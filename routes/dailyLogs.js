const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DailyLog = require('../models/DailyLogs');
require('dotenv').config();
const authenticateUser = require('../middleware/authMiddleware');
const router = express.Router();

// Health check route
router.get("/ping", (req, res) => {
  res.status(200).json({ message: "Server is alive!" });
});

// User Signup
router.post("/signup", async (req, res) => {
    try {
        const { email, password, Goal, TargetWeight, WeightSpeed, DietType, ...otherUserData } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10); // Hash the password

        const newUser = new User({
          email,
          password: hashedPassword,
          // Convert to lowercase to match schema
          goal: Goal,
          targetWeight: TargetWeight,
          weightSpeed: WeightSpeed,
          dietType: DietType,
          ...otherUserData,
        });

        await newUser.save();
        return res.status(201).json({ 
          message: "User registered successfully", 
          user: {
            ...newUser.toObject({ virtuals: true }),
            password: undefined // Don't return password in response
          }
        });
    } catch (error) {
        console.error("Error during signup:", error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

// User Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    let user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT Token
    const token = jwt.sign({ id: user._id, user_id: user.user_id }, process.env.JWT_SECRET, { expiresIn: "7d" });
    
    // Convert to object with virtuals but exclude password
    const userResponse = user.toObject({ virtuals: true });
    delete userResponse.password;
    
    res.json({ token, user: userResponse });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get authenticated user's data
router.get('/me', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password')
      .exec();

    if (!user) return res.status(404).json({ message: "User not found" });

    // Convert to object with virtuals
    const userObj = user.toObject({ virtuals: true, getters: true });
    
    // Debugging with actual values
    console.log('Raw user data:', {
      weight: user.weight,
      feet: user.feet,
      inches: user.inches,
      gender: user.gender,
      age: user.age,
      workoutsPerWeek: user.workoutsPerWeek
    });

    res.json({
      ...userObj,
      bmi: userObj.bmi,
      bmr: userObj.bmr,
      dailyCalorieGoal: userObj.dailyCalorieGoal,
      proteinGoal: userObj.proteinGoal,
      carbsGoal: userObj.carbsGoal,
      fatGoal: userObj.fatGoal
    });
    console.log(userObj.bmi,
      userObj.bmr,userObj.dailyCalorieGoal,
      userObj.proteinGoal,
       userObj.carbsGoal,
       userObj.fatGoal);
    
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post('/daily-log', authenticateUser, async (req, res) => {
  try {
    const { log } = req.body;
    console.log("Received log:", log);

    // Find user to get user_id
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Create a new daily log entry with user_id reference
    const newLog = new DailyLog({
      user_id: user.user_id,
      caloriesConsumed: log.caloriesConsumed, // FIXED
      proteinConsumed: log.proteinConsumed, // FIXED
      carbsConsumed: log.carbsConsumed, // FIXED
      fatConsumed: log.fatConsumed, // FIXED
      waterConsumed: log.waterConsumed, // FIXED
      meals: log.meals || [] // Ensure meals array is used properly
    });

    await newLog.save();

    // Get updated logs to return to client
    const userLogs = await DailyLog.find({ user_id: user.user_id })
      .sort({ date: -1 })
      .limit(10); // Return most recent logs

    res.json({ 
      message: "Daily log added", 
      log: newLog,
      recentLogs: userLogs 
    });
  } catch (err) {
    console.error("Error saving log:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// // Get User Daily Logs (updated for separate schema)
// router.get('/daily-logs/:userId', authenticateUser, async (req, res) => {
//   try {
//     const user = await User.findById(req.user.id);
//     if (!user) return res.status(404).json({ message: "User not found" });

//     // Query logs by user_id
//     const logs = await DailyLog.find({ user_id: user.user_id })
//       .sort({ date: -1 });
      
//     res.json(logs);
//   } catch (err) {
//     res.status(500).json({ message: "Server error", error: err.message });
//   }
// });

router.get('/daily-logs/:userId', authenticateUser, async (req, res) => {
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
});

// Get Daily Logs by Date Range
router.get('/daily-logs/range', authenticateUser, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Create date filter
    const dateFilter = {};
    if (startDate) dateFilter.$gte = new Date(startDate);
    if (endDate) dateFilter.$lte = new Date(endDate);

    // Query with optional date filter
    const query = { user_id: user.user_id };
    if (Object.keys(dateFilter).length > 0) {
      query.date = dateFilter;
    }

    const logs = await DailyLog.find(query).sort({ date: -1 });
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Get Log Summary (aggregated data)
router.get('/logs/summary', authenticateUser, async (req, res) => {
  try {
    const { period } = req.query; // 'week', 'month', 'year'
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Calculate start date based on period
    const now = new Date();
    let startDate = new Date();
    
    if (period === 'week') {
      startDate.setDate(now.getDate() - 7);
    } else if (period === 'month') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (period === 'year') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      // Default to week if invalid period
      startDate.setDate(now.getDate() - 7);
    }

    // Aggregate data
    const summary = await DailyLog.aggregate([
      {
        $match: {
          user_id: user.user_id,
          date: { $gte: startDate, $lte: now }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$date' } },
          totalCalories: { $sum: '$caloriesConsumed' },
          totalProtein: { $sum: '$proteinConsumed' },
          totalCarbs: { $sum: '$carbsConsumed' },
          totalFat: { $sum: '$fatConsumed' }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Delete a specific log
router.delete('/daily-log/:logId', authenticateUser, async (req, res) => {
  try {
    const { logId } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // Find and delete the log, ensuring it belongs to the user
    const log = await DailyLog.findOne({ _id: logId, user_id: user.user_id });
    
    if (!log) {
      return res.status(404).json({ message: "Log not found or unauthorized" });
    }
    
    await DailyLog.deleteOne({ _id: logId });
    
    res.json({ message: "Log deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

module.exports = router;