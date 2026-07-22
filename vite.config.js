import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const environment = loadEnv(mode, process.cwd(), '');
  const apiPort = environment.API_PORT || environment.PORT || '3002';

  return {
    plugins: [react()],
    server: {
      host: '127.0.0.1',
      port: 5173,
      proxy: {
        '/api': `http://127.0.0.1:${apiPort}`,
      },
    },
    build: {
      rolldownOptions: {
        output: {
          codeSplitting: {
            groups: [
              { name: 'react-vendor', test: /node_modules[\\/](?:react|react-dom|scheduler)[\\/]/, priority: 20 },
              { name: 'controls-vendor', test: /node_modules[\\/](?:@radix-ui|cmdk|react-day-picker|date-fns|@date-fns)[\\/]/, priority: 15 },
              { name: 'vendor', test: /node_modules/, priority: 10, maxSize: 300000 },
            ],
          },
        },
      },
    },
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.js'],
      exclude: ['node_modules/**', 'dist/**'],
    },
  };
});
