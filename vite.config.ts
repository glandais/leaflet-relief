import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
    build: {
        lib: {
            entry: resolve(__dirname, 'src/L.GridLayer.Relief.ts'),
            name: 'LeafletRelief',
            formats: ['es', 'umd', 'iife'],
            fileName: format => {
                switch (format) {
                    case 'es':
                        return 'leaflet-relief.esm.js';
                    case 'umd':
                        return 'leaflet-relief.umd.js';
                    case 'iife':
                        return 'leaflet-relief.min.js';
                    default:
                        return `leaflet-relief.${format}.js`;
                }
            },
        },
        sourcemap: true,
        rollupOptions: {
            external: ['leaflet'],
            output: {
                globals: {
                    leaflet: 'L',
                },
            },
        },
    },
    define: {
        'process.env.NODE_ENV': '"production"',
    },
});
