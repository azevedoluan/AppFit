import fs from 'fs';
import sharp from 'sharp';

const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#080e1e"/>
      <stop offset="40%" stop-color="#0b1329"/>
      <stop offset="100%" stop-color="#040711"/>
    </linearGradient>
    <linearGradient id="primaryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="50%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#10b981"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.5"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="14" result="blur"/>
      <feComposite in="SourceGraphic" in2="blur" operator="over"/>
    </filter>
  </defs>

  <!-- Fundo escuro integral para preencher o ícone no Android e iOS sem cantos transparentes -->
  <rect width="512" height="512" fill="url(#bgGrad)"/>

  <!-- Moldura arredondada sutil interna -->
  <rect width="472" height="472" x="20" y="20" rx="96" fill="none" stroke="url(#primaryGrad)" stroke-width="4" stroke-opacity="0.35"/>

  <!-- Brilho circular de fundo -->
  <circle cx="256" cy="245" r="145" fill="url(#glowGrad)" filter="url(#glow)"/>

  <!-- Haltere Estilizado com Raio Central -->
  <g transform="translate(256,235) scale(1.05) translate(-256,-256)" filter="url(#glow)">
    <rect x="110" y="196" width="36" height="120" rx="12" fill="url(#primaryGrad)"/>
    <rect x="156" y="216" width="24" height="80" rx="8" fill="url(#primaryGrad)"/>
    <rect x="180" y="244" width="152" height="24" rx="12" fill="#e2e8f0"/>
    <rect x="332" y="216" width="24" height="80" rx="8" fill="url(#primaryGrad)"/>
    <rect x="366" y="196" width="36" height="120" rx="12" fill="url(#primaryGrad)"/>
    <path d="M268 180 L234 250 L260 250 L244 320 L288 244 L262 244 Z" fill="#ffffff"/>
  </g>

  <!-- Nome da Marca -->
  <text x="256" y="425" text-anchor="middle" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-weight="900" font-size="46" fill="#f8fafc" letter-spacing="5">APPFIT</text>
</svg>
`.trim();

async function generate() {
  const buf = Buffer.from(svgContent);

  // 1. Favicon SVG
  fs.writeFileSync('public/favicon.svg', svgContent, 'utf8');

  // 2. Apple Touch Icon (iOS Safari - 180x180)
  await sharp(buf)
    .resize(180, 180)
    .png({ quality: 100 })
    .toFile('public/apple-touch-icon.png');
  console.log('✓ public/apple-touch-icon.png gerado (180x180)');

  // 3. Android / PWA Icon (192x192)
  await sharp(buf)
    .resize(192, 192)
    .png({ quality: 100 })
    .toFile('public/icons/icon-192.png');
  console.log('✓ public/icons/icon-192.png gerado (192x192)');

  // 4. Android / PWA High-Res (512x512)
  await sharp(buf)
    .resize(512, 512)
    .png({ quality: 100 })
    .toFile('public/icons/icon-512.png');
  console.log('✓ public/icons/icon-512.png gerado (512x512)');

  // 5. SVGs complementares
  fs.writeFileSync('public/icons/icon-192.svg', svgContent, 'utf8');
  fs.writeFileSync('public/icons/icon-512.svg', svgContent, 'utf8');
  console.log('✓ SVGs complementares atualizados');
}

generate().catch(err => {
  console.error('Erro ao gerar ícones:', err);
  process.exit(1);
});
