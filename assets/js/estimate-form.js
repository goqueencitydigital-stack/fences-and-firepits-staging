// Multi-step "Free Fence Estimate" form — /request-estimate/ and embedded forms.
import { submitLead } from './lead.js';
const D = window.FF_DATA, C = window.FF_CONFIG;

document.querySelectorAll('[data-estimate]').forEach(init);

function init(root) {
  const compact = root.dataset.estimate === 'compact';
  const pj = window.ffProject.get();
  const mats = D.materials.filter(m => m.status !== 'confirm');
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${v}" ${String(v) === String(cur || '') ? 'selected' : ''}>${l}</option>`).join('');
  const pre = pj && pj.summary ? `<div class="prefill"><b>Added from the ${({ studio: 'Design Studio', calculator: 'Cost Calculator', planner: 'Fence Planner', quiz: 'Style Quiz' })[pj.origin] || 'site'}</b>${pj.summary.map(r => esc(r[0]) + ': ' + esc(r[1])).join(' · ')}<br><button type="button" class="link" data-clear style="background:none;border:0;padding:0;margin-top:.4rem;cursor:pointer;font-size:.8rem">Remove these details</button></div>` : '';
  const ID = 'ef' + Math.random().toString(36).slice(2, 7);
  const cur = k => { if (!pj) return ''; const v = pj[k] !== undefined ? pj[k] : (pj.design && pj.design[k]); return v == null ? '' : String(v); };
  const pills = (name, legend, arr, val) => `<fieldset class="field pillset"><legend>${legend}</legend><div class="pills-row">${arr.map(([v, l], i) => `<label class="fpill"><input type="radio" name="${name}" value="${v}" ${String(v) === String(val == null ? '' : val) || (i === 0 && !arr.some(x => String(x[0]) === String(val == null ? '' : val))) ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>`;
  const curMat = cur('material');
  const tiles = `<fieldset class="field mat-tiles"><legend>What kind of fence?</legend><div class="mt-grid">${mats.map(m => `<label class="mtile"><input type="radio" name="material" value="${m.id}" ${curMat === m.id ? 'checked' : ''}><span class="mt-img">${m.image ? `<img src="${C.root}${m.image.src}" alt="" loading="lazy" width="160" height="110">${m.image.real ? '' : '<em>Concept image</em>'}` : ''}</span><span class="mt-txt"><b>${m.name}</b><small>${esc(m.tagline || '')}</small></span><i class="mt-check" aria-hidden="true"></i></label>`).join('')}<label class="mtile mt-unsure"><input type="radio" name="material" value="" ${mats.some(m => m.id === curMat) ? '' : 'checked'}><span class="mt-img"><span class="mt-q" aria-hidden="true">?</span></span><span class="mt-txt"><b>Not sure yet</b><small>Ron can recommend options on site.</small></span><i class="mt-check" aria-hidden="true"></i></label></div></fieldset>`;
  root.innerHTML = `
  <form class="form-shell${compact ? ' is-compact' : ' is-full'}" novalidate data-form-id="${compact ? 'estimate_compact' : 'estimate_full'}">
    ${compact ? '' : `<div class="fhead"><p class="eyebrow">Free on-site estimate</p><h2 class="h3">Tell us about your fence</h2><p>Three short steps. Only your address, ZIP and contact details are required.</p></div>`}
    <ol class="fsteps" aria-hidden="true"><li class="on"><span>1</span>Your fence</li><li><span>2</span>Project</li><li><span>3</span>Contact</li></ol>
    <p class="sr-only" id="${ID}-sl" aria-live="polite">Step 1 of 3 · Your fence</p>
    ${pre}
    <fieldset class="fstep" data-s="1" style="border:0;padding:0;margin:0"><legend class="sr-only">Your fence</legend>
      ${compact ? '' : tiles + `<div class="pill-grid">${pills('height', 'Fence height', [['', 'Not sure'], ['3', '3 ft'], ['4', '4 ft'], ['5', '5 ft'], ['6', '6 ft'], ['8', '8 ft']], cur('height'))}${pills('gates', 'Gates', [['', 'Not sure'], ['0', 'None'], ['1', '1'], ['2', '2'], ['3+', '3+']], pj && pj.gates !== undefined ? String(pj.gates) : '')}${pills('removal', 'Remove an old fence?', [['', 'Not sure'], ['yes', 'Yes'], ['no', 'No']], '')}${pills('hoa', 'In an HOA?', [['', 'Not sure'], ['yes', 'Yes'], ['no', 'No']], '')}</div>`}
      <div class="fgrid">
        ${compact ? `<div class="field"><label for="${ID}-mat">Fence material</label><select class="input fsel" id="${ID}-mat" name="material">${opt([['', 'Not sure yet'], ...mats.map(m => [m.id, m.name])], pj && (pj.material || (pj.design && pj.design.material)))}</select></div>` : ''}
        <div class="field"><label for="${ID}-style">Preferred style</label><input class="input" id="${ID}-style" name="style" maxlength="80" value="${esc(pj && pj.style || '')}" placeholder="e.g. Board-on-board"></div>
        ${compact ? `<div class="field"><label for="${ID}-h">Fence height</label><select class="input fsel" id="${ID}-h" name="height">${opt([['', 'Not sure'], ['3', '3 ft'], ['4', '4 ft'], ['5', '5 ft'], ['6', '6 ft'], ['8', '8 ft']], pj && (pj.height || (pj.design && pj.design.height)))}</select></div>` : ''}
        <div class="field"><label for="${ID}-ft">Approximate linear feet</label><input class="input" id="${ID}-ft" name="feet" type="number" min="0" max="10000" inputmode="numeric" value="${pj && pj.feet || ''}" placeholder="Optional"></div>
        ${compact ? `<div class="field"><label for="${ID}-g">Gates</label><select class="input fsel" id="${ID}-g" name="gates">${opt([['', 'Not sure'], ['0', 'None'], ['1', '1'], ['2', '2'], ['3+', '3 or more']], pj && pj.gates !== undefined ? String(pj.gates) : '')}</select></div>` : ''}
        <div class="field"><label for="${ID}-pt">Property type</label><select class="input fsel" id="${ID}-pt" name="property_type">${opt([['residential', 'Residential'], ['commercial', 'Commercial'], ['hoa', 'HOA / community']])}</select></div>
        ${compact ? `<div class="field"><label for="${ID}-rem">Existing fence removal?</label><select class="input fsel" id="${ID}-rem" name="removal">${opt([['', 'Not sure'], ['no', 'No'], ['yes', 'Yes']])}</select></div>
        <div class="field"><label for="${ID}-hoa">Is the property in an HOA?</label><select class="input fsel" id="${ID}-hoa" name="hoa">${opt([['', 'Not sure'], ['yes', 'Yes'], ['no', 'No']])}</select></div>` : ''}
        <div class="field"><label for="${ID}-tl">Timeline</label><select class="input fsel" id="${ID}-tl" name="timeline">${opt([['', 'Select'], ['asap', 'As soon as possible'], ['1-3', 'Within 1–3 months'], ['3+', '3+ months'], ['research', 'Just researching']])}</select></div>
        <div class="field"><label for="${ID}-bud">Budget range (optional)</label><select class="input fsel" id="${ID}-bud" name="budget">${opt([['', 'Prefer not to say'], ['<3k', 'Under $3,000'], ['3-6k', '$3,000–$6,000'], ['6-10k', '$6,000–$10,000'], ['10k+', '$10,000+']])}</select></div>
      </div>
    </fieldset>
    <fieldset class="fstep" data-s="2" hidden style="border:0;padding:0;margin:0"><legend class="sr-only">Project details</legend>
      <div class="fgrid">
        <div class="field" style="grid-column:1/-1"><label for="${ID}-addr">Project address <span aria-hidden="true">*</span></label><input class="input" id="${ID}-addr" name="address" required autocomplete="street-address" value="${esc(pj && pj.address || '')}"><p class="ferr" id="${ID}-addr-e"></p></div>
        <div class="field"><label for="${ID}-city">City</label><input class="input" id="${ID}-city" name="city" autocomplete="address-level2"></div>
        <div class="field"><label for="${ID}-zip">ZIP <span aria-hidden="true">*</span></label><input class="input" id="${ID}-zip" name="zip" required inputmode="numeric" maxlength="5" autocomplete="postal-code" value="${esc(pj && pj.zip || '')}"><p class="ferr" id="${ID}-zip-e"></p></div>
        <div class="field" style="grid-column:1/-1"><label for="${ID}-notes">Tell us about your project</label><textarea class="input" id="${ID}-notes" name="notes" rows="4" maxlength="2000" placeholder="Slopes, pets, pool, HOA rules, gate locations…">${esc(pj && pj.special || '')}</textarea></div>
        <div class="field" style="grid-column:1/-1"><span class="caps" style="display:block;margin-bottom:.4rem">Photos, plat or site plan (optional)</span>
          <label class="dropzone" for="${ID}-files">Drag files here or <u>browse</u><br><small>JPG, PNG, HEIC or PDF · up to 5 files, 10 MB each</small></label>
          <input class="sr-only" id="${ID}-files" name="files[]" type="file" multiple accept="image/*,.pdf,.heic"><ul class="fine" data-filelist style="list-style:none;padding:0;margin:.5rem 0 0"></ul><p class="ferr" id="${ID}-files-e"></p></div>
      </div>
    </fieldset>
    <fieldset class="fstep" data-s="3" hidden style="border:0;padding:0;margin:0"><legend class="sr-only">Contact information</legend>
      <div class="fgrid">
        <div class="field"><label for="${ID}-fn">Full name <span aria-hidden="true">*</span></label><input class="input" id="${ID}-fn" name="name" required autocomplete="name"><p class="ferr" id="${ID}-fn-e"></p></div>
        <div class="field"><label for="${ID}-ph">Phone <span aria-hidden="true">*</span></label><input class="input" id="${ID}-ph" name="phone" required type="tel" autocomplete="tel" inputmode="tel"><p class="ferr" id="${ID}-ph-e"></p></div>
        <div class="field"><label for="${ID}-em">Email <span aria-hidden="true">*</span></label><input class="input" id="${ID}-em" name="email" required type="email" autocomplete="email"><p class="ferr" id="${ID}-em-e"></p></div>
        <div class="field"><label for="${ID}-cm">Preferred contact method</label><select class="input fsel" id="${ID}-cm" name="contact_method">${opt([['phone', 'Phone call'], ['text', 'Text message'], ['email', 'Email']])}</select></div>
        <div class="field" style="grid-column:1/-1"><label class="check"><input type="checkbox" name="consent_contact" required id="${ID}-cc"><span>I agree that Fences &amp; Firepits may contact me about this estimate by phone or email. <span aria-hidden="true">*</span></span></label><p class="ferr" id="${ID}-cc-e"></p>
          <label class="check" style="margin-top:.6rem"><input type="checkbox" name="consent_sms" value="yes"><span>Optional: I agree to receive text messages about my estimate and scheduling. Message frequency varies; message and data rates may apply. Reply STOP to opt out. Consent is not a condition of purchase. See our <a class="link" href="${D.site.warranty.pdf}" target="_blank" rel="noopener">Terms &amp; Conditions</a>, including SMS terms (Section 3) and privacy (Section 7).</span></label></div>
        <div class="hp" aria-hidden="true"><label>Company website<input type="text" name="website_url" tabindex="-1" autocomplete="off"></label></div>
      </div>
    </fieldset>
    <div data-status aria-live="assertive"></div>
    <div class="form-actions"><button type="button" class="btn btn-ghost-dark" data-prev hidden>Back</button><button type="button" class="btn btn-brass" data-next style="margin-left:auto">Continue <span class="arrow">→</span></button><button type="submit" class="btn btn-brass" data-submit hidden style="margin-left:auto">GET MY FREE ESTIMATE <span class="arrow">→</span></button></div>
    ${compact ? '' : `<ul class="ftrust"><li>Free, no-obligation estimate</li><li>Itemized and in writing</li><li>2-year workmanship warranty</li></ul>`}
    <p class="fine fcall" style="margin-top:.75rem">Prefer to talk? <a class="link" href="tel:${D.site.tel}" data-loc="form">Call Ron at ${D.site.phone}</a>.</p>
  </form>`;

  const f = root.querySelector('form'), t0 = Date.now();
  let step = 1, files = [], started = false;
  const steps = [...f.querySelectorAll('.fstep')], bars = [...f.querySelectorAll('.fsteps li')];
  const names = ['Your fence', 'Project details', 'Contact information'];
  const status = f.querySelector('[data-status]');
  const show = n => {
    step = n; steps.forEach(s => s.hidden = +s.dataset.s !== n); bars.forEach((b, i) => { b.classList.toggle('on', i === n - 1); b.classList.toggle('done', i < n - 1); });
    f.querySelector('#' + ID + '-sl').textContent = 'Step ' + n + ' of 3 · ' + names[n - 1];
    f.querySelector('[data-prev]').hidden = n === 1; f.querySelector('[data-next]').hidden = n === 3; f.querySelector('[data-submit]').hidden = n !== 3;
    const first = steps[n - 1].querySelector('input,select,textarea'); if (first && started) first.focus();
  };
  const err = (name, msg) => { const el = f.elements[name]; const e = f.querySelector('#' + el.id + '-e'); if (e) e.textContent = msg || ''; el.setAttribute('aria-invalid', msg ? 'true' : 'false'); if (msg) el.setAttribute('aria-describedby', el.id + '-e'); return !msg; };
  const validate = n => {
    let ok = true;
    if (n === 2) {
      ok = err('address', f.address.value.trim().length < 5 ? 'Please enter the project address.' : '') && ok;
      ok = err('zip', !/^\d{5}$/.test(f.zip.value.trim()) ? 'Please enter a 5-digit ZIP code.' : '') && ok;
    }
    if (n === 3) {
      ok = err('name', f.elements.name.value.trim().length < 2 ? 'Please enter your name.' : '') && ok;
      ok = err('phone', f.phone.value.replace(/\D/g, '').length < 10 ? 'Please enter a 10-digit phone number.' : '') && ok;
      ok = err('email', !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.value.trim()) ? 'Please enter a valid email address.' : '') && ok;
      ok = err('consent_contact', !f.consent_contact.checked ? 'Please agree so we can contact you about your estimate.' : '') && ok;
    }
    if (!ok) { const bad = steps[n - 1].querySelector('[aria-invalid=true]'); bad && bad.focus(); }
    return ok;
  };
  f.addEventListener('focusin', () => { if (!started) { started = true; window.ffTrack('form_start', { form: f.dataset.formId }); } }, { once: false });
  f.querySelector('[data-next]').onclick = () => { if (validate(step)) { show(step + 1); window.ffTrack('form_step', { step: step }); } };
  f.querySelector('[data-prev]').onclick = () => show(step - 1);
  const clr = f.querySelector('[data-clear]'); if (clr) clr.onclick = () => { window.ffProject.clear(); clr.parentElement.remove(); };

  // attachments
  const input = f.querySelector('input[type=file]'), list = f.querySelector('[data-filelist]'), dz = f.querySelector('.dropzone');
  const addFiles = fl => {
    let msg = '';
    [...fl].forEach(x => { if (files.length >= 5) msg = 'Up to 5 files.'; else if (x.size > 10e6) msg = x.name + ' is larger than 10 MB.'; else files.push(x); });
    f.querySelector('#' + ID + '-files-e').textContent = msg; drawFiles();
  };
  const drawFiles = () => { list.innerHTML = files.map((x, i) => `<li>${esc(x.name)} (${Math.round(x.size / 1024)} KB) <button type="button" class="link" data-rm="${i}" style="background:none;border:0;cursor:pointer">Remove</button></li>`).join(''); };
  input.addEventListener('change', () => { addFiles(input.files); input.value = ''; });
  list.addEventListener('click', e => { const b = e.target.closest('[data-rm]'); if (b) { files.splice(+b.dataset.rm, 1); drawFiles(); } });
  ['dragenter', 'dragover'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('drag'); }));
  ['dragleave', 'drop'].forEach(ev => dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('drag'); }));
  dz.addEventListener('drop', e => addFiles(e.dataTransfer.files));

  f.addEventListener('submit', async e => {
    e.preventDefault();
    if (!validate(3)) return;
    if (f.website_url.value || Date.now() - t0 < 3000) { status.innerHTML = '<p class="notice warn">Please wait a moment and try again.</p>'; return; }
    const btn = f.querySelector('[data-submit]'); btn.disabled = true; btn.textContent = 'Sending…';
    const fd = new FormData(f); fd.delete('files[]'); files.forEach(x => fd.append('files[]', x));
    fd.append('form_id', f.dataset.formId);
    if (pj) { fd.append('origin', pj.origin || ''); fd.append('project_summary', JSON.stringify(pj.summary || [])); if (pj.design) fd.append('design', JSON.stringify(pj.design)); if (pj.layout) fd.append('layout', JSON.stringify(pj.layout)); if (pj.layoutImage) fd.append('layout_image', pj.layoutImage); if (pj.quiz) fd.append('quiz', JSON.stringify(pj.quiz)); }
    const r = await submitLead(fd);
    btn.disabled = false; btn.innerHTML = 'GET MY FREE ESTIMATE <span class="arrow">→</span>';
    if (r.ok) {
      window.ffProject.clear();
      root.innerHTML = `<div class="form-shell" tabindex="-1"><p class="caps" style="color:var(--forest);margin:0">Request received</p><p class="h2" style="margin:.4rem 0">Thank you, ${esc(fd.get('name').split(' ')[0])}.</p><p class="lead">Your estimate request reached our team. We will contact you by ${esc(f.contact_method ? fd.get('contact_method') : 'phone')} to schedule your free on-site visit.</p><p>Need to talk sooner? <a class="link" href="tel:${D.site.tel}">Call Ron at ${D.site.phone}</a>.</p></div>`;
      root.firstElementChild.focus();
    } else if (r.staging) {
      status.innerHTML = `<p class="notice warn"><strong>Staging preview — this request was not sent.</strong> Validation passed and the data below would be delivered to ${D.site.leadRecipients.join(', ')} on production. Fields: ${[...fd.keys()].filter(k => !['layout_image', 'website_url'].includes(k)).join(', ')}.</p>`;
      window.ffTrack('form_submit_staging', { form: f.dataset.formId });
    } else {
      status.innerHTML = `<p class="notice bad"><strong>Your request did not go through.</strong> Nothing was lost on your screen — please try again, or call Ron directly at <a class="link" href="tel:${D.site.tel}">${D.site.phone}</a>.</p>`;
      window.ffTrack('form_submit_error', { form: f.dataset.formId, error: r.error });
    }
    status.querySelector('.notice') && status.querySelector('.notice').scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
  show(1);
}
function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]); }
