const mongoose = require('mongoose');
const { Schema } = mongoose;

// Auto-increment plugin setup
const AutoIncrement = require('mongoose-sequence')(mongoose);

// User Schema
const UserSchema = new Schema({
  user_id: {
    type: Number,
    unique:true
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  gender: { 
    type: String, 
    enum: ["Male", "Female", "Other"] 
  },
  feet: { 
    type: Number 
  },
  inches: { 
    type: Number 
  },
  weight: { 
    type: Number 
  },
  month: { 
    type: String 
  },
  day: { 
    type: String 
  },
  year: { 
    type: String 
  },
  dietType: { 
    type: String 
  },
  goal: { 
    type: String, 
    enum: ["gain", "lose", "maintain"] 
  },
  targetWeight: { 
    type: Number 
  },
  weightSpeed: { 
    type: String 
  },
  workoutsPerWeek: { 
    type: String 
  },
  obstacles: [{ 
    type: String 
  }],
  PreviousAppUsed: { 
    type: String 
  },
  life_Goal: [{ 
    type: String 
  }],
  onboardingCompleted: { 
    type: Boolean, 
    default: false 
  }
}, { 
  timestamps: true 
});


UserSchema.virtual('age').get(function() {
  const year = Number(this.year) || 2000;
  const month = Number(this.month) || 1;
  const day = Number(this.day) || 1;
  
  const birthDate = new Date(year, month - 1, day);
  const today = new Date();
  
  let age = today.getFullYear() - birthDate.getFullYear();
  if (today.getMonth() < birthDate.getMonth() || 
     (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});
// Add the auto-increment plugin to generate sequential user_id
UserSchema.plugin(AutoIncrement, { inc_field: 'user_id', start_seq: 1000 });

// Add virtual properties for BMI, BMR, and nutrition goals
UserSchema.virtual('bmi').get(function() {
  if (!this.weight || !this.feet || !this.inches) return null;
  const heightInInches = (this.feet * 12) + this.inches;
  const heightInMeters = heightInInches * 0.0254;
  const weightInKg = this.weight * 0.453592;
  return (weightInKg / (heightInMeters * heightInMeters)).toFixed(1);
});

UserSchema.virtual('bmr').get(function() {
  if (!this.weight || !this.feet || !this.inches || !this.gender || !this.year) return null;
  
  const heightInInches = (this.feet * 12) + this.inches;
  const heightInCm = heightInInches * 2.54;
  const weightInKg = this.weight * 0.453592;
  const age = new Date().getFullYear() - parseInt(this.year);
  
  // Harris-Benedict equation
  if (this.gender === "Male") {
    return Math.round(88.362 + (13.397 * weightInKg) + (4.799 * heightInCm) - (5.677 * age));
  } else {
    return Math.round(447.593 + (9.247 * weightInKg) + (3.098 * heightInCm) - (4.330 * age));
  }
});

UserSchema.virtual('dailyCalorieGoal').get(function() {
  if (!this.bmr || !this.goal || !this.workoutsPerWeek) return null;
  
  // Activity multiplier based on workouts per week
  let activityMultiplier = 1.2; // Sedentary
  if (this.workoutsPerWeek === "1-2") activityMultiplier = 1.375;
  else if (this.workoutsPerWeek === "3-5") activityMultiplier = 1.55;
  else if (this.workoutsPerWeek === "6-7") activityMultiplier = 1.725;
  
  let tdee = this.bmr * activityMultiplier;
  
  // Adjust based on goal
  if (this.goal === "lose") {
    if (this.weightSpeed === "slow") return Math.round(tdee - 250);
    else if (this.weightSpeed === "moderate") return Math.round(tdee - 500);
    else return Math.round(tdee - 750); // fast
  } else if (this.goal === "gain") {
    if (this.weightSpeed === "slow") return Math.round(tdee + 250);
    else if (this.weightSpeed === "moderate") return Math.round(tdee + 500);
    else return Math.round(tdee + 750); // fast
  }
  
  return Math.round(tdee); // maintain
});

UserSchema.virtual('proteinGoal').get(function() {
  if (!this.weight || !this.goal) return null;
  // Protein: 1g per lb for gaining, 0.8g for maintaining, 1.2g for losing
  if (this.goal === "gain") return Math.round(this.weight * 1.0);
  else if (this.goal === "lose") return Math.round(this.weight * 1.2);
  else return Math.round(this.weight * 0.8); // maintain
});

UserSchema.virtual('carbsGoal').get(function() {
  if (!this.dailyCalorieGoal || !this.proteinGoal || !this.dietType) return null;
  
  let carbPercentage = 0.50; // Default balanced diet
  if (this.dietType === "lowCarb") carbPercentage = 0.25;
  else if (this.dietType === "highCarb") carbPercentage = 0.65;
  
  const proteinCalories = this.proteinGoal * 4;
  const fatCalories = this.dailyCalorieGoal * 0.25; // 25% from fat is standard
  const remainingCalories = this.dailyCalorieGoal - proteinCalories - fatCalories;
  
  return Math.round(remainingCalories / 4); // 4 calories per gram of carbs
});

UserSchema.virtual('fatGoal').get(function() {
  if (!this.dailyCalorieGoal) return null;
  return Math.round((this.dailyCalorieGoal * 0.25) / 9); // 25% calories from fat, 9 calories per gram
});

// Add explicit virtuals configuration
UserSchema.set('toObject', { virtuals: true });
UserSchema.set('toJSON', { 
  virtuals: true,
  transform: (doc, ret) => {
    delete ret.password;
    return ret;
  }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;