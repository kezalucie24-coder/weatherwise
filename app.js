const express = require('express'), helmet = require('helmet'), rate = require('express-rate-limit'), path = require('path');
const app = express();

app.use(helmet({ contentSecurityPolicy: false }), express.json({ limit: '10kb' }), rate({ windowMs: 60000, max: 120 }));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', rate({ windowMs: 15 * 60000, max: 30 }), require('./routes/auth'));
app.use('/api', require('./routes/api'));
app.use('/api', (q, s) => s.status(404).json({ error: 'Not found' }));

app.use((err, q, s, n) => {
  const code = err.code === 11000 ? 409 : ['ValidationError', 'CastError'].includes(err.name) ? 400 : 500;
  if (code === 500) console.error(err);
  s.status(code).json({ error: code === 409 ? 'That email is already registered' : code === 500 ? 'Something went wrong' : err.message });
});

module.exports = app;
