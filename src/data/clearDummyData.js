/**
 * One-time script — clears ALL data from the database.
 * Buses, routes, schedules, bookings, OTPs, demo users — everything.
 * Admin account (admin@demo.com) is kept so you can still log in.
 *
 * Run:
 *   node src/data/clearDummyData.js
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import { connectDB, User, Bus, Route, Schedule, Booking, OTP } from './db.js';

await connectDB();

console.log('\n🗑  Clearing all data...\n');

const [buses, routes, schedules, bookings, otps] = await Promise.all([
  Bus.deleteMany({}),
  Route.deleteMany({}),
  Schedule.deleteMany({}),
  Booking.deleteMany({}),
  OTP.deleteMany({}),
]);

// Delete all users except admin
const users = await User.deleteMany({ role: { $ne: 'admin' } });

console.log(`✓ Deleted ${buses.deletedCount} buses`);
console.log(`✓ Deleted ${routes.deletedCount} routes`);
console.log(`✓ Deleted ${schedules.deletedCount} schedules`);
console.log(`✓ Deleted ${bookings.deletedCount} bookings`);
console.log(`✓ Deleted ${otps.deletedCount} OTPs`);
console.log(`✓ Deleted ${users.deletedCount} users`);
console.log('\n✅ Done. Admin account kept.\n');

await mongoose.disconnect();
process.exit(0);
