(() => {
  const css = `
.top-btn,.star{font:500 14px 'DM Sans',sans-serif;color:#fff;background:var(--glass);border:1px solid var(--line);border-radius:999px;padding:8px 16px;cursor:pointer}
.star{display:inline-block;margin-top:8px;padding:5px 14px}
.top-btn:focus-visible,.star:focus-visible,.link:focus-visible,.primary:focus-visible{outline:3px solid #fff;outline-offset:2px}
dialog{border:1px solid var(--line);border-radius:24px;padding:26px;width:min(94vw,540px);color:#fff;background:linear-gradient(160deg,var(--bg1),var(--bg2));box-shadow:0 30px 80px rgba(0,0,0,.45)}
dialog::backdrop{background:rgba(8,12,24,.6);backdrop-filter:blur(4px)}
dialog h2{font:800 26px 'Bricolage Grotesque',sans-serif;margin-bottom:10px}
dialog label{display:block;font-size:14px;margin:10px 0 4px}
dialog input,dialog select{width:100%;padding:10px 12px;border-radius:12px;border:1px solid var(--line);background:rgba(255,255,255,.14);color:#fff;font:400 15px 'DM Sans',sans-serif}
dialog input::placeholder{color:rgba(255,255,255,.65)}
dialog select option{color:#14213d}
.row{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-top:16px;flex-wrap:wrap}
.primary{background:#fff;color:#14213d;font:700 15px 'DM Sans',sans-serif;border:0;border-radius:999px;padding:10px 22px;cursor:pointer}
.link{background:none;border:0;color:#fff;text-decoration:underline;cursor:pointer;font:inherit}
.msg{margin-top:10px;font-size:14px;min-height:20px}
.rules{max-height:32vh;overflow:auto;display:grid;gap:8px;margin:12px 0}
.rule{display:grid;grid-template-columns:1fr auto auto;gap:12px;align-items:center;background:rgba(255,255,255,.12);border-radius:14px;padding:10px 12px;font-size:14px}
.rule small{opacity:.8;display:block}
.rule input{width:auto}
.grid4{display:grid;grid-template-columns:repeat(4,1fr);gap:8px}
.grid2{display:grid;grid-template-columns:1fr 1fr;gap:8px}`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  let token = localStorage.token || '', me = null, mode = 'login';
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const api = async (url, o = {}) => {
    const r = await fetch(url, { method: o.method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) }, body: o.body && JSON.stringify(o.body) });
    const d = r.status === 204 ? {} : await r.json();
    if (!r.ok) throw new Error(d.error || 'Request failed');
    return d;
  };
  const dlg = (id, html) => {
    const d = document.createElement('dialog'); d.id = id; d.innerHTML = html; document.body.append(d);
    d.addEventListener('click', e => { if (e.target === d) d.close(); }); return d;
  };

  /* ---- Header buttons and star ---- */
  $('.ctl').insertAdjacentHTML('afterbegin', '<button class="top-btn" id="rulesBtn" hidden>Manage advice</button><button class="top-btn" id="acct">Sign in</button>');
  $('#place').insertAdjacentHTML('afterend', '<button class="star" id="star" hidden></button>');

  const saved = () => !!me && me.saved.includes(S.id);
  function paint() {
    $('#acct').textContent = me ? `Sign out (${me.name.split(' ')[0]})` : 'Sign in';
    $('#rulesBtn').hidden = !(me && me.role === 'admin');
    $('#star').hidden = !me; $('#who').textContent = me ? me.name : 'Guest'; $('#avatar').textContent = me ? me.name[0].toUpperCase() : '';
    $('#star').textContent = saved() ? '★ Saved' : '☆ Save this place';
    $('#star').setAttribute('aria-pressed', saved());
  }
  const setMe = u => { me = window.ME = u; paint(); return u; };

  /* ---- Sign in / register ---- */
  const authD = dlg('authD', `<h2 id="aT"></h2><form id="aF">
    <div id="nameRow"><label for="aN">Name</label><input id="aN" autocomplete="name"></div>
    <label for="aE">Email</label><input id="aE" type="email" autocomplete="email" required>
    <label for="aP">Password (8 characters or more)</label><input id="aP" type="password" minlength="8" autocomplete="current-password" required>
    <div class="msg" id="aM" role="alert"></div>
    <div class="row"><button class="primary">Continue</button><button type="button" class="link" id="aS"></button></div></form>`);
  const setMode = m => {
    mode = m; $('#aM').textContent = '';
    $('#aT').textContent = m === 'login' ? 'Welcome back' : 'Create your account';
    $('#nameRow').hidden = m === 'login';
    $('#aS').textContent = m === 'login' ? 'New here? Create an account' : 'Have an account? Sign in';
  };
  $('#aS').onclick = () => setMode(mode === 'login' ? 'register' : 'login');
  $('#aF').onsubmit = async e => {
    e.preventDefault();
    try {
      const d = await api('/api/auth/' + mode, { method: 'POST', body: { name: $('#aN').value, email: $('#aE').value, password: $('#aP').value } });
      token = localStorage.token = d.token;
      if (mode === 'register') setMe(await api('/api/me', { method: 'PUT', body: { lang: S.lang, profile: S.profile } }));
      else { setMe(d.user); S.lang = me.lang; S.profile = me.profile; localStorage.lang = S.lang; localStorage.profile = S.profile; }
      authD.close(); ui(); load();
    } catch (err) { $('#aM').textContent = err.message; }
  };
  $('#acct').onclick = () => {
    if (me) { token = localStorage.token = ''; setMe(null); ui(); }
    else { setMode('login'); authD.showModal(); }
  };
  $('#star').onclick = async () => {
    try { setMe(await api('/api/me/locations/' + S.id, { method: saved() ? 'DELETE' : 'POST' })); ui(); } catch (e) { }
  };

  /* ---- Admin: manage advice rules ---- */
  const admD = dlg('admD', `<h2>Advice rules</h2><div class="msg" id="stats"></div><div class="rules" id="rl"></div>
    <form id="rF"><div class="grid2"><div><label for="rC">Category</label><select id="rC"><option value="clothing">Clothing</option><option value="home">Home</option><option value="activity">Activity</option></select></div>
    <div><label for="rS">Severity</label><select id="rS"><option value="info">Info</option><option value="warning">Warning</option><option value="danger">Danger</option></select></div></div>
    <label for="rT">Advice text (English)</label><input id="rT" required maxlength="200" placeholder="Bring washing in before the storm.">
    <div class="grid4"><div><label for="rn">Rain % min</label><input id="rn" type="number"></div><div><label for="tn">Temp min</label><input id="tn" type="number"></div><div><label for="tx">Temp max</label><input id="tx" type="number"></div><div><label for="wn">Wind min</label><input id="wn" type="number"></div></div>
    <div class="msg" id="rM" role="alert"></div>
    <div class="row"><button class="primary">Add rule</button><button type="button" class="link" id="rX">Close</button></div></form>`);
  async function rules() {
    const [r, st] = await Promise.all([api('/api/rules'), api('/api/admin/stats')]);
    const asked = st.byProfile.reduce((n, p) => n + p.requests, 0);
    $('#stats').textContent = `${st.users} users, ${st.readings} stored readings, ${asked} advice requests`;
    $('#rl').innerHTML = r.map(x => `<div class="rule"><div>${esc(x.text.en)}<small>${x.category}, ${x.severity}, for ${x.audience}</small></div>
      <input type="checkbox" data-t="${x._id}" ${x.active ? 'checked' : ''} aria-label="Rule active"><button class="link" data-d="${x._id}">Delete</button></div>`).join('');
  }
  $('#rulesBtn').onclick = () => { admD.showModal(); rules().catch(e => $('#rM').textContent = e.message); };
  $('#rX').onclick = () => admD.close();
  $('#rl').onchange = async e => { if (e.target.dataset.t) await api('/api/rules/' + e.target.dataset.t, { method: 'PUT', body: { active: e.target.checked } }); };
  $('#rl').onclick = async e => {
    const id = e.target.dataset.d;
    if (id && confirm('Delete this rule?')) { await api('/api/rules/' + id, { method: 'DELETE' }); rules(); }
  };
  $('#rF').onsubmit = async e => {
    e.preventDefault();
    const when = {};
    [['rain', 'min', '#rn'], ['temp', 'min', '#tn'], ['temp', 'max', '#tx'], ['wind', 'min', '#wn']].forEach(([k, m, id]) => {
      if ($(id).value !== '') (when[k] ??= {})[m] = +$(id).value;
    });
    const severity = $('#rS').value;
    try {
      await api('/api/rules', { method: 'POST', body: { category: $('#rC').value, severity, when, priority: { info: 1, warning: 3, danger: 5 }[severity], text: { en: $('#rT').value } } });
      $('#rF').reset(); $('#rM').textContent = 'Rule added. It applies on the next refresh.'; rules();
    } catch (err) { $('#rM').textContent = err.message; }
  };

  /* ---- Hook into the main page ---- */
  const _ui = ui, _load = load;
  ui = function () {
    _ui();
    if (me) document.querySelectorAll('#chips .chip').forEach(c => {
      if (me.saved.includes(c.dataset.id)) { c.textContent = '★ ' + c.textContent; $('#chips').prepend(c); }
    });
    paint();
  };
  load = async function () {
    await _load();
    if (me && (me.lang !== S.lang || me.profile !== S.profile)) api('/api/me', { method: 'PUT', body: { lang: S.lang, profile: S.profile } }).then(setMe).catch(() => { });
  };

  if (token) api('/api/me').then(u => { setMe(u); S.lang = u.lang; S.profile = u.profile; ui(); load(); }).catch(() => { token = localStorage.token = ''; });
})();
