import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SAGE = 0x3f6253;
const SAGE_DARK = 0x2f493f;
const PAPER = 0xfffaf3;

// Cria dados BMP 32bpp para o ícone FileText
function createBMPData(size) {
  const buf = Buffer.alloc(size * size * 4);
  const off = (y, x) => (y * size + x) * 4;

  // Fundo com gradiente
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const t = 0.5 + 0.5 * (x / size);
      const r = Math.round((SAGE >> 16 & 0xFF) * (1 - t) + (SAGE_DARK >> 16 & 0xFF) * t);
      const g = Math.round((SAGE >> 8 & 0xFF) * (1 - t) + (SAGE_DARK >> 8 & 0xFF) * t);
      const b = Math.round((SAGE >> 0 & 0xFF) * (1 - t) + (SAGE_DARK >> 0 & 0xFF) * t);
      const idx = off(y, x);
      buf[idx] = r; buf[idx + 1] = g; buf[idx + 2] = b; buf[idx + 3] = 255;
    }
  }

  const dl = size * 0.40, dt = size * 0.30;
  const dr = size * 0.92, db = size * 0.88;
  const fillR = size * 0.02;

  const docX1 = dl - fillR, docY1 = dt - fillR;
  const docX2 = dr + fillR, docY2 = db + fillR;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const cx = x + 0.5, cy = y + 0.5;
      const dx = cx - (docX1 + fillR), dy = cy - (docY1 + fillR);
      const rw = (docX2 - fillR) - (docX1 + fillR), rh = (docY2 - fillR) - (docY1 + fillR);
      if (dx >= 0 && dx <= rw && dy >= 0 && dy <= rh) {
        const dist = Math.sqrt(Math.pow(dx - rw / 2, 2) + Math.pow(dy - rh / 2, 2));
        if (dist <= rw / 2) {
          const idx = off(y, x);
          buf[idx] = PAPER >> 16 & 0xFF;
          buf[idx + 1] = PAPER >> 8 & 0xFF;
          buf[idx + 2] = PAPER >> 0 & 0xFF;
          buf[idx + 3] = 255;
        }
      }
    }
  }

  const lines = [
    { x1: dl + size * 0.05, x2: dr - size * 0.08, y: dt + size * 0.22 },
    { x1: dl + size * 0.05, x2: dr - size * 0.20, y: dt + size * 0.38 },
    { x1: dl + size * 0.05, x2: dr - size * 0.35, y: dt + size * 0.54 },
  ];

  for (const line of lines) {
    const steps = Math.ceil(Math.abs(line.x2 - line.x1) / 0.6);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const px = Math.round(line.x1 + (line.x2 - line.x1) * t);
      const py = Math.round(line.y - size * 0.02);
      if (px >= 0 && px < size && py >= 0 && py < size) {
        const idx = off(py, px);
        buf[idx] = PAPER >> 16 & 0xFF;
        buf[idx + 1] = PAPER >> 8 & 0xFF;
        buf[idx + 2] = PAPER >> 0 & 0xFF;
        buf[idx + 3] = 255;
      }
    }
  }

  return buf;
}

function generateFavicon(sizes, outputPath) {
  const entries = [];

  // Calcula offsets
  let offset = 6;
  for (const size of sizes) {
    const width = size;
    const height = size;
    const pixelCount = width * height * 4;
    const bmpHeaderSize = 54;
    const total = bmpHeaderSize + pixelCount;
    entries.push({ width, height, total, offset });
    offset += total;
  }

  const ico = Buffer.alloc(offset);
  ico.writeUInt16LE(0, 0);
  ico.writeUInt16LE(1, 2);
  ico.writeUInt16LE(sizes.length, 4);

  for (let i = 0; i < sizes.length; i++) {
    const e = entries[i];
    const o = 6 + i * 16;
    ico.writeUInt8(e.width, o);
    ico.writeUInt8(e.height, o + 1);
    ico.writeUInt8(0, o + 2);
    ico.writeUInt8(0, o + 3);
    ico.writeUInt16LE(1, o + 4);
    ico.writeUInt16LE(32, o + 6);
    ico.writeUInt32LE(e.total, o + 8);
    // Campo Offset no ICO: aponta para o cabeçalho BMP (e.offset + 16)
    ico.writeUInt32LE(e.offset + 16, o + 12);
  }

  // Escreve cada entrada: BMP header + pixel data
  for (let i = 0; i < sizes.length; i++) {
    const size = sizes[i];
    const e = entries[i];

    // BMP Header
    const bmpOffset = e.offset + 16; // 16 bytes para o ICONDIRENTRY
    ico.writeUInt16LE(0x4D42, bmpOffset);    // bfType = 'BM'
    ico.writeUInt32LE(0, bmpOffset + 2);     // bfSize (preenchido ao final)
    ico.writeUInt16LE(0, bmpOffset + 4);     // bfReserved1
    ico.writeUInt16LE(0, bmpOffset + 6);     // bfReserved2
    ico.writeUInt32LE(bmpOffset + 54, bmpOffset + 10); // bfOffBits
    // BITMAPINFOHEADER
    ico.writeUInt32LE(40, bmpOffset + 14);
    ico.writeUInt32LE(size, bmpOffset + 18);
    ico.writeUInt32LE(size, bmpOffset + 22);
    ico.writeUInt16LE(1, bmpOffset + 26);
    ico.writeUInt16LE(32, bmpOffset + 28);
    ico.writeUInt32LE(0, bmpOffset + 30);      // Compression
    ico.writeUInt32LE(size * size * 4, bmpOffset + 34);
    ico.writeUInt32LE(2835, bmpOffset + 38);   // 72 DPI
    ico.writeUInt32LE(2835, bmpOffset + 42);
    ico.writeUInt32LE(0, bmpOffset + 46);      // ClrUsed
    ico.writeUInt32LE(0, bmpOffset + 50);      // ClrImportant

    // Pixel data
    const pixelData = createBMPData(size);
    pixelData.copy(ico, bmpOffset + 54);
  }

  fs.writeFileSync(outputPath, ico);
  console.log(`Favicon gerado: ${outputPath} (${sizes.length} tamanhos)`);
}

generateFavicon([16, 32, 64, 192], path.join(__dirname, '..', 'public', 'favicon.ico'));



