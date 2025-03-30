const mongoose = require('mongoose');
const { Schema } = mongoose;

// Daily Log Schema (now separate from User)
const DailyLogSchema = new Schema({
  user_id: {
    type: Number,
    required: true,
    ref: 'User' // Reference to the User model
  },
  date: { 
    type: Date, 
    default: Date.now 
  },
  caloriesConsumed: { 
    type: Number, 
    default: 0 
  },
  proteinConsumed: { 
    type: Number, 
    default: 0 
  },
  carbsConsumed: { 
    type: Number, 
    default: 0 
  },
  fatConsumed: { 
    type: Number, 
    default: 0 
  },
  waterConsumed: { 
    type: Number, 
    default: 0 
  },
  meals: [{
    type: { 
      type: String, 
      enum: ['breakfast', 'lunch', 'dinner', 'snack'] 
    },
    name: { 
      type: String 
    },
    calories: { 
      type: Number 
    },
    protein: { 
      type: Number 
    },
    carbs: { 
      type: Number 
    },
    fat: { 
      type: Number 
    }
  }]
  // Uncomment if you want to track workouts
  // workout: {
  //   completed: { type: Boolean, default: false },
  //   type: { type: String },
  //   duration: { type: Number }
  // }
}, {
  timestamps: true
});

// Create indexes for efficient querying
DailyLogSchema.index({ user_id: 1, date: 1 });

const DailyLog = mongoose.model('DailyLog', DailyLogSchema);

module.exports = DailyLog;