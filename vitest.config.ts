import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
    hookTimeout: 60000, // 60 seconds for hooks (beforeEach, afterEach, etc.)
    testTimeout: 30000, // 30 seconds for individual tests
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types/**',
        '.eslintrc.cjs',
        'scripts/**',
        'src/index.ts',
        'src/services/ai.service.ts',
        'src/utils/logger.ts',
        'src/utils/sentry.ts',
        'src/middleware/logging.middleware.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 60,
        statements: 80,
      },
    },
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});
