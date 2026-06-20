import bcrypt from 'bcryptjs';
import { User, OTP } from '../data/db.js';
import { asyncHandler, ApiError, publicUser } from '../utils/helpers.js';
import { signToken } from '../middleware/auth.js';

const genOtp = () => String(Math.floor(100000 + Math.random() * 900000));

const setOtp = async (email, purpose) => {
  const code = genOtp();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await OTP.deleteMany({ email, purpose });
  await OTP.create({ email, code, purpose, expiresAt });
  console.log(`[OTP] ${purpose} code for ${email}: ${code}`);
  return code;
};

const consumeOtp = async (email, code, purpose) => {
  const otp = await OTP.findOne({ email, purpose });
  if (!otp) throw new ApiError(400, 'No OTP requested. Please try again.');
  if (otp.expiresAt < new Date()) throw new ApiError(400, 'OTP has expired. Request a new one.');
  if (otp.code !== String(code)) throw new ApiError(400, 'Incorrect OTP.');
  await OTP.deleteOne({ _id: otp._id });
};

// POST /api/auth/register
export const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (!name || !email || !password) throw new ApiError(400, 'Name, email and password are required');
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
  const exists = await User.findOne({ email: email.toLowerCase() });
  if (exists) throw new ApiError(409, 'An account with that email already exists');

  const user = await User.create({
    name,
    email: email.toLowerCase(),
    phone: phone || '',
    password: bcrypt.hashSync(password, 10),
    role: 'user',
    isVerified: false,
  });
  const otp = await setOtp(user.email, 'verify');
  res.status(201).json({
    message: 'Registered. Verify the OTP sent to your email.',
    email: user.email,
    devOtp: otp,
  });
});

// POST /api/auth/verify-otp
export const verifyOtp = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) throw new ApiError(400, 'Email and OTP are required');
  await consumeOtp(email.toLowerCase(), otp, 'verify');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(404, 'User not found');
  user.isVerified = true;
  await user.save();
  const token = signToken(user);
  res.json({ message: 'Account verified', token, user: publicUser(user) });
});

// POST /api/auth/resend-otp
export const resendOtp = asyncHandler(async (req, res) => {
  const { email, purpose = 'verify' } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(404, 'User not found');
  const otp = await setOtp(user.email, purpose);
  res.json({ message: 'OTP resent', email: user.email, devOtp: otp });
});

// POST /api/auth/login
export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw new ApiError(400, 'Email and password are required');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user || !bcrypt.compareSync(password, user.password))
    throw new ApiError(401, 'Invalid email or password');
  if (!user.isVerified) {
    const otp = await setOtp(user.email, 'verify');
    return res.status(403).json({
      message: 'Account not verified. A new OTP has been sent.',
      needsVerification: true,
      email: user.email,
      devOtp: otp,
    });
  }
  const token = signToken(user);
  res.json({ message: 'Logged in', token, user: publicUser(user) });
});

// POST /api/auth/forgot-password
export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) throw new ApiError(400, 'Email is required');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) return res.json({ message: 'If that account exists, an OTP has been sent.' });
  const otp = await setOtp(user.email, 'reset');
  res.json({ message: 'OTP sent to reset your password', email: user.email, devOtp: otp });
});

// POST /api/auth/reset-password
export const resetPassword = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) throw new ApiError(400, 'Email, OTP and new password are required');
  if (password.length < 6) throw new ApiError(400, 'Password must be at least 6 characters');
  await consumeOtp(email.toLowerCase(), otp, 'reset');
  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new ApiError(404, 'User not found');
  user.password = bcrypt.hashSync(password, 10);
  await user.save();
  res.json({ message: 'Password reset successful. You can now log in.' });
});

// GET /api/auth/me
export const me = asyncHandler(async (req, res) => {
  res.json({ user: req.user });
});

// GET /api/auth/google/callback — called by Passport after Google approves
export const googleCallback = (req, res) => {
  const { token, user } = req.user; // set by passport strategy done()
  const CLIENT_URL = process.env.CLIENT_ORIGIN || 'http://localhost:5173';
  res.redirect(
    `${CLIENT_URL}/auth/google/success?token=${token}` +
    `&name=${encodeURIComponent(user.name)}` +
    `&email=${encodeURIComponent(user.email)}` +
    `&role=${user.role}`
  );
};
