require('dotenv').config();
const { connect } = require('../src/services/db');
const Contact = require('../src/models/Contact');
const { WARDS } = require('../src/config/wards');

async function main() {
  await connect();
  const docs = WARDS.map((w) => ({
    ward: w,
    kwsHotline: '+254 726 610 098',
    wardAdmin: w === 'Sagalla' ? '+254 7XX 111 222' : '+254 7XX 333 444'
  }));
  for (const d of docs) {
    await Contact.updateOne({ ward: d.ward }, { $set: d }, { upsert: true });
  }
  console.log('Seeded contacts:', docs.length);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });

