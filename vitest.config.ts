import vue from '@vitejs/plugin-vue';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['tests/unit/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'mail-dom',
          environment: 'jsdom',
          include: ['tests/integration/mail-dom/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'outlook-web',
          environment: 'jsdom',
          include: ['tests/integration/outlook-web/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'gmail-web',
          environment: 'jsdom',
          include: ['tests/integration/gmail-web/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'outlook-addin',
          environment: 'jsdom',
          include: ['tests/integration/outlook-addin/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'session',
          environment: 'jsdom',
          include: ['tests/integration/session/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'extension',
          environment: 'jsdom',
          include: ['tests/integration/extension/**/*.test.ts'],
        },
      },
      {
        plugins: [vue()],
        test: {
          name: 'ui',
          environment: 'jsdom',
          include: ['tests/integration/ui/**/*.test.ts'],
        },
      },
    ],
  },
});
