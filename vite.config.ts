import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      allowedHosts: true,
      host: true,
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/graphify-out/**', '**/.data/**', '**/tmp/**', '**/.git/**'],
      },
    },
    build: {
      modulePreload: {
        resolveDependencies: (_filename, deps, context) => {
          if (context.hostType === 'html') {
            return deps.filter((dep) => !dep.includes('charts'));
          }
          return deps;
        },
      },
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules/')) return;
            const parts = id.split('node_modules/');
            const pkg = parts[parts.length - 1] || '';
            if (pkg.startsWith('recharts/') || pkg.startsWith('d3-') || pkg.startsWith('victory-vendor/')) {
              return 'charts';
            }
            if (pkg.startsWith('lucide-react/')) {
              return 'icons';
            }
            if (pkg.startsWith('three/') || pkg.startsWith('web-ifc/')) {
              // Loaded only by the lazy IFC review surface. Keep the renderer,
              // parser and self-hosted WASM out of the application entry chunk.
              return 'ifc-viewer';
            }
            if (
              pkg.startsWith('react/') ||
              pkg.startsWith('react-dom/') ||
              pkg.startsWith('scheduler/') ||
              pkg.startsWith('react-router/') ||
              pkg.startsWith('react-router-dom/') ||
              pkg.startsWith('@remix-run/router/')
            ) {
              return 'react-vendor';
            }
            if (pkg.startsWith('motion/') || pkg.startsWith('framer-motion/') || pkg.startsWith('motion-dom/') || pkg.startsWith('motion-utils/')) {
              return 'motion';
            }
          },
        },
      },
    },
  };
});
