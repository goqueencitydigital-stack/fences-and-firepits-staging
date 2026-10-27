// Fence Design Studio — /fence-design-studio/
import { createFenceScene, hasWebGL } from './fence3d.js';
import { makePdf } from './pdf.js';

const D = window.FF_DATA, C = window.FF_CONFIG, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
const root = $('#studio');
const mats = D.materials.filter(m => m.status !== 'confirm');
const HOMES = [['farmhouse', 'Modern farmhouse'], ['traditional', 'Traditional'], ['modern', 'Contemporary']];
const LOCS = [['front', 'Back of yard'], ['left', 'Left side'], ['right', 'Right side']];

const params = new URLSearchParams(location.search);
let st = {
  material: params.get('m') || 'wood', style: params.get('s') || 'privacy', height: parseFloat(params.get('h')) || 6,
  color: params.get('c') || 'natural-cedar', gate: params.get('g') || 'single', gateWidth: parseFloat(params.get('gw')) || 4,
  gateLoc: params.get('gl') || 'front', latch: params.get('l') || 'Gravity latch', home: params.get('home') || 'farmhouse', time: params.get('t') || 'day'
};
const saved = !location.search && window.ffProject.get();
if (saved && saved.origin === 'studio' && saved.design) Object.assign(st, saved.design);
normalize();

function M() { return D.materials.find(m => m.id === st.material); }
function normalize() {
  const m = M() || mats[0]; st.material = m.id;
  const okStyles = m.styles.filter(s => s.status === 'offered');
  if (!okStyles.find(s => s.id === st.style)) st.style = okStyles[0].id;
  if (!m.heights.includes(st.height)) st.height = m.heights.includes(6) ? 6 : m.heights[m.heights.length - 1];
  if (st.style === 'picket' && st.height > 4) st.height = 4;
  if (st.style === 'pool' && st.height < 4) st.height = 4;
  if (st.style === 'split-rail' && st.height > 4) st.height = 4;
  const okColors = m.colors.filter(c => D.colors[c].status === 'offered');
  if (!okColors.includes(st.color)) st.color = okColors[0];
  const gt = D.gateTypes.find(g => g.id === st.gate) || D.gateTypes[0]; st.gate = gt.id;
  if (gt.widths && !gt.widths.includes(st.gateWidth)) st.gateWidth = gt.widths[0];
  if (!D.latchTypes.includes(st.latch)) st.latch = D.latchTypes[0];
  if (!LOCS.some(l => l[0] === st.gateLoc)) st.gateLoc = LOCS[0][0];
  if (!HOMES.some(h => h[0] === st.home)) st.home = HOMES[0][0];
  if (!['day', 'evening'].includes(st.time)) st.time = 'day';
}
function allowedHeights() {
  const m = M(); let hs = m.heights.slice();
  if (st.style === 'picket') hs = hs.filter(h => h <= 4);
  if (st.style === 'split-rail' || st.style === 'ranch-rail') hs = hs.filter(h => h <= 5);
  if (st.style === 'pool') hs = hs.filter(h => h >= 4);
  if (['privacy', 'board-on-board', 'shadowbox', 'horizontal', 'stockade', 'decorative-top', 'lattice-top'].includes(st.style)) hs = hs.filter(h => h >= 4);
  return hs;
}
const label = {
  material: () => M().name,
  style: () => (M().styles.find(s => s.id === st.style) || {}).name,
  height: () => st.height + ' ft',
  color: () => D.colors[st.color].name,
  gate: () => st.gate === 'none' ? 'No gate' : D.gateTypes.find(g => g.id === st.gate).name + ' · ' + st.gateWidth + ' ft',
};
function specRows() {
  const r = [['Material', label.material()], ['Style', label.style()], ['Height', label.height()], ['Color / finish', label.color()], ['Gate', label.gate()]];
  if (st.gate !== 'none') { r.push(['Gate location', LOCS.find(l => l[0] === st.gateLoc)[1]]); r.push(['Latch', st.latch]); }
  r.push(['Home style shown', HOMES.find(h => h[0] === st.home)[1]]);
  return r;
}
function shareUrl() {
  const p = new URLSearchParams({ m: st.material, s: st.style, h: st.height, c: st.color, g: st.gate, gw: st.gateWidth, gl: st.gateLoc, l: st.latch, home: st.home, t: st.time });
  return location.origin + location.pathname + '?' + p.toString();
}

// ---------- render controls ----------
const steps = $('#studio-steps');
function pills(name, items, cur, opts = {}) {
  return '<div class="pillset" role="radiogroup" aria-label="' + opts.aria + '">' + items.map(it => {
    const dis = it.disabled ? ' disabled' : '';
    return '<label class="pill" title="' + (it.title || '') + '"><input type="radio" name="' + name + '" value="' + it.value + '"' + (String(it.value) === String(cur) ? ' checked' : '') + dis + '><span>' + it.label + '</span></label>';
  }).join('') + '</div>';
}
function render() {
  const m = M();
  const sec = (n, key, title, body) => {
    const v = label[key] ? label[key]() : '';
    return `<div class="acc done" data-step="${n}"><button class="acc-h" type="button" aria-expanded="${openStep === n}" aria-controls="acc-${n}"><span class="n">${n}</span><span class="t">${title}</span><span class="v">${v || ''}</span></button><div class="acc-b" id="acc-${n}" ${openStep === n ? '' : 'hidden'}>${body}</div></div>`;
  };
  const matHtml = pills('material', D.materials.map(x => ({ value: x.id, label: x.name, disabled: x.status === 'confirm', title: x.status === 'confirm' ? 'Ask about availability' : '' })), st.material, { aria: 'Fence material' })
    + '<p class="fine" style="margin-top:.75rem">' + m.summary + '</p>';
  const styleHtml = pills('style', m.styles.map(s => ({ value: s.id, label: s.name + (s.status === 'confirm' ? ' (ask us)' : ''), disabled: s.status !== 'offered', title: s.status !== 'offered' ? 'Ask Ron about availability' : '' })), st.style, { aria: 'Fence style' });
  const hs = allowedHeights();
  const heightHtml = pills('height', m.heights.map(h => ({ value: h, label: h + ' ft', disabled: !hs.includes(h) })), st.height, { aria: 'Fence height' })
    + '<p class="fine" style="margin-top:.75rem">' + D.heightNote + '</p>';
  const colorHtml = '<div class="swatches">' + m.colors.map(c => {
    const o = D.colors[c]; const dis = o.status !== 'offered';
    return `<label class="sw" title="${dis ? 'Ask about availability' : o.name}"><input type="radio" name="color" value="${c}" ${c === st.color ? 'checked' : ''} ${dis ? 'disabled' : ''}><span><i style="background:${o.hex}"></i>${o.name}${dis ? '<br><small>ask us</small>' : ''}</span></label>`;
  }).join('') + '</div>';
  const gt = D.gateTypes.find(g => g.id === st.gate);
  let gateHtml = pills('gate', D.gateTypes.map(g => ({ value: g.id, label: g.name })), st.gate, { aria: 'Gate type' });
  if (gt.widths) {
    gateHtml += '<p class="caps" style="margin:1rem 0 .5rem">Gate width</p>' + pills('gateWidth', gt.widths.map(w => ({ value: w, label: w + ' ft' })), st.gateWidth, { aria: 'Gate width' });
    gateHtml += '<p class="caps" style="margin:1rem 0 .5rem">Gate location</p>' + pills('gateLoc', LOCS.map(([v, l]) => ({ value: v, label: l })), st.gateLoc, { aria: 'Gate location' });
    gateHtml += '<p class="caps" style="margin:1rem 0 .5rem">Latch</p>' + pills('latch', D.latchTypes.map(l => ({ value: l, label: l })), st.latch, { aria: 'Latch type' });
  }
  const sceneHtml = '<p class="caps" style="margin:0 0 .5rem">Home style</p>' + pills('home', HOMES.map(([v, l]) => ({ value: v, label: l })), st.home, { aria: 'Home style' })
    + '<p class="caps" style="margin:1rem 0 .5rem">Lighting</p>' + pills('time', [{ value: 'day', label: 'Daylight' }, { value: 'evening', label: 'Evening' }], st.time, { aria: 'Lighting' })
    + '<p class="caps" style="margin:1rem 0 .5rem">Compare designs</p><div class="btn-row"><button type="button" class="btn btn-sm btn-ghost-dark" data-cmp="A">Save as Design A</button><button type="button" class="btn btn-sm btn-ghost-dark" data-cmp="B">Save as Design B</button></div><div class="compare-strip" id="cmp-strip"></div>';
  const saveHtml = `<div class="btn-row" style="flex-direction:column;align-items:stretch">
    <a class="btn btn-brass" id="st-quote" href="${C.links.estimate}?from=studio" data-track="studio_complete">Request a quote for this design <span class="arrow">→</span></a>
    <button type="button" class="btn btn-ghost-dark" id="st-pdf">Download PDF summary</button>
    <button type="button" class="btn btn-ghost-dark" id="st-hoa">Download HOA spec sheet</button>
    <a class="btn btn-ghost-dark" id="st-mail" href="#">Email this design to myself</a>
    <button type="button" class="btn btn-ghost-dark" id="st-save">Save design on this device</button>
    <button type="button" class="btn btn-ghost-dark" id="st-link">Copy shareable link</button>
  </div><p class="fine" id="st-msg" role="status" aria-live="polite" style="margin-top:.75rem"></p>`;
  steps.innerHTML = sec(1, 'material', 'Choose your material', matHtml) + sec(2, 'style', 'Choose your style', styleHtml) + sec(3, 'height', 'Choose fence height', heightHtml)
    + sec(4, 'color', 'Choose color or finish', colorHtml) + sec(5, 'gate', 'Add gates', gateHtml) + sec(6, null, 'Visualize & compare', sceneHtml) + sec(7, null, 'Save & request a quote', saveHtml);
  $('#st-mail').href = 'mailto:?subject=' + encodeURIComponent('My Fences & Firepits fence design') + '&body=' + encodeURIComponent('My fence design from Fences & Firepits:\n\n' + specRows().map(r => r[0] + ': ' + r[1]).join('\n') + '\n\nOpen it again: ' + shareUrl() + '\n\nQuestions? Call Ron at ' + D.site.phone);
  drawCompare();
  $('#spec-title').textContent = label.style() + ' · ' + label.material();
  $('#spec-body').textContent = label.height() + ' · ' + label.color() + ' · ' + label.gate();
}
let openStep = 1;
const cmp = {};
function drawCompare() {
  const el = $('#cmp-strip'); if (!el) return;
  el.innerHTML = ['A', 'B'].map(k => cmp[k] ? `<figure><img src="${cmp[k].img}" alt="Design ${k}: ${cmp[k].name}"><figcaption>${k} · ${cmp[k].name}</figcaption></figure>` : `<figure style="display:flex;align-items:center;justify-content:center;color:#8e8b84;font-size:.75rem">Design ${k} empty</figure>`).join('')
    + (cmp.A && cmp.B ? '<div style="grid-column:1/-1;display:flex;gap:.5rem"><button type="button" class="btn btn-sm btn-ghost-dark" data-load="A">Load A</button><button type="button" class="btn btn-sm btn-ghost-dark" data-load="B">Load B</button></div>' : '');
}

steps.addEventListener('click', e => {
  const h = e.target.closest('.acc-h');
  if (h) { const n = +h.parentElement.dataset.step; openStep = openStep === n ? 0 : n; render(); const nh = steps.querySelector(`[data-step="${n}"] .acc-h`); nh && nh.focus(); return; }
  const c = e.target.closest('[data-cmp]');
  if (c && scene) { cmp[c.dataset.cmp] = { img: scene.snapshot('image/jpeg', .7), name: label.style() + ' ' + label.material() + ' ' + label.height(), st: Object.assign({}, st) }; drawCompare(); window.ffTrack('studio_compare_save', { slot: c.dataset.cmp }); }
  const l = e.target.closest('[data-load]');
  if (l) { st = Object.assign({}, cmp[l.dataset.load].st); apply(); }
  if (e.target.id === 'st-save') { window.ffProject.set('studio', { design: st, summary: specRows() }); msg('Saved on this device. It will be here when you come back.'); }
  if (e.target.id === 'st-link') { navigator.clipboard && navigator.clipboard.writeText(shareUrl()).then(() => msg('Link copied to your clipboard.'), () => msg(shareUrl())); }
  if (e.target.id === 'st-pdf' || e.target.id === 'st-hoa') pdf(e.target.id === 'st-hoa');
  if (e.target.id === 'st-quote') window.ffProject.set('studio', { design: st, summary: specRows(), material: st.material, style: label.style(), height: st.height, color: label.color(), gates: st.gate === 'none' ? 0 : (st.gate === 'double' || st.gate === 'driveway' ? 1 : 1), gateType: label.gate() });
});
steps.addEventListener('change', e => {
  const t = e.target; if (!t.name) return;
  st[t.name] = ['height', 'gateWidth'].includes(t.name) ? parseFloat(t.value) : t.value;
  if (t.name === 'material') { st.style = ''; st.color = ''; }
  if (t.name === 'gate') st.gateWidth = 0;
  apply(t.name);
  window.ffTrack('studio_option', { option: t.name, value: t.value });
});
function msg(t) { const m = $('#st-msg'); if (m) m.textContent = t; }

let scene = null, started = false;
function apply(changed) {
  normalize(); render();
  if (changed) { const inp = steps.querySelector(`input[name="${changed}"]:checked`); inp && inp.focus({ preventScroll: true }); }
  if (scene) scene.set(st);
  if (!started) { started = true; window.ffTrack('studio_start', {}); }
  history.replaceState(null, '', shareUrl().replace(location.origin, ''));
}

async function pdf(hoa) {
  msg('Preparing your PDF…');
  try {
    await makePdf({
      site: D.site,
      title: hoa ? 'Fence Specification for HOA Review' : 'Your Fence Design',
      subtitle: hoa ? 'Prepared with the Fences & Firepits Design Studio. Attach to your architectural review application with your plat or site plan.' : 'Created in the Fences & Firepits Design Studio',
      image: scene ? scene.snapshot('image/jpeg', .85) : null,
      rows: specRows().concat(hoa ? [['Installer', D.site.legalName], ['Installer phone', D.site.phone], ['Fence location on lot', 'Attach plat/site plan with fence line marked'], ['Good side faces', 'Outward (typical HOA requirement — confirm)']] : []),
      notes: [D.heightNote, 'This design is a visualization for planning purposes. Colors on screen are approximate. Final materials, heights and layout are confirmed during a free on-site estimate.', hoa ? 'HOA and architectural committees set their own requirements and make all approval decisions. Fences & Firepits does not guarantee HOA approval.' : 'Request your free estimate at fencesandfirepits.com or call ' + D.site.phone + '.'],
      filename: hoa ? 'fence-hoa-spec-sheet.pdf' : 'my-fence-design.pdf'
    });
    msg('PDF downloaded.'); window.ffTrack(hoa ? 'hoa_spec_download' : 'studio_pdf_download', {});
  } catch (err) { msg('The PDF could not be created. Please try again, or use "Email this design to myself".'); }
}

// ---------- stage ----------
const canvas = $('#studio-canvas');
render();
if (hasWebGL()) {
  scene = createFenceScene(canvas, { lowPower: window.innerWidth < 700 });
  scene.set(st);
  $('#stage-views').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) scene.view(b.dataset.view); const z = e.target.closest('[data-zoom]'); if (z) scene.zoom(parseFloat(z.dataset.zoom)); });
  $('#stage-time').addEventListener('click', e => { const b = e.target.closest('[data-time]'); if (!b) return; st.time = b.dataset.time; apply(); $$('#stage-time [data-time]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.time === st.time))); });
} else {
  $('#studio-stage').innerHTML = '<div style="padding:2rem;color:#d8d5cd"><p class="h3" style="color:#fff">3D preview unavailable on this device</p><p>Your browser does not support WebGL. You can still build your design with the steps on this page, download the PDF summary and request a quote.</p></div>';
}
