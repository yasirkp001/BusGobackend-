import 'dotenv/config';
import { createServer } from 'http';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import passport from 'passport';

import { connectDB, User, Bus, Route, Schedule, Booking } from './data/db.js';
import { seedDatabase } from './data/seed.js';
import { notFound, errorHandler } from './middleware/errorHandler.js';
import { initSocket } from './utils/socket.js';
import { initPassport } from './config/passport.js';

import authRoutes from './routes/authRoutes.js';
import busRoutes from './routes/busRoutes.js';
import routeRoutes from './routes/routeRoutes.js';
import scheduleRoutes from './routes/scheduleRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import userRoutes from './routes/userRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import paymentRoutes from './routes/paymentRoutes.js';

const app = express();
const httpServer = createServer(app);
const PORT = process.env.PORT || 5000;

// Connect to MongoDB and seed on boot
await connectDB();
await seedDatabase();

const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(',').map((o) => o.trim())
  : process.env.CLIENT_ORIGIN
    ? [process.env.CLIENT_ORIGIN, process.env.ADMIN_ORIGIN].filter(Boolean)
    : true;

// Explicit CORS handler — must be before all routes so preflight OPTIONS
// requests are answered correctly from any origin in the allow-list.
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, mobile apps, Render health checks)
    if (!origin) return callback(null, true);
    if (allowedOrigins === true) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Respond to all preflight OPTIONS requests immediately
app.options('*', cors());
app.use(express.json());
app.use(morgan('dev'));

// Initialize Passport (Google OAuth)
initPassport();
app.use(passport.initialize());

// Attach Socket.IO to the HTTP server
initSocket(httpServer, allowedOrigins);

app.get('/', (req, res) => {
  res.json({ name: 'BusGo API', version: '1.0.0', status: 'running', docs: '/api/health' });
});

app.get('/api/health', async (req, res) => {
  try {
    const counts = {
      users: await User.countDocuments(),
      buses: await Bus.countDocuments(),
      routes: await Route.countDocuments(),
      schedules: await Schedule.countDocuments(),
      bookings: await Booking.countDocuments(),
    };
    res.json({ status: 'ok', uptime: process.uptime(), counts });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/buses', busRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/schedules', scheduleRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/payment', paymentRoutes);

app.use(notFound);
app.use(errorHandler);

httpServer.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`\n✗ Port ${PORT} is already in use.`);
    console.error(`  Run this to free it:  lsof -ti :${PORT} | xargs kill -9`);
    console.error(`  Or set a different port:  PORT=5001 npm run dev\n`);
    process.exit(1);
  } else {
    throw err;
  }
});

httpServer.listen(PORT, () => {
  console.log(`\n🚌  Bus Booking API  →  http://localhost:${PORT}`);
  console.log('   Demo accounts:');
  console.log('     admin@demo.com / Admin@123');
  console.log('     user@demo.com  / User@123\n');
});
