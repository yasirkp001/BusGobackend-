import mongoose from 'mongoose';
import { baseSchemaOptions } from './schemaOptions.js';

const busSchema = new mongoose.Schema({
  name: { type: String, required: true },
  busNumber: { type: String, required: true },
  type: { type: String, required: true },
  operator: { type: String, required: true },
  totalSeats: { type: Number, required: true, min: 1, max: 100 },
  rating: { type: Number, default: 4.0 },
  amenities: [String],
  createdAt: { type: Date, default: Date.now },
}, baseSchemaOptions);

export default mongoose.model('Bus', busSchema);
