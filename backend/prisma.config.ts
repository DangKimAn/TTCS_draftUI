import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Nạp biến môi trường từ file .env
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DIRECT_URL,
  },
});