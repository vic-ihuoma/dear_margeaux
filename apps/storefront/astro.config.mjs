import { defineConfig } from 'astro/config';
import tailwind from '@astrojs/tailwind';
import react from '@astrojs/react';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import sentry from '@sentry/astro';

// https://astro.build/config
export default defineConfig({
  // Site URL for sitemap and canonical URLs
  site: 'https://dearmargeaux.com',
  integrations: [
    tailwind(),
    react(),
    mdx(),
    sitemap({
      // Exclude checkout, cart, account, and API pages from sitemap
      filter: (page) =>
        !page.includes('/checkout/') &&
        !page.includes('/cart') &&
        !page.includes('/account/') &&
        !page.includes('/api/'),
      // Change frequency hints for crawlers
      changefreq: 'weekly',
      // Priority hints
      priority: 0.7,
      // Last modified based on build time
      lastmod: new Date(),
      // Serialize function to customize entries
      serialize(item) {
        // Give higher priority to key pages
        if (item.url === 'https://dearmargeaux.com/') {
          item.priority = 1.0;
          item.changefreq = 'daily';
        } else if (item.url.includes('/shop')) {
          item.priority = 0.9;
          item.changefreq = 'daily';
        } else if (item.url.includes('/product/')) {
          item.priority = 0.8;
          item.changefreq = 'weekly';
        } else if (item.url.includes('/blog/')) {
          item.priority = 0.6;
          item.changefreq = 'monthly';
        } else if (item.url.includes('/lookbook/')) {
          item.priority = 0.5;
          item.changefreq = 'monthly';
        }
        return item;
      },
    }),
    // Sentry error monitoring (only enabled when DSN is configured)
    ...(process.env.PUBLIC_SENTRY_DSN
      ? [
          sentry({
            dsn: process.env.PUBLIC_SENTRY_DSN,
            environment: process.env.PUBLIC_SENTRY_ENVIRONMENT || 'development',
            sourceMapsUploadOptions: {
              project: 'dear-margeaux-storefront',
              org: process.env.SENTRY_ORG,
              authToken: process.env.SENTRY_AUTH_TOKEN,
            },
            // Performance monitoring
            tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
            // Session Replay
            replaysSessionSampleRate: 0.01,
            replaysOnErrorSampleRate: 1.0,
          }),
        ]
      : []),
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
