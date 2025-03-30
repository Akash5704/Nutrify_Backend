const mongoose = require('mongoose');
const { Schema } = mongoose;

const WeightEntrySchema = new Schema({
  user_id: {
    type: Number,
    required: true,
    ref: 'User'
  },
  weight: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  notes: {
    type: String
  }
}, { 
  timestamps: true 
});

// Index for faster queries by user_id and date
WeightEntrySchema.index({ user_id: 1, date: -1 });

const WeightEntry = mongoose.model('WeightEntry', WeightEntrySchema);

module.exports = WeightEntry;