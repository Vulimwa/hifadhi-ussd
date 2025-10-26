const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
  ward: { type: String, index: true, unique: true },
  kwsHotline: String,
  wardAdmin: String
}, { timestamps: true });

module.exports = mongoose.model('Contact', contactSchema);

