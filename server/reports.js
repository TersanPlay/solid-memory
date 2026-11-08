import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

const palette = { ink: '#2b231f', muted: '#746c63', sage: '#3f6253', terracotta: '#b96548', line: '#ded8cf', soft: '#f5f1e9' };

function pdfText(value) {
  return String(value ?? '—').replace(/[\u0000-\u001f]/g, ' ');
}

export function createExcelReport(data, metadata) {
  const rows = [
    ['MEMORYDOC · RELATÓRIO DOCUMENTAL'],
    ['Data do relatório', metadata.generatedAt],
    ['Gerado por', metadata.generatedBy],
    ['Período', `${metadata.dateFrom || 'Todos'} a ${metadata.dateTo || 'Todos'}`],
    ['Tipo', metadata.typeLabel],
    ['Número de protocolos', data.length],
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
  const drawSystemLogo = (x, y) => {
    doc.save().translate(x, y).strokeColor(palette.sage).lineWidth(1.7).lineCap('round').lineJoin('round');
    doc.moveTo(6, 2).lineTo(23, 2).lineTo(31, 10).lineTo(31, 34).lineTo(6, 34).closePath().stroke();
    doc.moveTo(23, 2).lineTo(23, 10).lineTo(31, 10).stroke();
    doc.moveTo(12, 18).lineTo(25, 18).stroke();
    doc.moveTo(12, 24).lineTo(25, 24).stroke();
    doc.restore();
  };
  const drawHeader = () => {
    drawSystemLogo(42, 58);
    doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(16).text('MEMORYDOC', 84, 57);
    doc.fillColor(palette.sage).font('Helvetica-Bold').fontSize(8).text('GESTÃO DOCUMENTAL', 84, 80);
    doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(27).text('Relatório documental', 42, 198);
    doc.roundedRect(326, 42, 227, 142, 4).lineWidth(1).strokeColor('#ded8cf').stroke();
    const info = [
      ['DATA DO RELATÓRIO', metadata.generatedAt],
      ['GERADO POR', metadata.generatedBy],
      ['PERÍODO', `${metadata.dateFrom || 'Todos'} a ${metadata.dateTo || 'Todos'}`],
      ['TIPO', metadata.typeLabel],
      ['NÚMERO DE PROTOCOLOS', data.length],
    ];
    info.forEach(([label, value], index) => {
      const rowY = 54 + index * 24;
      if (index > 0) doc.moveTo(340, rowY - 10).lineTo(539, rowY - 10).strokeColor(palette.line).stroke();
      doc.fillColor(palette.muted).font('Helvetica-Bold').fontSize(5.8).text(label, 340, rowY, { width: 110, lineBreak: false });
      doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(index === 4 ? 12 : 7.2).text(pdfText(value), index === 4 ? 460 : 445, index === 4 ? rowY - 3 : rowY, { width: 82, align: 'right', ellipsis: true, lineBreak: false });
    });
    doc.moveTo(42, 228).lineTo(553, 228).strokeColor('#ded8cf').stroke();
  };
  const drawTableHeader = (y) => {
    doc.roundedRect(42, y, pageWidth, 24, 4).fill(palette.ink);
    let x = 42;
    headers.forEach((header, index) => { doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6.5).text(header, x + 4, y + 8, { width: columns[index] - 8, lineBreak: false }); x += columns[index]; });
    return y + 24;
  };
  drawHeader();
  let y = drawTableHeader(242);
  data.forEach((item, index) => {
    if (y > 735) { doc.addPage(); y = 42; y = drawTableHeader(y); }
    const values = [item.protocol, item.type, item.date, item.origin, item.destination, item.subject, item.responsible, item.status];
    const rowHeight = 30;
    if (index % 2 === 0) {
      if (index === data.length - 1) doc.roundedRect(42, y, pageWidth, rowHeight, 4).fill(palette.soft);
      else doc.rect(42, y, pageWidth, rowHeight).fill(palette.soft);
    }
    let x = 42;
    values.forEach((value, valueIndex) => { doc.fillColor(palette.ink).font(valueIndex === 0 ? 'Helvetica-Bold' : 'Helvetica').fontSize(7).text(pdfText(value), x + 4, y + 10, { width: columns[valueIndex] - 8, height: 12, ellipsis: true, lineBreak: false }); x += columns[valueIndex]; });
    y += rowHeight;
  });
  doc.fillColor(palette.muted).font('Helvetica').fontSize(7).text('MemoryDoc · Relatório gerado pelo sistema', 42, 790, { align: 'left' });
  doc.end();
  return done;
}
