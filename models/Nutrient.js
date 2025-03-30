// Define Nutrient Schema
const mongoose = require('mongoose');
const { Schema } = mongoose;

const nutrientSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      unique: true
    },
    per_gram: {
      calories: {
        type: Number,
        required: true
      },
      protein: {
        type: Number,
        required: true
      },
      carbs: {
        type: Number,
        required: true
      },
      fats: {
        type: Number,
        required: true
      }
    }
  });
const Nutrient = mongoose.model('Nutrient', nutrientSchema);
module.exports = Nutrient;