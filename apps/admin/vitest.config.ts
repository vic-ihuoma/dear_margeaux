import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    'import.meta.env.MERCHANT_API_URL': JSON.stringify(
      'https://api.example.com'
    ),
    'import.meta.env.MERCHANT_ADMIN_KEY': JSON.stringify('test-api-key'),
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/env.d.ts'],
    },
  },
});
