// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: cloudflare({
    platformProxy: {
      enabled: true,
    },
  }),
  vite: {
    // @ts-expect-error - Vite version mismatch between @tailwindcss/vite (Vite 7) and Astro (Vite 6)
    plugins: [tailwindcss()],
    ssr: {
      external: ['lucia'],
    },
  },
  integrations: [react()],
});
