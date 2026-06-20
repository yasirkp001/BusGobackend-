import { Route, Schedule } from '../data/db.js';
import { asyncHandler, ApiError } from '../utils/helpers.js';
import { emit } from '../utils/socket.js';

// GET /api/routes
export const listRoutes = asyncHandler(async (req, res) => {
  const routes = await Route.find();
  res.json({ routes });
});

// GET /api/routes/cities
export const listCities = asyncHandler(async (req, res) => {
  const routes = await Route.find();
  const cities = new Set();
  routes.forEach((r) => {
    cities.add(r.source);
    cities.add(r.destination);
  });
  res.json({ cities: [...cities].sort() });
});

// POST /api/routes  (admin)
export const createRoute = asyncHandler(async (req, res) => {
  const { source, destination, distanceKm, durationHours, baseFare } = req.body;
  if (!source || !destination) throw new ApiError(400, 'source and destination are required');
  const route = await Route.create({
    source,
    destination,
    distanceKm: Number(distanceKm) || 0,
    durationHours: Number(durationHours) || 0,
    baseFare: Number(baseFare) || 500,
  });
  emit('route:created', { route });
  res.status(201).json({ route });
});

// PUT /api/routes/:id  (admin)
export const updateRoute = asyncHandler(async (req, res) => {
  const { source, destination, distanceKm, durationHours, baseFare } = req.body;
  const route = await Route.findByIdAndUpdate(
    req.params.id,
    {
      ...(source !== undefined && { source }),
      ...(destination !== undefined && { destination }),
      ...(distanceKm !== undefined && { distanceKm: Number(distanceKm) }),
      ...(durationHours !== undefined && { durationHours: Number(durationHours) }),
      ...(baseFare !== undefined && { baseFare: Number(baseFare) }),
    },
    { new: true }
  );
  if (!route) throw new ApiError(404, 'Route not found');
  emit('route:updated', { route });
  res.json({ route });
});

// DELETE /api/routes/:id  (admin)
export const deleteRoute = asyncHandler(async (req, res) => {
  const route = await Route.findByIdAndDelete(req.params.id);
  if (!route) throw new ApiError(404, 'Route not found');
  await Schedule.deleteMany({ routeId: route._id });
  emit('route:deleted', { id: route.id });   // string id, not ObjectId
  res.json({ message: 'Route deleted' });
});
