import { Booking, User, Bus, Route, Schedule } from '../data/db.js';
import { asyncHandler, enrichBooking } from '../utils/helpers.js';

// GET /api/admin/dashboard  (admin) — headline stats + chart series + recent bookings
export const getDashboard = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate({ path: 'scheduleId', populate: ['busId', 'routeId'] })
    .sort({ createdAt: -1 });

  const confirmed = bookings.filter((b) => b.status === 'confirmed');
  const totalRevenue = confirmed.reduce((sum, b) => sum + b.totalAmount, 0);

  // Revenue grouped by month label (months present in data).
  const monthOrder = [];
  const byMonth = {};
  confirmed.forEach((b) => {
    const d = new Date(b.createdAt);
    const label = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });
    if (!(label in byMonth)) {
      byMonth[label] = 0;
      monthOrder.push({ label, ts: d.getFullYear() * 12 + d.getMonth() });
    }
    byMonth[label] += b.totalAmount;
  });
  const revenueByMonth = monthOrder
    .sort((a, b) => a.ts - b.ts)
    .map(({ label }) => ({ month: label, revenue: byMonth[label] }));

  const [totalUsers, totalBuses, totalRoutes, totalSchedules] = await Promise.all([
    User.countDocuments(),
    Bus.countDocuments(),
    Route.countDocuments(),
    Schedule.countDocuments(),
  ]);

  const stats = {
    totalUsers,
    totalBuses,
    totalRoutes,
    totalSchedules,
    totalBookings: bookings.length,
    confirmedBookings: confirmed.length,
    cancelledBookings: bookings.filter((b) => b.status === 'cancelled').length,
    totalRevenue,
  };

  // Recent 5 bookings, each with a lightweight user attached.
  const recent = bookings.slice(0, 5);
  const recentUserIds = [...new Set(recent.map((b) => String(b.userId)))];
  const recentUsers = await User.find({ _id: { $in: recentUserIds } });
  const userMap = new Map(recentUsers.map((u) => [String(u._id), u]));
  const recentBookings = recent.map((b) => {
    const user = userMap.get(String(b.userId));
    return { ...enrichBooking(b), user: user ? { id: user.id, name: user.name, email: user.email } : null };
  });

  res.json({ stats, revenueByMonth, recentBookings });
});

// GET /api/admin/notifications  (admin) — activity feed synthesized from stored data
export const getNotifications = asyncHandler(async (req, res) => {
  const items = [];

  const bookings = await Booking.find().sort({ createdAt: -1 });
  const bookingUserIds = [...new Set(bookings.map((b) => String(b.userId)))];
  const bookingUsers = await User.find({ _id: { $in: bookingUserIds } });
  const userMap = new Map(bookingUsers.map((u) => [String(u._id), u]));

  bookings.forEach((b) => {
    const user = userMap.get(String(b.userId));
    const who = user?.name || 'A customer';
    const trip = `${b.source || '—'} → ${b.destination || '—'}`;
    if (b.status === 'cancelled') {
      items.push({
        id: `cancel-${b.id}`,
        type: 'cancellation',
        title: 'Booking cancelled',
        message: `${who} cancelled ${trip}`,
        createdAt: b.createdAt,
      });
    } else {
      items.push({
        id: `booking-${b.id}`,
        type: 'booking',
        title: 'New booking',
        message: `${who} booked ${trip} · ₹${b.totalAmount}`,
        createdAt: b.createdAt,
      });
    }
  });

  const customers = await User.find({ role: 'user' });
  customers.forEach((u) => {
    items.push({
      id: `user-${u.id}`,
      type: 'user',
      title: 'New user registered',
      message: `${u.name} (${u.email})`,
      createdAt: u.createdAt,
    });
  });

  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json({ notifications: items.slice(0, 25) });
});
