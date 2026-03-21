import express, { Request, Response } from 'express';
import multer from 'multer';
import rateLimit from 'express-rate-limit';
import { BookModel } from '../models/bookModel';
import { TenantModel } from '../models/tenantModel';
import { isValidUUID, sanitizeBook, validateBookFields } from '../middleware/validate';
import { indexBook, removeBook as removeBookFromIndex, searchBooks } from '../services/searchService';
import { requireAuth } from '../middleware/auth';

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

// ── Admin routes (require authentication) ─────────────────────────────────────

// POST /books/recognize — upload one or more book photos → extract metadata via AI
router.post('/recognize', requireAuth, recognizeLimiter, upload.array('photos', 10), async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;
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

        // Pass the tenant's encrypted OpenAI key and the tenant ID to the AI service.
        // The AI service fetches the per-tenant encryption_key from the DB using the tenant ID,
        // then decrypts the ciphertext locally — plaintext API key never travels over any network link.
        const tenantRow = await TenantModel.findById(tenantId);
        const aiHeaders: Record<string, string> = { 'X-Tenant-Id': tenantId };
        if (tenantRow?.openai_api_key_enc) {
            aiHeaders['X-OpenAI-Api-Key-Enc'] = tenantRow.openai_api_key_enc;
        }

        const aiRes = await fetch(`${AI_API_URL}/recognize`, {
            method: 'POST',
            body: form,
            headers: aiHeaders,
        });

        if (!aiRes.ok) {
            const errText = await aiRes.text();
            console.error('ai-api /recognize error:', errText);
            return res.status(502).json({ msg: 'AI recognition service returned an error' });
        }

        const aiData = await aiRes.json() as { data?: Record<string, unknown>; cover_thumbnail?: string };

        const meta = (aiData?.data ?? {}) as { isbn?: string; title?: string; author?: string };
        const existing = await BookModel.findByIdentity(tenantId, {
            isbn:   meta.isbn   || null,
            title:  meta.title  || null,
            author: meta.author || null,
        });

        if (existing) {
            const updated = await BookModel.incrementStockAndPatch(existing.id, tenantId, {
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
router.post('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;
        const fields = sanitizeBook(req.body as Record<string, unknown>);
        const validationError = validateBookFields(fields);
        if (validationError) {
            return res.status(400).json({ msg: validationError });
        }

        const book = await BookModel.create(tenantId, fields as Parameters<typeof BookModel.create>[1]);
        await indexBook(book);
        return res.status(201).json({ data: book });
    } catch (error: unknown) {
        console.error((error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// GET /books — list all books for this tenant (or ALL books for superusers), or search via ?q=
router.get('/', requireAuth, async (req: Request, res: Response) => {
    try {
        const { q } = req.query as { q?: string };

        // ── Superuser: cross-tenant view ────────────────────────────────────
        if (req.isSuperuser) {
            const allBooks = await BookModel.findAllCrossTenant();

            if (q && q.trim()) {
                const term = q.trim().toLowerCase();
                const found = allBooks.filter(
                    (b) =>
                        b.title.toLowerCase().includes(term) ||
                        b.author.toLowerCase().includes(term) ||
                        b.store_name.toLowerCase().includes(term),
                );
                return res.status(200).json({ count: found.length, data: found });
            }

            return res.status(200).json({ count: allBooks.length, data: allBooks });
        }

        // ── Tenant admin: scoped to their tenant ────────────────────────────
        const tenantId = req.tenantId!;

        if (q && q.trim()) {
            const ids = await searchBooks(q.trim(), tenantId);

            if (ids === null) {
                const books = await BookModel.findAll(tenantId);
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

            const books = await Promise.all(ids.map((id) => BookModel.findById(id, tenantId)));
            const found = books.filter(Boolean);
            return res.status(200).json({ count: found.length, data: found });
        }

        const books = await BookModel.findAll(tenantId);
        return res.status(200).json({ count: books.length, data: books });
    } catch (error: unknown) {
        console.error((error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// GET /books/:id — get a single book
router.get('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        // Superuser: search across all tenants
        if (req.isSuperuser) {
            const allBooks = await BookModel.findAllCrossTenant();
            const book = allBooks.find((b) => b.id === id);
            if (!book) {
                return res.status(404).json({ msg: 'Book not found' });
            }
            return res.status(200).json({ data: book });
        }

        const tenantId = req.tenantId!;
        const book = await BookModel.findById(id, tenantId);
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
router.put('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const fields = sanitizeBook(req.body as Record<string, unknown>);
        const validationError = validateBookFields(fields);
        if (validationError) {
            return res.status(400).json({ msg: validationError });
        }

        const updated = await BookModel.update(id, tenantId, fields as Parameters<typeof BookModel.update>[2]);
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
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const deleted = await BookModel.remove(id, tenantId);
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
