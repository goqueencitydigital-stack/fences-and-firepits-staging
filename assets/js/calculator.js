// Fence Cost Calculator — /fence-cost-calculator/
// Uses ONLY the administrator-controlled table in FF_DATA.pricing. Factors without an approved
// value are never priced; they are listed as "confirmed at your on-site estimate".
const D = window.FF_DATA, P = D.pricing, C = window.FF_CONFIG;
const el = document.getElementById('calc');
const mats = D.materials.filter(m => m.status !== 'confirm');
const $ = s => el.querySelector(s);
const money = n => '$' + Math.round(n).toLocaleString('en-US');

el.innerHTML = `
<form class="form-shell" id="calc-form" novalidate>
  <div class="fgrid">
    <div class="field"><label for="c-zip">Project ZIP code</label><input class="input" id="c-zip" name="zip" inputmode="numeric" maxlength="5" autocomplete="postal-code" placeholder="e.g. 28277"><p class="fine" id="c-zipmsg" aria-live="polite"></p></div>
    <div class="field"><label for="c-ft">Approximate linear feet</label><input class="input" id="c-ft" name="feet" type="number" min="10" max="5000" step="1" value="150" inputmode="numeric"><p class="fine">Not sure? Use the <a class="link" href="${C.links.planner}">fence planner</a> to measure.</p></div>
    <div class="field"><label for="c-mat">Material</label><select class="input fsel" id="c-mat" name="material">${mats.map(m => `<option value="${m.id}">${m.name}</option>`).join('')}</select></div>
    <div class="field"><label for="c-style">Style</label><select class="input fsel" id="c-style" name="style"></select></div>
    <div class="field"><label for="c-h">Height</label><select class="input fsel" id="c-h" name="height"></select></div>
    <div class="field"><label for="c-g">Number of gates</label><select class="input fsel" id="c-g" name="gates">${[0,1,2,3,4].map(n => `<option ${n===1?'selected':''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="c-gt">Gate type</label><select class="input fsel" id="c-gt" name="gateType">${D.gateTypes.filter(g => g.id !== 'none').map(g => `<option value="${g.id}">${g.name}</option>`).join('')}</select></div>
    <div class="field"><label for="c-ter">Terrain</label><select class="input fsel" id="c-ter" name="terrain"><option value="flat">Mostly flat</option><option value="slope">Gentle slope</option><option value="steep">Steep or uneven</option><option value="unsure">Not sure</option></select></div>
    <div class="field"><label for="c-rem">Existing fence removal</label><select class="input fsel" id="c-rem" name="removal"><option value="no">No removal needed</option><option value="yes">Yes, remove old fence</option><option value="unsure">Not sure</option></select></div>
    <div class="field"><label for="c-acc">Yard access</label><select class="input fsel" id="c-acc" name="access"><option value="easy">Easy access</option><option value="limited">Limited (narrow side yard, landscaping)</option><option value="unsure">Not sure</option></select></div>
    <div class="field" style="grid-column:1/-1"><label for="c-sp">Special requirements (optional)</label><input class="input" id="c-sp" name="special" maxlength="200" placeholder="Pool barrier, HOA rules, dog digging, tree roots…"></div>
  </div>
</form>
<div class="form-shell" id="calc-out" aria-live="polite"></div>`;

const f = $('#calc-form');
function fillStyle() {
  const m = D.materials.find(x => x.id === f.material.value);
  f.style.innerHTML = m.styles.filter(s => s.status === 'offered').map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  f.height.innerHTML = m.heights.map(h => `<option value="${h}" ${h === 6 || (h === 4 && !m.heights.includes(6)) ? 'selected' : ''}>${h} ft</option>`).join('');
}
fillStyle();

function zipStatus(z) {
  if (!/^\d{5}$/.test(z)) return null;
  if (P.serviceZips.includes(z)) return 'in';
  if (P.extendedZips.includes(z)) return 'ask';
  return 'out';
}
let tracked = false;
function calc() {
  const v = Object.fromEntries(new FormData(f));
  const feet = Math.max(0, Math.min(5000, parseInt(v.feet, 10) || 0)), gates = parseInt(v.gates, 10) || 0;
  const zs = zipStatus(v.zip);
  $('#c-zipmsg').textContent = zs === 'in' ? 'Great, this ZIP is in our service area.' : zs === 'ask' ? 'This ZIP may be outside our regular area. Call Ron to confirm.' : zs === 'out' ? 'This ZIP appears to be outside our listed service area. Call Ron to check.' : '';
  const rate = P.perFoot[v.material];
  const m = D.materials.find(x => x.id === v.material);
  const styleName = m.styles.find(s => s.id === v.style).name;
  const gateName = D.gateTypes.find(g => g.id === v.gateType).name;
  const gatePriced = gates > 0 && P.gatePricedTypes.includes(v.gateType);
  const onSite = [];
  if (gates > 0 && !gatePriced) onSite.push(gates + ' × ' + gateName.toLowerCase());
  if (+v.height !== 6 && +v.height !== 4) onSite.push(v.height + ' ft height');
  if (v.terrain !== 'flat') onSite.push('terrain (' + f.terrain.selectedOptions[0].text.toLowerCase() + ')');
  if (v.removal !== 'no') onSite.push('old fence removal and haul-away');
  if (v.access !== 'easy') onSite.push('yard access');
  if (v.special) onSite.push('special requirements');
  // Complexity meter: informative only, not priced.
  let cx = 1 + (v.terrain === 'slope' ? 1 : v.terrain === 'steep' ? 2 : 0) + (v.removal === 'yes' ? 1 : 0) + (v.access === 'limited' ? 1 : 0) + (gates > 2 || ['driveway','custom'].includes(v.gateType) && gates ? 1 : 0);
  cx = Math.min(5, cx);
  const cxLabel = ['', 'Straightforward', 'Moderate', 'Moderate', 'Involved', 'Complex'][cx];

  let range = '';
  if (P.showRanges && rate && feet >= 10) {
    const lo = feet * rate.low + (gatePriced ? gates * P.gate.low : 0), hi = feet * rate.high + (gatePriced ? gates * P.gate.high : 0);
    range = `<p class="caps muted" style="margin:0">Preliminary range</p><p class="out-big">${money(lo)} – ${money(hi)}</p>
      <p class="fine">Based on ${feet} linear ft of ${m.name.toLowerCase()} at ${money(rate.low)}–${money(rate.high)} per linear foot (the range used in our current online calculator; published starting price ${rate.published.replace(/^Starting at /, "").replace(/ \/ linear ft.*/, "")})${gatePriced ? ', plus ' + gates + ' walk gate' + (gates > 1 ? 's' : '') + ' at ' + money(P.gate.low) + '–' + money(P.gate.high) + ' each' : ''}.</p>`;
  } else {
    range = `<p class="caps muted" style="margin:0">Project summary</p><p class="h3">${feet || '—'} ft of ${m.name.toLowerCase()} fencing</p><p class="fine">Enter at least 10 linear feet to see a preliminary range.</p>`;
  }
  $('#calc-out').innerHTML = range + `
    <div style="margin:1rem 0"><p class="caps" style="margin:0 0 .4rem">Project complexity: <strong>${cxLabel}</strong></p><div class="complexity" role="img" aria-label="Project complexity ${cx} of 5">${[1,2,3,4,5].map(i => `<i class="${i <= cx ? 'on' : ''}"></i>`).join('')}</div></div>
    ${onSite.length ? `<p class="fine"><strong>Confirmed at your free on-site estimate:</strong> ${onSite.join(', ')}. These are not included in the range above.</p>` : ''}
    <p class="fine">This is a preliminary, non-binding range for planning only. Your final price depends on an on-site measurement, materials, layout, gates, terrain and site conditions, and is provided in a written estimate.</p>
    <div class="btn-row" style="margin-top:1rem"><a class="btn btn-brass" id="c-quote" href="${C.links.estimate}?from=calculator" data-track="calculator_quote_click">GET MY ACCURATE FREE QUOTE <span class="arrow">→</span></a><a class="btn btn-ghost-dark" href="tel:${D.site.tel}" data-loc="calculator">SPEAK WITH RON</a></div>`;
  window.ffProject.set('calculator', { zip: v.zip, feet, material: v.material, style: styleName, height: +v.height, gates, gateType: gates ? gateName : '', terrain: f.terrain.selectedOptions[0].text, removal: f.removal.selectedOptions[0].text, access: f.access.selectedOptions[0].text, special: v.special,
    summary: [['Material', m.name], ['Style', styleName], ['Height', v.height + ' ft'], ['Linear feet', feet], ['Gates', gates ? gates + ' × ' + gateName : 'None'], ['Terrain', f.terrain.selectedOptions[0].text], ['Removal', f.removal.selectedOptions[0].text], ['Access', f.access.selectedOptions[0].text]] });
  if (!tracked) { tracked = true; window.ffTrack('calculator_start', {}); }
}
f.addEventListener('input', e => { if (e.target.name === 'material') fillStyle(); calc(); });
f.addEventListener('change', e => { if (e.target.name === 'material') { fillStyle(); calc(); } });
f.addEventListener('submit', e => e.preventDefault());
// Prefill from studio
const pj = window.ffProject.get();
if (pj && pj.design && mats.find(m => m.id === pj.design.material)) { f.material.value = pj.design.material; fillStyle(); f.style.value = pj.design.style; f.height.value = pj.design.height; }
calc();
