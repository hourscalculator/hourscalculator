import sharp from 'sharp';

const png = await sharp(new URL('./assets/og-source.png', import.meta.url).pathname)
  .resize(1200, 630, { fit: 'contain', background: '#f5f5f0' })
  .png({ palette: true, colours: 32, quality: 60, effort: 10, compressionLevel: 9, dither: 0 })
  .toBuffer();
if (png.length >= 300_000) throw new Error(`Social image exceeds 300KB: ${png.length} bytes`);
await sharp(png).toFile(new URL('../dist/og-image.png', import.meta.url).pathname);
console.log(`Generated og-image.png: 1200×630, ${png.length} bytes`);
