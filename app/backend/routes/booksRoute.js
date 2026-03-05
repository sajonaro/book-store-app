import express from 'express';
import { BookModel } from '../models/bookModel.js';
import { isValidUUID, sanitizeBook, validateBookFields } from '../middleware/validate.js';
import { indexBook, removeBook as removeBookFromIndex, searchBooks } from '../services/searchService.js';

const router = express.Router();

// POST /books — create a new book
router.post('/', async (req, res) => {
    try {
        const fields = sanitizeBook(req.body);
        const validationError = validateBookFields(fields);
        if (validationError) {
            return res.status(400).json({ msg: validationError });
        }

        const book = await BookModel.create(fields);
        // Index in Elasticsearch (non-blocking, errors are logged but not thrown)
        await indexBook(book);
        return res.status(201).json({ data: book });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// GET /books — list all books, or search via ?q=
router.get('/', async (req, res) => {
    try {
        const { q } = req.query;

        if (q && q.trim()) {
            // Delegate to Elasticsearch; returns null when ES is unavailable
            const ids = await searchBooks(q.trim());

            if (ids === null) {
                // ES unavailable — fall back to a PostgreSQL ILIKE search
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

            // Fetch matching books from PostgreSQL to return full records
            const books = await Promise.all(ids.map((id) => BookModel.findById(id)));
            const found = books.filter(Boolean);
            return res.status(200).json({ count: found.length, data: found });
        }

        // No query — return all books from PostgreSQL
        const books = await BookModel.findAll();
        return res.status(200).json({ count: books.length, data: books });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// GET /books/:id — get a single book
router.get('/:id', async (req, res) => {
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
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// PUT /books/:id — update a book
router.put('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidUUID(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const fields = sanitizeBook(req.body);
        const validationError = validateBookFields(fields);
        if (validationError) {
            return res.status(400).json({ msg: validationError });
        }

        const updated = await BookModel.update(id, fields);
        if (!updated) {
            return res.status(404).json({ msg: 'Book not found' });
        }

        await indexBook(updated);
        return res.status(200).json({ msg: 'Book updated successfully' });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// DELETE /books/:id — delete a book
router.delete('/:id', async (req, res) => {
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
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

export default router;
