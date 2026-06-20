import { randomUUID } from 'crypto';

/** Short unique id — used for demo payment order ids. */
export const uid = () => randomUUID();

/** Wrap async route handlers so thrown errors hit the error middleware. */
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

/** Throwable error carrying an HTTP status code. */
export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
  }
}

/** Strip the password before sending a user to the client. */
export const publicUser = (user) => {
  if (!user) return null;
  const obj = user.toObject ? user.toObject() : user;
  const { password, ...rest } = obj;
  return rest;
};

/**
 * Reshape a schedule for the client: surface the populated bus/route under the
 * `bus`/`route` keys the frontend reads, keep `busId`/`routeId` as plain id
 * strings, and add seat availability. Accepts a Mongoose doc or a plain object.
 */
export const enrichSchedule = (schedule) => {
  if (!schedule) return null;
  const obj = schedule.toObject ? schedule.toObject() : { ...schedule };
  // A populated ref is an object carrying its own fields; an unpopulated one is
  // just an id. Detect by a required domain field.
  const bus = obj.busId && obj.busId.name ? obj.busId : null;
  const route = obj.routeId && obj.routeId.source ? obj.routeId : null;
  return {
    ...obj,
    bus,
    route,
    busId: bus ? bus.id : obj.busId,
    routeId: route ? route.id : obj.routeId,
    availableSeats: obj.totalSeats - (obj.bookedSeats?.length || 0),
  };
};

/** Reshape a booking for the client: surface the populated schedule under `schedule`. */
export const enrichBooking = (booking) => {
  if (!booking) return null;
  const obj = booking.toObject ? booking.toObject() : { ...booking };
  const schedule =
    obj.scheduleId && obj.scheduleId.departureTime ? enrichSchedule(obj.scheduleId) : null;
  return {
    ...obj,
    schedule,
    scheduleId: schedule ? schedule.id : obj.scheduleId,
  };
};

const pad = (n) => String(n).padStart(2, '0');

export const addHoursToTime = (time, hours) => {
  const [h, m] = time.split(':').map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const nh = Math.floor((total % (24 * 60)) / 60);
  const nm = total % 60;
  const dayOffset = Math.floor(total / (24 * 60));
  return { time: `${pad(nh)}:${pad(nm)}`, dayOffset };
};

