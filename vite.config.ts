import path from 'path';

import tailwindcss from '@tailwindcss/vite';
import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import viteReact from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const config = defineConfig({
    base: './',
    resolve: {
        // Vite resolves the `@/*` and `#/*` aliases from tsconfig natively,
        // which replaces the former vite-tsconfig-paths plugin.
        tsconfigPaths: true,
        alias: {
            ui: path.resolve(import.meta.dirname, './ui'),
        },
    },
    plugins: [devtools(), tailwindcss(), tanstackRouter(), viteReact()],
});

export default config;
