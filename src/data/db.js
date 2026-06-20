import mongoose from 'mongoose';
import User from '../models/User.js';
import Bus from '../models/Bus.js';
import Route from '../models/Route.js';
import Schedule from '../models/Schedule.js';
import Booking from '../models/Booking.js';
import OTP from '../models/OTP.js';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/busgo';

export async function connectDB() {
  if (/<db_password>|%3cdb_password%3e/i.test(MONGODB_URI)) {
    console.error('\n✗ MONGODB_URI still contains the PLACEHOLDER password.');
    console.error('  Open backend/.env and replace "<db_password>" with your real Atlas password.\n');
    process.exit(1);
  }

  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // fail fast if Atlas unreachable
      socketTimeoutMS: 45000,
    });

    // Warn clearly on any future connection errors instead of silent failure
    mongoose.connection.on('error', (err) => {
      console.error('✗ MongoDB connection error:', err.message);
    });
    mongoose.connection.on('disconnected', () => {
      console.warn('⚠ MongoDB disconnected — will attempt to reconnect automatically.');
    });

    console.log('✓ Connected to MongoDB');
  } catch (err) {
    console.error('✗ MongoDB connection failed:', err.message);
    if (/bad auth|authentication failed/i.test(err.message)) {
      console.error('  → Wrong username or password in MONGODB_URI.');
    } else if (/ENOTFOUND|ECONNREFUSED|timed out/i.test(err.message)) {
      console.error('  → Cannot reach the database host. Check your network / Atlas IP whitelist.');
    }
    process.exit(1);
  }
}

export { User, Bus, Route, Schedule, Booking, OTP };
