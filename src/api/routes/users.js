const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { generateToken } = require('../middleware/auth');
const { authorize } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const { validateEmail } = require('../../utils/validators');

router.post('/register', authLimiter, async (req, res, next) => {
    try {
          const { email, password, firstName, lastName } = req.body;
          if (!email || !password || !firstName || !lastName) {
                  return res.status(400).json({ error: 'Validation Error', message: 'All fields are required' });
                }
          if (!validateEmail(email)) {
                  return res.status(400).json({ error: 'Validation Error', message: 'Invalid email format' });
                }
          const existing = await User.findOne({ email });
          if (existing) {
                  return res.status(409).json({ error: 'Conflict', message: 'Email already registered' });
                }
          const user = new User({ email, firstName, lastName });
          user.setPassword(password);
          await user.save();
          const token = generateToken(user);
          res.status(201).json({ data: { user: { id: user._id, email: user.email, name: user.fullName }, token } });
        } catch (error) {
          next(error);
        }
  });

router.post('/login', authLimiter, async (req, res, next) => {
    try {
          const { email, password } = req.body;
          const user = await User.findOne({ email });
          if (!user) {
                  return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
                }
          if (user.isLocked()) {
                  return res.status(423).json({ error: 'Locked', message: 'Account is temporarily locked' });
                }
          if (!user.validatePassword(password)) {
                  await user.recordFailedLogin();
                  return res.status(401).json({ error: 'Unauthorized', message: 'Invalid credentials' });
                }
          await user.recordLogin();
          const token = generateToken(user);
          res.json({ data: { token, user: { id: user._id, email: user.email, role: user.role } } });
        } catch (error) {
          next(error);
        }
  });

router.get('/me', async (req, res) => {
    res.json({ data: { id: req.user._id, email: req.user.email, name: req.user.fullName, role: req.user.role } });
  });

router.get('/', authorize('admin'), async (req, res, next) => {
    try {
          const users = await User.find({}).select('-passwordHash');
          res.json({ data: users, count: users.length });
        } catch (error) {
          next(error);
        }
  });

module.exports = router;
