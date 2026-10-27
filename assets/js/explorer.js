// Homepage Fence Style Explorer — panels are server-rendered; this only switches tabs.
document.querySelectorAll('[data-explorer]').forEach(ex => {
  const tabs = [...ex.querySelectorAll('[role=tab]')];
  const select = (t, focus) => {
    tabs.forEach(x => { const on = x === t; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; document.getElementById(x.getAttribute('aria-controls')).hidden = !on; });
    if (focus) t.focus();
    window.ffTrack('explorer_tab', { style: t.dataset.id });
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', e => {
      const k = e.key; let n = null;
      if (k === 'ArrowRight') n = tabs[(i + 1) % tabs.length]; if (k === 'ArrowLeft') n = tabs[(i - 1 + tabs.length) % tabs.length];
      if (k === 'Home') n = tabs[0]; if (k === 'End') n = tabs[tabs.length - 1];
      if (n) { e.preventDefault(); select(n, true); }
    });
  });
});
