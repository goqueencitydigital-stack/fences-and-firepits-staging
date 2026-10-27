// Branded PDF summaries (design studio, calculator, planner, HOA spec sheet). jsPDF loaded on demand.
let jsPDFp;
function loadJsPDF() {
  if (window.jspdf) return Promise.resolve(window.jspdf.jsPDF);
  if (!jsPDFp) jsPDFp = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';
    s.onload = () => res(window.jspdf.jsPDF); s.onerror = rej; document.head.appendChild(s);
  });
  return jsPDFp;
}
function imgToData(src) {
  return new Promise(res => {
    const i = new Image(); i.crossOrigin = 'anonymous';
    i.onload = () => { try { const c = document.createElement('canvas'); c.width = i.naturalWidth; c.height = i.naturalHeight; c.getContext('2d').drawImage(i, 0, 0); res(c.toDataURL('image/png')); } catch (e) { res(null); } };
    i.onerror = () => res(null); i.src = src;
  });
}

/** rows: [[label, value], ...]; image: dataURL; notes: [string] */
export async function makePdf({ title, subtitle, image, rows, notes = [], filename = 'fences-and-firepits-summary.pdf', site }) {
  const JsPDF = await loadJsPDF();
  const doc = new JsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth(), M = 48;
  doc.setFillColor(17, 19, 21); doc.rect(0, 0, W, 92, 'F');
  const shield = await imgToData(window.FF_CONFIG.root + 'img/brand/shield.png');
  if (shield) doc.addImage(shield, 'PNG', M, 20, 54, 46);
  doc.setTextColor(247, 246, 242); doc.setFont('times', 'normal'); doc.setFontSize(22); doc.text('Fences & Firepits', M + 66, 46);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(184, 155, 103);
  doc.text('CHARLOTTE FENCE INSTALLATION  ·  ' + site.phone + '  ·  ' + site.email, M + 66, 62);
  let y = 132;
  doc.setTextColor(17, 19, 21); doc.setFont('times', 'normal'); doc.setFontSize(24); doc.text(title, M, y);
  if (subtitle) { y += 18; doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(91, 94, 95); doc.text(subtitle, M, y); }
  y += 18;
  if (image) { const iw = W - 2 * M, ih = iw * 0.5; doc.addImage(image, 'JPEG', M, y, iw, ih); y += ih + 22; }
  doc.setFontSize(10.5);
  rows.forEach(([k, v]) => {
    if (y > 700) { doc.addPage(); y = 60; }
    doc.setDrawColor(217, 214, 207); doc.line(M, y + 6, W - M, y + 6);
    doc.setTextColor(91, 94, 95); doc.setFont('helvetica', 'normal'); doc.text(String(k), M, y);
    doc.setTextColor(17, 19, 21); doc.setFont('helvetica', 'bold');
    const lines = doc.splitTextToSize(String(v), W - 2 * M - 190); doc.text(lines, M + 190, y);
    y += 20 + (lines.length - 1) * 13;
  });
  y += 10;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8.5); doc.setTextColor(91, 94, 95);
  notes.forEach(n => { const l = doc.splitTextToSize(n, W - 2 * M); if (y + l.length * 11 > 760) { doc.addPage(); y = 60; } doc.text(l, M, y); y += l.length * 11 + 6; });
  doc.setFontSize(8); doc.text('Generated ' + new Date().toLocaleDateString() + ' at fencesandfirepits.com', M, 770);
  doc.save(filename);
}
