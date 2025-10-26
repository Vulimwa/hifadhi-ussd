const mongoose = require('mongoose');

const incidentSchema = new mongoose.Schema({
  caseId: { type: String, index: true, unique: true },
  phone: { type: String, index: true },
  userRef: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  species: { type: String, enum: ['elephant','buffalo','lion','other'], required: true },
  urgency: { type: String, enum: ['now','today','24h'], required: true },
  type: { type: String, enum: ['crop','livestock','fence','human'], required: true },
  ward: { type: String, index: true },
  village: { type: String },
  note: { type: String, maxlength: 80 },
  status: { type: String, enum: ['new','ack','closed'], default: 'new' }
}, { timestamps: true });

module.exports = mongoose.model('Incident', incidentSchema);

