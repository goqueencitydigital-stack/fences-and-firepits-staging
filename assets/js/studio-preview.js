// Homepage Design Studio preview — live 3D teaser with material chips.
import { createFenceScene, hasWebGL } from './fence3d.js';
const box = document.getElementById('teaser');
const cv = box && box.querySelector('canvas');
const presets = {
  wood: { material: 'wood', style: 'horizontal', height: 6, color: 'natural-cedar' },
  vinyl: { material: 'vinyl', style: 'privacy', height: 6, color: 'white' },
  aluminum: { material: 'aluminum', style: 'flat-top', height: 4, color: 'black' },
  'chain-link': { material: 'chain-link', style: 'black-coated', height: 5, color: 'black' }
};
if (cv && hasWebGL()) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const sc = createFenceScene(cv, { lowPower: true, noZoom: true });
  sc.set(Object.assign({ gate: 'single', gateWidth: 4, gateLoc: 'front', home: 'farmhouse', time: 'day' }, presets.wood));
  if (!reduce) sc.autoRotate(true);
  box.addEventListener('click', e => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    box.querySelectorAll('[data-preset]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    if (b.dataset.preset === 'evening') { const on = b.dataset.on !== '1'; b.dataset.on = on ? '1' : ''; b.setAttribute('aria-pressed', String(on)); sc.set({ time: on ? 'evening' : 'day' }); return; }
    sc.set(presets[b.dataset.preset]);
    const l = document.getElementById('teaser-launch'); if (l) l.href = l.dataset.base + '?m=' + presets[b.dataset.preset].material + '&s=' + presets[b.dataset.preset].style;
  });
} else if (box) {
  box.querySelector('.teaser-fallback') && (box.querySelector('.teaser-fallback').hidden = false);
}
