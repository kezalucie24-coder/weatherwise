const mongoose = require('mongoose');
const { Schema, model } = mongoose;

/* ---------- Schemas ---------- */
const locSchema = new Schema({
  name: { type: String, required: true, unique: true },
  loc: { type: { type: String, default: 'Point' }, coordinates: { type: [Number], required: true } } // [lon, lat]
});
locSchema.index({ loc: '2dsphere' });
const Location = model('Location', locSchema);

// Time-series collection: hourly readings, auto-deleted after 90 days
const Reading = model('Reading', new Schema(
  { ts: { type: Date, required: true }, loc: Schema.Types.ObjectId, temp: Number, humidity: Number, wind: Number, rain: Number, uv: Number },
  { timeseries: { timeField: 'ts', metaField: 'loc', granularity: 'hours' }, expireAfterSeconds: 60 * 60 * 24 * 90 }
));

// Advice rules live in the database, so admins change advice without touching code
const range = { min: Number, max: Number };
const ruleSchema = new Schema({
  category: { type: String, enum: ['clothing', 'home', 'activity'], required: true },
  when: { temp: range, rain: range, wind: range, uv: range },
  audience: { type: String, default: 'all' }, // all | farmer | student
  severity: { type: String, enum: ['info', 'warning', 'danger'], default: 'info' },
  priority: { type: Number, default: 1 },
  active: { type: Boolean, default: true },
  text: { en: { type: String, required: true }, rw: String, fr: String }
});
ruleSchema.index({ category: 1, severity: 1, priority: -1 });
const Rule = model('Rule', ruleSchema);

// Advice history, expires after 30 days (TTL index)
const Advice = model('Advice', new Schema({
  loc: Schema.Types.ObjectId, profile: String, count: Number,
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 }
}));

const User = model('User', new Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  profile: { type: String, enum: ['all', 'farmer', 'student'], default: 'all' },
  lang: { type: String, enum: ['en', 'rw', 'fr'], default: 'en' },
  saved: [{ type: Schema.Types.ObjectId, ref: 'Location' }]
}, { timestamps: true }));

module.exports = { Location, Reading, Rule, Advice, User };
