const User = require('../models/User');

exports.getNutritionGoals = async (req, res) => {
    try {
      const user = await User.findById(req.user.id);
  
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // Extract just the goals-related data
      const goals = {
        dailyCalorieGoal: user.dailyCalorieGoal,
        proteinGoal: user.proteinGoal,
        carbsGoal: user.carbsGoal,
        fatGoal: user.fatGoal,
        goal: user.goal,
        weightSpeed: user.weightSpeed,
        dietType: user.dietType
      };
  
      res.json(goals);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }

exports.updateNutritionGoals = async (req, res) => {
    try {
      const { dailyCalorieGoal, proteinGoal, carbsGoal, fatGoal } = req.body;
      
      // Find the user
      const user = await User.findById(req.user.id);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
  
      // The approach will depend on whether you want to override the calculated values
      // Option 1: Update the base values that affect the virtual calculations
      // This route uses a different approach: we store the custom values
      
      // Store the user's preferred values
      // We need to create a custom field for these since they're not in your original schema
      const updatedUser = await User.findByIdAndUpdate(
        req.user.id,
        { 
          $set: {
            customCalorieGoal: dailyCalorieGoal || undefined,
            customProteinGoal: proteinGoal || undefined,
            customCarbsGoal: carbsGoal || undefined,
            customFatGoal: fatGoal || undefined
          }
        },
        { new: true }
      );
  
      // Return the updated goals (either custom or calculated)
      const goals = {
        dailyCalorieGoal: updatedUser.customCalorieGoal || updatedUser.dailyCalorieGoal,
        proteinGoal: updatedUser.customProteinGoal || updatedUser.proteinGoal,
        carbsGoal: updatedUser.customCarbsGoal || updatedUser.carbsGoal,
        fatGoal: updatedUser.customFatGoal || updatedUser.fatGoal,
        goal: updatedUser.goal,
        weightSpeed: updatedUser.weightSpeed,
        dietType: updatedUser.dietType
      };
  
      res.json(goals);
    } catch (err) {
      console.error(err.message);
      res.status(500).send('Server Error');
    }
  }