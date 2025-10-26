const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema({
  ward: { type: String, index: true, unique: true },
  risk: { type: String, enum: ['LOW','MED','HIGH'] },
  window: { type: String },
  summaryEn: String,
  summarySw: String,
  updatedBy: String
}, { timestamps: true });

module.exports = mongoose.model('Alert', alertSchema);

