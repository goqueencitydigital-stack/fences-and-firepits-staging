// Lead submission. Success is reported ONLY after the endpoint confirms receipt
// (HTTP 2xx and {"success":true}). This fixes the live-site bug where network
// errors were shown to visitors as "Request Received".
const C = window.FF_CONFIG;
export async function submitLead(fd) {
  const a = window.ffAttribution() || {};
  fd.append('attribution', JSON.stringify(a));
  fd.append('page', location.pathname);
  fd.append('submitted_at', new Date().toISOString());
  if (!C.leadEndpoint) return { ok: false, staging: true };
  try {
    const res = await fetch(C.leadEndpoint, { method: 'POST', body: fd, credentials: 'same-origin' });
    let j = null; try { j = await res.json(); } catch (e) {}
    if (res.ok && j && j.success === true) { window.ffTrack('generate_lead', { form: fd.get('form_id') || 'estimate', origin: fd.get('origin') || '' }); return { ok: true }; }
    return { ok: false, error: (j && j.data && j.data.message) || 'Server error ' + res.status };
  } catch (e) { return { ok: false, error: 'network' }; }
}
