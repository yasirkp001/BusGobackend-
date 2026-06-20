import { Router } from 'express';
import { updateProfile, listUsers, updateUserRole, deleteUser } from '../controllers/userController.js';
import { protect, adminOnly } from '../middleware/auth.js';

const router = Router();

router.put('/me', protect, updateProfile);
router.get('/', protect, adminOnly, listUsers);
router.put('/:id/role', protect, adminOnly, updateUserRole);
router.delete('/:id', protect, adminOnly, deleteUser);

export default router;
