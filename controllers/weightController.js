const WeightEntry = require('../models/WeightEntry');
const User = require('../models/User');
const formatDateForPeriod = (date, period) => {
  switch(period) {
    case '30d':
    case '90d':
      return date.toISOString().split('T')[0];
    case '6m':
      return date.toISOString().substring(0, 7);
    case '1y':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `${date.getFullYear()}-Q${quarter}`;
    default:
      return date.toISOString().split('T')[0];
  }
};
const generateLabels = (entries, period) => {
  if (entries.length === 0) return [];
  switch(period) {
    case '30d':
      return entries
        .filter((_, index) => index % 5 === 0 || index === entries.length - 1)
        .map(entry => {
          const date = new Date(entry._id);
          return `${date.getDate()}/${date.getMonth() + 1}`;
        });
    case '90d':
      return entries
        .filter((_, index) => index % 15 === 0 || index === entries.length - 1)
        .map(entry => {
          const date = new Date(entry._id);
          return `${date.getDate()}/${date.getMonth() + 1}`;
        });
    case '6m':
      return entries.map(entry => {
        const date = new Date(entry._id + "-01"); 
        return date.toLocaleString('default', { month: 'short' });
      });
    case '1y':
      return entries.map(entry => entry._id.split('-')[1]);
    default:
      return entries.map(entry => {
        const date = new Date(entry._id);
        return `${date.getDate()}/${date.getMonth() + 1}`;
      });
  }
};
exports.logWeight = async (req, res) => {
  try {
    const { weight, notes } = req.body;
    const user_id = req.user.user_id; 
    console.log(user_id);
    const newEntry = new WeightEntry({
      user_id,
      weight,
      date: new Date(),
      notes: notes || ''
    });
    await newEntry.save();
    await User.findOneAndUpdate(
      { user_id },
      { weight: weight }
    );
    res.status(201).json({
      success: true,
      data: newEntry
    });
  } catch (error) {
    console.error('Error logging weight:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to log weight',
      error: error.message
    });
  }
};

exports.updateTargetWeight = async(req,res) =>{
  try{
    const user_id = req.user.user_id;
    const targetWeight = Number(req.body.targetWeight);
    console.log(targetWeight);
    const user = await User.findOne({ user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    await User.findOneAndUpdate(
      { user_id },
      { targetWeight: targetWeight }
    );
    res.status(200).json({ message: 'Target weight updated successfully', user });
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
}
exports.getWeightProgress = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const { period = '30d' } = req.query;
    const user = await User.findOne({ user_id });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    const now = new Date();
    let startDate;
    
    switch(period) {
      case '30d':
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case '90d':
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case '6m':
        startDate = new Date(now.setMonth(now.getMonth() - 6));
        break;
      case '1y':
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      default:
        startDate = new Date(now.setDate(now.getDate() - 30));
    }
    let entries = await WeightEntry.find({
      user_id,
      date: { $gte: startDate }
    }).sort({ date: 1 });
    if (entries.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          labels: [],
          datasets: [{ data: [] }],
          performance: user.weight || 0,
          change: 0,
          positive: true,
          targetWeight: user.targetWeight || 0
        }
      });
    }
    const groupedEntries = entries.reduce((acc, entry) => {
      const key = formatDateForPeriod(entry.date, period);
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(entry);
      return acc;
    }, {});
    const aggregatedData = Object.keys(groupedEntries)
      .sort() 
      .map(key => {
        const entriesInPeriod = groupedEntries[key];
        const totalWeight = entriesInPeriod.reduce((sum, entry) => sum + entry.weight, 0);
        return {
          _id: key,
          weight: totalWeight / entriesInPeriod.length
        };
      });
    const labels = generateLabels(aggregatedData, period);
    const dataPoints = aggregatedData.map(entry => entry.weight);
    const oldestWeight = dataPoints[0];
    const newestWeight = dataPoints[dataPoints.length - 1];
    let change = 0;
    if (oldestWeight && newestWeight) {
      change = ((newestWeight - oldestWeight) / oldestWeight * 100).toFixed(1);
    }
    let progressPercentage = 0;
    if (user.targetWeight && user.weight) {
      if (user.goal === 'lose') {
        const originalWeight = Math.max(...dataPoints) || user.weight;
        progressPercentage = ((originalWeight - user.weight) / (originalWeight - user.targetWeight)) * 100;
      } else if (user.goal === 'gain') {
        const originalWeight = Math.min(...dataPoints) || user.weight;
        progressPercentage = ((user.weight - originalWeight) / (user.targetWeight - originalWeight)) * 100;
      }
      progressPercentage = Math.max(0, Math.min(100, progressPercentage));
    }
    
    res.status(200).json({
      success: true,
      data: {
        labels,
        datasets: [
          {
            data: dataPoints,
            color: () => `rgba(0, 122, 255, 1)`,
          }
        ],
        performance: user.weight || 0,
        change: parseFloat(change),
        positive: user.goal === 'gain' ? change >= 0 : change <= 0,
        targetWeight: user.targetWeight || 0,
        progressPercentage: parseFloat(progressPercentage.toFixed(1))
      }
    });
    
  } catch (error) {
    console.error('Error fetching weight progress:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch weight progress',
      error: error.message
    });
  }
};
exports.getLatestWeight = async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const latestEntry = await WeightEntry.findOne({ user_id })
      .sort({ date: -1 })
      .limit(1);  
    if (!latestEntry) {
      return res.status(200).json({
        success: true,
        data: null
      });
    }
    res.status(200).json({
      success: true,
      data: latestEntry
    });
  } catch (error) {
    console.error('Error fetching latest weight:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch latest weight',
      error: error.message
    });
  }
};