import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { User } from '../data/db.js';
import { ApiError, publicUser } from '../utils/helpers.js';

const SECRET = process.env.JWT_SECRET || 'super-secret-dev-key-change-me';

export const signToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, SECRET, { expiresIn: '7d' });

/** Require a valid bearer token; attaches req.user (without password). */
export const protect = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return next(new ApiError(401, 'Not authenticated'));

  let decoded;
  try {
    decoded = jwt.verify(token, SECRET);
  } catch {
    return next(new ApiError(401, 'Invalid or expired token'));
  }

  // Guard: token id must be a valid MongoDB ObjectId — reject UUIDs or
  // any other legacy ids that would cause a Mongoose CastError.
  if (!mongoose.isValidObjectId(decoded.id)) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }

  try {
    const user = await User.findById(decoded.id);
    if (!user) return next(new ApiError(401, 'User no longer exists'));
    req.user = publicUser(user);
    next();
  } catch (err) {
    next(err);
  }
};

/** Require the authenticated user to be an admin. Use after `protect`. */
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== 'admin') return next(new ApiError(403, 'Admin access required'));
  next();
};
