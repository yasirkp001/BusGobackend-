import { Bus, Schedule } from '../data/db.js';
import { asyncHandler, ApiError } from '../utils/helpers.js';
import { emit } from '../utils/socket.js';

// GET /api/buses
export const listBuses = asyncHandler(async (req, res) => {
  const buses = await Bus.find();
  res.json({ buses });
});

// GET /api/buses/:id
export const getBus = asyncHandler(async (req, res) => {
  const bus = await Bus.findById(req.params.id);
  if (!bus) throw new ApiError(404, 'Bus not found');
  res.json({ bus });
});

// POST /api/buses  (admin)
export const createBus = asyncHandler(async (req, res) => {
  const { name, busNumber, type, operator, totalSeats, rating, amenities } = req.body;
  if (!name || !type || !totalSeats) throw new ApiError(400, 'name, type and totalSeats are required');
  const seatsNum = Number(totalSeats);
  if (!Number.isInteger(seatsNum) || seatsNum < 1 || seatsNum > 100)
    throw new ApiError(400, 'totalSeats must be a whole number between 1 and 100');
  const bus = await Bus.create({
    name,
    busNumber: busNumber || `KA-${Date.now() % 1000 + 1000}`,
    type,
    operator: operator || name,
    totalSeats: seatsNum,
    rating: rating ? Number(rating) : 4.0,
    amenities: Array.isArray(amenities) ? amenities : [],
  });
  emit('bus:created', { bus });
  res.status(201).json({ bus });
});

// PUT /api/buses/:id  (admin)
export const updateBus = asyncHandler(async (req, res) => {
  const { name, busNumber, type, operator, totalSeats, rating, amenities } = req.body;
  const bus = await Bus.findByIdAndUpdate(
    req.params.id,
    {
      ...(name !== undefined && { name }),
      ...(busNumber !== undefined && { busNumber }),
      ...(type !== undefined && { type }),
      ...(operator !== undefined && { operator }),
      ...(totalSeats !== undefined && { totalSeats: Number(totalSeats) }),
      ...(rating !== undefined && { rating: Number(rating) }),
      ...(amenities !== undefined && { amenities }),
    },
    { new: true }
  );
  if (!bus) throw new ApiError(404, 'Bus not found');
  emit('bus:updated', { bus });
  res.json({ bus });
});

// DELETE /api/buses/:id  (admin)
export const deleteBus = asyncHandler(async (req, res) => {
  const bus = await Bus.findByIdAndDelete(req.params.id);
  if (!bus) throw new ApiError(404, 'Bus not found');
  await Schedule.deleteMany({ busId: bus._id });
  emit('bus:deleted', { id: bus.id });   // string id, not ObjectId
  res.json({ message: 'Bus deleted' });
});
