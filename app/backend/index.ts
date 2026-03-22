import express, { Request, Response, NextFunction } from 'express';
import booksRoute from './routes/booksRoute';
import tenantRoute from './routes/tenantRoute';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import { initIndex } from './services/searchService';
import authRoute from './routes/authRoute';
import superuserRoute from './routes/superuserRoute';
import { UserModel } from './models/userModel';

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
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Note: auth-specific rate limits are applied per-route in authRoute.ts
// No global rate limiter — the app is self-hosted with a small number of users.

// Body parsing with payload size limit — 5 MB to allow base64 cover thumbnails in JSON
app.use(express.json({ limit: '5mb' }));

// Health check — public, no auth required
app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ status: 'ok' });
});

// Routes
app.use('/auth', authRoute);
app.use('/books', booksRoute);
app.use('/tenant', tenantRoute);
app.use('/superuser', superuserRoute);

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

/**
 * Seed the default superuser on first start.
 * Reads SUPERUSER_EMAIL, SUPERUSER_PASSWORD, SUPERUSER_NAME from env.
 * Only creates the superuser when none exists yet.
 */
async function seedSuperuser(): Promise<void> {
    const email    = process.env.SUPERUSER_EMAIL;
    const password = process.env.SUPERUSER_PASSWORD;
    const name     = process.env.SUPERUSER_NAME || 'System Admin';

    if (!email || !password) {
        console.warn(
            'SUPERUSER_EMAIL / SUPERUSER_PASSWORD not set — skipping superuser seed. ' +
            'Set these env vars to create the initial system-admin account.',
        );
        return;
    }

    try {
        const exists = await UserModel.superuserExists();
        if (exists) {
            console.log('Superuser already exists — skipping seed.');
            return;
        }
        await UserModel.createSuperuser(name, email, password);
        console.log(`Superuser created: ${email}`);
    } catch (err: unknown) {
        console.error('Failed to seed superuser:', (err as Error).message);
    }
}

async function start(): Promise<void> {
    initIndex().catch((err: unknown) => {
        console.warn('Elasticsearch initialization failed (continuing without it):', (err as Error).message);
    });

    await seedSuperuser();

    app.listen(PORT, () => {
        console.log(`App is listening on port: ${PORT}`);
    });
}

start();
