/* Fences & Firepits — core site behaviour (no dependencies) */
(function () {
  const d = document, w = window;
  d.documentElement.classList.add('js');
  const CFG = w.FF_CONFIG || {};

  /* ---------- Analytics: one helper for GA4 / GTM / Ads / Meta ---------- */
  w.dataLayer = w.dataLayer || [];
  w.ffTrack = function (event, params) {
    params = Object.assign({ page_path: location.pathname, ff_source: ffAttribution().source || '(direct)' }, params || {});
    w.dataLayer.push(Object.assign({ event }, params));
    if (typeof w.gtag === 'function') w.gtag('event', event, params);
    if (typeof w.fbq === 'function' && /generate_lead|estimate_submit/.test(event)) w.fbq('track', 'Lead', params);
    if (CFG.staging && w.console) console.info('[ff-track]', event, params);
  };

  /* ---------- Source attribution / UTM capture (first + last touch) ---------- */
  function ffAttribution() {
    try { return JSON.parse(localStorage.getItem('ff_attr') || '{}'); } catch (e) { return {}; }
  }
  (function captureUtm() {
    const p = new URLSearchParams(location.search);
    const keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'gclid', 'fbclid'];
    const a = ffAttribution();
    const now = {};
    keys.forEach(k => { if (p.get(k)) now[k] = p.get(k); });
    if (Object.keys(now).length) {
      if (!a.first) a.first = Object.assign({ ts: Date.now(), landing: location.pathname }, now);
      a.last = Object.assign({ ts: Date.now(), landing: location.pathname }, now);
      a.source = now.utm_source || (now.gclid ? 'google-ads' : now.fbclid ? 'meta' : '');
    } else if (!a.first) {
      a.first = { ts: Date.now(), landing: location.pathname, referrer: d.referrer || '(direct)' };
      a.source = d.referrer ? new URL(d.referrer).hostname : '(direct)';
    }
    try { localStorage.setItem('ff_attr', JSON.stringify(a)); } catch (e) {}
  })();
  w.ffAttribution = ffAttribution;

  /* ---------- Project hand-off between tools and the estimate form ---------- */
  w.ffProject = {
    get() { try { return JSON.parse(localStorage.getItem('ff_project') || 'null'); } catch (e) { return null; } },
    set(origin, data) {
      const cur = this.get() || {};
      const next = Object.assign(cur, data, { origin, updated: new Date().toISOString() });
      try { localStorage.setItem('ff_project', JSON.stringify(next)); } catch (e) {}
      return next;
    },
    clear() { try { localStorage.removeItem('ff_project'); } catch (e) {} }
  };

  /* ---------- Header: scroll state, mega menu, drawer ---------- */
  const hdr = d.querySelector('.hdr');
  const onScroll = () => hdr && hdr.classList.toggle('scrolled', w.scrollY > 8);
  w.addEventListener('scroll', onScroll, { passive: true }); onScroll();

  d.querySelectorAll('[data-mega]').forEach(btn => {
    const panel = d.getElementById(btn.getAttribute('aria-controls'));
    let t;
    let openedAt = 0;
    const open = () => { closeAll(btn); clearTimeout(t); if (btn.getAttribute('aria-expanded') !== 'true') openedAt = Date.now(); btn.setAttribute('aria-expanded', 'true'); place(); panel.classList.add('open'); };
    const place = () => { const r = btn.getBoundingClientRect(), vw = d.documentElement.clientWidth, pw = panel.offsetWidth; panel.style.left = Math.max(16, Math.min(r.left - 20, vw - pw - 16)) + 'px'; panel.style.setProperty('--caret', Math.max(24, r.left + r.width / 2 - Math.max(16, Math.min(r.left - 20, vw - pw - 16))) + 'px'); };
    const close = () => { btn.setAttribute('aria-expanded', 'false'); panel.classList.remove('open'); };
    btn.addEventListener('click', () => (btn.getAttribute('aria-expanded') === 'true' && Date.now() - openedAt > 400) ? close() : open()); // hover-then-click keeps it open
    const li = btn.parentElement;
    if (w.matchMedia('(hover:hover)').matches) {
      li.addEventListener('mouseenter', open);
      li.addEventListener('mouseleave', () => { t = setTimeout(close, 160); });
      panel.addEventListener('mouseenter', () => clearTimeout(t));
      panel.addEventListener('mouseleave', () => { t = setTimeout(close, 160); });
    }
    panel.addEventListener('keydown', e => { if (e.key === 'Escape') { close(); btn.focus(); } });
    btn._close = close;
  });
  function closeAll(except) { d.querySelectorAll('[data-mega]').forEach(b => { if (b !== except && b._close) b._close(); }); }
  d.addEventListener('keydown', e => { if (e.key === 'Escape') closeAll(); });
  d.addEventListener('click', e => { if (!e.target.closest('.nav') && !e.target.closest('.mega')) closeAll(); });

  const drawer = d.getElementById('drawer');
  d.querySelectorAll('[data-drawer]').forEach(b => b.addEventListener('click', () => {
    const isOpen = drawer.classList.toggle('open');
    d.querySelectorAll('[data-drawer]').forEach(x => x.setAttribute('aria-expanded', String(isOpen)));
    d.body.style.overflow = isOpen ? 'hidden' : '';
    if (isOpen) drawer.querySelector('button,a').focus();
  }));
  drawer && drawer.addEventListener('keydown', e => { if (e.key === 'Escape') d.querySelector('[data-drawer]').click(); });

  /* ---------- Reveal on scroll ---------- */
  const rv = d.querySelectorAll('.rv');
  if ('IntersectionObserver' in w && !w.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), { rootMargin: '0px 0px -8% 0px' });
    rv.forEach(el => io.observe(el));
  } else rv.forEach(el => el.classList.add('in'));

  /* ---------- Animated counters (verified figures only) ---------- */
  const counters = d.querySelectorAll('[data-count]');
  const runCount = el => {
    const end = parseFloat(el.dataset.count), dec = (el.dataset.count.split('.')[1] || '').length, dur = 1400, t0 = performance.now();
    const step = t => { const k = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - k, 3); el.textContent = (end * e).toFixed(dec) + (el.dataset.suffix || ''); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  };
  if ('IntersectionObserver' in w && !w.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const io2 = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { runCount(e.target); io2.unobserve(e.target); } }), { threshold: .6 });
    counters.forEach(c => io2.observe(c));
  }

  /* ---------- Click tracking ---------- */
  d.addEventListener('click', e => {
    const a = e.target.closest('a,button'); if (!a) return;
    const href = a.getAttribute('href') || '';
    if (href.startsWith('tel:')) w.ffTrack('phone_click', { link_location: a.dataset.loc || 'inline' });
    if (href.startsWith('mailto:')) w.ffTrack('email_click', {});
    if (a.dataset.track) w.ffTrack(a.dataset.track, { label: a.dataset.label || a.textContent.trim().slice(0, 60) });
  });

  /* ---------- Before / after slider ---------- */
  d.querySelectorAll('.ba').forEach(ba => {
    const r = ba.querySelector('input[type=range]');
    const set = v => ba.style.setProperty('--pos', v + '%');
    r.addEventListener('input', () => set(r.value));
    r.addEventListener('change', () => w.ffTrack('before_after_interact', { item: ba.dataset.name || '' }), { once: true });
    set(r.value);
  });

  /* ---------- Lightbox with swipe ---------- */
  const lb = d.getElementById('lb');
  if (lb) {
    const img = lb.querySelector('img'), cap = lb.querySelector('.cap');
    let list = [], i = 0, lastFocus;
    const show = () => { const it = list[i]; img.src = it.src; img.alt = it.alt; cap.textContent = (it.cap || it.alt) + '  ·  ' + (i + 1) + ' / ' + list.length; };
    d.querySelectorAll('[data-lb]').forEach(btn => btn.addEventListener('click', () => {
      const g = btn.dataset.lb;
      list = [...d.querySelectorAll('[data-lb="' + g + '"]')].map(b => ({ src: b.dataset.full, alt: b.querySelector('img').alt, cap: b.dataset.cap }));
      i = list.findIndex(x => x.src === btn.dataset.full); lastFocus = btn;
      show(); lb.classList.add('open'); lb.querySelector('.x').focus(); d.body.style.overflow = 'hidden';
      w.ffTrack('gallery_open', { gallery: g });
    }));
    const close = () => { lb.classList.remove('open'); d.body.style.overflow = ''; lastFocus && lastFocus.focus(); };
    lb.querySelector('.x').onclick = close;
    lb.querySelector('.pv').onclick = () => { i = (i - 1 + list.length) % list.length; show(); };
    lb.querySelector('.nx').onclick = () => { i = (i + 1) % list.length; show(); };
    lb.addEventListener('click', e => { if (e.target === lb) close(); });
    d.addEventListener('keydown', e => { if (!lb.classList.contains('open')) return; if (e.key === 'Escape') close(); if (e.key === 'ArrowLeft') lb.querySelector('.pv').click(); if (e.key === 'ArrowRight') lb.querySelector('.nx').click(); });
    let x0 = null;
    lb.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; if (Math.abs(dx) > 40) (dx > 0 ? lb.querySelector('.pv') : lb.querySelector('.nx')).click(); x0 = null; });
  }

  /* ---------- Project gallery filters ---------- */
  const pf = d.getElementById('project-filters');
  if (pf) {
    const cards = [...d.querySelectorAll('.pcard[data-material]')], count = d.getElementById('pcount');
    const apply = () => {
      const f = {}; pf.querySelectorAll('select').forEach(s => { if (s.value) f[s.name] = s.value; });
      let n = 0;
      cards.forEach(c => {
        const ok = Object.entries(f).every(([k, v]) => (c.dataset[k] || '').split(' ').includes(v));
        c.hidden = !ok; if (ok) n++;
      });
      count.textContent = n + (n === 1 ? ' project' : ' projects');
      w.ffTrack('gallery_filter', f);
    };
    pf.addEventListener('change', apply);
    pf.querySelector('[data-reset]').addEventListener('click', () => { pf.querySelectorAll('select').forEach(s => s.value = ''); apply(); });
  }

  /* ---------- Home project gallery filter ---------- */
  d.querySelectorAll('.gfilters').forEach(group => {
    const grid = group.parentElement.querySelector('.ggrid');
    group.addEventListener('click', e => {
      const b = e.target.closest('[data-gfilter]'); if (!b || !grid) return;
      const k = b.dataset.gfilter;
      group.querySelectorAll('[data-gfilter]').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      grid.querySelectorAll('[data-gitem]').forEach(it => { const show = k === 'all' || it.dataset.gitem === k; it.hidden = !show; it.dataset.lb = show ? 'home' : 'home-off'; });
      w.ffTrack && w.ffTrack('gallery_filter', { home: k });
    });
  });

  /* ---------- Lazy-load tool modules ---------- */
  d.querySelectorAll('[data-module]').forEach(el => {
    const src = el.dataset.module;
    const load = () => { const s = d.createElement('script'); s.type = 'module'; s.src = src; d.body.appendChild(s); };
    if (el.dataset.eager !== undefined || !('IntersectionObserver' in w)) return load();
    const io3 = new IntersectionObserver(es => { if (es[0].isIntersecting) { load(); io3.disconnect(); } }, { rootMargin: '400px' });
    io3.observe(el);
  });
})();
