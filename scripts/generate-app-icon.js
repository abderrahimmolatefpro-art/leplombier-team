/**
 * Generate app icon from logo.png + PRO badge for mobile apps
 * Usage: node scripts/generate-app-icon.js
 */
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..');
const LOGO_PATH = path.join(ROOT, 'public', 'logo.png');
const ICON_SIZE = 1024;

// Android mipmap sizes: { folder: sizeInPx }
const ANDROID_SIZES = {
  'mipmap-mdpi': 48,
  'mipmap-hdpi': 72,
  'mipmap-xhdpi': 96,
  'mipmap-xxhdpi': 144,
  'mipmap-xxxhdpi': 192,
};

async function createProBadge(width, height = 60) {
  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <text x="0" y="${height * 0.75}" font-size="${height * 0.6}" font-weight="bold" fill="#0284c7" font-family="Arial, sans-serif">PRO</text>
    </svg>
  `;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

async function generateIcon() {
  const logo = await sharp(LOGO_PATH);
  const logoMeta = await logo.metadata();
  const logoW = logoMeta.width || 200;
  const logoH = logoMeta.height || 80;

  // Logo takes ~60% of icon width, centered
  const logoScale = Math.min((ICON_SIZE * 0.6) / logoW, (ICON_SIZE * 0.3) / logoH);
  const logoNewW = Math.round(logoW * logoScale);
  const logoNewH = Math.round(logoH * logoScale);
  // Logo + PRO side by side: logo left, PRO right
  const totalW = logoNewW + 120;
  const startX = Math.round((ICON_SIZE - totalW) / 2);
  const logoX = startX;
  const logoY = Math.round((ICON_SIZE - logoNewH) / 2) - 20;

  const resizedLogo = await logo.resize(logoNewW, logoNewH).toBuffer();

  // PRO badge à côté du logo (à droite)
  const proBadge = await createProBadge(120, 50);
  const proX = logoX + logoNewW + 15;
  const proY = Math.round((ICON_SIZE - 50) / 2);

  // Create base: white background
  const icon = await sharp({
    create: {
      width: ICON_SIZE,
      height: ICON_SIZE,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .composite([
      { input: resizedLogo, left: logoX, top: logoY },
      { input: proBadge, left: proX, top: proY },
    ])
    .png()
    .toBuffer();

  return icon;
}

async function main() {
  const iconBuffer = await generateIcon();
  const icon = sharp(iconBuffer);

  // 1. iOS - single 1024x1024
  const iosPath = path.join(ROOT, 'mobile-plombier', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  await icon.clone().toFile(iosPath);
  console.log('iOS icon:', iosPath);

  // 2. Android - all mipmap sizes
  const androidBase = path.join(ROOT, 'mobile-plombier', 'android', 'app', 'src', 'main', 'res');
  for (const [folder, size] of Object.entries(ANDROID_SIZES)) {
    const dir = path.join(androidBase, folder);
    const buf = await icon.clone().resize(size, size).toBuffer();
    await sharp(buf).toFile(path.join(dir, 'ic_launcher_foreground.png'));
    await sharp(buf).toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(buf).toFile(path.join(dir, 'ic_launcher_round.png'));
    console.log(`Android ${folder}: ${size}x${size}`);
  }

  // 3. Same for mobile-client
  const iosClientPath = path.join(ROOT, 'mobile-client', 'ios', 'App', 'App', 'Assets.xcassets', 'AppIcon.appiconset', 'AppIcon-512@2x.png');
  await icon.clone().toFile(iosClientPath);
  console.log('iOS client icon:', iosClientPath);

  const androidClientBase = path.join(ROOT, 'mobile-client', 'android', 'app', 'src', 'main', 'res');
  for (const [folder, size] of Object.entries(ANDROID_SIZES)) {
    const dir = path.join(androidClientBase, folder);
    const buf = await icon.clone().resize(size, size).toBuffer();
    await sharp(buf).toFile(path.join(dir, 'ic_launcher_foreground.png'));
    await sharp(buf).toFile(path.join(dir, 'ic_launcher.png'));
    await sharp(buf).toFile(path.join(dir, 'ic_launcher_round.png'));
  }
  console.log('Done. Icons generated for mobile-plombier and mobile-client.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
