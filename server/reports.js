import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';

const palette = { ink: '#2b231f', muted: '#746c63', sage: '#3f6253', terracotta: '#b96548', line: '#ded8cf', soft: '#f5f1e9' };

function pdfText(value) {
  return String(value ?? '—').replace(/[\u0000-\u001f]/g, ' ');
}

export async function createExcelReport(data, metadata) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'MemoryDoc';
  workbook.created = new Date();
  const worksheet = workbook.addWorksheet('Relatório documental', { properties: { defaultRowHeight: 20 } });
  worksheet.columns = [
    { header: 'Protocolo', key: 'protocol', width: 18 },
    { header: 'Tipo', key: 'type', width: 22 },
    { header: 'Data de emissão', key: 'date', width: 17 },
    { header: 'Origem', key: 'origin', width: 28 },
    { header: 'Destino', key: 'destination', width: 28 },
    { header: 'Assunto', key: 'subject', width: 46 },
    { header: 'Responsável', key: 'responsible', width: 30 },
    { header: 'Status', key: 'status', width: 17 },
  ];
  worksheet.mergeCells('A1:H1');
  worksheet.getCell('A1').value = 'MEMORYDOC';
  worksheet.getCell('A1').font = { name: 'Arial', size: 18, bold: true, color: { argb: 'FF2B231F' } };
  worksheet.getCell('A1').alignment = { vertical: 'middle' };
  worksheet.getRow(1).height = 30;
  worksheet.mergeCells('A2:H2');
  worksheet.getCell('A2').value = 'RELATÓRIO DOCUMENTAL';
  worksheet.getCell('A2').font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FF3F6253' } };
  worksheet.getRow(2).height = 22;
  worksheet.mergeCells('A4:H4');
  worksheet.getCell('A4').value = 'CONTEXTO DA GERAÇÃO';
  worksheet.getCell('A4').font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF746C63' } };
  worksheet.getCell('A4').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F1E9' } };
  const context = [
    ['Data do relatório', metadata.generatedAt],
    ['Gerado por', metadata.generatedBy],
    ['Período', `${metadata.dateFrom || 'Todos'} a ${metadata.dateTo || 'Todos'}`],
    ['Tipo', metadata.typeLabel],
    ['Número de protocolos', data.length],
  ];
  context.forEach(([label, value], index) => {
    const row = worksheet.getRow(5 + index);
    row.getCell(1).value = label;
    row.getCell(1).font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF746C63' } };
    row.getCell(2).value = value;
    row.getCell(2).font = { name: 'Arial', size: index === 4 ? 13 : 10, bold: true, color: { argb: 'FF2B231F' } };
    row.getCell(1).border = { bottom: { style: 'thin', color: { argb: 'FFDED8CF' } } };
    row.getCell(2).border = { bottom: { style: 'thin', color: { argb: 'FFDED8CF' } } };
  });
  const headerRow = worksheet.getRow(12);
  ['Protocolo', 'Tipo', 'Data de emissão', 'Origem', 'Destino', 'Assunto', 'Responsável', 'Status'].forEach((value, index) => { headerRow.getCell(index + 1).value = value; });
  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B231F' } };
    cell.alignment = { vertical: 'middle' };
  });
  data.forEach((item, index) => {
    const row = worksheet.addRow(item);
    row.height = 22;
    row.eachCell((cell) => {
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF2B231F' } };
      cell.alignment = { vertical: 'middle', wrapText: false };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: index % 2 === 0 ? 'FFF5F1E9' : 'FFFFFFFF' } };
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE7E1D8' } } };
    });
  });
  worksheet.autoFilter = { from: 'A12', to: `H${12 + data.length}` };
  worksheet.views = [{ state: 'frozen', ySplit: 12 }];
  return Buffer.from(await workbook.xlsx.writeBuffer());
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
