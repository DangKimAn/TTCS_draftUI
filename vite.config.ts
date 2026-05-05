import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { timesheetApiPlugin } from './mock-api/timesheetApiPlugin';

export default defineConfig({
  plugins: [react(), timesheetApiPlugin()],
});
