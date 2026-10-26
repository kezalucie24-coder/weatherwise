const router = require('express').Router(), bcrypt = require('bcryptjs');
const { User } = require('../models');
const { sign, pub } = require('../middleware/auth');
const wrap = f => (q, s, n) => f(q, s).catch(n);

router.post('/register', wrap(async (q, s) => {
  const { name, email, password } = q.body || {};
  if (!name || !/^\S+@\S+\.\S+$/.test(String(email || ''))) return s.status(400).json({ error: 'Enter your name and a valid email' });
  if (typeof password !== 'string' || password.length < 8) return s.status(400).json({ error: 'Password must be at least 8 characters' });
  const u = await User.create({ name: String(name), email: String(email), password: await bcrypt.hash(password, 10) });
  s.status(201).json({ token: sign(u), user: pub(u) });
}));

router.post('/login', wrap(async (q, s) => {
  const { email, password } = q.body || {};
  const u = await User.findOne({ email: String(email || '').toLowerCase() }).select('+password');
  if (!u || !await bcrypt.compare(String(password || ''), u.password)) return s.status(401).json({ error: 'Wrong email or password' });
  s.json({ token: sign(u), user: pub(u) });
}));

module.exports = router;
