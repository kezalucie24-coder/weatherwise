const { Reading, Rule } = require('../models');

/* ---------- Weather + rule engine ---------- */
async function getWeather(l) {
  const [lon, lat] = l.loc.coordinates;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&hourly=temperature_2m,precipitation_probability,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&timezone=auto&past_days=3&forecast_days=3`;
  const d = await (await fetch(url)).json();
  const h = d.hourly, c = d.current;
  const i = Math.max(0, h.time.indexOf(c.time.slice(0, 13) + ':00'));
  return {
    ts: new Date(), temp: c.temperature_2m, humidity: c.relative_humidity_2m, wind: c.wind_speed_10m,
    code: c.weather_code, rain: h.precipitation_probability[i], uv: h.uv_index[i],
    daily: d.daily.time.map((t, k) => ({ date: t, max: d.daily.temperature_2m_max[k], min: d.daily.temperature_2m_min[k], code: d.daily.weather_code[k], rain: d.daily.precipitation_probability_max[k], wind: d.daily.wind_speed_10m_max[k] })),
    today: Math.max(0, d.daily.time.indexOf(c.time.slice(0, 10))),
    hourly: h.time.slice(i, i + 24).map((t, k) => ({ t, temp: h.temperature_2m[i + k], rain: h.precipitation_probability[i + k] }))
  };
}

// A rule matches when every metric sits inside its (optional) min/max band
const band = (k, v) => ['min', 'max'].map(m => ({
  $or: [{ [`when.${k}.${m}`]: { $exists: false } }, { [`when.${k}.${m}`]: { [m === 'min' ? '$lte' : '$gte']: v } }]
}));
const match = (w, profile) => Rule.find({
  active: true, audience: { $in: ['all', profile] },
  $and: ['temp', 'rain', 'wind', 'uv'].flatMap(k => band(k, w[k] ?? 0))
}).sort({ priority: -1 }).lean();

async function live(l) {
  try {
    const w = await getWeather(l);
    const { hourly, daily, today, code, ...r } = w;
    await Reading.create({ ...r, loc: l._id });
    return w;
  } catch (e) { // API down: fall back to the last stored reading
    const r = await Reading.findOne({ loc: l._id }).sort({ ts: -1 }).lean();
    if (!r) throw e;
    return { ...r, hourly: [], code: 3 };
  }
}

module.exports = { getWeather, match, live };
