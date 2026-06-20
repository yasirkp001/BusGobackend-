import bcrypt from 'bcryptjs';
import { User, Booking } from '../data/db.js';
import { asyncHandler, ApiError, publicUser } from '../utils/helpers.js';

// PUT /api/users/me  (auth) — update own profile
export const updateProfile = asyncHandler(async (req, res) => {
  const { name, phone, password, currentPassword } = req.body;
  const updates = {};
  if (name !== undefined) updates.name = name;
  if (phone !== undefined) updates.phone = phone;
  if (password) {
    if (!currentPassword) throw new ApiError(400, 'Current password is required to set a new password');
    if (password.length < 6) throw new ApiError(400, 'New password must be at least 6 characters');
    // Verify current password against stored hash
    const existing = await User.findById(req.user.id);
    if (!existing || !bcrypt.compareSync(currentPassword, existing.password))
      throw new ApiError(401, 'Current password is incorrect');
    updates.password = bcrypt.hashSync(password, 10);
  }

  const user = await User.findByIdAndUpdate(req.user.id, updates, { new: true });
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user: publicUser(user) });
});

// GET /api/users  (admin) — all users with booking counts
export const listUsers = asyncHandler(async (req, res) => {
  const users = await User.find();

  // Batch-aggregate booking counts in one query instead of one query per user
  const counts = await Booking.aggregate([
    { $group: { _id: '$userId', count: { $sum: 1 } } },
  ]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));

  const result = users.map((u) => ({
    ...publicUser(u),
    bookingsCount: countMap.get(String(u._id)) || 0,
  }));
  res.json({ users: result });
});

// PUT /api/users/:id/role  (admin) — promote/demote
export const updateUserRole = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  if (String(user._id) === req.user.id) throw new ApiError(400, 'You cannot change your own role');
  const { role } = req.body;
  if (!['user', 'admin'].includes(role)) throw new ApiError(400, 'role must be user or admin');
  user.role = role;
  await user.save();
  res.json({ user: publicUser(user) });
});

// DELETE /api/users/:id  (admin)
export const deleteUser = asyncHandler(async (req, res) => {
  if (req.params.id === req.user.id) throw new ApiError(400, 'You cannot delete your own account');
  const user = await User.findByIdAndDelete(req.params.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ message: 'User deleted' });
});
