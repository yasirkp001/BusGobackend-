import { Router } from 'express';
import {
  createBooking,
  myBookings,
  getBooking,
  cancelBooking,
  listBookings,
} from '../controllers/bookingController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.post('/', protect, createBooking);
router.get('/my', protect, myBookings);
router.get('/', protect, adminOnly, listBookings);
router.get('/:id', protect, getBooking);
router.put('/:id/cancel', protect, cancelBooking);

export default router;
