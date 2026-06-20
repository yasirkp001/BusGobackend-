import { Router } from 'express';
import { listBuses, getBus, createBus, updateBus, deleteBus } from '../controllers/busController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', listBuses);
router.get('/:id', getBus);
router.post('/', protect, adminOnly, createBus);
router.put('/:id', protect, adminOnly, updateBus);
router.delete('/:id', protect, adminOnly, deleteBus);

export default router;
