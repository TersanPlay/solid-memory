import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

const palette = { ink: '#2b231f', muted: '#746c63', sage: '#3f6253', terracotta: '#b96548', line: '#ded8cf', soft: '#f5f1e9' };

function pdfText(value) {
  return String(value ?? '—').replace(/[\u0000-\u001f]/g, ' ');
}

export function createExcelReport(data, metadata) {
  const rows = [
    ['MEMORYDOC · RELATÓRIO DOCUMENTAL'],
    ['Período', `${metadata.dateFrom || 'Todos'} a ${metadata.dateTo || 'Todos'}`],
    ['Tipo', metadata.typeLabel],
    ['Status', metadata.statusLabel],
    ['Assunto', metadata.subjectLabel],
    ['Responsável', metadata.responsibleLabel],
    ['Total de documentos', data.length],
    [],
    ['Protocolo', 'Tipo', 'Data de emissão', 'Origem', 'Destino', 'Assunto', 'Responsável', 'Status'],
    ...data.map((item) => [item.protocol, item.type, item.date, item.origin, item.destination, item.subject, item.responsible, item.status]),
  ];
  const worksheet = XLSX.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [18, 24, 16, 28, 28, 44, 28, 16].map((wch) => ({ wch }));
  worksheet['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Relatório documental');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export function createPdfReport(data, metadata) {
  const doc = new PDFDocument({ size: 'A4', margin: 42, bufferPages: true, info: { Title: 'Relatório documental · MemoryDoc', Author: 'MemoryDoc' } });
  const chunks = [];
  doc.on('data', (chunk) => chunks.push(chunk));
  const done = new Promise((resolve, reject) => { doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject); });
  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  const columns = [70, 42, 55, 68, 68, 82, 72, 54];
  const headers = ['PROTOCOLO', 'TIPO', 'EMISSÃO', 'ORIGEM', 'DESTINO', 'ASSUNTO', 'RESPONSÁVEL', 'STATUS'];
  const drawHeart = (x, y) => {
    doc.save().translate(x, y).scale(0.72).path('M 24 42 C 19 37 4 28 4 15 C 4 5 16 1 24 10 C 32 1 44 5 44 15 C 44 28 29 37 24 42 Z').fill('#ffffff').restore();
  };
  const drawHeader = () => {
    doc.roundedRect(42, 42, 52, 62, 4).fill(palette.terracotta);
    drawHeart(48, 55);
    doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(16).text('MEMORYDOC', 108, 57);
    doc.fillColor(palette.terracotta).font('Helvetica-Bold').fontSize(8).text('GESTÃO DOCUMENTAL', 108, 80);
    doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(27).text('Relatório documental', 42, 145);
    doc.fillColor(palette.muted).font('Helvetica').fontSize(9).text('Recorte para conferência e prestação de contas', 42, 180);
    doc.roundedRect(326, 42, 227, 120, 4).lineWidth(1).strokeColor('#1555d6').stroke();
    const info = [
      ['PERÍODO', `${metadata.dateFrom || 'Todos'} a ${metadata.dateTo || 'Todos'}`],
      ['TIPO', metadata.typeLabel],
      ['STATUS', metadata.statusLabel],
      ['ASSUNTO', metadata.subjectLabel],
      ['RESPONSÁVEL', metadata.responsibleLabel],
    ];
    info.forEach(([label, value], index) => {
      const rowY = 55 + index * 20;
      doc.fillColor(palette.muted).font('Helvetica-Bold').fontSize(6.2).text(label, 340, rowY, { width: 76, lineBreak: false });
      doc.fillColor(palette.ink).font('Helvetica').fontSize(7.2).text(pdfText(value), 420, rowY, { width: 120, ellipsis: true, lineBreak: false });
    });
    doc.moveTo(42, 218).lineTo(553, 218).strokeColor(palette.line).stroke();
    doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(17).text(String(data.length), 42, 246);
    doc.fillColor(palette.muted).font('Helvetica').fontSize(8).text('DOCUMENTOS ENCONTRADOS', 42, 268);
  };
  const drawTableHeader = (y) => {
    doc.rect(42, y, pageWidth, 24).fill(palette.ink);
    let x = 42;
    headers.forEach((header, index) => { doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6.5).text(header, x + 4, y + 8, { width: columns[index] - 8, lineBreak: false }); x += columns[index]; });
    return y + 24;
  };
  drawHeader();
  let y = drawTableHeader(296);
  data.forEach((item, index) => {
    if (y > 735) { doc.addPage(); y = 42; y = drawTableHeader(y); }
    const values = [item.protocol, item.type, item.date, item.origin, item.destination, item.subject, item.responsible, item.status];
    const rowHeight = 30;
    if (index % 2 === 0) doc.rect(42, y, pageWidth, rowHeight).fill(palette.soft);
    let x = 42;
    values.forEach((value, valueIndex) => { doc.fillColor(palette.ink).font(valueIndex === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).text(pdfText(value), x + 4, y + 10, { width: columns[valueIndex] - 8, height: 12, ellipsis: true, lineBreak: false }); x += columns[valueIndex]; });
    y += rowHeight;
  });
  doc.fillColor(palette.muted).font('Helvetica').fontSize(7).text('MemoryDoc · Relatório gerado pelo sistema', 42, 790, { align: 'left' });
  doc.end();
  return done;
}
