const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  phone: { type: String, index: true, unique: true, required: true },
  name: { type: String },
  ward: { type: String, index: true },
  village: { type: String },
  lang: { type: String, enum: ['EN', 'SW'], default: 'EN' },
  registeredAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);

