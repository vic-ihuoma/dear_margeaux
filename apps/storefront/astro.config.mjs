// @ts-check
import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';

// https://astro.build/config
export default defineConfig({
  integrations: [
    tailwind(),
    react(),
    mdx()
  ],
  // Performance: Enable built-in image optimization
  image: {
    // Use Sharp for local image optimization (default)
    service: {
      entrypoint: 'astro/assets/services/sharp',
      config: {
        // Limit concurrent transformations for memory efficiency
        limitInputPixels: false
      }
    },
    // Generate WebP and AVIF formats
    domains: ['localhost', 'dear-margeaux-images.r2.cloudflarestorage.com'],
    remotePatterns: [{ protocol: 'https' }]
  },
  // Performance: Prefetch links on hover
  prefetch: {
    prefetchAll: false,
    defaultStrategy: 'hover'
  },
  // Build optimizations
  build: {
    // Inline small assets
    inlineStylesheets: 'auto'
  },
  // Compression
  compressHTML: true,
  // Output mode for static generation where possible
  output: 'static'
});
