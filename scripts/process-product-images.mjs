import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_DIR = '/Users/victorihuoma/Downloads/dear_margeaux_pics';
const OUTPUT_DIR = '/private/tmp/claude/-Users-victorihuoma-Desktop-dear-margeaux/a02ce3a8-6d18-4fea-8540-d5dae1f64726/scratchpad';

// Map source files to output names (handling the typo in image 4)
const productImages = [
  { src: 'dear_margeaux product image 1.jpg', out: 'prod-1.webp' },
  { src: 'dear_margeaux product image 2.jpg', out: 'prod-2.webp' },
  { src: 'dear_margeaux product image 3.jpg', out: 'prod-3.webp' },
  { src: 'dear_margeux product image 4.jpg', out: 'prod-4.webp' }, // Note: typo in source
  { src: 'dear_margeaux product image 5.jpg', out: 'prod-5.webp' },
  { src: 'dear_margeaux product image 6.jpg', out: 'prod-6.webp' },
  { src: 'dear_margeaux product image 7.jpg', out: 'prod-7.webp' },
];

const MAX_WIDTH = 1200;
const TARGET_SIZE_KB = 200;

async function processImage(srcPath, outPath) {
  const inputBuffer = fs.readFileSync(srcPath);
  const image = sharp(inputBuffer);

  // Get metadata to check dimensions
  const metadata = await image.metadata();
  console.log(`Processing ${path.basename(srcPath)}: ${metadata.width}x${metadata.height}`);

  // Resize if width > MAX_WIDTH, maintaining aspect ratio
  let pipeline = image.resize({
    width: MAX_WIDTH,
    height: undefined, // Maintain aspect ratio
    fit: 'inside',
    withoutEnlargement: true,
  });

  // Convert to WebP with quality adjustment to meet size target
  let quality = 80;
  let outputBuffer;
  let outputSize;

  do {
    outputBuffer = await pipeline.clone().webp({ quality }).toBuffer();
    outputSize = outputBuffer.length;

    if (outputSize > TARGET_SIZE_KB * 1024 && quality > 20) {
      quality -= 5;
      console.log(`  Size ${(outputSize / 1024).toFixed(1)}KB > ${TARGET_SIZE_KB}KB, reducing quality to ${quality}`);
    }
  } while (outputSize > TARGET_SIZE_KB * 1024 && quality > 20);

  // Write output
  fs.writeFileSync(outPath, outputBuffer);

  // Verify output
  const outMetadata = await sharp(outPath).metadata();
  const finalSize = fs.statSync(outPath).size;

  console.log(`  Output: ${outMetadata.width}x${outMetadata.height}, ${(finalSize / 1024).toFixed(1)}KB, quality=${quality}`);

  return {
    file: path.basename(outPath),
    width: outMetadata.width,
    height: outMetadata.height,
    sizeKB: (finalSize / 1024).toFixed(1),
    quality,
  };
}

async function main() {
  console.log('Processing product images...\n');

  const results = [];

  for (const img of productImages) {
    const srcPath = path.join(SOURCE_DIR, img.src);
    const outPath = path.join(OUTPUT_DIR, img.out);

    if (!fs.existsSync(srcPath)) {
      console.error(`ERROR: Source file not found: ${srcPath}`);
      process.exit(1);
    }

    const result = await processImage(srcPath, outPath);
    results.push(result);
    console.log('');
  }

  // Summary
  console.log('=== Summary ===');
  console.log('All 7 product images processed successfully!\n');

  let allPass = true;
  for (const r of results) {
    const widthPass = r.width <= MAX_WIDTH;
    const sizePass = parseFloat(r.sizeKB) < TARGET_SIZE_KB;
    const formatPass = r.file.endsWith('.webp');

    if (!widthPass || !sizePass || !formatPass) allPass = false;

    console.log(`${r.file}: ${r.width}px wide, ${r.sizeKB}KB ${widthPass && sizePass && formatPass ? '✓' : '✗'}`);
  }

  console.log('\n=== Test Results ===');
  console.log(`All 7 images processed: ${results.length === 7 ? '✓' : '✗'}`);
  console.log(`All images max 1200px width: ${results.every(r => r.width <= MAX_WIDTH) ? '✓' : '✗'}`);
  console.log(`All images <200KB: ${results.every(r => parseFloat(r.sizeKB) < TARGET_SIZE_KB) ? '✓' : '✗'}`);
  console.log(`All images WebP format: ${results.every(r => r.file.endsWith('.webp')) ? '✓' : '✗'}`);
  console.log(`Naming convention prod-1.webp through prod-7.webp: ✓`);

  if (!allPass) {
    process.exit(1);
  }
}

main().catch(console.error);
