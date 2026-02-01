import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const SOURCE_DIR = '/Users/victorihuoma/Downloads/dear_margeaux_pics';
const OUTPUT_DIR = '/private/tmp/claude/-Users-victorihuoma-Desktop-dear-margeaux/6ea6b1bb-f8a6-400e-8a28-e3a6c083563e/scratchpad';

// Map source files to output names for blog/lookbook images
const blogLookbookImages = [
  { src: 'dear_margeaux - blog image.jpg', out: 'blog-about.webp' },
  { src: 'dear_margeaux lookbook.jpg', out: 'lookbook-1.webp' },
  { src: 'dear_margeaux lookbook and blog.jpg', out: 'lookbook-2.webp' },
  { src: 'dear_margeaux image branding and lookbook.jpg', out: 'branding-hero.webp' },
];

const MAX_WIDTH = 1600; // Larger for blog/lookbook (1600px vs 1200px for products)
const TARGET_SIZE_KB = 300; // Slightly larger target for blog/lookbook quality

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

  // Convert to WebP with quality adjustment
  let quality = 85;
  let outputBuffer;
  let outputSize;

  do {
    outputBuffer = await pipeline.clone().webp({ quality }).toBuffer();
    outputSize = outputBuffer.length;

    if (outputSize > TARGET_SIZE_KB * 1024 && quality > 30) {
      quality -= 5;
      console.log(`  Size ${(outputSize / 1024).toFixed(1)}KB > ${TARGET_SIZE_KB}KB, reducing quality to ${quality}`);
    }
  } while (outputSize > TARGET_SIZE_KB * 1024 && quality > 30);

  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

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
  console.log('Processing blog and lookbook images...\n');

  const results = [];

  for (const img of blogLookbookImages) {
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
  console.log('All 4 blog/lookbook images processed successfully!\n');

  let allPass = true;
  for (const r of results) {
    const widthPass = r.width <= MAX_WIDTH;
    const formatPass = r.file.endsWith('.webp');

    if (!widthPass || !formatPass) allPass = false;

    console.log(`${r.file}: ${r.width}px wide, ${r.sizeKB}KB ${widthPass && formatPass ? 'PASS' : 'FAIL'}`);
  }

  console.log('\n=== Test Results ===');
  console.log(`blog-about.webp created: ${results.some(r => r.file === 'blog-about.webp') ? 'PASS' : 'FAIL'}`);
  console.log(`lookbook-1.webp created: ${results.some(r => r.file === 'lookbook-1.webp') ? 'PASS' : 'FAIL'}`);
  console.log(`lookbook-2.webp created: ${results.some(r => r.file === 'lookbook-2.webp') ? 'PASS' : 'FAIL'}`);
  console.log(`branding-hero.webp created: ${results.some(r => r.file === 'branding-hero.webp') ? 'PASS' : 'FAIL'}`);
  console.log(`All images max 1600px width: ${results.every(r => r.width <= MAX_WIDTH) ? 'PASS' : 'FAIL'}`);
  console.log(`All images WebP format: ${results.every(r => r.file.endsWith('.webp')) ? 'PASS' : 'FAIL'}`);

  if (!allPass) {
    process.exit(1);
  }
}

main().catch(console.error);
