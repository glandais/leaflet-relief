const js = require('@eslint/js');
const prettier = require('eslint-config-prettier');
const prettierPlugin = require('eslint-plugin-prettier');

module.exports = [
    js.configs.recommended,
    prettier,
    {
        ignores: ['node_modules/', 'coverage/', 'dist/', 'build/', '.github/', '*.min.js'],
    },
    {
        files: ['src/**/*.js', 'test/**/*.js', '*.js'],
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
                // Jest globals
                describe: 'readonly',
                it: 'readonly',
                test: 'readonly',
                expect: 'readonly',
                beforeEach: 'readonly',
                afterEach: 'readonly',
                jest: 'readonly',
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
];
