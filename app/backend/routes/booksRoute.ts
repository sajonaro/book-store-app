import express, { Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { BookModel } from '../models/bookModel';
import { isValidUUID, sanitizeBook, validateBookFields } from '../middleware/validate';
import { indexBook, removeBook as removeBookFromIndex, searchBooks } from '../services/searchService';

const router = express.Router();

// In-memory multer storage (images are forwarded to ai-api, not persisted)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB max per file
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
    },
});

// Stricter rate limit for AI recognition — 10 requests / minute per IP
const recognizeLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: { msg: 'Too many recognition requests, please try again later.' },
});

// POST /books/recognize — upload one or more book photos → extract metadata via AI
router.post('/recognize', recognizeLimiter, upload.array('photos', 10), async (req: Request, res: Response) => {
    try {
        const files = req.files as Express.Multer.File[] | undefined;
        if (!files || files.length === 0) {
            return res.status(400).json({ msg: 'At least one photo is required (field name: photos)' });
        }

        const AI_API_URL = (process.env.AI_API_URL || 'http://ai-api:8000').replace(/\/$/, '');

        const form = new FormData();
        for (const file of files) {
            const blob = new Blob([file.buffer], { type: file.mimetype });
            form.append('photos', blob, file.originalname || 'photo.jpg');
        }

        const aiRes = await fetch(`${AI_API_URL}/recognize`, {
            method: 'POST',
            body: form,
        });

        if (!aiRes.ok) {
            const errText = await aiRes.text();
            console.error('ai-api /recognize error:', errText);
            return res.status(502).json({ msg: 'AI recognition service returned an error' });
        }

        const aiData = await aiRes.json() as { data?: Record<string, unknown>; cover_thumbnail?: string };

        const meta = (aiData?.data ?? {}) as { isbn?: string; title?: string; author?: string };
        const existing = await BookModel.findByIdentity({
            isbn:   meta.isbn   || null,
            title:  meta.title  || null,
            author: meta.author || null,
        });

        if (existing) {
            const updated = await BookModel.incrementStockAndPatch(existing.id, {
                isbn: meta.isbn || null,
            });
            return res.status(200).json({
                ...aiData,
                duplicate: true,
                existing_book: updated,
            });
        }

        return res.status(200).json(aiData);
    } catch (error: unknown) {
        console.error('recognize error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error during book recognition' });
    }
});

// POST /books — create a new book
router.post('/', async (req: Request, res: Response) => {
    try {
        const fields = sanitizeBook(req.body as Record<string, unknown>);
        const validationError = validateBookFields(fields);
        if (validationError) {
            return res.status(400).json({ msg: validationError });
        }

        const book = await BookModel.create(fields as Parameters<typeof BookModel.create>[0]);
        await indexBook(book);
        return res.status(201).json({ data: book });
    } catch (error: unknown) {
        console.error((error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// GET /books — list all books, or search via ?q=
router.get('/', async (req: Request, res: Response) => {
    try {
        const { q } = req.query as { q?: string };

        if (q && q.trim()) {
            const ids = await searchBooks(q.trim());

            if (ids === null) {
                const books = await BookModel.findAll();
                const term = q.trim().toLowerCase();
                const found = books.filter(
                    (b) =>
                        b.title.toLowerCase().includes(term) ||
                        b.author.toLowerCase().includes(term),
                );
                return res.status(200).json({ count: found.length, data: found });
            }

            if (!ids.length) {
                return res.status(200).json({ count: 0, data: [] });
            }

            const books = await Promise.all(ids.map((id) => BookModel.findById(id)));
            const found = books.filter(Boolean);
            return res.status(200).json({ count: found.length, data: found });
        }

        const books = await BookModel.findAll();
        return res.status(200).json({ count: books.length, data: books });
    } catch (error: unknown) {
        console.error((error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// GET /books/:id — get a single book
router.get('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const book = await BookModel.findById(id);
        if (!book) {
            return res.status(404).json({ msg: 'Book not found' });
        }

        return res.status(200).json({ data: book });
    } catch (error: unknown) {
        console.error((error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// PUT /books/:id — update a book
router.put('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const fields = sanitizeBook(req.body as Record<string, unknown>);
        const validationError = validateBookFields(fields);
        if (validationError) {
            return res.status(400).json({ msg: validationError });
        }

        const updated = await BookModel.update(id, fields as Parameters<typeof BookModel.update>[1]);
        if (!updated) {
            return res.status(404).json({ msg: 'Book not found' });
        }

        await indexBook(updated);
        return res.status(200).json({ msg: 'Book updated successfully' });
    } catch (error: unknown) {
        console.error((error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// DELETE /books/:id — delete a book
router.delete('/:id', async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const deleted = await BookModel.remove(id);
        if (!deleted) {
            return res.status(404).json({ msg: 'Book not found' });
        }

        await removeBookFromIndex(id);
        return res.status(200).json({ msg: 'Book deleted successfully' });
    } catch (error: unknown) {
        console.error((error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

export default router;
