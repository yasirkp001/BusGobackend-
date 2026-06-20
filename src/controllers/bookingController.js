import mongoose from 'mongoose';
import { Booking, Schedule, User } from '../data/db.js';
import { asyncHandler, ApiError, enrichBooking } from '../utils/helpers.js';
import { emit } from '../utils/socket.js';

// POST /api/bookings  (auth)
export const createBooking = asyncHandler(async (req, res) => {
  const { scheduleId, seats, passengers, contact, paymentId, orderId } = req.body;
  if (!scheduleId || !Array.isArray(seats) || seats.length === 0)
    throw new ApiError(400, 'scheduleId and at least one seat are required');

  // Populate route so we can read source/destination — the Schedule model
  // itself does not store those fields; they live on the referenced Route.
  const schedule = await Schedule.findById(scheduleId).populate('routeId');
  if (!schedule) throw new ApiError(404, 'Schedule not found');

  const clash = seats.filter((s) => schedule.bookedSeats.includes(String(s)));
  if (clash.length) throw new ApiError(409, `Seats already taken: ${clash.join(', ')}`);

  const source      = schedule.routeId?.source      || '';
  const destination = schedule.routeId?.destination || '';

  const booking = await Booking.create({
    userId: new mongoose.Types.ObjectId(req.user.id),
    scheduleId: new mongoose.Types.ObjectId(scheduleId),
    seats: seats.map(String),
    passengers: Array.isArray(passengers) ? passengers : [],
    contact: contact || { email: req.user.email, phone: req.user.phone },
    totalAmount: schedule.fare * seats.length,
    status: 'confirmed',
    paymentStatus: 'paid',
    paymentId: paymentId || null,
    orderId: orderId || null,
    journeyDate: schedule.date,
    source,
    destination,
  });

  schedule.bookedSeats = [...new Set([...schedule.bookedSeats, ...booking.seats])];
  await schedule.save();

  await booking.populate({ path: 'scheduleId', populate: ['busId', 'routeId'] });
  const user = await User.findById(req.user.id);
  const enriched = {
    ...enrichBooking(booking),
    user: user ? { id: user._id, name: user.name, email: user.email } : null,
  };

  emit('booking:new', enriched);
  res.status(201).json({ booking: enriched });
});

// GET /api/bookings/my  (auth)
export const myBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find({ userId: new mongoose.Types.ObjectId(req.user.id) })
    .populate({ path: 'scheduleId', populate: ['busId', 'routeId'] })
    .sort({ createdAt: -1 });
  res.json({ bookings: bookings.map(enrichBooking) });
});

// GET /api/bookings/:id  (auth — own booking, or admin)
export const getBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findById(req.params.id).populate({ path: 'scheduleId', populate: ['busId', 'routeId'] });
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (String(booking.userId) !== req.user.id && req.user.role !== 'admin')
    throw new ApiError(403, 'Not allowed to view this booking');
  res.json({ booking: enrichBooking(booking) });
});

// PUT /api/bookings/:id/cancel  (auth — own booking, or admin)
export const cancelBooking = asyncHandler(async (req, res) => {
  // Fetch without populating so booking.scheduleId stays a plain ObjectId,
  // which is needed for the Schedule.findById look-up below.
  const booking = await Booking.findById(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (String(booking.userId) !== req.user.id && req.user.role !== 'admin')
    throw new ApiError(403, 'Not allowed to cancel this booking');
  if (booking.status === 'cancelled') throw new ApiError(400, 'Booking already cancelled');

  booking.status = 'cancelled';
  booking.paymentStatus = 'refunded';
  await booking.save();

  // Free up the seats on the schedule
  const schedule = await Schedule.findById(booking.scheduleId);
  if (schedule) {
    schedule.bookedSeats = schedule.bookedSeats.filter((s) => !booking.seats.includes(s));
    await schedule.save();
  }

  // Re-fetch with population so enrichBooking has full nested data
  await booking.populate({ path: 'scheduleId', populate: ['busId', 'routeId'] });

  const user = await User.findById(booking.userId);
  const enriched = {
    ...enrichBooking(booking),
    user: user ? { id: user._id, name: user.name, email: user.email } : null,
  };

  emit('booking:cancelled', enriched);
  res.json({ booking: enriched });
});

// GET /api/bookings  (admin) — all bookings
export const listBookings = asyncHandler(async (req, res) => {
  const bookings = await Booking.find()
    .populate({ path: 'scheduleId', populate: ['busId', 'routeId'] })
    .sort({ createdAt: -1 });

  // Batch-load all users in one query instead of one query per booking
  const userIds = [...new Set(bookings.map((b) => String(b.userId)))];
  const users   = await User.find({ _id: { $in: userIds } });
  const userMap = new Map(users.map((u) => [String(u._id), u]));

  const result = bookings.map((b) => {
    const user = userMap.get(String(b.userId));
    return { ...enrichBooking(b), user: user ? { id: user._id, name: user.name, email: user.email } : null };
  });
  res.json({ bookings: result });
});
