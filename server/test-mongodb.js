const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });

console.log('Testing MongoDB connection...');
console.log('MongoDB URI:', process.env.MONGODB_URI ? 'Found' : 'Not found');

if (!process.env.MONGODB_URI) {
  console.error('Error: MONGODB_URI is not defined in .env file');
  process.exit(1);
}

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000
})
.then(() => {
  console.log('✅ Successfully connected to MongoDB');
  process.exit(0);
})
.catch((error) => {
  console.error('❌ MongoDB connection error:', error.message);
  console.error('Error code:', error.code);
  console.error('Error name:', error.name);
  console.error('Error stack:', error.stack);
  process.exit(1);
});
