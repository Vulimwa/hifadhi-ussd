const mongoose = require('mongoose');

let isConnected = false;

async function connect() {
  if (isConnected) return mongoose.connection;
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error('MONGO_URI not set');
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri, { autoIndex: true });
  isConnected = true;
  return mongoose.connection;
}

module.exports = { connect };

