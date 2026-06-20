import { Router } from 'express';
import { getDashboard, getNotifications } from '../controllers/dashboardController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/dashboard', protect, adminOnly, getDashboard);
router.get('/notifications', protect, adminOnly, getNotifications);

export default router;
