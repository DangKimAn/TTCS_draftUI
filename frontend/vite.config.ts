import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { timesheetApiPlugin } from './mock-api/timesheetApiPlugin';

export default defineConfig({
  plugins: [react(), tailwindcss(), timesheetApiPlugin()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
