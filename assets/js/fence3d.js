// Fences & Firepits — parametric 3D fence renderer (three.js r183)
// Units are feet. Every style/height/color/gate option produces real geometry.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const SECTION = 8; // ft between line posts

export function hasWebGL() {
  try { const c = document.createElement('canvas'); return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl'))); } catch (e) { return false; }
}

function noiseTexture(base, vary, size = 256, streak = false) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size);
  const n = streak ? 900 : 5000;
  for (let i = 0; i < n; i++) {
    const a = Math.random() * vary;
    g.fillStyle = Math.random() > .5 ? `rgba(255,255,255,${a})` : `rgba(0,0,0,${a})`;
    if (streak) g.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 20 + Math.random() * 60);
    else g.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}
function chainTexture(hex) {
  const s = 64, c = document.createElement('canvas'); c.width = c.height = s;
  const g = c.getContext('2d'); g.clearRect(0, 0, s, s); g.strokeStyle = hex; g.lineWidth = 3.2;
  g.beginPath(); g.moveTo(0, s / 2); g.lineTo(s / 2, 0); g.lineTo(s, s / 2); g.lineTo(s / 2, s); g.closePath(); g.stroke();
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function createFenceScene(canvas, opts = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.lowPower ? 1.5 : 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.5, 600);
  camera.position.set(50, 19, 60);
  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 3, 4); controls.enableDamping = true; controls.dampingFactor = .08;
  controls.minDistance = 14; controls.maxDistance = 110; controls.maxPolarAngle = Math.PI * .47; controls.enablePan = false;
  controls.autoRotate = !!opts.autoRotate; controls.autoRotateSpeed = .45;
  if (opts.noZoom) controls.enableZoom = false;

  // lights
  const hemi = new THREE.HemisphereLight(0xdfe9f3, 0x4a5a3a, .9); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff1dc, 2.4); sun.position.set(-30, 45, 25); sun.castShadow = true;
  sun.shadow.mapSize.set(opts.lowPower ? 1024 : 2048, opts.lowPower ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 1, far: 140 }); sun.shadow.bias = -0.0004;
  scene.add(sun);
  const nightLights = new THREE.Group(); scene.add(nightLights);

  // ground
  const grassTex = noiseTexture('#5d7a3e', .12); grassTex.repeat.set(30, 30);
  const ground = new THREE.Mesh(new THREE.CircleGeometry(220, 48), new THREE.MeshStandardMaterial({ map: grassTex, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  const patio = new THREE.Mesh(new THREE.BoxGeometry(22, .25, 9), new THREE.MeshStandardMaterial({ color: 0xb8b0a2, roughness: .9 }));
  patio.position.set(0, .12, -11.5); patio.receiveShadow = true; scene.add(patio);

  // trees (context)
  const trees = new THREE.Group(); scene.add(trees);
  const trunkM = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
  const leafM = new THREE.MeshStandardMaterial({ color: 0x2f4a2a, roughness: 1, flatShading: true });
  const pineM = new THREE.MeshStandardMaterial({ color: 0x27402a, roughness: 1, flatShading: true });
  const rng = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7);
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2, r = 42 + rng() * 40, x = Math.cos(a) * r, z = Math.sin(a) * r - 10;
    if (z > 30 && Math.abs(x) < 40) continue;
    const h = 18 + rng() * 22;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(.5, .8, h * .5, 6), trunkM); t.position.set(x, h * .25, z); t.castShadow = true; trees.add(t);
    const pine = rng() > .45;
    const top = pine ? new THREE.Mesh(new THREE.ConeGeometry(4 + rng() * 2, h * .75, 7), pineM) : new THREE.Mesh(new THREE.IcosahedronGeometry(5 + rng() * 3, 0), leafM);
    top.position.set(x, pine ? h * .62 : h * .6, z); top.castShadow = true; trees.add(top);
  }

  // house + fence groups
  const house = new THREE.Group(); scene.add(house);
  const fence = new THREE.Group(); scene.add(fence);
  let state = { material: 'wood', style: 'privacy', height: 6, color: 'natural-cedar', gate: 'single', gateWidth: 4, gateLoc: 'front', home: 'farmhouse', time: 'day' };

  const colorHex = {
    'natural-cedar': 0xa8693f, 'pressure-treated': 0xc4a271, white: 0xf1efe8, tan: 0xcdb995, gray: 0x9a9c98,
    black: 0x1a1b1d, bronze: 0x4e3d2b, galvanized: 0xa7adb0
  };
  const woodTex = noiseTexture('#ffffff', .1, 256, true);

  function mat(colorKey, kind) {
    const c = colorHex[colorKey] ?? 0xaaaaaa;
    if (kind === 'wood') return new THREE.MeshStandardMaterial({ color: c, map: woodTex, roughness: .85 });
    if (kind === 'vinyl') return new THREE.MeshStandardMaterial({ color: c, roughness: .45, metalness: 0 });
    if (kind === 'metal') return new THREE.MeshStandardMaterial({ color: c, roughness: .38, metalness: .55 });
    return new THREE.MeshStandardMaterial({ color: c, roughness: .6 });
  }

  // ----- geometry helpers: collect boxes into buckets then merge -----
  function Bucket() { this.geos = []; }
  Bucket.prototype.box = function (w, h, dpt, x, y, z, rotY = 0, rotZ = 0) {
    const g = new THREE.BoxGeometry(w, h, dpt); const m = new THREE.Matrix4();
    m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, rotY, rotZ)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m); this.geos.push(g);
  };
  Bucket.prototype.geo = function (g, x, y, z, rotY = 0, rotX = 0, rotZ = 0) {
    const m = new THREE.Matrix4(); m.compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rotX, rotY, rotZ)), new THREE.Vector3(1, 1, 1));
    g = g.clone(); g.applyMatrix4(m); this.geos.push(g);
  };
  function flush(bucket, material, group) {
    if (!bucket.geos.length) return;
    const nonIndexed = bucket.geos.map(g => g.index ? g.toNonIndexed() : g);
    nonIndexed.forEach(g => { ['uv', 'normal', 'position'].forEach(a => { if (!g.attributes[a]) g.setAttribute(a, new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * (a === 'uv' ? 2 : 3)), a === 'uv' ? 2 : 3)); }); Object.keys(g.attributes).forEach(k => { if (!['uv', 'normal', 'position'].includes(k)) g.deleteAttribute(k); }); });
    const merged = mergeGeometries(nonIndexed, false);
    const mesh = new THREE.Mesh(merged, material); mesh.castShadow = true; mesh.receiveShadow = true; group.add(mesh);
    bucket.geos.forEach(g => g.dispose());
  }

  // Build one straight run in local coords (x from 0..len, z=0), then place.
  function buildRun(len, cfg, gateSpec) {
    const g = new THREE.Group();
    const H = cfg.height; const kind = cfg.material === 'wood' ? 'wood' : cfg.material === 'vinyl' ? 'vinyl' : 'metal';
    const M = mat(cfg.color, kind);
    const postM = cfg.material === 'chain-link' ? mat(cfg.color, 'metal') : M;
    const B = new Bucket(), P = new Bucket(), X = new Bucket(); // infill, posts, extra (chain mesh handled separately)
    const n = Math.max(1, Math.round(len / SECTION)); const sec = len / n;
    const style = cfg.style;
    // posts
    for (let i = 0; i <= n; i++) {
      const x = i * sec;
      if (cfg.material === 'aluminum') { P.box(.22, H + .1, .22, x, (H + .1) / 2, 0); }
      else if (cfg.material === 'chain-link') { P.geo(new THREE.CylinderGeometry(.11, .11, H + .2, 10), x, (H + .2) / 2, 0); }
      else if (cfg.material === 'vinyl') { P.box(.42, H + .25, .42, x, (H + .25) / 2, 0); P.box(.5, .12, .5, x, H + .3, 0); }
      else if (style === 'split-rail') { P.box(.5, H + .4, .5, x, (H + .4) / 2, 0); }
      else { P.box(.32, H + .15, .32, x, (H + .15) / 2, 0); }
    }
    for (let i = 0; i < n; i++) {
      const x0 = i * sec, x1 = x0 + sec;
      const isGate = gateSpec && gateSpec.sections.includes(i);
      if (isGate) continue;
      infill(B, X, cfg, x0, x1, H, style);
    }
    flush(B, M, g); flush(P, postM, g); flush(X, M, g);
    if (cfg.material === 'chain-link') {
      const tex = chainTexture('#' + new THREE.Color(colorHex[cfg.color] ?? 0xaaaaaa).getHexString());
      const segs = [];
      for (let i = 0; i < n; i++) if (!(gateSpec && gateSpec.sections.includes(i))) segs.push(i);
      segs.forEach(i => {
        const t = tex.clone(); t.needsUpdate = true; t.repeat.set(sec * 2.2, H * 2.2);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(sec, H - .1), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .3, side: THREE.DoubleSide, metalness: .4, roughness: .5 }));
        m.position.set(i * sec + sec / 2, H / 2, 0); m.castShadow = true; g.add(m);
      });
      const R = new Bucket(); R.geo(new THREE.CylinderGeometry(.08, .08, len, 8), len / 2, H - .05, 0, 0, 0, Math.PI / 2); flush(R, postM, g);
    }
    if (gateSpec) gateSpec.sections.forEach((s, k) => {});
    if (gateSpec) buildGate(g, cfg, gateSpec, sec, H, M);
    return g;
  }

  function infill(B, X, cfg, x0, x1, H, style) {
    const w = x1 - x0, cx = (x0 + x1) / 2, m = cfg.material;
    const railsWood = () => { B.box(w, .29, .12, cx, .9, -.2); B.box(w, .29, .12, cx, H - .8, -.2); if (H > 5) B.box(w, .29, .12, cx, H / 2, -.2); };
    if (m === 'wood') {
      if (style === 'split-rail') {
        const rails = 3; for (let r = 0; r < rails; r++) { const y = .9 + r * ((H - 1.2) / (rails - 1)); B.geo(new THREE.CylinderGeometry(.22, .26, w, 7), cx, y, 0, 0, 0, Math.PI / 2); }
        return;
      }
      if (style === 'horizontal') {
        const bh = .46, gap = .06; for (let y = .15; y + bh <= H; y += bh + gap) B.box(w, bh, .06, cx, y + bh / 2, .19);
        B.box(w + .1, .12, .45, cx, H + .06, 0); return;
      }
      const pw = .46; railsWood();
      if (style === 'picket') { for (let x = x0 + .3; x < x1 - .2; x += pw + .28) { B.box(pw, H - .2, .06, x + pw / 2, (H - .2) / 2 + .2, .0); X.geo(new THREE.ConeGeometry(.33, .32, 4), x + pw / 2, H + .14, 0, Math.PI / 4); } return; }
      if (style === 'board-on-board') { for (let x = x0; x < x1 - .1; x += pw * 1.6) { B.box(pw, H, .06, x + pw / 2, H / 2 + .05, .05); B.box(pw, H, .06, x + pw * 1.3, H / 2 + .05, .12); } B.box(w, .12, .4, cx, H + .1, 0); return; }
      if (style === 'shadowbox') { let side = 1; for (let x = x0 + .1; x < x1 - .2; x += pw * .85) { B.box(pw, H, .06, x + pw / 2, H / 2 + .05, side * .22); side *= -1; } B.box(w, .12, .55, cx, H + .1, 0); return; }
      if (style === 'stockade') { for (let x = x0; x < x1 - .1; x += pw) { B.box(pw - .02, H - .25, .06, x + pw / 2, (H - .25) / 2 + .05, .05); X.geo(new THREE.ConeGeometry(.32, .45, 4), x + pw / 2, H - .02, .05, Math.PI / 4); } return; }
      if (style === 'decorative-top') { const ph = H - 1; for (let x = x0; x < x1 - .1; x += pw) B.box(pw - .02, ph, .06, x + pw / 2, ph / 2 + .05, .05); lattice(B, x0, x1, ph + .1, H - .05, .05); B.box(w, .12, .4, cx, H + .03, 0); return; }
      // standard privacy dog-ear
      for (let x = x0; x < x1 - .1; x += pw) { B.box(pw - .02, H - .12, .06, x + pw / 2, (H - .12) / 2 + .05, .05); B.box(.2, .17, .06, x + pw / 2, H - .04, .05); }
      return;
    }
    if (m === 'vinyl') {
      B.box(w - .4, .35, .32, cx, .35, 0); B.box(w - .4, .4, .32, cx, H - .2, 0);
      if (style === 'privacy') { B.box(w - .4, H - .75, .1, cx, (H - .75) / 2 + .52, 0); return; }
      if (style === 'lattice-top') { const ph = H - 1.4; B.box(w - .4, ph, .1, cx, ph / 2 + .52, 0); B.box(w - .4, .22, .3, cx, ph + .6, 0); lattice(B, x0 + .2, x1 - .2, ph + .72, H - .4, 0); return; }
      if (style === 'semi-privacy') { for (let x = x0 + .3; x < x1 - .4; x += .62) B.box(.5, H - .75, .1, x + .25, (H - .75) / 2 + .52, 0); return; }
      if (style === 'picket') { for (let x = x0 + .35; x < x1 - .4; x += .75) { B.box(.3, H - .3, .09, x + .15, (H - .3) / 2 + .15, .16); X.geo(new THREE.ConeGeometry(.22, .2, 4), x + .15, H - .05, .16, Math.PI / 4); } return; }
      if (style === 'ranch-rail') { B.geos.pop(); B.geos.pop(); const r = H > 4 ? 3 : 2; for (let k = 0; k < r; k++) B.box(w - .4, .5, .14, cx, .9 + k * ((H - 1.4) / (r - 1 || 1)), .15); return; }
    }
    if (m === 'aluminum') {
      const rails = style === 'three-rail' ? 3 : 2; const bottomY = style === 'flush-bottom' ? .2 : .55;
      const topY = style === 'spear-top' ? H - .55 : H - .08;
      for (let k = 0; k < rails; k++) { const y = rails === 3 ? [bottomY, topY - .9, topY][k] : [bottomY, topY][k]; B.box(w - .2, .14, .12, cx, y, 0); }
      const sp = .33;
      for (let x = x0 + .25; x < x1 - .15; x += sp) {
        const top = style === 'spear-top' ? H : H - .02, bot = style === 'flush-bottom' ? .14 : .4;
        B.box(.065, top - bot, .065, x, (top + bot) / 2, 0);
        if (style === 'spear-top') X.geo(new THREE.ConeGeometry(.07, .2, 4), x, top + .1, 0, Math.PI / 4);
      }
      if (style === 'puppy-picket') for (let x = x0 + .25 + sp / 2; x < x1 - .15; x += sp) B.box(.05, 1.2, .05, x, 1, 0);
      return;
    }
  }

  function lattice(B, x0, x1, y0, y1, z) {
    const h = y1 - y0, step = .45; const L = Math.hypot(h, h);
    for (let x = x0 - h; x < x1; x += step) {
      [1, -1].forEach(s => {
        const cx = x + h / 2; if (cx < x0 + h / 2 - .01 && s === 1) {} // keep simple: clip by bounds
        const mid = Math.min(Math.max(cx, x0 + h / 2), x1 - h / 2);
        if (Math.abs(mid - cx) > .01) return;
        B.box(.06, L, .04, cx, (y0 + y1) / 2, z, 0, s * Math.PI / 4);
      });
    }
    B.box(x1 - x0, .07, .08, (x0 + x1) / 2, y0, z); B.box(x1 - x0, .07, .08, (x0 + x1) / 2, y1, z);
  }

  function buildGate(group, cfg, spec, sec, H, M) {
    const x0 = spec.sections[0] * sec, x1 = (spec.sections[spec.sections.length - 1] + 1) * sec;
    const span = x1 - x0, gw = Math.min(spec.width, span - .4), cx = (x0 + x1) / 2;
    const leaves = (cfg.gate === 'double' || cfg.gate === 'driveway') ? 2 : 1;
    const lw = gw / leaves;
    // filler panels each side of the opening
    const fillW = (span - gw) / 2;
    const G = new Bucket(), F = new Bucket();
    if (fillW > .3) { infill(F, F, cfg, x0, x0 + fillW, H, cfg.style); infill(F, F, cfg, x1 - fillW, x1, H, cfg.style); }
    // gate posts
    const pw = cfg.material === 'vinyl' ? .46 : cfg.material === 'aluminum' ? .26 : .4;
    G.box(pw, H + .3, pw, cx - gw / 2 - pw / 2, (H + .3) / 2, 0); G.box(pw, H + .3, pw, cx + gw / 2 + pw / 2, (H + .3) / 2, 0);
    for (let l = 0; l < leaves; l++) {
      const lx0 = cx - gw / 2 + l * lw + .08, lx1 = lx0 + lw - .16, lcx = (lx0 + lx1) / 2, w = lx1 - lx0;
      const arch = cfg.gate === 'custom';
      const gh = H - .25;
      if (cfg.material === 'chain-link') {
        G.box(w, .12, .12, lcx, .3, 0); G.box(w, .12, .12, lcx, gh, 0); G.box(.12, gh, .12, lx0, gh / 2 + .15, 0); G.box(.12, gh, .12, lx1, gh / 2 + .15, 0);
        const t = chainTexture('#' + new THREE.Color(colorHex[cfg.color]).getHexString()); t.repeat.set(w * 2.2, gh * 2.2);
        const m = new THREE.Mesh(new THREE.PlaneGeometry(w, gh - .3), new THREE.MeshStandardMaterial({ map: t, transparent: true, alphaTest: .3, side: THREE.DoubleSide, metalness: .4, roughness: .5 }));
        m.position.set(lcx, gh / 2 + .15, 0); group.add(m);
      } else if (cfg.material === 'aluminum') {
        G.box(w, .14, .12, lcx, .5, 0); G.box(w, .14, .12, lcx, gh, 0);
        for (let x = lx0 + .1; x <= lx1 - .05; x += .33) {
          const t = l === 0 ? (x - lx0) / w : 1 - (x - lx0) / w;
          const extra = arch ? Math.sin(Math.min(1, (x - (cx - gw / 2)) / gw) * Math.PI) * .9 : 0;
          G.box(.065, gh - .4 + extra, .065, x, (gh - .4 + extra) / 2 + .4, 0);
        }
      } else {
        const step = cfg.material === 'vinyl' ? .55 : .47;
        for (let x = lx0; x <= lx1 - step / 2; x += step) {
          const rel = (x + step / 2 - (cx - gw / 2)) / gw; const extra = arch ? Math.sin(rel * Math.PI) * 1.1 : 0;
          const h = (cfg.style === 'picket' ? gh - .3 : gh) + extra;
          if (cfg.style === 'split-rail') continue;
          G.box(step - .03, h, .07, x + step / 2, h / 2 + .12, .12);
        }
        if (cfg.style === 'split-rail') { for (let k = 0; k < 3; k++) G.box(w, .3, .1, lcx, .9 + k * ((H - 1.2) / 2), .1); }
        G.box(w, .32, .12, lcx, .8, -.06); G.box(w, .32, .12, lcx, gh - .5, -.06);
        G.box(.12, Math.hypot(w, gh - 1.3), .1, lcx, gh / 2 + .15, -.12, 0, (l === 0 ? 1 : -1) * Math.atan2(w, gh - 1.3));
      }
    }
    flush(G, M, group); flush(F, M, group);
    // latch accent
    const latch = new THREE.Mesh(new THREE.BoxGeometry(.25, .12, .2), new THREE.MeshStandardMaterial({ color: 0x222222, metalness: .8, roughness: .3 }));
    latch.position.set(cx + (leaves === 2 ? 0 : gw / 2 - .25), H * .6, .25); group.add(latch);
  }

  // layout: U-shaped yard enclosure behind the house
  const W = 64, D = 40; // yard width & depth (ft)
  function rebuildFence() {
    fence.children.slice().forEach(c => { fence.remove(c); c.traverse(o => { if (o.geometry) o.geometry.dispose(); if (o.material) { o.material.map && o.material.map !== woodTex && o.material.map.dispose(); o.material.dispose(); } }); });
    const cfg = state;
    const gw = cfg.gate === 'none' ? 0 : (cfg.gateWidth || 4);
    const needSecs = Math.max(1, Math.ceil((gw + .8) / SECTION));
    const runs = [
      { id: 'left', len: D, pos: [-W / 2, 0, -14], rot: -Math.PI / 2 },
      { id: 'front', len: W, pos: [-W / 2, 0, -14 + D], rot: 0 },
      { id: 'right', len: D, pos: [W / 2, 0, -14 + D], rot: Math.PI / 2 },
      { id: 'tieL', len: 8, pos: [-W / 2, 0, -14], rot: 0 },
      { id: 'tieR', len: 8, pos: [W / 2 - 8, 0, -14], rot: 0 }
    ];
    runs.forEach(r => {
      const n = Math.round(r.len / SECTION);
      let gateSpec = null;
      if (cfg.gate !== 'none' && r.id === (cfg.gateLoc || 'front')) {
        const start = Math.max(0, Math.floor(n / 2 - needSecs / 2)); gateSpec = { sections: Array.from({ length: needSecs }, (_, k) => start + k), width: gw };
        if (r.id !== 'front') gateSpec.sections = gateSpec.sections.map(s => Math.min(n - needSecs, s + 1));
      }
      const g = buildRun(r.len, cfg, gateSpec);
      g.position.set(...r.pos); g.rotation.y = r.rot;
      fence.add(g);
    });
  }

  function rebuildHouse() {
    house.children.slice().forEach(c => { house.remove(c); c.geometry && c.geometry.dispose(); });
    const style = state.home;
    const sideC = style === 'modern' ? 0xe9e6df : style === 'traditional' ? 0x8b6b5a : 0xf2f0ea;
    const roofC = style === 'modern' ? 0x1d1f21 : style === 'traditional' ? 0x3d3f42 : 0x222426;
    const trimC = style === 'modern' ? 0x1c1d1f : style === 'traditional' ? 0xefede6 : 0x1c1d1f;
    const side = new THREE.MeshStandardMaterial({ color: sideC, roughness: .9 });
    const roofM = new THREE.MeshStandardMaterial({ color: roofC, roughness: .7, metalness: style === 'farmhouse' ? .3 : 0 });
    const glassM = new THREE.MeshStandardMaterial({ color: 0x23303a, roughness: .15, metalness: .6, emissive: 0xffb469, emissiveIntensity: state.time === 'evening' ? 1.1 : 0 });
    const trimM = new THREE.MeshStandardMaterial({ color: trimC, roughness: .6 });
    const add = (geo, m, x, y, z, ry = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.rotation.y = ry; o.castShadow = true; o.receiveShadow = true; house.add(o); return o; };
    const hz = -24, hw = 46, hd = 18;
    if (style === 'modern') {
      add(new THREE.BoxGeometry(hw, 12, hd), side, 0, 6, hz);
      add(new THREE.BoxGeometry(26, 10, hd - 2), new THREE.MeshStandardMaterial({ color: 0x2b2d30, roughness: .8 }), 8, 17, hz - 1);
      add(new THREE.BoxGeometry(hw + 2, .6, hd + 2), roofM, 0, 12.3, hz);
      add(new THREE.BoxGeometry(28, .6, hd), roofM, 8, 22.2, hz - 1);
      add(new THREE.BoxGeometry(22, 8.5, .2), glassM, -6, 5, hz + hd / 2 + .05);
      add(new THREE.BoxGeometry(16, 6, .2), glassM, 10, 17, hz + hd / 2 - .9);
    } else {
      add(new THREE.BoxGeometry(hw, 20, hd), side, 0, 10, hz);
      const R = (hd + 2) / 1.732; // triangular prism roof
      const roof = new THREE.CylinderGeometry(R, R, hw + 1.5, 3, 1, false, Math.PI / 2);
      const r = add(roof, roofM, 0, 20 + .5 * R * .6, hz); r.rotation.z = Math.PI / 2; r.scale.set(.6, 1, 1);
      const win = (x, y) => { add(new THREE.BoxGeometry(3.2, 5, .2), glassM, x, y, hz + hd / 2 + .05); add(new THREE.BoxGeometry(3.8, .35, .3), trimM, x, y - 2.7, hz + hd / 2 + .1); };
      [-16, -8, 8, 16].forEach(x => { win(x, 5.5); win(x, 14.5); });
      add(new THREE.BoxGeometry(8, 7.5, .2), glassM, 0, 4.2, hz + hd / 2 + .05);
      if (style === 'farmhouse') for (let x = -hw / 2 + 1; x < hw / 2; x += 1.6) add(new THREE.BoxGeometry(.12, 20, .1), trimM, x, 10, hz + hd / 2 + .02);
    }
  }

  function applyTime() {
    const ev = state.time === 'evening';
    scene.background = new THREE.Color(ev ? 0x141c26 : 0xcfdde6);
    scene.fog = new THREE.Fog(scene.background, 90, 260);
    hemi.intensity = ev ? .25 : .9; hemi.color.set(ev ? 0x6d7fa8 : 0xdfe9f3);
    sun.intensity = ev ? .25 : 2.4; sun.color.set(ev ? 0x7c8fc7 : 0xfff1dc);
    renderer.toneMappingExposure = ev ? 1.25 : 1.05;
    nightLights.clear();
    if (ev) {
      const pts = [];
      for (let x = -W / 2 + 8; x <= W / 2 - 8; x += 16) pts.push([x, -14 + D - 1.4]);
      for (let z = -6; z < -14 + D; z += 14) { pts.push([-W / 2 + 1.4, z]); pts.push([W / 2 - 1.4, z]); }
      pts.forEach(([x, z]) => {
        const l = new THREE.PointLight(0xffb873, 14, 16, 1.5); l.position.set(x, .8, z); nightLights.add(l);
        const b = new THREE.Mesh(new THREE.CylinderGeometry(.12, .15, .6, 8), new THREE.MeshStandardMaterial({ color: 0x222222, emissive: 0xffb873, emissiveIntensity: 2 })); b.position.set(x, .3, z); nightLights.add(b);
      });
      const fire = new THREE.PointLight(0xff8a3d, 30, 30, 1.4); fire.position.set(0, 2, -9); nightLights.add(fire);
    }
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2, .6, 8, 24), new THREE.MeshStandardMaterial({ color: 0x77706a, roughness: 1 }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(0, .7, -9); ring.castShadow = true; nightLights.add(ring);
    if (ev) { const f = new THREE.Mesh(new THREE.ConeGeometry(1.2, 2, 8), new THREE.MeshStandardMaterial({ color: 0xff7a2f, emissive: 0xff7a2f, emissiveIntensity: 3, transparent: true, opacity: .85 })); f.position.set(0, 1.7, -9); nightLights.add(f); }
    rebuildHouse();
  }

  function resize() {
    const r = canvas.parentElement.getBoundingClientRect();
    const w = Math.max(200, r.width), h = Math.max(200, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
    if (w < 600) { camera.fov = 46; } else camera.fov = 38; camera.updateProjectionMatrix();
  }
  const ro = new ResizeObserver(resize); ro.observe(canvas.parentElement); resize();

  let visible = true, raf;
  const io = new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) loop(); }, { threshold: 0 }); io.observe(canvas);
  function loop() { cancelAnimationFrame(raf); if (!visible) return; controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); }

  applyTime(); rebuildFence(); loop();

  return {
    set(partial) {
      const prev = state; state = Object.assign({}, state, partial);
      if (partial.time && partial.time !== prev.time) applyTime();
      else if (partial.home && partial.home !== prev.home) rebuildHouse();
      const fenceKeys = ['material', 'style', 'height', 'color', 'gate', 'gateWidth', 'gateLoc'];
      if (fenceKeys.some(k => k in partial && partial[k] !== prev[k])) rebuildFence();
    },
    get state() { return Object.assign({}, state); },
    view(name) {
      const v = { corner: [50, 19, 60], front: [0, 9, 66], top: [0, 92, 22], close: [20, 6, 40] }[name] || [50, 19, 60];
      camera.position.set(...v); controls.target.set(0, 3, name === "top" ? 2 : 4); controls.update();
    },
    zoom(f) { const dir = camera.position.clone().sub(controls.target); const len = THREE.MathUtils.clamp(dir.length() * f, controls.minDistance, controls.maxDistance); camera.position.copy(controls.target.clone().add(dir.setLength(len))); },
    autoRotate(on) { controls.autoRotate = on; },
    snapshot(type = 'image/jpeg', q = .86) { renderer.render(scene, camera); return renderer.domElement.toDataURL(type, q); },
    dispose() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); }
  };
}
