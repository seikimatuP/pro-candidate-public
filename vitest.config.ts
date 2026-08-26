import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@aws-sdk/client-s3': path.resolve(__dirname, 'node_modules/@aws-sdk/client-s3'),
      '@aws-sdk/client-lambda': path.resolve(__dirname, 'node_modules/@aws-sdk/client-lambda'),
      '@aws-sdk/client-ssm': path.resolve(__dirname, 'node_modules/@aws-sdk/client-ssm'),
      '@aws-sdk/client-secrets-manager': path.resolve(__dirname, 'node_modules/@aws-sdk/client-secrets-manager'),
    },
  },
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/unit/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'tests/integration/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'tests/aws/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}', 'src/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['**/node_modules/**', '**/dist/**', '**/cypress/**', '**/.{idea,git,cache,output,temp}/**', '**/frontend/**', '**/tests/e2e/**', '**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        lines: 70,
        functions: 70,
      },
    },
  },
});
