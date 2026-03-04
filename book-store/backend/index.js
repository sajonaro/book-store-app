import express from "express";
import mongoose from "mongoose";
import booksRoute from './routes/booksRoute.js';
import dotenv from 'dotenv';
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import mongoSanitize from "express-mongo-sanitize";

dotenv.config();

const PORT = process.env.PORT || 5555;
const mongoDBURL = process.env.mongoDBURL;

if (!mongoDBURL) {
    console.error('FATAL: mongoDBURL environment variable is not set');
    process.exit(1);
}

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

// NoSQL injection prevention — strips $ and . from user input
app.use(mongoSanitize());

// Routes
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

mongoose
    .connect(mongoDBURL)
    .then(() => {
        console.log('App connected to database');
        app.listen(PORT, () => {
            console.log(`App is listening on port: ${PORT}`);
        });
    })
    .catch((error) => {
        console.error('Failed to connect to database:', error.message);
        process.exit(1);
    });
