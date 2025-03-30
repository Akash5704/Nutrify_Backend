const DailyLog = require('../models/DailyLogs');
exports.getNutritionStats = async (req, res) => {
    try {
      const userId = req.user.user_id;
      const { period = 'week' } = req.query;
      const endDate = new Date();
      let startDate = new Date();
      let prevStartDate = new Date();
      let prevEndDate = new Date();
      
      switch (period) {
        case 'week':
          startDate.setDate(endDate.getDate() - 7);
          prevStartDate.setDate(endDate.getDate() - 14);
          prevEndDate.setDate(endDate.getDate() - 8);
          break;
        case 'twoWeeks':
          startDate.setDate(endDate.getDate() - 14);
          prevStartDate.setDate(endDate.getDate() - 21);
          prevEndDate.setDate(endDate.getDate() - 15);
          break;
        case 'threeWeeks':
          startDate.setDate(endDate.getDate() - 21);
          prevStartDate.setDate(endDate.getDate() - 28);
          prevEndDate.setDate(endDate.getDate() - 22);
          break;
        default:
          startDate.setDate(endDate.getDate() - 7);
          prevStartDate.setDate(endDate.getDate() - 14);
          prevEndDate.setDate(endDate.getDate() - 8);
      }
      const currentLogs = await DailyLog.find({
        user_id: userId,
        date: { $gte: startDate, $lte: endDate }
      }).sort({ date: 1 });
      const previousLogs = await DailyLog.find({
        user_id: userId,
        date: { $gte: prevStartDate, $lte: prevEndDate }
      });
      const dailyData = [];
      const labels = [];
      let totalCalories = 0;
      let totalProtein = 0;
      let totalCarbs = 0;
      let totalFat = 0;
      let totalWater = 0;
      
      const mealTypeStats = {
        breakfast: { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
        lunch: { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
        dinner: { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
        snack: { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
      };
      
      const mealFrequency = {};
      
      const dateMap = new Map();
      let currentDate = new Date(startDate);
      
      while (currentDate <= endDate) {
        const dateString = currentDate.toISOString().split('T')[0];
        labels.push(dateString);
        dateMap.set(dateString, {
          calories: 0,
          protein: 0,
          carbs: 0,
          fat: 0,
          water: 0,
          meals: []
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }
      currentLogs.forEach(log => {
        const dateString = log.date.toISOString().split('T')[0];
        if (dateMap.has(dateString)) {
          const dayData = dateMap.get(dateString);
          dayData.calories = log.caloriesConsumed;
          dayData.protein = log.proteinConsumed;
          dayData.carbs = log.carbsConsumed;
          dayData.fat = log.fatConsumed;
          dayData.water = log.waterConsumed;
          dayData.meals = log.meals || [];
          
          totalCalories += log.caloriesConsumed;
          totalProtein += log.proteinConsumed;
          totalCarbs += log.carbsConsumed;
          totalFat += log.fatConsumed;
          totalWater += log.waterConsumed;
          if (log.meals && log.meals.length > 0) {
            log.meals.forEach(meal => {
              if (mealTypeStats[meal.type]) {
                mealTypeStats[meal.type].count++;
                mealTypeStats[meal.type].calories += meal.calories || 0;
                mealTypeStats[meal.type].protein += meal.protein || 0;
                mealTypeStats[meal.type].carbs += meal.carbs || 0;
                mealTypeStats[meal.type].fat += meal.fat || 0;
              }
              
              if (meal.name) {
                mealFrequency[meal.name] = (mealFrequency[meal.name] || 0) + 1;
              }
            });
          }
        }
      });
      
      dateMap.forEach((value) => {
        dailyData.push(value.calories);
      });
      
      let prevTotalCalories = 0;
      let prevTotalProtein = 0;
      let prevTotalCarbs = 0;
      let prevTotalFat = 0;
      let prevTotalWater = 0;
      
      const prevMealTypeStats = {
        breakfast: { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
        lunch: { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
        dinner: { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 },
        snack: { count: 0, calories: 0, protein: 0, carbs: 0, fat: 0 }
      };
      
      previousLogs.forEach(log => {
        prevTotalCalories += log.caloriesConsumed;
        prevTotalProtein += log.proteinConsumed;
        prevTotalCarbs += log.carbsConsumed;
        prevTotalFat += log.fatConsumed;
        prevTotalWater += log.waterConsumed;
        if (log.meals && log.meals.length > 0) {
          log.meals.forEach(meal => {
            if (prevMealTypeStats[meal.type]) {
              prevMealTypeStats[meal.type].count++;
              prevMealTypeStats[meal.type].calories += meal.calories || 0;
              prevMealTypeStats[meal.type].protein += meal.protein || 0;
              prevMealTypeStats[meal.type].carbs += meal.carbs || 0;
              prevMealTypeStats[meal.type].fat += meal.fat || 0;
            }
          });
        }
      });
      
      const dayCount = currentLogs.length || 1; 
      const prevDayCount = previousLogs.length || 1;
      
      const averageCalories = totalCalories / dayCount;
      const prevAverageCalories = prevTotalCalories / prevDayCount;
      const caloriesChange = prevTotalCalories > 0 
        ? ((totalCalories - prevTotalCalories) / prevTotalCalories) * 100 
        : 0;
      
      const proteinChange = prevTotalProtein > 0 
        ? ((totalProtein - prevTotalProtein) / prevTotalProtein) * 100 
        : 0;
      
      const carbsChange = prevTotalCarbs > 0 
        ? ((totalCarbs - prevTotalCarbs) / prevTotalCarbs) * 100 
        : 0;
      
      const fatChange = prevTotalFat > 0 
        ? ((totalFat - prevTotalFat) / prevTotalFat) * 100 
        : 0;
        
      const waterChange = prevTotalWater > 0 
        ? ((totalWater - prevTotalWater) / prevTotalWater) * 100 
        : 0;
      const mealTypeChanges = {};
      Object.keys(mealTypeStats).forEach(type => {
        const currentCals = mealTypeStats[type].calories;
        const prevCals = prevMealTypeStats[type].calories;
        
        mealTypeChanges[type] = {
          countChange: prevMealTypeStats[type].count > 0 
            ? ((mealTypeStats[type].count - prevMealTypeStats[type].count) / prevMealTypeStats[type].count) * 100 
            : 0,
          caloriesChange: prevCals > 0 
            ? ((currentCals - prevCals) / prevCals) * 100 
            : 0
        };
      });
      const topMeals = Object.entries(mealFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count }));
      const chartData = {
        labels,
        datasets: [
          {
            data: dailyData,
            color: (opacity = 1) => `rgba(255, 159, 64, ${opacity})`,
            strokeWidth: 2
          }
        ],
        legend: ['Calories']
      };
      const mealDistribution = {
        labels: Object.keys(mealTypeStats),
        datasets: [{
          data: Object.values(mealTypeStats).map(stats => stats.calories),
          backgroundColor: [
            'rgba(255, 99, 132, 0.6)',  
            'rgba(54, 162, 235, 0.6)',  
            'rgba(75, 192, 192, 0.6)',  
            'rgba(255, 206, 86, 0.6)'   
          ]
        }]
      };
      const responseData = {
        success: true,
        data: {
          chartData,
          mealDistribution,
          stats: {
            totalCalories,
            averageCalories: parseFloat(averageCalories.toFixed(1)),
            totalProtein,
            totalCarbs,
            totalFat,
            totalWater,
            caloriesChange: parseFloat(caloriesChange.toFixed(1)),
            proteinChange: parseFloat(proteinChange.toFixed(1)),
            carbsChange: parseFloat(carbsChange.toFixed(1)),
            fatChange: parseFloat(fatChange.toFixed(1)),
            waterChange: parseFloat(waterChange.toFixed(1)),
            period
          },
          mealStats: {
            mealTypeStats,
            mealTypeChanges,
            topMeals
          }
        }
      };
      
      return res.status(200).json(responseData);
      
    } catch (error) {
      console.error('Error fetching nutrition stats:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to fetch nutrition statistics',
        error: error.message
      });
    }
  };
