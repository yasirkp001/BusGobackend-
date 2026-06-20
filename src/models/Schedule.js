import mongoose from 'mongoose';
import { baseSchemaOptions } from './schemaOptions.js';

const scheduleSchema = new mongoose.Schema({
  busId: { type: mongoose.Schema.Types.ObjectId, ref: 'Bus', required: true },
  routeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Route', required: true },
  date: { type: String, required: true },
  departureTime: { type: String, required: true },
  arrivalTime: { type: String, default: '' },
  arrivalDayOffset: { type: Number, default: 0 },
  durationHours: { type: Number, default: 0 },
  fare: { type: Number, required: true },
  totalSeats: { type: Number, required: true },
  bookedSeats: [String],
  createdAt: { type: Date, default: Date.now },
}, baseSchemaOptions);

export default mongoose.model('Schedule', scheduleSchema);
