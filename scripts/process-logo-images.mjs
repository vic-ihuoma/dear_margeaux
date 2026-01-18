import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_DIR = '/Users/victorihuoma/Downloads/dear_margeaux_pics';
const OUTPUT_DIR = '/private/tmp/claude/-Users-victorihuoma-Desktop-dear-margeaux/4f58e100-89c5-4f86-a224-17606fe87685/scratchpad';

// Map source files to output names
const logoImages = [
  { src: 'dear_margeaux main logo.jpg', out: 'logo-main', highQuality: true },
  { src: 'dear_margeaux - light logo.jpg', out: 'logo-light', highQuality: false },
  { src: 'dear_margeaux light logo bold.jpg', out: 'logo-light-bold', highQuality: false },
];

// Standard header height range
const MIN_HEIGHT = 48;
const MAX_HEIGHT = 64;
const TARGET_HEIGHT = 56; // Middle of the range

async function processLogo(srcPath, outBaseName, preserveQuality = false) {
  const inputBuffer = fs.readFileSync(srcPath);
  const image = sharp(inputBuffer);

  // Get metadata
  const metadata = await image.metadata();
  console.log(`Processing ${path.basename(srcPath)}: ${metadata.width}x${metadata.height}`);

  // Calculate new dimensions to fit target height while maintaining aspect ratio
  const aspectRatio = metadata.width / metadata.height;
  const newHeight = TARGET_HEIGHT;
  const newWidth = Math.round(newHeight * aspectRatio);

  console.log(`  Resizing to ${newWidth}x${newHeight} (target height: ${TARGET_HEIGHT}px)`);

  // Resize
  const resizedImage = image.resize({
    width: newWidth,
    height: newHeight,
    fit: 'fill',
  });

  // WebP output (high quality for main logo)
  const webpQuality = preserveQuality ? 95 : 85;
  const webpPath = path.join(OUTPUT_DIR, `${outBaseName}.webp`);
  await resizedImage.clone().webp({ quality: webpQuality, lossless: preserveQuality }).toBuffer()
    .then(buffer => fs.writeFileSync(webpPath, buffer));

  // PNG output (for transparency support)
  const pngPath = path.join(OUTPUT_DIR, `${outBaseName}.png`);
  await resizedImage.clone().png({ compressionLevel: 9 }).toBuffer()
    .then(buffer => fs.writeFileSync(pngPath, buffer));

  // Verify outputs
  const webpMetadata = await sharp(webpPath).metadata();
  const pngMetadata = await sharp(pngPath).metadata();
  const webpSize = fs.statSync(webpPath).size;
  const pngSize = fs.statSync(pngPath).size;

  console.log(`  WebP: ${webpMetadata.width}x${webpMetadata.height}, ${(webpSize / 1024).toFixed(1)}KB`);
  console.log(`  PNG: ${pngMetadata.width}x${pngMetadata.height}, ${(pngSize / 1024).toFixed(1)}KB`);

  return {
    name: outBaseName,
    webp: {
      width: webpMetadata.width,
      height: webpMetadata.height,
      sizeKB: (webpSize / 1024).toFixed(1),
    },
    png: {
      width: pngMetadata.width,
      height: pngMetadata.height,
      sizeKB: (pngSize / 1024).toFixed(1),
    },
  };
}

async function main() {
  console.log('Processing logo images...\n');

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const results = [];

  for (const img of logoImages) {
    const srcPath = path.join(SOURCE_DIR, img.src);

    if (!fs.existsSync(srcPath)) {
      console.error(`ERROR: Source file not found: ${srcPath}`);
      process.exit(1);
    }

    const result = await processLogo(srcPath, img.out, img.highQuality);
    results.push(result);
    console.log('');
  }

  // Summary
  console.log('=== Summary ===');
  console.log('Logo images processed:\n');

  for (const r of results) {
    console.log(`${r.name}:`);
    console.log(`  WebP: ${r.webp.width}x${r.webp.height}, ${r.webp.sizeKB}KB`);
    console.log(`  PNG:  ${r.png.width}x${r.png.height}, ${r.png.sizeKB}KB`);
  }

  // Test results
  console.log('\n=== Test Results ===');

  const mainWebp = results.find(r => r.name === 'logo-main');
  const lightWebp = results.find(r => r.name === 'logo-light');
  const lightBoldWebp = results.find(r => r.name === 'logo-light-bold');

  const tests = [
    {
      name: 'logo-main.webp created with high quality',
      pass: mainWebp && fs.existsSync(path.join(OUTPUT_DIR, 'logo-main.webp')),
    },
    {
      name: 'logo-light.webp created successfully',
      pass: lightWebp && fs.existsSync(path.join(OUTPUT_DIR, 'logo-light.webp')),
    },
    {
      name: 'logo-light-bold.webp created successfully',
      pass: lightBoldWebp && fs.existsSync(path.join(OUTPUT_DIR, 'logo-light-bold.webp')),
    },
    {
      name: 'PNG versions created for each logo',
      pass: fs.existsSync(path.join(OUTPUT_DIR, 'logo-main.png')) &&
            fs.existsSync(path.join(OUTPUT_DIR, 'logo-light.png')) &&
            fs.existsSync(path.join(OUTPUT_DIR, 'logo-light-bold.png')),
    },
    {
      name: 'Logo heights are between 48-64px',
      pass: results.every(r =>
        r.webp.height >= MIN_HEIGHT && r.webp.height <= MAX_HEIGHT &&
        r.png.height >= MIN_HEIGHT && r.png.height <= MAX_HEIGHT
      ),
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
}

main().catch(console.error);
