import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: false,
        setupFiles: ['./test/setup.ts'],
        include: ['test/**/*.test.ts', '**/__tests__/**/*.test.ts'],
        coverage: {
            provider: 'v8',
            reportsDirectory: 'coverage',
            include: ['src/**/*.ts'],
            exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
            thresholds: {
                branches: 50,
                functions: 50,
                lines: 50,
                statements: 50,
            },
        },
    },
});
