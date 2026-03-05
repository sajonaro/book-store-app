import express from 'express';
import booksRoute from './routes/booksRoute.js';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { initDB } from './models/bookModel.js';
import { UserModel } from './models/userModel.js';
import { initIndex } from './services/searchService.js';
import authRoute from './routes/authRoute.js';

dotenv.config();

const PORT = process.env.PORT || 5555;

const app = express();

// Security headers
app.use(helmet());

// CORS — restrict to allowed origins via env var (comma-separated list)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, server-to-server)
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error('Not allowed by CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type'],
}));

// Rate limiting — 100 requests per 15 minutes per IP
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Too many requests, please try again later.' },
});
app.use(limiter);

// Body parsing with payload size limit to prevent DoS
app.use(express.json({ limit: '10kb' }));

// Routes
app.use('/auth', authRoute);
app.use('/books', booksRoute);

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ msg: 'Route not found' });
});

// Global error handler — never expose stack traces in production
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
    console.error(err.stack);
    const statusCode = err.status || 500;
    const message =
        process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(statusCode).json({ msg: message });
});

// Initialize DB, then Elasticsearch (best-effort), then start server
async function start() {
    try {
    await initDB();
    await UserModel.initUsers();
  } catch (err) {
    console.error('FATAL: Failed to initialize database:', err.message);
    process.exit(1);
  }

    // Elasticsearch init is best-effort — don't block startup
    initIndex().catch((err) => {
        console.warn('Elasticsearch initialization failed (continuing without it):', err.message);
    });

    app.listen(PORT, () => {
        console.log(`App is listening on port: ${PORT}`);
    });
}

start();
