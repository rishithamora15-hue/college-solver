/** Minimal valid one-font PDF; each page's text is drawn line by line ("\n" starts a new line). Test fixture; xref offsets computed. */
export function tinyPdf(pages: string[]) {
  const objs: string[] = ['<< /Type /Catalog /Pages 2 0 R >>', ''];
  const kids: string[] = [];
  const font = 3 + pages.length * 2;
  pages.forEach((t, i) => {
    const page = 3 + i * 2, content = page + 1;
    kids.push(`${page} 0 R`);
    const stream = `BT /F1 12 Tf 50 700 Td ${t.split('\n').map((l) => `(${l.replace(/[()\\]/g, '\\$&')}) Tj`).join(' 0 -16 Td ')} ET`;
    objs[page - 1] = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${font} 0 R >> >> /Contents ${content} 0 R >>`;
    objs[content - 1] = `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`;
  });
  objs[1] = `<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${pages.length} >>`;
  objs[font - 1] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  let out = '%PDF-1.4\n';
  const offs = objs.map((o, i) => { const at = out.length; out += `${i + 1} 0 obj\n${o}\nendobj\n`; return at; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, 'latin1');
}
