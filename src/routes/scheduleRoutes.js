import { Router } from 'express';
import {
  searchSchedules,
  getSchedule,
  listSchedules,
  createSchedule,
  updateSchedule,
  deleteSchedule,
} from '../controllers/scheduleController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/search', searchSchedules);
router.get('/all', protect, adminOnly, listSchedules);
router.get('/:id', getSchedule);
router.post('/', protect, adminOnly, createSchedule);
router.put('/:id', protect, adminOnly, updateSchedule);
router.delete('/:id', protect, adminOnly, deleteSchedule);

export default router;
