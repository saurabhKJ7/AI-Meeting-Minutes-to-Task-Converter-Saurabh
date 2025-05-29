// Load environment variables first
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file in the server root
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Log environment status (debug mode)
console.log('Environment variables loaded:', {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '5000',
  MONGODB_URI: process.env.MONGODB_URI ? 'Found' : 'Not Found',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'Found' : 'Not Found'
});

// Debug: Check if .env file is being loaded
console.log('Loading .env from:', path.resolve(__dirname, '../../.env'));

import express from 'express';
import cors from 'cors';
import mongoose from 'mongoose';
import taskRoutes from './routes/taskRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/tasks', taskRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start the server immediately
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  
  // Try to connect to MongoDB in the background
  if (process.env.MONGODB_URI) {
    console.log('Attempting to connect to MongoDB in the background...');
    mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    .then(() => console.log('✅ Successfully connected to MongoDB'))
    .catch(err => console.warn('⚠️  MongoDB connection warning:', err.message));
  } else {
    console.warn('⚠️  MONGODB_URI not found. Some features requiring database access will be limited.');
  }
});

export default app;
