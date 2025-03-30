const User = require('../models/User');
const DailyLog = require('../models/DailyLogs')

exports.FoodLog = async (req, res) => {
  try {
    const { log } = req.body;
    console.log("Received log:", log);

    // Find user to get user_id
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const today = new Date().toISOString().split("T")[0]; // Get only the date part

    // Find if an entry exists for today
    let existingLog = await DailyLog.findOne({
      user_id: user.user_id,
      date: { $gte: new Date(today), $lt: new Date(today + "T23:59:59.999Z") } // Same day range
    });

    if (existingLog) {
      // Update existing log by adding the new values
      existingLog.caloriesConsumed += log.caloriesConsumed || 0;
      existingLog.proteinConsumed += log.proteinConsumed || 0;
      existingLog.carbsConsumed += log.carbsConsumed || 0;
      existingLog.fatConsumed += log.fatConsumed || 0;
      existingLog.waterConsumed += log.waterConsumed || 0;
      existingLog.meals.push(...(log.meals || [])); // Merge meals array

      await existingLog.save();
    } else {
      // Create new log entry for today
      existingLog = new DailyLog({
        user_id: user.user_id,
        caloriesConsumed: log.caloriesConsumed || 0,
        proteinConsumed: log.proteinConsumed || 0,
        carbsConsumed: log.carbsConsumed || 0,
        fatConsumed: log.fatConsumed || 0,
        waterConsumed: log.waterConsumed || 0,
        meals: log.meals || [],
        date: new Date(today)
      });

      await existingLog.save();
    }

    res.json({
      message: "Daily log updated",
      log: existingLog
    });
  } catch (err) {
    console.error("Error updating log:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
exports.getDailyLogs = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const { date } = req.query;

    if (date) {
      // Parse the date and set time range for the entire day
      const selectedDate = new Date(date);
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);

      const log = await DailyLog.findOne({
        user_id: user.user_id,
        date: { $gte: startOfDay, $lte: endOfDay },
      });

      return res.json(log || null);
    }

    // Fallback: return all logs if no date is specified
    const logs = await DailyLog.find({ user_id: user.user_id }).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}