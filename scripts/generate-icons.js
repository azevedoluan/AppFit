// Script to generate SVG and PNG icons for AppFit
import fs from 'fs';
import path from 'path';

const publicDir = path.resolve('public');
const iconsDir = path.resolve('public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Sleek AppFit SVG icon
const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080e1e"/>
      <stop offset="50%" stop-color="#0e172a"/>
      <stop offset="100%" stop-color="#060913"/>
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="16" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Background rounded rect -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  <rect width="504" height="504" x="4" y="4" rx="108" fill="none" stroke="url(#primaryGrad)" stroke-width="6" stroke-opacity="0.4"/>

  <!-- Glowing pulse back circle -->
  <circle cx="256" cy="256" r="160" fill="url(#glowGrad)" filter="url(#glow)"/>

  <!-- Stylized Dumbbell / Bolt 'A' icon -->
  <g transform="translate(256,256) scale(1.1) translate(-256,-256)" filter="url(#glow)">
    <!-- Dumbbell Left Weight -->
    <rect x="110" y="196" width="36" height="120" rx="12" fill="url(#primaryGrad)"/>
    <rect x="156" y="216" width="24" height="80" rx="8" fill="url(#primaryGrad)"/>
    
    <!-- Central Bar -->
    <rect x="180" y="244" width="152" height="24" rx="12" fill="#e2e8f0"/>

    <!-- Dumbbell Right Weight -->
    <rect x="332" y="216" width="24" height="80" rx="8" fill="url(#primaryGrad)"/>
    <rect x="366" y="196" width="36" height="120" rx="12" fill="url(#primaryGrad)"/>

    <!-- Dynamic Fitness Spark / Lightning in center -->
    <path d="M268 180 L234 250 L260 250 L244 320 L288 244 L262 244 Z" fill="#ffffff" filter="drop-shadow(0 2px 6px rgba(0,0,0,0.5))"/>
  </g>

  <!-- Subtle Bottom Brand Text -->
  <text x="256" y="420" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="800" font-size="44" fill="#f8fafc" letter-spacing="4">APPFIT</text>
</svg>`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), svgContent);
fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), svgContent);
fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), svgContent);

// Also generate basic uncompressed BMP/PNG or create valid PNG using pure JS zlib
import zlib from 'zlib';

function createSimplePng(width, height, r, g, b) {
  // A simple RGBA PNG generator
  const buffer = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      // Gradient background with teal/cyan ring
      const cx = width / 2;
      const cy = height / 2;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const isCorner = (x < 30 && y < 30) || (x > width - 30 && y < 30) || (x < 30 && y > height - 30) || (x > width - 30 && y > height - 30);
      
      if (dist < width * 0.42 && dist > width * 0.38) {
        buffer[idx] = 20;     // R
        buffer[idx + 1] = 184; // G
        buffer[idx + 2] = 166; // B
        buffer[idx + 3] = 255; // A
      } else if (dist < width * 0.35 && dist > width * 0.1) {
        buffer[idx] = 6;      // R
        buffer[idx + 1] = 182; // G
        buffer[idx + 2] = 212; // B
        buffer[idx + 3] = 255;
      } else {
        buffer[idx] = 11;     // R
        buffer[idx + 1] = 17;  // G
        buffer[idx + 2] = 30;  // B
        buffer[idx + 3] = 255;
      }
    }
  }

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth
  ihdr[9] = 6; // Color type: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);

  // Raw image data with filter byte 0 at start of each scanline
  const scanlines = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++) {
    const lineStart = y * (width * 4 + 1);
    scanlines[lineStart] = 0; // Filter None
    buffer.copy(scanlines, lineStart + 1, y * width * 4, (y + 1) * width * 4);
  }

  const compressedData = zlib.deflateSync(scanlines);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function makeChunk(type, data) {
  const len = data.length;
  const chunk = Buffer.alloc(12 + len);
  chunk.writeUInt32BE(len, 0);
  chunk.write(type, 4);
  data.copy(chunk, 8);
  const crc = crc32(chunk.subarray(4, 8 + len));
  chunk.writeUInt32BE(crc >>> 0, 8 + len);
  return chunk;
}

function crc32(buf) {
  let crc = 0 ^ -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

const table = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  table[i] = c;
}

fs.writeFileSync(path.join(iconsDir, 'icon-192.png'), createSimplePng(192, 192, 6, 182, 212));
fs.writeFileSync(path.join(iconsDir, 'icon-512.png'), createSimplePng(512, 512, 6, 182, 212));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createSimplePng(180, 180, 6, 182, 212));

console.log('AppFit icons generated successfully!');
