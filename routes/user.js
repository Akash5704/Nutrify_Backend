const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const DailyLog = require('../models/DailyLogs');
require('dotenv').config();
const authenticateUser = require('../middleware/authMiddleware');
const router = express.Router();
const weightController = require('../controllers/weightController');
const nutritionController = require('../controllers/nutritionController');
const userController = require('../controllers/userController')
const dailyLogController = require('../controllers/dailylogsController')
const Nutrient = require('../models/Nutrient')
router.get("/ping", (req, res) => {
  res.status(200).json({ message: "Server is alive!" });
});

router.post("/signup", userController.userSignUp);

router.post('/login', userController.userLogin);

router.get('/me', authenticateUser, async (req, res) => {
  try {
    console.log(req.user.user_id);
    const user = await User.findById(req.user.id)
      .select('-password')
      .exec();

    if (!user) return res.status(404).json({ message: "User not found" });

    const userObj = user.toObject({ virtuals: true, getters: true });
    console.log("Debugging")
    res.json({
      ...userObj,
      bmi: userObj.bmi,
      bmr: userObj.bmr,
      dailyCalorieGoal: userObj.dailyCalorieGoal,
      proteinGoal: userObj.proteinGoal,
      carbsGoal: userObj.carbsGoal,
      fatGoal: userObj.fatGoal
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

router.post('/daily-log', authenticateUser, dailyLogController.FoodLog);

router.get('/daily-logs', authenticateUser, dailyLogController.getDailyLogs);

router.post('/log',authenticateUser, weightController.logWeight);

router.get('/progress', authenticateUser, weightController.getWeightProgress);

router.post('/updateTargetWeight', authenticateUser, weightController.updateTargetWeight);

router.get('/latest', authenticateUser, weightController.getLatestWeight);

router.get('/stats',authenticateUser, nutritionController.getNutritionStats);

router.get('/weightstats', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get user stats
    const stats = {
      age: user.age, // This is a virtual property
      height: {
        feet: user.feet,
        inches: user.inches,
        total_inches: (user.feet * 12) + user.inches
      },
      weight: {
        current: user.weight,
        target: user.targetWeight,
        goal: user.goal // 'gain', 'lose', or 'maintain'
      },
      dob:{ 
      day : user.day,
      month : user.month,
      year : user.year
    },
    gender : user.gender
    };

    res.json(stats);
  } catch (err) {
    console.error('Error fetching user stats:', err.message);
    res.status(500).json({ message: 'Server error' });
  }
});
router.get('/height', authenticateUser, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('feet inches');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.json({
      success: true,
      feet: user.feet,
      inches: user.inches
    });
  } catch (err) {
    console.error('Error fetching height:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.put('/height', authenticateUser, async (req, res) => {
  try {
    const { feet, inches } = req.body;

    // Validate input
    if (feet === undefined || inches === undefined) {
      return res.status(400).json({ success: false, message: 'Both feet and inches are required' });
    }

    // Parse values to ensure they're numbers
    const parsedFeet = parseInt(feet);
    const parsedInches = parseInt(inches);

    // Additional validation
    if (isNaN(parsedFeet) || isNaN(parsedInches)) {
      return res.status(400).json({ success: false, message: 'Feet and inches must be valid numbers' });
    }

    if (parsedFeet < 0 || parsedInches < 0 || parsedInches > 11) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid height values. Feet must be positive, inches must be between 0 and 11' 
      });
    }

    // Update user height
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.feet = parsedFeet;
    user.inches = parsedInches;
    
    await user.save();
    
    // Return updated user without password
    const updatedUser = user.toJSON();
    
    res.json({
      success: true,
      message: 'Height updated successfully',
      user: updatedUser
    });
  } catch (err) {
    console.error('Error updating height:', err.message);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update DOB Route
router.put('/updatedob', authenticateUser, async (req, res) => {
  try {
    const { month, day, year } = req.body;
    
    // Basic validation
    if (!month || !day || !year) {
      return res.status(400).json({ message: 'Month, day, and year are required' });
    }
    
    // Find and update user
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    user.month = month;
    user.day = day;
    user.year = year;
    
    await user.save();
    
    // Return updated user without password
    res.json({
      success: true,
      data: {
        user_id: user.user_id,
        month: user.month,
        day: user.day,
        year: user.year,
        age: user.age // Virtual property
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});
// PUT /api/users/gender
router.put('/gender', authenticateUser, async (req, res) => {
  try {
    const { gender } = req.body;
    
    // Validate the gender input
    if (!gender || !['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({ msg: 'Please provide a valid gender (Male, Female, or Other)' });
    }
    
    // Find the user by id (from auth middleware) and update
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }
    
    // Update the gender
    user.gender = gender;
    
    // Save the updated user
    await user.save();
    
    // Return the updated user object (without the password)
    res.json(user);
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

router.post('/update-token', authenticateUser, async (req, res) => {
  try {
    const { expoPushToken } = req.body;
    const userId = req.user.id; // Assuming auth middleware sets req.user

    await User.findByIdAndUpdate(userId, { expoPushToken });
    res.status(200).json({ message: 'Push token updated successfully' });
  } catch (error) {
    console.error('Error updating push token:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// API Route for getting custom nutritional info
router.post('/custom-nutrition',authenticateUser, async (req, res) => {
  try {
    const { foodName, quantity } = req.body;
    
    if (!foodName || !quantity) {
      return res.status(400).json({ 
        error: true, 
        message: 'Food name and quantity are required' 
      });
    }

    const normalizedFoodName = foodName;
    console.log(normalizedFoodName);

    let nutrientData = await Nutrient.findOne({name:normalizedFoodName});
    // If not found, try partial match
    if (!nutrientData) {
      nutrientData = await Nutrient.findOne({ 
        name: { $regex: new RegExp(normalizedFoodName, 'i') } 
      });
    }

    if (!nutrientData) {
      return res.status(404).json({
        error: true,
        message: `Food item "${foodName}" not found in database`
      });
    }

    // Convert quantity to grams if needed
    let quantityInGrams = parseFloat(quantity);
    
    // Handle unit conversions if necessary
    // For now, assuming the quantity is already in grams or can be directly multiplied
    
    // Calculate nutrition based on quantity
    const nutritionInfo = {
      calories: Math.round(nutrientData.per_gram.calories * quantityInGrams),
      protein: Math.round(nutrientData.per_gram.protein * quantityInGrams) ,
      carbohydrates: Math.round(nutrientData.per_gram.carbs * quantityInGrams) ,
      fat: Math.round(nutrientData.per_gram.fats * quantityInGrams)
    };

    res.json(nutritionInfo);
  } catch (error) {
    console.error('Error processing nutrition request:', error);
    res.status(500).json({
      error: true,
      message: 'Server error processing nutrition information'
    });
  }
});


module.exports = router;