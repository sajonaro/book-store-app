import express from 'express';
import mongoose from 'mongoose';
import { Book } from '../models/bookModel.js';

const router = express.Router();

const isValidObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// Sanitize and coerce book fields from request body
const sanitizeBook = (body) => ({
    title: typeof body.title === 'string' ? body.title.trim().slice(0, 200) : undefined,
    author: typeof body.author === 'string' ? body.author.trim().slice(0, 100) : undefined,
    publishYear: Number(body.publishYear),
});

const validateBookFields = ({ title, author, publishYear }) => {
    if (!title || !author || !publishYear || isNaN(publishYear)) {
        return 'Send all required fields: title, author, publishYear';
    }
    if (publishYear < 1000 || publishYear > new Date().getFullYear() + 5) {
        return 'publishYear must be a valid year';
    }
    return null;
};

// POST /books — create a new book
router.post('/', async (req, res) => {
    try {
        const fields = sanitizeBook(req.body);
        const validationError = validateBookFields(fields);
        if (validationError) {
            return res.status(400).json({ msg: validationError });
        }

        const book = await Book.create(fields);
        return res.status(201).json(book);
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

// GET /books — list all books
router.get('/', async (_req, res) => {
    try {
        const books = await Book.find({});
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

        if (!isValidObjectId(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const book = await Book.findById(id);
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

        if (!isValidObjectId(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const fields = sanitizeBook(req.body);
        const validationError = validateBookFields(fields);
        if (validationError) {
            return res.status(400).json({ msg: validationError });
        }

        const result = await Book.findByIdAndUpdate(
            id,
            fields,
            { new: true, runValidators: true }
        );

        if (!result) {
            return res.status(404).json({ msg: 'Book not found' });
        }

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

        if (!isValidObjectId(id)) {
            return res.status(400).json({ msg: 'Invalid book ID' });
        }

        const result = await Book.findByIdAndDelete(id);

        if (!result) {
            return res.status(404).json({ msg: 'Book not found' });
        }

        return res.status(200).json({ msg: 'Book deleted successfully' });
    } catch (error) {
        console.error(error.message);
        return res.status(500).json({ msg: 'Internal server error' });
    }
});

export default router;
