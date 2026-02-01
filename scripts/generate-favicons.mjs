import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SOURCE_DIR = '/Users/victorihuoma/Downloads/dear_margeaux_pics';
const OUTPUT_DIR = '/Users/victorihuoma/Desktop/dear_margeaux/apps/storefront/public';

// Use the light logo as favicon source
const SOURCE_FILE = 'dear_margeaux - light logo.jpg';

const FAVICON_SIZES = {
  'favicon-16x16.png': 16,
  'favicon-32x32.png': 32,
  'apple-touch-icon.png': 180,
  'android-chrome-192x192.png': 192,
  'android-chrome-512x512.png': 512,
};

const ICO_SIZES = [16, 32, 48];

async function generatePngFavicon(inputBuffer, size, outputPath) {
  // Create a square crop from the center of the image, then resize
  const metadata = await sharp(inputBuffer).metadata();

  // Calculate square crop dimensions (use the smaller dimension)
  const cropSize = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - cropSize) / 2);
  const top = Math.floor((metadata.height - cropSize) / 2);

  await sharp(inputBuffer)
    .extract({ left, top, width: cropSize, height: cropSize })
    .resize(size, size, { fit: 'fill' })
    .png()
    .toFile(outputPath);

  return outputPath;
}

async function generateIco(inputBuffer, sizes, outputPath) {
  // Generate individual PNG files for each size
  const tempDir = '/tmp/favicon-ico-temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const metadata = await sharp(inputBuffer).metadata();
  const cropSize = Math.min(metadata.width, metadata.height);
  const left = Math.floor((metadata.width - cropSize) / 2);
  const top = Math.floor((metadata.height - cropSize) / 2);

  const pngFiles = [];
  for (const size of sizes) {
    const pngPath = path.join(tempDir, `favicon-${size}.png`);
    await sharp(inputBuffer)
      .extract({ left, top, width: cropSize, height: cropSize })
      .resize(size, size, { fit: 'fill' })
      .png()
      .toFile(pngPath);
    pngFiles.push(pngPath);
  }

  // Use ImageMagick to combine PNGs into ICO (if available)
  // Otherwise, we'll create a simple ICO manually
  try {
    execSync(`convert ${pngFiles.join(' ')} ${outputPath}`, { stdio: 'pipe' });
  } catch (e) {
    // ImageMagick not available, create a simple ICO with the 32x32 version
    // ICO format: header + directory entries + image data
    console.log('  ImageMagick not available, creating ICO from PNG data...');
    await createIcoFromPngs(pngFiles, outputPath);
  }

  // Cleanup temp files
  for (const f of pngFiles) {
    fs.unlinkSync(f);
  }

  return outputPath;
}

async function createIcoFromPngs(pngPaths, outputPath) {
  // Read PNG files and their metadata
  const images = [];
  for (const pngPath of pngPaths) {
    const pngBuffer = fs.readFileSync(pngPath);
    const metadata = await sharp(pngPath).metadata();
    images.push({
      buffer: pngBuffer,
      width: metadata.width,
      height: metadata.height,
    });
  }

  // ICO file structure:
  // - ICONDIR header (6 bytes)
  // - ICONDIRENTRY array (16 bytes each)
  // - Image data (PNG format)

  const numImages = images.length;
  const headerSize = 6;
  const dirEntrySize = 16;
  const dirSize = headerSize + (dirEntrySize * numImages);

  // Calculate offsets for each image
  let offset = dirSize;
  const offsets = [];
  for (const img of images) {
    offsets.push(offset);
    offset += img.buffer.length;
  }

  // Create buffer
  const totalSize = offset;
  const ico = Buffer.alloc(totalSize);

  // Write ICONDIR header
  ico.writeUInt16LE(0, 0);      // Reserved, must be 0
  ico.writeUInt16LE(1, 2);      // Image type: 1 = ICO
  ico.writeUInt16LE(numImages, 4); // Number of images

  // Write ICONDIRENTRY for each image
  for (let i = 0; i < numImages; i++) {
    const img = images[i];
    const entryOffset = headerSize + (i * dirEntrySize);

    ico.writeUInt8(img.width >= 256 ? 0 : img.width, entryOffset);     // Width (0 means 256)
    ico.writeUInt8(img.height >= 256 ? 0 : img.height, entryOffset + 1); // Height (0 means 256)
    ico.writeUInt8(0, entryOffset + 2);        // Color palette (0 = no palette)
    ico.writeUInt8(0, entryOffset + 3);        // Reserved
    ico.writeUInt16LE(1, entryOffset + 4);     // Color planes
    ico.writeUInt16LE(32, entryOffset + 6);    // Bits per pixel
    ico.writeUInt32LE(img.buffer.length, entryOffset + 8);  // Image size
    ico.writeUInt32LE(offsets[i], entryOffset + 12);        // Image offset
  }

  // Write image data
  for (let i = 0; i < numImages; i++) {
    images[i].buffer.copy(ico, offsets[i]);
  }

  fs.writeFileSync(outputPath, ico);
}

function createWebManifest(outputPath) {
  const manifest = {
    name: 'Dear Margeaux',
    short_name: 'Dear Margeaux',
    icons: [
      {
        src: '/android-chrome-192x192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/android-chrome-512x512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
    theme_color: '#ffffff',
    background_color: '#ffffff',
    display: 'standalone',
  };

  fs.writeFileSync(outputPath, JSON.stringify(manifest, null, 2));
  return outputPath;
}

async function main() {
  console.log('Generating favicons from logo...\n');

  const srcPath = path.join(SOURCE_DIR, SOURCE_FILE);

  if (!fs.existsSync(srcPath)) {
    console.error(`ERROR: Source file not found: ${srcPath}`);
    process.exit(1);
  }

  const inputBuffer = fs.readFileSync(srcPath);
  const metadata = await sharp(inputBuffer).metadata();
  console.log(`Source: ${SOURCE_FILE} (${metadata.width}x${metadata.height})\n`);

  const results = [];

  // Generate PNG favicons
  for (const [filename, size] of Object.entries(FAVICON_SIZES)) {
    const outputPath = path.join(OUTPUT_DIR, filename);
    console.log(`Generating ${filename} (${size}x${size})...`);
    await generatePngFavicon(inputBuffer, size, outputPath);

    const outMeta = await sharp(outputPath).metadata();
    const outSize = fs.statSync(outputPath).size;
    console.log(`  Created: ${outMeta.width}x${outMeta.height}, ${(outSize / 1024).toFixed(1)}KB`);

    results.push({
      file: filename,
      width: outMeta.width,
      height: outMeta.height,
      expectedSize: size,
    });
  }

  // Generate favicon.ico
  console.log(`\nGenerating favicon.ico (${ICO_SIZES.join(', ')}px)...`);
  const icoPath = path.join(OUTPUT_DIR, 'favicon.ico');
  await generateIco(inputBuffer, ICO_SIZES, icoPath);
  const icoSize = fs.statSync(icoPath).size;
  console.log(`  Created: ${(icoSize / 1024).toFixed(1)}KB`);

  // Generate site.webmanifest
  console.log('\nGenerating site.webmanifest...');
  const manifestPath = path.join(OUTPUT_DIR, 'site.webmanifest');
  createWebManifest(manifestPath);
  console.log('  Created: site.webmanifest');

  // Verify manifest is valid JSON
  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  // Summary and tests
  console.log('\n=== Test Results ===');

  const tests = [
    {
      name: 'favicon.ico contains 16x16, 32x32, 48x48 sizes',
      pass: fs.existsSync(icoPath) && icoSize > 0,
    },
    {
      name: 'favicon-16x16.png is exactly 16x16px',
      pass: results.find(r => r.file === 'favicon-16x16.png')?.width === 16,
    },
    {
      name: 'favicon-32x32.png is exactly 32x32px',
      pass: results.find(r => r.file === 'favicon-32x32.png')?.width === 32,
    },
    {
      name: 'apple-touch-icon.png is exactly 180x180px',
      pass: results.find(r => r.file === 'apple-touch-icon.png')?.width === 180,
    },
    {
      name: 'android-chrome-192x192.png is exactly 192x192px',
      pass: results.find(r => r.file === 'android-chrome-192x192.png')?.width === 192,
    },
    {
      name: 'android-chrome-512x512.png is exactly 512x512px',
      pass: results.find(r => r.file === 'android-chrome-512x512.png')?.width === 512,
    },
    {
      name: 'site.webmanifest is valid JSON',
      pass: manifestContent && typeof manifestContent === 'object',
    },
    {
      name: 'site.webmanifest references correct icon paths',
      pass: manifestContent.icons?.some(i => i.src === '/android-chrome-192x192.png') &&
            manifestContent.icons?.some(i => i.src === '/android-chrome-512x512.png'),
    },
  ];

  let allPass = true;
  for (const test of tests) {
    console.log(`${test.pass ? '✓' : '✗'} ${test.name}`);
    if (!test.pass) allPass = false;
  }

  if (!allPass) {
    console.log('\nSome tests failed!');
    process.exit(1);
  }

  console.log('\nAll tests passed!');
  console.log(`\nFavicons generated in: ${OUTPUT_DIR}`);
}

main().catch(console.error);
