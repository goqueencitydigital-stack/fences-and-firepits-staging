// Material comparison center — /compare-fencing-materials/
const D = window.FF_DATA, P = D.pricing, C = window.FF_CONFIG;
const box = document.getElementById('compare');
const mats = D.materials.filter(m => m.status !== 'confirm');
let sel = (new URLSearchParams(location.search).get('m') || 'wood,vinyl,aluminum').split(',').filter(id => mats.find(m => m.id === id)).slice(0, 3);
const meter = n => `<span class="meter" role="img" aria-label="${n} out of 5">${[1,2,3,4,5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
function render() {
  const ms = sel.map(id => mats.find(m => m.id === id));
  const rows = [
    ['Look', m => m.tagline], ['Privacy', m => meter(m.privacy)], ['Durability', m => meter(m.durability)], ['Low maintenance', m => meter(m.maintenance)],
    ['Style options', m => meter(m.customization)], ['Published starting rate', m => P.perFoot[m.id] ? P.perFoot[m.id].published : 'Quoted on site'],
    ['Maintenance', m => m.maintenanceText], ['Pets', m => m.petFit], ['Pools', m => m.poolFit], ['HOA', m => m.hoa],
    ['Best for', m => m.applications.join(', ')], ['Heights', m => m.heights.join(', ') + ' ft'],
    ['Styles', m => m.styles.filter(s => s.status === 'offered').map(s => s.name).join(', ')]
  ];
  box.innerHTML = `<div class="cmp-pick" role="group" aria-label="Choose up to three materials">${mats.map(m => `<label class="pill"><input type="checkbox" value="${m.id}" ${sel.includes(m.id) ? 'checked' : ''} ${!sel.includes(m.id) && sel.length >= 3 ? 'disabled' : ''}><span>${m.name}</span></label>`).join('')}</div>
  <p class="fine" aria-live="polite">${sel.length < 2 ? 'Select at least two materials to compare.' : 'Comparing ' + ms.map(m => m.name).join(', ') + '.'}</p>
  ${sel.length >= 1 ? `<div class="table-scroll" tabindex="0" role="region" aria-label="Comparison table (scrolls sideways)"><table class="cmp-table"><thead><tr><td></td>${ms.map(m => `<th scope="col">${m.name}</th>`).join('')}</tr></thead><tbody>
  ${rows.map(([k, f]) => `<tr><th scope="row">${k}</th>${ms.map(m => `<td>${f(m)}</td>`).join('')}</tr>`).join('')}
  <tr><th scope="row">Next step</th>${ms.map(m => `<td><a class="link" href="${C.root}${m.serviceUrl}/index.html">${m.name} fencing</a><br><a class="link" href="${C.links.studio}?m=${m.id}">Design in ${m.name.toLowerCase()}</a></td>`).join('')}</tr>
  </tbody></table></div>` : ''}
  <p class="fine" style="margin-top:1rem">Ratings are general guidance on a 1–5 scale for comparison only. Published starting rates come from our pricing page; your written estimate is based on an on-site measurement.</p>`;
}
box.addEventListener('change', e => {
  const v = e.target.value; if (e.target.checked) sel.push(v); else sel = sel.filter(x => x !== v);
  history.replaceState(null, '', '?m=' + sel.join(',')); render(); window.ffTrack('compare_materials', { materials: sel.join(',') });
});
render();
