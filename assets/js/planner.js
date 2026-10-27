// Fence Planner — /plan-your-fence/
// No paid map API is configured, so homeowners draw on a measured grid or on an uploaded
// plat / site plan / screenshot, calibrated with a known distance. (Map tiles can be added
// later if an approved Google Maps key is provided — see docs/admin-guide.md.)
const D = window.FF_DATA, C = window.FF_CONFIG;
const root = document.getElementById('planner');
const W = 1200, H = 760;
root.innerHTML = `
<div class="fgrid" style="margin-bottom:1rem">
  <div class="field" style="grid-column:1/-1"><label for="pl-addr">Property address (optional)</label><input class="input" id="pl-addr" autocomplete="street-address" placeholder="Street, city"></div>
</div>
<div class="toolbar no-print" role="toolbar" aria-label="Planner tools" style="margin-bottom:.75rem">
  <button type="button" class="tbtn" data-tool="draw" aria-pressed="true">Draw fence</button>
  <button type="button" class="tbtn" data-tool="privacy" aria-pressed="false">Mark privacy section</button>
  <button type="button" class="tbtn" data-tool="gate" aria-pressed="false">Add gate</button>
  <button type="button" class="tbtn" data-tool="scale" aria-pressed="false">Set scale</button>
  <button type="button" class="tbtn" data-act="finish">Finish run</button>
  <button type="button" class="tbtn" data-act="undo">Undo</button>
  <button type="button" class="tbtn" data-act="clear">Clear</button>
  <label class="tbtn" style="display:inline-flex;align-items:center;cursor:pointer">Upload plat or photo<input type="file" accept="image/*" id="pl-file" class="sr-only"></label>
</div>
<div class="planner-wrap"><canvas id="pl-c" width="${W}" height="${H}" aria-label="Fence layout drawing area. Click or tap to place fence points." role="img"></canvas></div>
<div class="legend" style="margin:.75rem 0"><span><i style="background:#B89B67"></i>Standard fence</span><span><i style="background:#5fa37b"></i>Privacy section</span><span><i style="background:#f7f6f2;border:1px solid #999"></i>Gate</span><span id="pl-scale"></span></div>
<p class="fine" id="pl-hint" aria-live="polite">Click or tap to place fence corners. Use "Finish run" to start a separate line.</p>
<div class="form-shell" style="margin-top:1rem">
  <dl class="kv"><dt>Total fence</dt><dd id="pl-total">0 ft</dd><dt>Privacy sections</dt><dd id="pl-priv">0 ft</dd><dt>Gates</dt><dd id="pl-gates">0</dd></dl>
  <div class="btn-row" style="margin-top:1rem"><a class="btn btn-brass" id="pl-send" href="${C.links.estimate}?from=planner" data-track="planner_send">Send layout with my quote request <span class="arrow">→</span></a>
  <button type="button" class="btn btn-ghost-dark" id="pl-save">Save layout</button><button type="button" class="btn btn-ghost-dark" id="pl-png">Download image</button></div>
  <p class="fine" id="pl-msg" role="status" aria-live="polite"></p>
</div>`;

const cv = root.querySelector('#pl-c'), ctx = cv.getContext('2d');
let tool = 'draw', bg = null, pxPerFt = 10; // blank grid: 10 px = 1 ft
let runs = [[]], segType = {}, gates = [], scalePts = [], history = [];
const q = s => root.querySelector(s);
try {
  const s = JSON.parse(localStorage.getItem('ff_planner') || 'null');
  if (s) { runs = s.runs; segType = s.segType; gates = s.gates; pxPerFt = s.pxPerFt; q('#pl-addr').value = s.addr || ''; if (s.bg) { const i = new Image(); i.onload = () => { bg = i; draw(); }; i.src = s.bg; } }
} catch (e) {}
function snapshot() { history.push(JSON.stringify({ runs, segType, gates })); if (history.length > 60) history.shift(); }
function pt(e) { const r = cv.getBoundingClientRect(); return [(e.clientX - r.left) * W / r.width, (e.clientY - r.top) * H / r.height]; }
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
function segs() { const out = []; runs.forEach((r, ri) => { for (let i = 1; i < r.length; i++) out.push({ key: ri + ':' + i, a: r[i - 1], b: r[i] }); }); return out; }
function nearestSeg(p) {
  let best = null, bd = 28;
  segs().forEach(s => { const [ax, ay] = s.a, [bx, by] = s.b, dx = bx - ax, dy = by - ay, L = dx * dx + dy * dy || 1; let t = ((p[0] - ax) * dx + (p[1] - ay) * dy) / L; t = Math.max(0, Math.min(1, t)); const d = dist(p, [ax + t * dx, ay + t * dy]); if (d < bd) { bd = d; best = Object.assign({ t, p: [ax + t * dx, ay + t * dy] }, s); } });
  return best;
}
function totals() {
  let tot = 0, priv = 0; segs().forEach(s => { const ft = dist(s.a, s.b) / pxPerFt; tot += ft; if (segType[s.key] === 'privacy') priv += ft; });
  const gateFt = gates.reduce((a, g) => a + g.w, 0);
  return { tot: Math.round(tot), priv: Math.round(priv), gates: gates.length, gateFt };
}
function draw() {
  ctx.fillStyle = '#1b1e20'; ctx.fillRect(0, 0, W, H);
  if (bg) { const k = Math.min(W / bg.width, H / bg.height); const w = bg.width * k, h = bg.height * k; ctx.globalAlpha = .85; ctx.drawImage(bg, (W - w) / 2, (H - h) / 2, w, h); ctx.globalAlpha = 1; }
  else { ctx.strokeStyle = 'rgba(247,246,242,.07)'; ctx.lineWidth = 1; for (let x = 0; x < W; x += pxPerFt * 5) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); } for (let y = 0; y < H; y += pxPerFt * 5) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); } ctx.fillStyle = 'rgba(247,246,242,.35)'; ctx.font = '14px sans-serif'; ctx.fillText('Grid: each square = 5 ft', 16, H - 16); }
  segs().forEach(s => {
    const priv = segType[s.key] === 'privacy';
    ctx.strokeStyle = priv ? '#5fa37b' : '#B89B67'; ctx.lineWidth = priv ? 9 : 6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(...s.a); ctx.lineTo(...s.b); ctx.stroke();
    const ft = Math.round(dist(s.a, s.b) / pxPerFt), mx = (s.a[0] + s.b[0]) / 2, my = (s.a[1] + s.b[1]) / 2;
    ctx.font = '600 15px sans-serif'; const tw = ctx.measureText(ft + ' ft').width;
    ctx.fillStyle = 'rgba(10,11,12,.8)'; ctx.fillRect(mx - tw / 2 - 6, my - 22, tw + 12, 22); ctx.fillStyle = '#f7f6f2'; ctx.fillText(ft + ' ft', mx - tw / 2, my - 6);
  });
  runs.forEach(r => r.forEach(p => { ctx.fillStyle = '#f7f6f2'; ctx.beginPath(); ctx.arc(p[0], p[1], 6, 0, 7); ctx.fill(); }));
  gates.forEach((g, i) => { ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.ang); const w = g.w * pxPerFt; ctx.fillStyle = '#f7f6f2'; ctx.fillRect(-w / 2, -7, w, 14); ctx.strokeStyle = '#111315'; ctx.lineWidth = 2; ctx.strokeRect(-w / 2, -7, w, 14); ctx.restore(); ctx.fillStyle = '#f7f6f2'; ctx.font = '600 13px sans-serif'; ctx.fillText('Gate ' + (i + 1) + ' · ' + g.w + ' ft', g.x + 10, g.y + 26); });
  scalePts.forEach(p => { ctx.strokeStyle = '#ff7a59'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p[0], p[1], 9, 0, 7); ctx.stroke(); });
  const t = totals();
  q('#pl-total').textContent = t.tot + ' ft'; q('#pl-priv').textContent = t.priv + ' ft'; q('#pl-gates').textContent = t.gates ? t.gates + ' (' + t.gateFt + ' ft total)' : '0';
  q('#pl-scale').textContent = bg ? (pxPerFt === 10 && !scaled ? 'Scale not set: set scale for accurate footage' : 'Scale set') : '';
}
let scaled = false, started = false;
cv.addEventListener('pointerdown', e => {
  const p = pt(e);
  if (!started) { started = true; window.ffTrack('planner_start', {}); }
  if (tool === 'draw') { snapshot(); runs[runs.length - 1].push(p); }
  else if (tool === 'privacy') { const s = nearestSeg(p); if (s) { snapshot(); segType[s.key] = segType[s.key] === 'privacy' ? 'standard' : 'privacy'; } else hint('Tap directly on a fence line to mark it as privacy.'); }
  else if (tool === 'gate') {
    const s = nearestSeg(p); if (!s) return hint('Tap on a fence line to place a gate.');
    const w = parseFloat(prompt('Gate width in feet (e.g. 4, 5, 10, 12):', '4')); if (!(w > 0 && w < 40)) return;
    snapshot(); gates.push({ x: s.p[0], y: s.p[1], ang: Math.atan2(s.b[1] - s.a[1], s.b[0] - s.a[0]), w });
  } else if (tool === 'scale') {
    scalePts.push(p);
    if (scalePts.length === 2) {
      const ft = parseFloat(prompt('How many feet apart are these two points? (Use a known measurement from your plat, like a lot line.)', '50'));
      if (ft > 0) { pxPerFt = dist(scalePts[0], scalePts[1]) / ft; scaled = true; hint('Scale set. Footage now uses your measurement.'); }
      scalePts = []; setTool('draw');
    } else hint('Now tap the second point of the known distance.');
  }
  draw();
});
function hint(t) { q('#pl-hint').textContent = t; }
function setTool(t) { tool = t; root.querySelectorAll('[data-tool]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.tool === t))); hint({ draw: 'Click or tap to place fence corners. Use "Finish run" to start a separate line.', privacy: 'Tap a fence line to mark it as a privacy section (tap again to unmark).', gate: 'Tap a fence line where you want a gate.', scale: 'Tap the first point of a distance you know, like a lot line on your plat.' }[t]); }
root.addEventListener('click', e => {
  const b = e.target.closest('[data-tool],[data-act]'); if (!b) return;
  if (b.dataset.tool) return setTool(b.dataset.tool);
  const a = b.dataset.act;
  if (a === 'finish' && runs[runs.length - 1].length) runs.push([]);
  if (a === 'undo' && history.length) { const s = JSON.parse(history.pop()); runs = s.runs; segType = s.segType; gates = s.gates; }
  if (a === 'clear' && confirm('Clear the whole layout?')) { snapshot(); runs = [[]]; segType = {}; gates = []; }
  draw();
});
q('#pl-file').addEventListener('change', e => {
  const f = e.target.files[0]; if (!f) return;
  if (f.size > 12e6) return hint('That image is larger than 12 MB. Please choose a smaller file.');
  const r = new FileReader(); r.onload = () => { const i = new Image(); i.onload = () => { bg = i; scaled = false; draw(); setTool('scale'); hint('Image added. Now set the scale: tap two points with a known distance.'); }; i.src = r.result; }; r.readAsDataURL(f);
});
function bgData() { if (!bg) return null; const c = document.createElement('canvas'); const k = Math.min(1, 1400 / bg.width); c.width = bg.width * k; c.height = bg.height * k; c.getContext('2d').drawImage(bg, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', .7); }
function save(silent) {
  try { localStorage.setItem('ff_planner', JSON.stringify({ runs, segType, gates, pxPerFt, addr: q('#pl-addr').value, bg: bgData() })); if (!silent) q('#pl-msg').textContent = 'Layout saved on this device.'; }
  catch (e) { localStorage.setItem('ff_planner', JSON.stringify({ runs, segType, gates, pxPerFt, addr: q('#pl-addr').value })); if (!silent) q('#pl-msg').textContent = 'Layout saved (background image too large to store).'; }
}
q('#pl-save').onclick = () => save(false);
q('#pl-png').onclick = () => { const a = document.createElement('a'); a.download = 'my-fence-layout.png'; a.href = cv.toDataURL('image/png'); a.click(); };
q('#pl-send').addEventListener('click', () => {
  save(true); const t = totals();
  let img = null; try { img = cv.toDataURL('image/jpeg', .6); } catch (e) {}
  window.ffProject.set('planner', { feet: t.tot, address: q('#pl-addr').value, layout: { totalFt: t.tot, privacyFt: t.priv, gates: gates.map(g => g.w + ' ft'), scaled: !bg || scaled }, layoutImage: img && img.length < 1.5e6 ? img : null,
    gates: t.gates, summary: [['Measured fence (approx.)', t.tot + ' ft'], ['Privacy sections', t.priv + ' ft'], ['Gates', t.gates ? gates.map(g => g.w + ' ft').join(', ') : 'None'], ['Address', q('#pl-addr').value || 'Not provided']] });
});
draw();
