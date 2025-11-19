import sharp from 'sharp';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const sizes = [72, 96, 128, 144, 152, 180, 192, 384, 512];
const svgPath = join(__dirname, '../public/icon.svg');
const iconDir = join(__dirname, '../public/icons');
const publicDir = join(__dirname, '../public');

const svgBuffer = readFileSync(svgPath);

console.log('Generating PWA icons...\n');

// Generate standard icons
for (const size of sizes) {
  const outputPath = join(iconDir, `icon-${size}x${size}.png`);

  await sharp(svgBuffer)
    .resize(size, size)
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated ${size}x${size} icon`);
}

// Generate maskable icons (with padding for safe area)
const maskableSizes = [192, 512];
for (const size of maskableSizes) {
  const outputPath = join(iconDir, `icon-${size}x${size}-maskable.png`);

  // Add 20% padding for safe area in maskable icons
  const paddedSize = Math.floor(size * 0.8);
  const padding = Math.floor((size - paddedSize) / 2);

  await sharp(svgBuffer)
    .resize(paddedSize, paddedSize)
    .extend({
      top: padding,
      bottom: padding,
      left: padding,
      right: padding,
      background: { r: 139, g: 92, b: 246, alpha: 1 } // Theme color
    })
    .png()
    .toFile(outputPath);

  console.log(`✓ Generated ${size}x${size} maskable icon`);
}

// Generate apple-touch-icon for iOS (180x180)
const appleTouchIconPath = join(publicDir, 'apple-touch-icon.png');
await sharp(svgBuffer)
  .resize(180, 180)
  .png()
  .toFile(appleTouchIconPath);
console.log('✓ Generated apple-touch-icon.png (180x180)');

console.log('\n✅ All icons generated successfully!');
