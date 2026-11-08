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
  const columns = [72, 45, 55, 85, 85, 95, 75, 55];
  const headers = ['PROTOCOLO', 'TIPO', 'EMISSÃO', 'ORIGEM', 'DESTINO', 'ASSUNTO', 'RESPONSÁVEL', 'STATUS'];
  const drawHeader = () => {
    doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(19).text('MEMORYDOC', 42, 42);
    doc.fillColor(palette.terracotta).fontSize(9).text('GESTÃO DOCUMENTAL', 42, 66);
    doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(27).text('Relatório documental', 42, 104);
    doc.fillColor(palette.muted).font('Helvetica').fontSize(9).text('Recorte para conferência e prestação de contas', 42, 137);
    doc.moveTo(42, 158).lineTo(553, 158).strokeColor(palette.line).stroke();
    doc.fillColor(palette.muted).fontSize(8).text(`PERÍODO  ${metadata.dateFrom || 'Todos'} a ${metadata.dateTo || 'Todos'}`, 42, 178);
    doc.text(`TIPO  ${pdfText(metadata.typeLabel)}`, 210, 178);
    doc.text(`STATUS  ${pdfText(metadata.statusLabel)}`, 400, 178);
    doc.fillColor(palette.ink).font('Helvetica-Bold').fontSize(17).text(String(data.length), 42, 214);
    doc.fillColor(palette.muted).font('Helvetica').fontSize(8).text('DOCUMENTOS ENCONTRADOS', 42, 236);
  };
  const drawTableHeader = (y) => {
    doc.rect(42, y, pageWidth, 24).fill(palette.ink);
    let x = 42;
    headers.forEach((header, index) => { doc.fillColor('#ffffff').font('Helvetica-Bold').fontSize(6.5).text(header, x + 4, y + 8, { width: columns[index] - 8, lineBreak: false }); x += columns[index]; });
    return y + 24;
  };
  drawHeader();
  let y = drawTableHeader(264);
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
