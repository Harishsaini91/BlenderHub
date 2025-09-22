// models/FilterOption.js
const mongoose = require("mongoose");

const FilterOptionSchema = new mongoose.Schema({
  location: [String],
  skills: [String],
  available: [String],
});

module.exports = mongoose.model("FilterOption", FilterOptionSchema);
