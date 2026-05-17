import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv, type PluginOption } from 'vite';
import { timesheetApiPlugin } from './mock-api/timesheetApiPlugin';

export default defineConfig(async ({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const plugins: PluginOption[] = [react()];

  if (mode !== 'test') {
    const { default: tailwindcss } = await import('@tailwindcss/vite');
    plugins.push(tailwindcss());
  }

  if (env.VITE_ENABLE_MOCK_FALLBACK === 'true') {
    plugins.push(timesheetApiPlugin());
  }

  return {
    plugins,
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
    },
  };
});
