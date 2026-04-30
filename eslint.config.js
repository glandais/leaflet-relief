const js = require('@eslint/js');
const tseslint = require('@typescript-eslint/eslint-plugin');
const tsparser = require('@typescript-eslint/parser');
const prettier = require('eslint-config-prettier');
const importPlugin = require('eslint-plugin-import-x');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
    js.configs.recommended,
    prettier,
    {
        ignores: ['node_modules/', 'coverage/', 'dist/', 'build/', '.github/', '*.min.js'],
    },
    {
        files: ['*.js'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'script',
            globals: {
                L: 'readonly',
                // Node.js globals
                module: 'readonly',
                require: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                global: 'readonly',
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                createImageBitmap: 'readonly',
                DOMException: 'readonly',
                AbortController: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                Blob: 'readonly',
                HTMLCanvasElement: 'readonly',
            },
        },
        plugins: {
            prettier: prettierPlugin,
        },
        rules: {
            'prettier/prettier': 'error',
            'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'all'],
            'brace-style': ['error', '1tbs'],
        },
    },
    {
        files: ['src/**/*.ts', 'test/**/*.ts', 'e2e/**/*.ts', '*.ts'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            parser: tsparser,
            globals: {
                L: 'readonly',
                // Node.js globals
                module: 'readonly',
                require: 'readonly',
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                global: 'readonly',
                // Browser globals
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
                fetch: 'readonly',
                createImageBitmap: 'readonly',
                DOMException: 'readonly',
                AbortController: 'readonly',
                setTimeout: 'readonly',
                clearTimeout: 'readonly',
                Blob: 'readonly',
                HTMLCanvasElement: 'readonly',
                HTMLElement: 'readonly',
                Image: 'readonly',
                ImageBitmap: 'readonly',
                AbortSignal: 'readonly',
                CanvasRenderingContext2D: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            prettier: prettierPlugin,
            import: importPlugin,
        },
        rules: {
            'prettier/prettier': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-unused-vars': 'off',
            'no-console': 'off',
            'no-var': 'error',
            'prefer-const': 'error',
            eqeqeq: ['error', 'always'],
            curly: ['error', 'all'],
            'brace-style': ['error', '1tbs'],
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/no-explicit-any': 'warn',
            '@typescript-eslint/no-inferrable-types': 'off',
            'import/no-duplicates': 'error',
            'import/order': [
                'error',
                {
                    groups: [
                        'builtin',
                        'external',
                        'internal',
                        'parent',
                        'sibling',
                        'index',
                        'object',
                        'type',
                    ],
                    'newlines-between': 'never',
                    alphabetize: { order: 'asc', caseInsensitive: true },
                },
            ],
        },
        settings: {
            'import/resolver': {
                typescript: {
                    project: './tsconfig.json',
                },
            },
        },
    },
    {
        files: ['e2e/**/*.ts'],
        languageOptions: {
            ecmaVersion: 2021,
            sourceType: 'module',
            parser: tsparser,
            globals: {
                // Playwright globals
                expect: 'readonly',
                test: 'readonly',
                describe: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                // Browser environment (for page.waitForFunction context)
                window: 'readonly',
                document: 'readonly',
                console: 'readonly',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
            prettier: prettierPlugin,
        },
        rules: {
            'prettier/prettier': 'error',
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
            'no-unused-vars': 'off',
            'no-console': 'off',
            // Allow any types in test files for convenience
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
];
