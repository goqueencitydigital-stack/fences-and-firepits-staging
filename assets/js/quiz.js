// 5-question fence recommendation quiz (homepage section + /fence-style-quiz/)
const D = window.FF_DATA, C = window.FF_CONFIG;

const Q = [
  { id: 'goal', q: 'What is the main job of your new fence?', o: [['privacy', 'Privacy from neighbors'], ['pets', 'Keep pets or kids in'], ['pool', 'Enclose a pool'], ['curb', 'Curb appeal'], ['boundary', 'Mark a property line']] },
  { id: 'view', q: 'How much of the view do you want to keep?', o: [['solid', 'Block it completely'], ['some', 'Some screening'], ['open', 'Keep it open']] },
  { id: 'care', q: 'How do you feel about maintenance?', o: [['none', 'As little as possible'], ['some', 'An occasional stain is fine'], ['any', 'Whatever looks best']] },
  { id: 'home', q: 'Which best describes your home?', o: [['modern', 'Modern or contemporary'], ['farmhouse', 'Modern farmhouse'], ['traditional', 'Traditional'], ['unsure', 'Not sure']] },
  { id: 'budget', q: 'Where are you on budget?', o: [['value', 'Best value per foot'], ['mid', 'Balanced'], ['premium', 'Invest in the look']] }
];

function recommend(a) {
  const s = { wood: 0, vinyl: 0, aluminum: 0, 'chain-link': 0 };
  if (a.goal === 'privacy') { s.wood += 3; s.vinyl += 3; }
  if (a.goal === 'pets') { s.wood += 2; s.vinyl += 1; s['chain-link'] += 2; s.aluminum += 1; }
  if (a.goal === 'pool') { s.aluminum += 5; }
  if (a.goal === 'curb') { s.aluminum += 3; s.vinyl += 2; s.wood += 1; }
  if (a.goal === 'boundary') { s['chain-link'] += 2; s.wood += 2; s.aluminum += 1; }
  if (a.view === 'solid') { s.wood += 2; s.vinyl += 2; s.aluminum -= 4; s['chain-link'] -= 4; }
  if (a.view === 'some') { s.vinyl += 1; s.wood += 1; }
  if (a.view === 'open') { s.aluminum += 2; s['chain-link'] += 1; s.wood -= 1; s.vinyl -= 1; }
  if (a.care === 'none') { s.vinyl += 2; s.aluminum += 2; s['chain-link'] += 1; s.wood -= 2; }
  if (a.care === 'any') { s.wood += 1; }
  if (a.budget === 'value') { s['chain-link'] += 2; s.wood += 2; s.vinyl -= 1; }
  if (a.budget === 'premium') { s.vinyl += 1; s.aluminum += 1; s.wood += 1; s['chain-link'] -= 2; }
  if (a.goal === 'curb' || a.goal === 'privacy') s['chain-link'] -= 2;
  const mat = Object.entries(s).sort((x, y) => y[1] - x[1])[0][0];
  let style, height, why;
  if (mat === 'wood') {
    if (a.view === 'open') { style = 'split-rail'; height = 4; }
    else if (a.home === 'modern' || a.home === 'farmhouse') { style = 'horizontal'; height = 6; }
    else if (a.goal === 'curb') { style = 'picket'; height = 4; }
    else { style = a.budget === 'value' ? 'privacy' : 'board-on-board'; height = 6; }
  } else if (mat === 'vinyl') { style = a.view === 'solid' ? 'privacy' : a.goal === 'curb' ? 'picket' : 'semi-privacy'; height = style === 'picket' ? 4 : 6; }
  else if (mat === 'aluminum') { style = a.goal === 'pool' ? 'pool' : a.goal === 'pets' ? 'puppy-picket' : a.home === 'traditional' ? 'spear-top' : 'flat-top'; height = a.goal === 'pool' ? 5 : 4; }
  else { style = a.goal === 'curb' ? 'black-coated' : 'residential'; height = a.goal === 'pets' ? 5 : 4; }
  const m = D.materials.find(x => x.id === mat);
  if (!m.heights.includes(height)) height = m.heights.find(h => h >= height) || m.heights[m.heights.length - 1];
  const st = m.styles.find(x => x.id === style) || m.styles[0];
  const reasons = [];
  if (a.goal === 'privacy' || a.view === 'solid') reasons.push('solid panels block sight lines');
  if (a.goal === 'pool') reasons.push('open aluminum keeps the pool visible and pairs with self-closing gate hardware');
  if (a.goal === 'pets') reasons.push('a continuous barrier with no climbable gaps keeps pets in');
  if (a.care === 'none' && mat !== 'wood') reasons.push('it never needs painting or staining');
  if (a.budget === 'value' && (mat === 'wood' || mat === 'chain-link')) reasons.push('it has one of the lowest published starting rates');
  if (a.home === 'modern' && style === 'horizontal') reasons.push('horizontal boards suit contemporary architecture');
  if (a.home === 'farmhouse' && style === 'horizontal') reasons.push('horizontal lines pair well with modern farmhouse homes');
  if (a.view === 'open' && mat === 'aluminum') reasons.push('it defines the yard without hiding the view');
  return { material: mat, mName: m.name, style: st.id, sName: st.name, height, why: reasons.length ? reasons : ['it balances the priorities you selected'], url: m.serviceUrl, color: mat === 'aluminum' ? 'black' : mat === 'vinyl' ? 'white' : mat === 'chain-link' ? (style === 'black-coated' ? 'black' : 'galvanized') : 'natural-cedar' };
}

function init(box) {
  let i = 0; const a = {};
  const render = () => {
    if (i >= Q.length) return result();
    const q = Q[i];
    box.innerHTML = `<div class="quiz-progress" aria-hidden="true"><i style="width:${(i / Q.length) * 100}%"></i></div>
      <fieldset style="border:0;padding:0;margin:0"><legend class="caps muted">Question ${i + 1} of ${Q.length}</legend><p class="h3" style="margin:.4rem 0 0">${q.q}</p>
      <div class="opts">${q.o.map(([v, l]) => `<label class="opt"><input type="radio" name="q-${q.id}" value="${v}" ${a[q.id] === v ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
      <div class="quiz-nav"><button type="button" class="btn btn-ghost-dark btn-sm" data-back ${i ? '' : 'disabled'}>Back</button><button type="button" class="btn btn-brass btn-sm" data-next ${a[q.id] ? '' : 'disabled'}>${i === Q.length - 1 ? 'SEE MY RECOMMENDED FENCE' : 'Next'}</button></div>`;
    const first = box.querySelector('input:checked') || box.querySelector('input'); first && i && first.focus();
  };
  box.addEventListener('change', e => { const q = Q[i]; if (e.target.name === 'q-' + q.id) { a[q.id] = e.target.value; box.querySelector('[data-next]').disabled = false; if (i === 0 && !box._t) { box._t = 1; window.ffTrack('quiz_start', {}); } } });
  box.addEventListener('click', e => {
    if (e.target.closest('[data-next]')) { i++; render(); }
    if (e.target.closest('[data-back]')) { i = Math.max(0, i - 1); render(); }
    if (e.target.closest('[data-restart]')) { i = 0; Object.keys(a).forEach(k => delete a[k]); render(); }
  });
  function result() {
    const r = recommend(a);
    const studio = `${C.links.studio}?m=${r.material}&s=${r.style}&h=${r.height}&c=${r.color}&g=single&gw=4`;
    window.ffTrack('quiz_complete', { material: r.material, style: r.style });
    window.ffProject.set('quiz', { material: r.material, style: r.sName, height: r.height, quiz: Object.assign({}, a), summary: [['Quiz recommendation', r.sName + ' ' + r.mName.toLowerCase() + ', ' + r.height + ' ft']] });
    box.innerHTML = `<div class="quiz-progress" aria-hidden="true"><i style="width:100%"></i></div>
      <p class="caps muted" style="margin:0">Your recommended fence</p>
      <p class="h2" style="margin:.4rem 0 .6rem">${r.height}-ft ${r.sName} ${r.mName.toLowerCase()}</p>
      <p class="lead">We suggest this because ${r.why.join(', ')}.</p>
      <p class="fine">Your answers are saved on this device and will be attached to your estimate request. Final recommendations are made on site, where HOA rules, slope and layout come into play.</p>
      <div class="btn-row" style="margin-top:1.25rem"><a class="btn btn-brass" href="${C.links.estimate}?from=quiz" data-track="quiz_estimate">Request an estimate for this fence <span class="arrow">→</span></a>
      <a class="btn btn-ghost-dark" href="${studio}">Open it in the Design Studio</a>
      <a class="btn btn-ghost-dark" href="${C.root}${r.url}/index.html">Learn about ${r.mName.toLowerCase()} fencing</a>
      <button type="button" class="btn btn-ghost-dark" data-restart>Start over</button></div>
      <div aria-live="polite" class="sr-only">Recommendation ready: ${r.height}-foot ${r.sName} ${r.mName}.</div>`;
  }
  render();
}

document.querySelectorAll('[data-quiz]').forEach(init);
