import express, { Request, Response } from 'express';
import multer from 'multer';
import { TenantModel } from '../models/tenantModel';
import { BookModel } from '../models/bookModel';
import { searchBooks, reindexTenant } from '../services/searchService';
import { SearchConfigModel } from '../models/searchConfigModel';
import { requireAuth } from '../middleware/auth';
import { isValidUUID } from '../middleware/validate';

const router = express.Router();

// In-memory multer for logo uploads
const logoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2 MB max for logos
    fileFilter: (_req, file, cb) => {
        const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml'];
        if (allowed.includes(file.mimetype)) return cb(null, true);
        cb(new Error(`Unsupported file type: ${file.mimetype}`));
    },
});

// ── Public routes (no auth required) ─────────────────────────────────────────

/**
 * GET /tenant/:slug/info
 * Returns public tenant info (store name, logo) by slug.
 * Used by the buyer-facing search page.
 */
router.get('/:slug/info', async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const info = await TenantModel.getPublicInfoBySlug(slug.toLowerCase().trim());
        if (!info) {
            return res.status(404).json({ msg: 'Store not found' });
        }
        return res.status(200).json({ data: info });
    } catch (error: unknown) {
        console.error('tenant info error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

/**
 * GET /tenant/:slug/books
 * Public buyer catalog — list all books for a tenant by slug, or search via ?q=
 */
router.get('/:slug/books', async (req: Request, res: Response) => {
    try {
        const { slug } = req.params;
        const tenant = await TenantModel.findBySlug(slug.toLowerCase().trim());
        if (!tenant) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        const { q } = req.query as { q?: string };

        if (q && q.trim()) {
            const ids = await searchBooks(q.trim(), tenant.id);

            if (ids === null) {
                // ES unavailable — fallback to DB text filter (case-insensitive)
                const books = await BookModel.findAll(tenant.id);
                const term = q.trim().toLowerCase();
                const found = books.filter(
                    (b) =>
                        b.title.toLowerCase().includes(term) ||
                        b.author.toLowerCase().includes(term) ||
                        (b.isbn?.toLowerCase().includes(term) ?? false) ||
                        (b.publisher?.toLowerCase().includes(term) ?? false) ||
                        (b.genre?.toLowerCase().includes(term) ?? false) ||
                        (b.description?.toLowerCase().includes(term) ?? false) ||
                        (b.language?.toLowerCase().includes(term) ?? false) ||
                        (b.keywords?.some((k) => k.toLowerCase().includes(term)) ?? false),
                );
                return res.status(200).json({ count: found.length, data: found });
            }

            if (!ids.length) {
                return res.status(200).json({ count: 0, data: [] });
            }

            const books = await Promise.all(ids.map((id) => BookModel.findById(id, tenant.id)));
            const found = books.filter(Boolean);
            return res.status(200).json({ count: found.length, data: found });
        }

        const books = await BookModel.findAll(tenant.id);
        return res.status(200).json({ count: books.length, data: books });
    } catch (error: unknown) {
        console.error('public catalog error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

/**
 * GET /tenant/:slug/books/:id
 * Public buyer catalog — get a single book detail by slug + book ID.
 */
router.get('/:slug/books/:id', async (req: Request, res: Response) => {
    try {
        const { slug, id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const tenant = await TenantModel.findBySlug(slug.toLowerCase().trim());
        if (!tenant) {
            return res.status(404).json({ msg: 'Store not found' });
        }

        const book = await BookModel.findById(id, tenant.id);
        if (!book) {
            return res.status(404).json({ msg: 'Book not found' });
        }

        return res.status(200).json({ data: book });
    } catch (error: unknown) {
        console.error('public book detail error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// ── Admin routes (require authentication) ─────────────────────────────────────

/**
 * POST /tenant/logo
 * Upload/update the store logo for the authenticated tenant.
 */
router.post('/logo', requireAuth, logoUpload.single('logo'), async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;
        const file = req.file;

        if (!file) {
            return res.status(400).json({ msg: 'A logo image file is required (field name: logo)' });
        }

        await TenantModel.updateLogo(tenantId, file.buffer, file.mimetype);

        const info = await TenantModel.getPublicInfo(tenantId);
        return res.status(200).json({ msg: 'Logo updated successfully', tenant: info });
    } catch (error: unknown) {
        console.error('logo upload error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

/**
 * PUT /tenant/settings
 * Update store settings (currently: store_name) for the authenticated tenant.
 * Body: { store_name: string }
 */
router.put('/settings', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;
        const { store_name } = req.body as { store_name?: unknown };

        if (!store_name || typeof store_name !== 'string' || !store_name.trim()) {
            return res.status(400).json({ msg: 'store_name is required' });
        }

        const trimmed = store_name.trim();
        if (trimmed.length < 2) {
            return res.status(400).json({ msg: 'Store name must be at least 2 characters' });
        }
        if (trimmed.length > 100) {
            return res.status(400).json({ msg: 'Store name must be 100 characters or fewer' });
        }

        await TenantModel.updateStoreName(tenantId, trimmed);

        return res.status(200).json({ msg: 'Store name updated successfully', store_name: trimmed });
    } catch (error: unknown) {
        console.error('settings update error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

/**
 * PUT /tenant/apikey
 * Update the OpenAI API key for the authenticated tenant.
 * Body: { openai_api_key: string }
 */
router.put('/apikey', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;
        const { openai_api_key } = req.body as { openai_api_key?: unknown };

        if (!openai_api_key || typeof openai_api_key !== 'string' || !openai_api_key.trim()) {
            return res.status(400).json({ msg: 'An OpenAI API key is required' });
        }

        await TenantModel.updateApiKey(tenantId, openai_api_key.trim());
        return res.status(200).json({ msg: 'OpenAI API key updated successfully' });
    } catch (error: unknown) {
        console.error('apikey update error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

/**
 * GET /tenant/qrcode
 * Generate a QR code PNG for the authenticated tenant's buyer catalog URL.
 * Returns a PNG image as base64 data-URI in JSON.
 *
 * The QR code encodes: <BASE_URL>/store/<slug>
 */
router.get('/qrcode', requireAuth, async (req: Request, res: Response) => {
    try {
        const tenantId = req.tenantId!;
        const tenant = await TenantModel.findById(tenantId);
        if (!tenant) {
            return res.status(404).json({ msg: 'Tenant not found' });
        }

        // Determine base URL from request headers or env
        const baseUrl = process.env.PUBLIC_BASE_URL ||
            `${req.protocol}://${req.get('host')}`;

        const catalogUrl = `${baseUrl}/store/${tenant.slug}`;

        // Generate QR code using qrcode npm package (installed below)
        // We dynamically import to avoid issues if not installed
        let qrDataUri: string;
        try {
            const QRCode = (await import('qrcode')).default;
            qrDataUri = await QRCode.toDataURL(catalogUrl, {
                errorCorrectionLevel: 'M',
                width: 300,
                margin: 2,
            });
        } catch {
            // If qrcode package not available, return just the URL
            return res.status(200).json({
                catalog_url: catalogUrl,
                qr_data_uri: null,
                msg: 'QR code generation unavailable; use catalog_url directly',
            });
        }

        return res.status(200).json({
            catalog_url: catalogUrl,
            qr_data_uri: qrDataUri,
        });
    } catch (error: unknown) {
        console.error('qrcode error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// ── Search Index Config routes (tenant-admin only) ────────────────────────────

/**
 * GET /tenant/search-config
 * Returns the current search indexing config for the authenticated tenant.
 * Defaults to all-enabled if not yet configured.
 * Accessible only by tenant-admin role.
 */
router.get('/search-config', requireAuth, async (req: Request, res: Response) => {
    try {
        if (req.authUser?.role !== 'tenant-admin') {
            return res.status(403).json({ msg: 'Only tenant admins can access search configuration' });
        }
        const tenantId = req.tenantId!;
        const config = await SearchConfigModel.getConfig(tenantId);
        return res.status(200).json({ data: config });
    } catch (error: unknown) {
        console.error('search-config GET error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

/**
 * PUT /tenant/search-config
 * Update the search indexing config for the authenticated tenant.
 * Body: { idx_title, idx_author, idx_isbn, idx_publisher, idx_genre,
 *         idx_description, idx_publish_year, idx_language, idx_keywords }
 * All fields are booleans. Omitted fields keep their current value.
 * Accessible only by tenant-admin role.
 */
router.put('/search-config', requireAuth, async (req: Request, res: Response) => {
    try {
        if (req.authUser?.role !== 'tenant-admin') {
            return res.status(403).json({ msg: 'Only tenant admins can update search configuration' });
        }
        const tenantId = req.tenantId!;

        const allowedFields = [
            'idx_title', 'idx_author', 'idx_isbn', 'idx_publisher',
            'idx_genre', 'idx_description', 'idx_publish_year',
            'idx_language', 'idx_keywords',
        ] as const;

        type ConfigField = typeof allowedFields[number];

        const body = req.body as Record<string, unknown>;
        const patch: Partial<Record<ConfigField, boolean>> = {};

        for (const field of allowedFields) {
            if (field in body) {
                if (typeof body[field] !== 'boolean') {
                    return res.status(400).json({ msg: `Field "${field}" must be a boolean` });
                }
                patch[field] = body[field] as boolean;
            }
        }

        const updated = await SearchConfigModel.upsertConfig(tenantId, patch);
        return res.status(200).json({ msg: 'Search configuration updated', data: updated });
    } catch (error: unknown) {
        console.error('search-config PUT error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

/**
 * POST /tenant/search-reindex
 * Trigger a full reindex of all books for the authenticated tenant,
 * using the current search config.
 * Accessible only by tenant-admin role.
 * Returns { indexed_count, total_books }
 */
router.post('/search-reindex', requireAuth, async (req: Request, res: Response) => {
    try {
        if (req.authUser?.role !== 'tenant-admin') {
            return res.status(403).json({ msg: 'Only tenant admins can trigger a reindex' });
        }
        const tenantId = req.tenantId!;

        // Load all books for the tenant
        const books = await BookModel.findAll(tenantId);
        const indexedCount = await reindexTenant(tenantId, books);

        return res.status(200).json({
            msg: 'Reindex complete',
            indexed_count: indexedCount,
            total_books: books.length,
        });
    } catch (error: unknown) {
        console.error('search-reindex error:', (error as Error).message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

export default router;
