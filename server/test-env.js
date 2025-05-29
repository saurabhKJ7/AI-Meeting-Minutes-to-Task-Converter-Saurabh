// Load environment variables
require('dotenv').config({ path: './.env' });

console.log('Current working directory:', process.cwd());
console.log('Environment variables:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 'Not Set',
  MONGODB_URI: process.env.MONGODB_URI ? 'Set' : 'Not Set',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Set' : 'Not Set'
});

// Try to require the nlpParser to test if it can access the environment variables
try {
  console.log('\nTesting nlpParser...');
  require('./dist/utils/nlpParser');
  console.log('Successfully loaded nlpParser');
} catch (error) {
  console.error('Error loading nlpParser:', error.message);
}
