require('dotenv').config();
const { connect } = require('../src/services/db');
const Alert = require('../src/models/Alert');
const { WARDS } = require('../src/config/wards');

async function main() {
  await connect();
  const docs = WARDS.map((w) => ({
    ward: w,
    risk: w === 'Sagalla' ? 'HIGH' : 'LOW',
    window: '18:00–06:00',
    summaryEn: w === 'Sagalla' ? 'High elephant movement tonight.' : 'Low risk.',
    summarySw: w === 'Sagalla' ? 'Harakati za ndovu usiku huu.' : 'Hatari ndogo.'
  }));
  for (const d of docs) {
    await Alert.updateOne({ ward: d.ward }, { $set: d }, { upsert: true });
  }
  console.log('Seeded alerts:', docs.length);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

