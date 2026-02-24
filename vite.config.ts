import { devtools } from '@tanstack/devtools-vite';
import { tanstackRouter } from '@tanstack/router-plugin/vite';
import tailwindcss from '@tailwindcss/vite';
import viteReact from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

const config = defineConfig({
    base: '/',
    resolve: {
        alias: {
            ui: path.resolve(__dirname, './ui'),
        },
    },
    plugins: [
        devtools(),
        tsconfigPaths({ projects: ['./tsconfig.json'] }),
        tailwindcss(),
        tanstackRouter(),
        viteReact(),
    ],
});

export default config;
