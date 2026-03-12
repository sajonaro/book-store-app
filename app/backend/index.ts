import express, { Request, Response, NextFunction } from 'express';
import booksRoute from './routes/booksRoute';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { UserModel } from './models/userModel';
import { initIndex } from './services/searchService';
import authRoute from './routes/authRoute';

dotenv.config();

const PORT = process.env.PORT || 5555;

const app = express();

// Trust the first proxy (nginx) so express-rate-limit can read the real IP
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — restrict to allowed origins via env var (comma-separated list)
const allowedOrigins = process.env.ALLOWED_ORIGINS
    ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
    : ['http://localhost:5173', 'http://localhost:3000'];

app.use(cors({
    origin: (origin, callback) => {
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

// Body parsing with payload size limit — 5 MB to allow base64 cover thumbnails in JSON
app.use(express.json({ limit: '5mb' }));

// Routes
app.use('/auth', authRoute);
app.use('/books', booksRoute);

// 404 handler
app.use((_req: Request, res: Response) => {
    res.status(404).json({ msg: 'Route not found' });
});

// Global error handler — never expose stack traces in production
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error & { status?: number }, _req: Request, res: Response, _next: NextFunction) => {
    console.error(err.stack);
    const statusCode = err.status || 500;
    const message =
        process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
    res.status(statusCode).json({ msg: message });
});

async function start(): Promise<void> {
    try {
        await UserModel.seedDefaultAdmin();
    } catch (err: unknown) {
        console.error('FATAL: Failed to seed default admin:', (err as Error).message);
        process.exit(1);
    }

    initIndex().catch((err: unknown) => {
        console.warn('Elasticsearch initialization failed (continuing without it):', (err as Error).message);
    });

    app.listen(PORT, () => {
        console.log(`App is listening on port: ${PORT}`);
    });
}

start();
