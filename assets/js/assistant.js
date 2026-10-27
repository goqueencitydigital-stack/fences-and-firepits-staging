// "Ask the Fence Expert" — automated, rule-based assistant. Answers ONLY from approved site
// content in FF_DATA (catalog, FAQs, published pricing, warranty summary). It never invents
// prices, availability, legal requirements or specifications; unknowns are routed to Ron.
import { submitLead } from './lead.js';
const D = window.FF_DATA, C = window.FF_CONFIG, S = D.site, P = D.pricing;
const fab = document.querySelector('.asst-fab'), box = document.getElementById('asst');
const log = box.querySelector('.asst-log'), form = box.querySelector('.asst-f'), input = form.querySelector('input');
const L = C.links, page = slug => C.root + slug + '/index.html';
const a = (href, t) => `<a href="${href}">${t}</a>`;
const faq = q => (D.faqs.find(f => f.q.toLowerCase().includes(q)) || {}).a;
const mat = id => D.materials.find(m => m.id === id);

const intents = [
  { k: /\b(price|cost|how much|expensive|cheap|budget|per foot|quote)\b/, r: () => `<p>Our published starting rates per linear foot, installed: ${Object.entries(P.perFoot).map(([id, v]) => `<b>${mat(id).name}</b> ${v.published.replace('Starting at ', '')}`).join('; ')}. Gates, height, terrain and removal change the total.</p><p>For a preliminary range, try the ${a(L.calculator, 'Fence Cost Calculator')}. Your exact price comes from a free on-site estimate.</p>`, q: ['Get a free estimate', 'Talk to Ron'] },
  { k: /\b(wood|cedar|pine|pressure.?treated|board.?on.?board|shadowbox|horizontal|stockade|split rail)\b/, r: () => matAns('wood') },
  { k: /\b(vinyl|pvc|white fence)\b/, r: () => matAns('vinyl') },
  { k: /\b(aluminum|aluminium|ornamental|wrought|metal)\b/, r: () => matAns('aluminum') },
  { k: /\b(chain.?link|chainlink)\b/, r: () => matAns('chain-link') },
  { k: /\b(composite|trex|steel|iron|bamboo|brick|stone wall)\b/, r: () => `<p>I don't have confirmed information about that material on our approved list. Ron can tell you whether it's something we install.</p>`, q: ['Talk to Ron'] },
  { k: /\b(hoa|architectural|covenant|arc)\b/, r: () => `<p>${faq('hoa')}</p><p>See the ${a(page('hoa-fence-approval'), 'HOA Fence Approval guide')} for a checklist, and download an HOA spec sheet from the ${a(L.studio, 'Design Studio')}.</p>` },
  { k: /\b(permit|zoning|code|legal|setback|how tall can|height limit)\b/, r: () => `<p>${faq('permits')}</p><p>Height and placement limits depend on your jurisdiction, HOA and lot, so I can't give you a legal answer. We confirm what applies to your property during the on-site estimate.</p>` },
  { k: /\b(property line|survey|boundary|neighbor)\b/, r: () => `<p>${faq('property lines')}</p>` },
  { k: /\b(811|utilit|dig|irrigation|sprinkler line)\b/, r: () => `<p>${faq('811')}</p>` },
  { k: /\b(warrant|guarantee)\b/, r: () => `<p>${faq('warranty')}</p><p>${a(page('warranty'), 'Read the warranty details')}.</p>` },
  { k: /\b(area|serve|service area|location|near me|county|city|town|zip|mecklenburg|union|cabarrus|charlotte|matthews|waxhaw|huntersville|concord|mint hill|weddington|ballantyne|indian trail|monroe|cornelius|davidson|marvin|stallings|pineville|harrisburg|kannapolis|wesley chapel|mount pleasant)\b/, r: () => `<p>${faq('areas')}</p><p>${a(page('service-areas'), 'See all service areas')}. Outside these? ${a('tel:' + S.tel, 'Call Ron')} to check.</p>` },
  { k: /\b(fort mill|tega cay|rock hill|south carolina|sc\b|gastonia|mooresville)/, r: () => `<p>That area isn't on our confirmed service list. Please ${a('tel:' + S.tel, 'call Ron at ' + S.phone)} and he'll let you know.</p>` },
  { k: /\b(how long|timeline|schedule|when can|availability|available|start date|lead time|install time)\b/, r: () => `<p>I can't confirm scheduling or availability — that depends on the current calendar and materials. Ron can give you a real date.</p>`, q: ['Talk to Ron', 'Get a free estimate'] },
  { k: /\b(pool|swim)\b/, r: () => `<p>We install aluminum pool fencing with gate hardware options such as self-closing pool latches. Pool barrier requirements are set by your local code and inspector, and we confirm them for your property. ${a(page('pool-fence-installation-charlotte'), 'Pool fencing')}.</p>` },
  { k: /\b(dog|pet|puppy|cat)\b/, r: () => `<p>For dogs, solid wood or vinyl privacy at 6 ft is the most common choice; aluminum puppy picket and chain link also work well for containment. ${a(page('fence-guides/best-fence-for-large-dogs'), 'Best fences for large dogs')}.</p>` },
  { k: /\b(gate|driveway|arched|double gate|latch)\b/, r: () => `<p>We build single walk gates, double gates, driveway gates and custom arched gates, with gravity, lockable or self-closing pool latches. ${a(page('custom-gates-charlotte'), 'Custom gates')}. Pick gate width and location in the ${a(L.studio, 'Design Studio')}.</p>` },
  { k: /\b(repair|fix|broken|damaged|leaning|replace sections?)\b/, r: () => `<p>${faq('repair')}</p>`, q: ['Get a free estimate', 'Talk to Ron'] },
  { k: /\b(fire ?pit|patio|paver|outdoor living)\b/, r: () => `<p>Ask Ron about firepits and outdoor living — I don't have confirmed details about current availability for those projects.</p>`, q: ['Talk to Ron'] },
  { k: /\b(financ|payment|pay|deposit|credit)\b/, r: () => `<p>I can't confirm financing or payment terms here. Ron can walk you through them during your estimate.</p>`, q: ['Talk to Ron'] },
  { k: /\b(measure|footage|linear feet|how many feet|draw|layout|plan)\b/, r: () => `<p>Use the ${a(L.planner, 'Fence Planner')} to draw your fence line and get approximate footage, or read ${a(page('fence-guides/how-to-measure-yard-for-fence'), 'how to measure your yard')}. We measure precisely on site.</p>` },
  { k: /\b(design|visuali[sz]e|3d|see it|configur|studio)\b/, r: () => `<p>The ${a(L.studio, 'Fence Design Studio')} lets you pick material, style, height, color and gates and see it on a model home — then save a PDF or send it with your quote.</p>` },
  { k: /\b(compare|vs|versus|better|which (fence|material)|difference)\b/, r: () => `<p>Compare up to three materials side by side in the ${a(page('compare-fencing-materials'), 'Comparison Center')}, or take the 5-question ${a(page('fence-style-quiz'), 'Fence Style Quiz')}.</p>` },
  { k: /\b(hour|open|closed|weekend|saturday|sunday)\b/, r: () => `<p>Listed hours: ${S.hours}. Ron can be reached at ${a('tel:' + S.tel, S.phone)}.</p>` },
  { k: /\b(estimate|consult|visit|come out|appointment)\b/, r: () => `<p>${faq('estimates free')}</p><p>${a(L.estimate, 'Request your free estimate')} or ${a('tel:' + S.tel, 'call Ron')}.</p>` },
  { k: /\b(ron|human|person|call|phone|talk|speak|someone)\b/, r: () => `<p>You can reach Ron directly at ${a('tel:' + S.tel, S.phone)}. If you'd like, I can pass your name and number along so he can call you.</p>`, q: ['Have Ron call me'] },
  { k: /\b(review|rating|testimonial)\b/, r: () => `<p>See what customers say on our ${a(page('reviews'), 'reviews page')}.</p>` }
];
function matAns(id) {
  const m = mat(id), p = P.perFoot[id];
  return `<p><b>${m.name}:</b> ${m.summary}</p><p>Styles: ${m.styles.filter(s => s.status === 'offered').map(s => s.name).join(', ')}. Heights: ${m.heights.join(', ')} ft. ${p ? 'Published rate: ' + p.published + '.' : ''}</p><p>${a(page(m.serviceUrl), m.name + ' fencing')} · ${a(L.studio + '?m=' + id, 'Design it')}</p>`;
}
function reply(text) {
  const t = text.toLowerCase();
  if (/have ron call me/.test(t)) return capture();
  if (/get a free estimate/.test(t)) return say(`<p>${a(L.estimate, 'Start your free estimate request')} — it takes about two minutes.</p>`);
  if (/talk to ron/.test(t)) return say(`<p>Call or text Ron at ${a('tel:' + S.tel, S.phone)}, or I can have him call you.</p>`, ['Have Ron call me']);
  const hits = intents.filter(i => i.k.test(t));
  if (!hits.length) return say(`<p>I'm not sure about that one, and I don't want to guess. Ron can answer it directly at ${a('tel:' + S.tel, S.phone)}.</p>`, ['Have Ron call me', 'Fence prices', 'Service areas']);
  const best = hits.slice(0, 2);
  say(best.map(h => h.r()).join(''), best[0].q || ['Get a free estimate']);
}
function add(cls, html, qs) {
  const d = document.createElement('div'); d.className = 'msg ' + cls; d.innerHTML = html;
  if (qs && qs.length) { const w = document.createElement('div'); w.className = 'qs'; qs.forEach(q => { const b = document.createElement('button'); b.type = 'button'; b.textContent = q; b.onclick = () => ask(q); w.appendChild(b); }); d.appendChild(w); }
  log.appendChild(d); log.scrollTop = log.scrollHeight; return d;
}
const say = (h, qs) => add('bot', h, qs);
function ask(q) { add('me', esc(q)); window.ffTrack('assistant_question', { q: q.slice(0, 80) }); setTimeout(() => reply(q), 250); }
function capture() {
  const d = say(`<p>Happy to. With your permission, I'll send your name and number to Ron so he can call you. You can skip this anytime.</p>
  <form class="asst-cap" novalidate style="display:grid;gap:.45rem;margin-top:.5rem">
    <label class="sr-only" for="ac-n">Name</label><input id="ac-n" class="input" name="name" placeholder="Name" autocomplete="name" required>
    <label class="sr-only" for="ac-p">Phone</label><input id="ac-p" class="input" name="phone" placeholder="Phone" type="tel" autocomplete="tel" required>
    <label class="check"><input type="checkbox" name="consent_contact" required><span>Yes, Fences &amp; Firepits may call me about my fence project.</span></label>
    <input type="text" name="website_url" class="hp" tabindex="-1" aria-hidden="true" autocomplete="off">
    <button class="btn btn-brass btn-sm" type="submit">Send to Ron</button><p class="fine" data-st role="status"></p></form>`);
  const f = d.querySelector('form');
  f.addEventListener('submit', async e => {
    e.preventDefault(); const st = f.querySelector('[data-st]');
    if (f.elements.name.value.trim().length < 2 || f.phone.value.replace(/\D/g, '').length < 10 || !f.consent_contact.checked) { st.textContent = 'Please add your name, a 10-digit phone number and check the box.'; return; }
    if (f.website_url.value) return;
    const fd = new FormData(f); fd.append('form_id', 'assistant_callback'); fd.append('chat', [...log.querySelectorAll('.msg.me')].map(m => m.textContent).join(' | ').slice(0, 1500));
    const r = await submitLead(fd);
    st.textContent = r.ok ? 'Sent. Ron will call you soon.' : r.staging ? 'Staging preview: not sent. On the live site this goes to ' + S.leadRecipients[0] + '.' : 'That didn\'t go through. Please call ' + S.phone + '.';
  });
}
function esc(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }

let opened = false;
function open() {
  box.classList.add('open'); fab.setAttribute('aria-expanded', 'true'); fab.hidden = true;
  if (!opened) { opened = true; window.ffTrack('assistant_open', {}); say(`<p>Hi — I'm an automated assistant for Fences &amp; Firepits. I can answer common questions about materials, styles, published pricing, HOA prep and our tools. For anything specific to your property, Ron is the best person to ask.</p>`, ['Fence prices', 'Which fence is best for dogs?', 'HOA approval', 'Talk to Ron']); }
  input.focus();
}
function close() { box.classList.remove('open'); fab.hidden = false; fab.setAttribute('aria-expanded', 'false'); fab.focus(); }
fab.addEventListener('click', open);
box.querySelector('[data-close]').addEventListener('click', close);
box.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
form.addEventListener('submit', e => { e.preventDefault(); const v = input.value.trim(); if (!v) return; input.value = ''; ask(v); });
document.querySelectorAll('[data-open-assistant]').forEach(b => b.addEventListener('click', open));
