import struct
import zlib
import os

# Cores da marca
SAGE = (0x3f, 0x62, 0x53)
SAGE_DARK = (0x2f, 0x49, 0x3f)
PAPER = (0xff, 0xfa, 0xf3)

def create_bmp_data(size):
    """Cria dados BMP 32bpp para o ícone FileText"""
    data = bytearray(size * size * 4)
    
    def off(y, x):
        return (y * size + x) * 4
    
    # Fundo com gradiente diagonal
    for y in range(size):
        for x in range(size):
            t = 0.5 + 0.5 * (x / size)
            r = int(SAGE[0] * (1 - t) + SAGE_DARK[0] * t)
            g = int(SAGE[1] * (1 - t) + SAGE_DARK[1] * t)
            b = int(SAGE[2] * (1 - t) + SAGE_DARK[2] * t)
            idx = off(y, x)
            data[idx] = r
            data[idx + 1] = g
            data[idx + 2] = b
            data[idx + 3] = 255
    
    # Documento FileText
    dl, dt = size * 0.40, size * 0.30
    dr, db = size * 0.92, size * 0.88
    fill_r = size * 0.02
    doc_x1, doc_y1 = dl - fill_r, dt - fill_r
    doc_x2, doc_y2 = dr + fill_r, db + fill_r
    
    for y in range(size):
        for x in range(size):
            cx, cy = x + 0.5, y + 0.5
            dx = cx - (doc_x1 + fill_r)
            dy = cy - (doc_y1 + fill_r)
            rw = (doc_x2 - fill_r) - (doc_x1 + fill_r)
            rh = (doc_y2 - fill_r) - (doc_y1 + fill_r)
            
            if 0 <= dx <= rw and 0 <= dy <= rh:
                import math
                dist = math.sqrt((dx - rw / 2) ** 2 + (dy - rh / 2) ** 2)
                if dist <= rw / 2:
                    idx = off(y, x)
                    data[idx] = PAPER[0]
                    data[idx + 1] = PAPER[1]
                    data[idx + 2] = PAPER[2]
                    data[idx + 3] = 255
    
    # Linhas do texto
    lines = [
        (dl + size * 0.05, dr - size * 0.08, dt + size * 0.22),
        (dl + size * 0.05, dr - size * 0.20, dt + size * 0.38),
        (dl + size * 0.05, dr - size * 0.35, dt + size * 0.54),
    ]
    
    for x1, x2, y in lines:
        steps = int(abs(x2 - x1) / 0.6)
        for i in range(steps + 1):
            t = i / steps if steps > 0 else 0
            px = int(x1 + (x2 - x1) * t)
            py = int(y - size * 0.02)
            if 0 <= px < size and 0 <= py < size:
                idx = off(py, px)
                data[idx] = PAPER[0]
                data[idx + 1] = PAPER[1]
                data[idx + 2] = PAPER[2]
                data[idx + 3] = 255
    
    return bytes(data)

def create_ico(sizes, output_path):
    """Cria um arquivo ICO com múltiplos tamanhos"""
    # Calcula offsets
    # ICO header: 6 bytes
    # Cada entry: 16 bytes
    # Image data começa após todos os entries
    offset = 6 + len(sizes) * 16  # 6 + 3*16 = 54
    entries = []
    
    for size in sizes:
        pixel_count = size * size * 4
        bmp_header_size = 54  # 14 (BITMAPFILEHEADER) + 40 (BITMAPINFOHEADER)
        total = bmp_header_size + pixel_count
        entries.append({'size': size, 'total': total, 'offset': offset})
        offset += total
    
    # ICO Header (6 bytes)
    ico_header = struct.pack('<HHH', 0, 1, len(sizes))
    
    # ICONDIRENTRY (16 bytes each)
    entries_data = bytearray()
    for entry in entries:
        # Width (1 byte), Height (1 byte), Color count (1 byte), Reserved (1 byte)
        entries_data += struct.pack('<BBBB', entry['size'], entry['size'], 0, 0)
        # Planes (2 bytes), Bit count (2 bytes)
        entries_data += struct.pack('<HH', 1, 32)
        # Size (4 bytes), Offset (4 bytes)
        entries_data += struct.pack('<II', entry['total'], entry['offset'])

    
    # Image data
    image_data = bytearray()
    for entry in entries:
        size = entry['size']
        pixel_data = create_bmp_data(size)
        
        # BMP Header (BITMAPFILEHEADER + BITMAPINFOHEADER)
        bmp_header = bytearray()
        
        # BITMAPFILEHEADER (14 bytes)
        bmp_header += struct.pack('<H', 0x4D42)  # bfType = 'BM'
        bmp_header += struct.pack('<I', 14 + 40 + size * size * 4)  # bfSize
        bmp_header += struct.pack('<HH', 0, 0)  # bfReserved1, bfReserved2
        bmp_header += struct.pack('<I', 54)  # bfOffBits (offset to pixel data within BMP)
        
        # BITMAPINFOHEADER (40 bytes)
        bmp_header += struct.pack('<I', 40)  # biSize
        bmp_header += struct.pack('<II', size, size)  # biWidth, biHeight
        bmp_header += struct.pack('<HH', 1, 32)  # biPlanes, biBitCount
        bmp_header += struct.pack('<I', 0)  # biCompression
        bmp_header += struct.pack('<I', size * size * 4)  # biSizeImage
        bmp_header += struct.pack('<II', 2835, 2835)  # biXPelsPerMeter, biYPelsPerMeter
        bmp_header += struct.pack('<II', 0, 0)  # biClrUsed, biClrImportant
        
        # Copia BMP header + pixel data
        image_data += bmp_header
        image_data += pixel_data
    
    # Escreve o arquivo ICO
    with open(output_path, 'wb') as f:
        f.write(ico_header)
        f.write(entries_data)
        f.write(image_data)
    
    print(f"ICO criado: {output_path} ({len(sizes)} tamanhos)")

if __name__ == '__main__':
    output_path = os.path.join(os.path.dirname(__file__), '..', 'public', 'favicon.ico')
    create_ico([16, 32, 64], output_path)
