import bcrypt from 'bcryptjs';
import { User } from './db.js';

/**
 * Ensures the admin account exists on every boot.
 * All dummy buses/routes/schedules/bookings have been removed.
 * To clear any remaining dummy data run:
 *   node src/data/clearDummyData.js
 */
export async function seedDatabase() {
  // Ensure admin account exists
  const existing = await User.findOne({ email: 'admin@demo.com' });
  if (!existing) {
    const adminPass = bcrypt.hashSync('Admin@123', 10);
    await User.create({
      name: 'Admin User',
      email: 'admin@demo.com',
      phone: '9000000000',
      password: adminPass,
      role: 'admin',
      isVerified: true,
    });
    console.log('✓ Admin account created (admin@demo.com / Admin@123)');
  }
}
