#!/usr/bin/env node

/**
 * Upload processed images to Cloudflare R2
 *
 * This script uploads all processed images from their scratchpad directories
 * to Cloudflare R2.
 *
 * Usage:
 *   node scripts/upload-images-to-r2.mjs              # Upload via wrangler CLI (production)
 *   node scripts/upload-images-to-r2.mjs --api       # Upload via Merchant API (local dev)
 *
 * The default mode uses wrangler CLI for direct R2 uploads to production.
 * Use --api mode when testing locally with the dev server.
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const BUCKET_NAME = 'dear-margeaux-images';
const MERCHANT_API_URL = process.env.MERCHANT_API_URL || 'http://localhost:8787';
const MERCHANT_ADMIN_KEY =
  process.env.MERCHANT_ADMIN_KEY || 'sk_95cc73a53cf7842b2d56cfc51a865b1e65edf2d19191ed68';

// Parse command line arguments
const useApiMode = process.argv.includes('--api');

// Image source directories (from previous processing scripts)
const IMAGE_SOURCES = {
  products:
    '/private/tmp/claude/-Users-victorihuoma-Desktop-dear-margeaux/a02ce3a8-6d18-4fea-8540-d5dae1f64726/scratchpad',
  blogLookbook:
    '/private/tmp/claude/-Users-victorihuoma-Desktop-dear-margeaux/6ea6b1bb-f8a6-400e-8a28-e3a6c083563e/scratchpad',
  logos:
    '/private/tmp/claude/-Users-victorihuoma-Desktop-dear-margeaux/4f58e100-89c5-4f86-a224-17606fe87685/scratchpad',
};

// Images to upload with their target folders
const UPLOAD_MANIFEST = [
  // Product images -> products/
  { source: 'products', file: 'prod-1.webp', targetFolder: 'products', targetName: 'prod-1.webp' },
  { source: 'products', file: 'prod-2.webp', targetFolder: 'products', targetName: 'prod-2.webp' },
  { source: 'products', file: 'prod-3.webp', targetFolder: 'products', targetName: 'prod-3.webp' },
  { source: 'products', file: 'prod-4.webp', targetFolder: 'products', targetName: 'prod-4.webp' },
  { source: 'products', file: 'prod-5.webp', targetFolder: 'products', targetName: 'prod-5.webp' },
  { source: 'products', file: 'prod-6.webp', targetFolder: 'products', targetName: 'prod-6.webp' },
  { source: 'products', file: 'prod-7.webp', targetFolder: 'products', targetName: 'prod-7.webp' },

  // Blog images -> blog/
  {
    source: 'blogLookbook',
    file: 'blog-about.webp',
    targetFolder: 'blog',
    targetName: 'blog-about.webp',
  },

  // Lookbook images -> lookbook/
  {
    source: 'blogLookbook',
    file: 'lookbook-1.webp',
    targetFolder: 'lookbook',
    targetName: 'lookbook-1.webp',
  },
  {
    source: 'blogLookbook',
    file: 'lookbook-2.webp',
    targetFolder: 'lookbook',
    targetName: 'lookbook-2.webp',
  },

  // Branding images -> branding/
  {
    source: 'blogLookbook',
    file: 'branding-hero.webp',
    targetFolder: 'branding',
    targetName: 'branding-hero.webp',
  },

  // Logo files -> branding/
  {
    source: 'logos',
    file: 'logo-main.webp',
    targetFolder: 'branding',
    targetName: 'logo-main.webp',
  },
  { source: 'logos', file: 'logo-main.png', targetFolder: 'branding', targetName: 'logo-main.png' },
  {
    source: 'logos',
    file: 'logo-light.webp',
    targetFolder: 'branding',
    targetName: 'logo-light.webp',
  },
  {
    source: 'logos',
    file: 'logo-light.png',
    targetFolder: 'branding',
    targetName: 'logo-light.png',
  },
  {
    source: 'logos',
    file: 'logo-light-bold.webp',
    targetFolder: 'branding',
    targetName: 'logo-light-bold.webp',
  },
  {
    source: 'logos',
    file: 'logo-light-bold.png',
    targetFolder: 'branding',
    targetName: 'logo-light-bold.png',
  },
];

// Get MIME type from file extension
function getMimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.webp': 'image/webp',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
  };
  return mimeTypes[ext] || 'application/octet-stream';
}

// Upload via wrangler CLI (production mode)
function uploadViaWrangler(localPath, r2Key, contentType) {
  const cmd = `npx wrangler r2 object put "${BUCKET_NAME}/${r2Key}" --file="${localPath}" --content-type="${contentType}" --remote`;
  try {
    execSync(cmd, { stdio: 'pipe' });
    return { key: r2Key };
  } catch (error) {
    console.error(`  Error: ${error.message}`);
    return null;
  }
}

// Upload via Merchant API (local dev mode)
async function uploadViaApi(filePath, targetFolder, targetName) {
  const fileBuffer = fs.readFileSync(filePath);
  const mimeType = getMimeType(filePath);
  const blob = new Blob([fileBuffer], { type: mimeType });

  const formData = new FormData();
  formData.append('file', blob, targetName);
  formData.append('folder', targetFolder);
  formData.append('filename', targetName);

  try {
    const response = await fetch(`${MERCHANT_API_URL}/v1/images`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${MERCHANT_ADMIN_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.text();
      console.error(`  Upload failed: ${response.status} ${error}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`  Upload error: ${error.message}`);
    return null;
  }
}

// Verify an uploaded image URL returns 200
async function verifyUrl(url) {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// Main upload function
async function main() {
  const mode = useApiMode ? 'API' : 'WRANGLER';

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║          DEAR MARGEAUX - R2 IMAGE UPLOAD                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log();
  console.log(`Mode: ${mode}`);

  if (useApiMode) {
    console.log(`API URL: ${MERCHANT_API_URL}`);

    // Check if API is running
    try {
      const healthCheck = await fetch(`${MERCHANT_API_URL}/`);
      if (!healthCheck.ok) {
        console.error(
          '❌ Merchant API is not responding. Start it with: cd merchant && pnpm dev'
        );
        process.exit(1);
      }
      const healthData = await healthCheck.json();
      if (!healthData.ok) {
        console.error('❌ Merchant API returned unhealthy status');
        process.exit(1);
      }
      console.log('✓ Merchant API is running');
    } catch {
      console.error(
        '❌ Cannot connect to Merchant API. Start it with: cd merchant && pnpm dev'
      );
      process.exit(1);
    }
  } else {
    console.log(`Bucket: ${BUCKET_NAME}`);
  }
  console.log();

  // Verify source directories exist
  const missingDirs = [];
  for (const [name, dir] of Object.entries(IMAGE_SOURCES)) {
    if (!fs.existsSync(dir)) {
      missingDirs.push(name);
    }
  }

  if (missingDirs.length > 0) {
    console.error(`❌ Missing source directories: ${missingDirs.join(', ')}`);
    console.error('   Run the image processing scripts first.');
    process.exit(1);
  }

  console.log('✓ All source directories exist');
  console.log();

  // Upload all images
  const results = { success: [], failed: [] };

  console.log('Uploading images...');
  console.log('─'.repeat(60));

  for (const item of UPLOAD_MANIFEST) {
    const localPath = path.join(IMAGE_SOURCES[item.source], item.file);

    if (!fs.existsSync(localPath)) {
      console.log(`  ✗ File not found: ${item.file}`);
      results.failed.push(item);
      continue;
    }

    process.stdout.write(`  ${item.targetFolder}/${item.targetName}... `);

    let result;
    if (useApiMode) {
      result = await uploadViaApi(localPath, item.targetFolder, item.targetName);
    } else {
      // Use clean folder structure: products/, blog/, lookbook/, branding/
      const r2Key = `${item.targetFolder}/${item.targetName}`;
      const contentType = getMimeType(item.file);
      result = uploadViaWrangler(localPath, r2Key, contentType);
    }

    if (result) {
      console.log('✓');
      results.success.push({ ...item, ...result });
    } else {
      console.log('✗');
      results.failed.push(item);
    }
  }

  console.log('─'.repeat(60));
  console.log();

  // Verify URLs if using API mode
  if (useApiMode && results.success.length > 0) {
    console.log('Verifying uploaded URLs...');
    console.log('─'.repeat(60));

    for (const item of results.success) {
      if (item.url) {
        const isValid = await verifyUrl(item.url);
        if (isValid) {
          console.log(`  ✓ ${item.url}`);
        } else {
          console.log(`  ✗ ${item.url} - URL not accessible`);
          results.failed.push(item);
          results.success = results.success.filter((i) => i.url !== item.url);
        }
      }
    }

    console.log('─'.repeat(60));
    console.log();
  }

  // Summary
  console.log('═'.repeat(60));
  console.log('UPLOAD SUMMARY');
  console.log('═'.repeat(60));
  console.log(`  Total: ${UPLOAD_MANIFEST.length}`);
  console.log(`  Success: ${results.success.length}`);
  console.log(`  Failed: ${results.failed.length}`);
  console.log();

  if (results.failed.length > 0) {
    console.log('Failed uploads:');
    for (const item of results.failed) {
      console.log(`  - ${item.targetFolder}/${item.targetName}`);
    }
    console.log();
  }

  // Output uploaded keys/URLs
  if (results.success.length > 0) {
    console.log(useApiMode ? 'Uploaded image URLs:' : 'Uploaded R2 keys:');
    console.log('─'.repeat(60));

    const byFolder = {};
    for (const item of results.success) {
      if (!byFolder[item.targetFolder]) byFolder[item.targetFolder] = [];
      byFolder[item.targetFolder].push({
        name: item.targetName,
        key: item.key,
        url: item.url,
      });
    }

    for (const [folder, items] of Object.entries(byFolder)) {
      console.log(`\n${folder}/`);
      for (const item of items) {
        console.log(`  ${item.name}: ${item.url || item.key}`);
      }
    }
    console.log();
  }

  // Save results to a JSON file for reference
  const outputPath = path.join(__dirname, '..', 'r2-upload-results.json');
  fs.writeFileSync(
    outputPath,
    JSON.stringify(
      {
        timestamp: new Date().toISOString(),
        mode,
        bucket: BUCKET_NAME,
        results: {
          success: results.success,
          failed: results.failed.map((f) => ({ folder: f.targetFolder, name: f.targetName })),
        },
      },
      null,
      2
    )
  );

  console.log(`Results saved to: ${outputPath}`);

  if (results.failed.length > 0) {
    process.exit(1);
  }

  console.log('\n✅ All images uploaded successfully!');
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
