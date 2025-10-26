const express = require('express');
const Incident = require('../models/Incident');
const Alert = require('../models/Alert');
const Contact = require('../models/Contact');

const adminRouter = express.Router();

function auth(req, res, next) {
  const tok = req.headers['x-admin-token'];
  if (!tok || tok !== process.env.ADMIN_TOKEN) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  next();
}

adminRouter.post('/alerts/seed', auth, async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : [];
    const ops = arr.map((a) => ({ updateOne: { filter: { ward: a.ward }, update: { $set: a }, upsert: true } }));
    if (ops.length) await Alert.bulkWrite(ops);
    res.json({ ok: true, upserted: ops.length });
  } catch (e) {
    res.status(500).json({ error: 'seed_failed' });
  }
});

adminRouter.post('/contacts/seed', auth, async (req, res) => {
  try {
    const arr = Array.isArray(req.body) ? req.body : [];
    const ops = arr.map((c) => ({ updateOne: { filter: { ward: c.ward }, update: { $set: c }, upsert: true } }));
    if (ops.length) await Contact.bulkWrite(ops);
    res.json({ ok: true, upserted: ops.length });
  } catch (e) {
    res.status(500).json({ error: 'seed_failed' });
  }
});

adminRouter.get('/export/incidents.csv', auth, async (req, res) => {
  try {
    const items = await Incident.find().sort({ createdAt: -1 }).lean();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="incidents.csv"');
    const header = 'id,createdAt,caseId,phone,ward,type,species,urgency,village,note,status\n';
    const rows = items.map(it => [
      it._id,
      new Date(it.createdAt).toISOString(),
      it.caseId,
      it.phone?.replace(/(\+?\d{4})\d+(\d{2})/, '$1****$2'),
      safeCsv(it.ward),
      safeCsv(it.type),
      safeCsv(it.species),
      safeCsv(it.urgency),
      safeCsv(it.village),
      safeCsv(it.note),
      safeCsv(it.status)
    ].join(',')).join('\n');
    res.send(header + rows + '\n');
  } catch (e) {
    res.status(500).json({ error: 'export_failed' });
  }
});

function safeCsv(v) {
  if (v === undefined || v === null) return '';
  const s = String(v).replaceAll('"', '""');
  if (s.includes(',') || s.includes('\n') || s.includes('"')) return `"${s}"`;
  return s;
}

module.exports = { adminRouter };

