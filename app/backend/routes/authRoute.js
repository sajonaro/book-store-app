import express from 'express';
import bcrypt from 'bcryptjs';
import rateLimit from 'express-rate-limit';
import { UserModel } from '../models/userModel.js';

const router = express.Router();

// Stricter rate limit for auth endpoint — 10 requests per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { msg: 'Too many login attempts, please try again later.' },
});

// POST /auth/login
router.post('/login', authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ msg: 'Email is required' });
    }
    if (!password || typeof password !== 'string') {
      return res.status(400).json({ msg: 'Password is required' });
    }

    const user = await UserModel.findByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    const match = await bcrypt.compare(password, user.pwd_hash);
    if (!match) {
      return res.status(401).json({ msg: 'Invalid email or password' });
    }

    // Phase-1 stub token: base64(id:email:timestamp)
    const token = Buffer.from(`${user.id}:${user.email}:${Date.now()}`).toString('base64');

    return res.status(200).json({
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error(error.message);
    return res.status(500).json({ msg: 'Internal server error' });
  }
});

export default router;
