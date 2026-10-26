require('dotenv').config();
const mongoose = require('mongoose'), cron = require('node-cron');
const app = require('./app');
const { Location } = require('./models');
const { live } = require('./services/weather');
const { seedAll } = require('./config/seed');

if (!process.env.JWT_SECRET) console.warn('Warning: JWT_SECRET is not set. Using an insecure development secret.');

// Hourly job: store a fresh reading for every location
cron.schedule('0 * * * *', async () => {
  for (const l of await Location.find()) {
    try { await live(l); } catch (e) { console.error('Fetch failed for', l.name); }
  }
});

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('error', (err) => console.error('MongoDB error:', err.message));

const port = process.env.PORT || 3000;

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log(`MongoDB connected (${mongoose.connection.host}/${mongoose.connection.name})`);
    app.listen(port, () => console.log(`Weatherwise running at http://localhost:${port}`));
  })
  .catch((err) => {
    console.error('Could not connect to MongoDB:', err.message);
    process.exit(1);
  });