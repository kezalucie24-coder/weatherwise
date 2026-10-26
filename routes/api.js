const router = require('express').Router(), mongoose = require('mongoose');
const { Location, Reading, Rule, Advice, User } = require('../models');
const { live, match } = require('../services/weather');
const { auth, adminOnly, pub } = require('../middleware/auth');
const wrap = f => (q, s, n) => f(q, s).catch(n);

/* ---- Public: locations, weather, advice ---- */
router.get('/locations', wrap(async (q, s) => s.json(await Location.find().lean())));

router.get('/locations/near', wrap(async (q, s) => s.json(await Location.find({
  loc: { $near: { $geometry: { type: 'Point', coordinates: [+q.query.lon, +q.query.lat] }, $maxDistance: 100000 } }
}).lean())));

router.get('/weather/:id', wrap(async (q, s) => {
  const l = await Location.findById(q.params.id);
  l ? s.json(await live(l)) : s.status(404).json({ error: 'Location not found' });
}));

router.get('/advice/:id', wrap(async (q, s) => {
  const l = await Location.findById(q.params.id);
  if (!l) return s.status(404).json({ error: 'Location not found' });
  const lang = ['en', 'rw', 'fr'].includes(q.query.lang) ? q.query.lang : 'en';
  const profile = ['farmer', 'student'].includes(q.query.profile) ? q.query.profile : 'all';
  const w = await live(l), rules = await match(w, profile);
  const advice = { clothing: [], home: [], activity: [] };
  rules.forEach(r => advice[r.category].push({ text: r.text[lang] || r.text.en, severity: r.severity }));
  Advice.create({ loc: l._id, profile, count: rules.length }).catch(() => {});
  s.json({ location: l.name, conditions: w, advice });
}));

// Daily averages for the last 7 days (aggregation pipeline)
router.get('/analytics/:id', wrap(async (q, s) => s.json(await Reading.aggregate([
  { $match: { loc: new mongoose.Types.ObjectId(q.params.id), ts: { $gte: new Date(Date.now() - 7 * 864e5) } } },
  { $group: { _id: { $dateTrunc: { date: '$ts', unit: 'day' } }, avg: { $avg: '$temp' }, max: { $max: '$temp' }, rain: { $avg: '$rain' } } },
  { $sort: { _id: 1 } }
]))));

/* ---- Signed-in user: preferences and saved places ---- */
router.get('/me', auth, (q, s) => s.json(pub(q.user)));

router.put('/me', auth, wrap(async (q, s) => {
  const { profile, lang } = q.body || {};
  if (profile) q.user.profile = profile;
  if (lang) q.user.lang = lang;
  await q.user.save();
  s.json(pub(q.user));
}));

router.post('/me/locations/:id', auth, wrap(async (q, s) => {
  if (!await Location.exists({ _id: q.params.id })) return s.status(404).json({ error: 'Location not found' });
  s.json(pub(await User.findByIdAndUpdate(q.user._id, { $addToSet: { saved: q.params.id } }, { new: true })));
}));

router.delete('/me/locations/:id', auth, wrap(async (q, s) =>
  s.json(pub(await User.findByIdAndUpdate(q.user._id, { $pull: { saved: q.params.id } }, { new: true })))));

/* ---- Admin: advice rules and usage stats ---- */
router.get('/rules', auth, adminOnly, wrap(async (q, s) => s.json(await Rule.find().sort({ category: 1, priority: -1 }).lean())));
router.post('/rules', auth, adminOnly, wrap(async (q, s) => s.status(201).json(await Rule.create(q.body))));
router.put('/rules/:id', auth, adminOnly, wrap(async (q, s) => s.json(await Rule.findByIdAndUpdate(q.params.id, q.body, { new: true, runValidators: true }))));
router.delete('/rules/:id', auth, adminOnly, wrap(async (q, s) => { await Rule.findByIdAndDelete(q.params.id); s.status(204).end(); }));

router.get('/admin/stats', auth, adminOnly, wrap(async (q, s) => {
  const [users, readings, byProfile] = await Promise.all([
    User.countDocuments(), Reading.countDocuments(),
    Advice.aggregate([{ $group: { _id: '$profile', requests: { $sum: 1 }, avgTips: { $avg: '$count' } } }])
  ]);
  s.json({ users, readings, byProfile });
}));

module.exports = router;
