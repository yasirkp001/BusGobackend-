import { Router } from 'express';
import {
  listRoutes,
  listCities,
  createRoute,
  updateRoute,
  deleteRoute,
} from '../controllers/routeController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.get('/', listRoutes);
router.get('/cities', listCities);
router.post('/', protect, adminOnly, createRoute);
router.put('/:id', protect, adminOnly, updateRoute);
router.delete('/:id', protect, adminOnly, deleteRoute);

export default router;
