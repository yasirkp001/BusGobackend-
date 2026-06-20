import mongoose from 'mongoose';
import { baseSchemaOptions } from './schemaOptions.js';

const routeSchema = new mongoose.Schema({
  source: { type: String, required: true },
  destination: { type: String, required: true },
  distanceKm: { type: Number, default: 0 },
  durationHours: { type: Number, default: 0 },
  baseFare: { type: Number, default: 500 },
  createdAt: { type: Date, default: Date.now },
}, baseSchemaOptions);

export default mongoose.model('Route', routeSchema);
