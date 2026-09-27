require('dotenv').config();
const mongoose = require('mongoose');

(async () => {
  const uri = process.env.MONGO_URI;
  console.log('URI host:', new URL(uri.replace('mongodb+srv://', 'https://')).host);
  try {
    await mongoose.connect(uri, { serverSelectionTimeoutMS: 15000 });
    console.log('CONNECTED to', mongoose.connection.name);
    process.exit(0);
  } catch (err) {
    console.error('FAILED:', err.message);
    process.exit(1);
  }
})();
