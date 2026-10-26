const jwt = require('jsonwebtoken');
const { User } = require('../models');
const SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

const sign = u => jwt.sign({ id: u._id, role: u.role }, SECRET, { expiresIn: '7d' });
const pub = u => ({ id: u._id, name: u.name, email: u.email, role: u.role, profile: u.profile, lang: u.lang, saved: (u.saved || []).map(String) });

const auth = async (q, s, n) => {
  try {
    const p = jwt.verify((q.get('authorization') || '').replace('Bearer ', ''), SECRET);
    q.user = await User.findById(p.id);
    if (!q.user) throw new Error('no user');
    n();
  } catch { s.status(401).json({ error: 'Please sign in' }); }
};
const adminOnly = (q, s, n) => q.user.role === 'admin' ? n() : s.status(403).json({ error: 'Admins only' });

module.exports = { sign, pub, auth, adminOnly };
