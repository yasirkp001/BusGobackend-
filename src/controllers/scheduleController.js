import { Schedule, Bus, Route } from '../data/db.js';
import { asyncHandler, ApiError, enrichSchedule, addHoursToTime } from '../utils/helpers.js';
import { emit } from '../utils/socket.js';

// GET /api/schedules?source=&destination=&date=&type=&sort=
export const searchSchedules = asyncHandler(async (req, res) => {
  const { source, destination, date, type, sort } = req.query;

  // Default to today if no date provided; never return past schedules
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = today.toISOString().slice(0, 10);
  const filterDate = date || todayStr;

  let query = { date: { $gte: filterDate } };
  // If a specific date was requested, pin exactly to that date
  if (date) query = { date };

  let schedules = await Schedule.find(query).populate('busId routeId');

  if (source) schedules = schedules.filter((s) => s.routeId?.source?.toLowerCase() === source.toLowerCase());
  if (destination) schedules = schedules.filter((s) => s.routeId?.destination?.toLowerCase() === destination.toLowerCase());
  if (type) schedules = schedules.filter((s) => s.busId?.type === type);

  switch (sort) {
    case 'price_asc':
      schedules.sort((a, b) => a.fare - b.fare);
      break;
    case 'price_desc':
      schedules.sort((a, b) => b.fare - a.fare);
      break;
    case 'rating':
      schedules.sort((a, b) => (b.busId?.rating || 0) - (a.busId?.rating || 0));
      break;
    case 'departure':
    default:
      schedules.sort((a, b) => `${a.date} ${a.departureTime}`.localeCompare(`${b.date} ${b.departureTime}`));
  }

  const results = schedules.map(enrichSchedule);
  res.json({ count: results.length, schedules: results });
});

// GET /api/schedules/:id
export const getSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findById(req.params.id).populate('busId routeId');
  if (!schedule) throw new ApiError(404, 'Schedule not found');
  res.json({ schedule: enrichSchedule(schedule) });
});

// GET /api/schedules (admin) — raw list, enriched
export const listSchedules = asyncHandler(async (req, res) => {
  const schedules = await Schedule.find().populate('busId routeId');
  res.json({ schedules: schedules.map(enrichSchedule) });
});

// POST /api/schedules (admin)
export const createSchedule = asyncHandler(async (req, res) => {
  const { busId, routeId, date, departureTime, arrivalTime, fare } = req.body;
  const bus = await Bus.findById(busId);
  const route = await Route.findById(routeId);
  if (!bus || !route) throw new ApiError(400, 'Valid busId and routeId are required');
  if (!date || !departureTime) throw new ApiError(400, 'date and departureTime are required');

  // Compute arrival from route duration if not explicitly provided
  const arrival = arrivalTime
    ? { time: arrivalTime, dayOffset: 0 }
    : addHoursToTime(departureTime, route.durationHours);

  const schedule = await Schedule.create({
    busId,
    routeId,
    date,
    departureTime,
    arrivalTime: arrival.time,
    arrivalDayOffset: arrival.dayOffset,
    durationHours: route.durationHours,
    fare: Number(fare) || route.baseFare,
    totalSeats: bus.totalSeats,
    bookedSeats: [],
  });
  const populated = await schedule.populate('busId routeId');
  emit('schedule:created', { schedule: enrichSchedule(populated) });
  res.status(201).json({ schedule: enrichSchedule(populated) });
});

// PUT /api/schedules/:id (admin)
export const updateSchedule = asyncHandler(async (req, res) => {
  const { date, departureTime, arrivalTime, fare } = req.body;
  const schedule = await Schedule.findByIdAndUpdate(
    req.params.id,
    {
      ...(date !== undefined && { date }),
      ...(departureTime !== undefined && { departureTime }),
      ...(arrivalTime !== undefined && { arrivalTime }),
      ...(fare !== undefined && { fare: Number(fare) }),
    },
    { new: true }
  ).populate('busId routeId');
  if (!schedule) throw new ApiError(404, 'Schedule not found');
  emit('schedule:updated', { schedule: enrichSchedule(schedule) });
  res.json({ schedule: enrichSchedule(schedule) });
});

// DELETE /api/schedules/:id (admin)
export const deleteSchedule = asyncHandler(async (req, res) => {
  const schedule = await Schedule.findByIdAndDelete(req.params.id);
  if (!schedule) throw new ApiError(404, 'Schedule not found');
  emit('schedule:deleted', { id: schedule.id });   // string id, not ObjectId
  res.json({ message: 'Schedule deleted' });
});
