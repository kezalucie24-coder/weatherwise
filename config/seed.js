const bcrypt = require('bcryptjs');
const { Location, Rule, User } = require('../models');

/* ---------- Seed data ---------- */
const R = (category, when, severity, priority, en, rw, fr, audience = 'all') => ({ category, when, severity, priority, audience, text: { en, rw, fr } });
const RULES = [
  R('clothing', { rain: { min: 60 } }, 'info', 2, 'Wear a waterproof jacket and closed shoes.', "Wambara ikoti ry'imvura n'inkweto zifunze.", 'Portez un imperméable et des chaussures fermées.'),
  R('clothing', { temp: { max: 15 } }, 'info', 2, 'Layer up with a sweater and long trousers.', "Ambara imyenda ishyushye n'ipantaro ndende.", 'Superposez pull et pantalon long.'),
  R('clothing', { temp: { min: 15, max: 26 } }, 'info', 1, 'Light layers you can add or remove.', 'Ambara imyenda yoroheje ushobora kongeraho.', 'Portez des couches légères.'),
  R('clothing', { temp: { min: 27 } }, 'info', 2, 'Wear light, breathable cotton and a hat.', "Ambara imyenda ya kotoni yoroheje n'ingofero.", 'Portez du coton léger et un chapeau.'),
  R('clothing', { uv: { min: 6 } }, 'warning', 3, 'High UV: use sunscreen and find shade at midday.', 'Izuba ryinshi: siga amavuta arinda izuba kandi wihishe ku manywa.', 'UV élevé : crème solaire et ombre à midi.'),
  R('home', { rain: { min: 70 } }, 'warning', 3, 'Clear gutters and drains before the rain arrives.', "Sukura imiyoboro y'amazi mbere y'uko imvura igwa.", 'Nettoyez gouttières et canalisations avant la pluie.'),
  R('home', { rain: { min: 80 } }, 'danger', 4, 'Heavy rain: check the roof for leaks and lift valuables off the floor.', "Imvura nyinshi: genzura igisenge, ushyire ibintu by'agaciro hejuru.", 'Pluie forte : vérifiez le toit et surélevez vos biens.'),
  R('home', { wind: { min: 35 } }, 'warning', 3, 'Strong wind: secure doors, windows and loose roof sheets.', "Umuyaga mwinshi: funga neza inzugi, amadirishya n'amabati.", 'Vent fort : fixez portes, fenêtres et tôles.'),
  R('home', { rain: { min: 75 }, wind: { min: 25 } }, 'danger', 5, 'Storm risk: unplug electronics and stay away from windows.', "Hari ibyago by'inkuba: kuramo ibikoresho by'amashanyarazi, wirinde amadirishya.", "Risque d'orage : débranchez vos appareils, éloignez-vous des fenêtres."),
  R('activity', { rain: { max: 30 }, temp: { min: 16, max: 27 } }, 'info', 1, 'Great day for outdoor sports and walking.', 'Ni umunsi mwiza wo gukorera siporo hanze.', "Idéal pour le sport en plein air."),
  R('activity', { rain: { min: 60 } }, 'info', 2, 'Postpone outdoor events. A good time for indoor study.', 'Ihanganire ibikorwa byo hanze; ni igihe cyiza cyo kwiga mu nzu.', 'Reportez les activités extérieures ; idéal pour étudier.'),
  R('activity', { rain: { min: 80 }, wind: { min: 25 } }, 'danger', 4, 'Avoid open fields and tall trees.', "Irinde imirima ifunguye n'ibiti birebire.", 'Évitez les champs ouverts et les grands arbres.'),
  R('activity', { rain: { min: 40, max: 70 } }, 'info', 2, 'Good window for planting: soil moisture is favourable.', 'Ni igihe cyiza cyo gutera: ubutaka bufite amazi ahagije.', 'Bon moment pour planter : sol bien humide.', 'farmer'),
  R('activity', { rain: { max: 20 }, temp: { min: 25 } }, 'info', 2, 'Dry and warm: irrigate early morning and dry your harvest.', 'Humye kandi hashyushye: vomera mu gitondo kare, wanike umusaruro.', 'Sec et chaud : irriguez tôt et séchez la récolte.', 'farmer'),
  R('activity', { rain: { min: 50 } }, 'info', 2, 'Leave early for class and keep notebooks in a waterproof bag.', 'Genda kare kwiga, ubike ibitabo mu gikapu kitanyagirwa.', 'Partez tôt et protégez vos cahiers.', 'student')
];
const C = (name, lat, lon) => ({ name, loc: { type: 'Point', coordinates: [lon, lat] } });

async function seed() {
  if (!await Location.countDocuments()) await Location.insertMany([C('Kigali', -1.9441, 30.0619), C('Musanze', -1.4998, 29.6344), C('Huye', -2.5967, 29.7394), C('Rubavu', -1.6794, 29.2594), C('Rusizi', -2.4846, 28.9072)]);
  if (!await Rule.countDocuments()) await Rule.insertMany(RULES);
}

async function seedAdmin() {
  const e = process.env.ADMIN_EMAIL, p = process.env.ADMIN_PASSWORD;
  if (e && p && !await User.exists({ email: e.toLowerCase() }))
    await User.create({ name: 'Admin', email: e, password: await bcrypt.hash(p, 10), role: 'admin' });
}
module.exports = { seedAll: async () => { await seed(); await seedAdmin(); } };
