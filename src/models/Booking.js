import mongoose from 'mongoose';
import { baseSchemaOptions } from './schemaOptions.js';

const bookingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduleId: { type: mongoose.Schema.Types.ObjectId, ref: 'Schedule', required: true },
  seats: [String],
  passengers: [
    {
      name: String,
      age: Number,
      gender: String,
      seat: String,
      _id: false,
    },
  ],
  contact: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  totalAmount: { type: Number, required: true },
  status: { type: String, enum: ['confirmed', 'cancelled'], default: 'confirmed' },
  paymentStatus: { type: String, enum: ['paid', 'refunded'], default: 'paid' },
  paymentId: String,
  orderId: String,
  journeyDate: String,
  source: String,
  destination: String,
  createdAt: { type: Date, default: Date.now },
}, baseSchemaOptions);

export default mongoose.model('Booking', bookingSchema);
