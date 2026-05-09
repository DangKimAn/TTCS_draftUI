import * as dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  DATABASE: {
    URL: process.env.DATABASE_URL,
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
  },
  JWT: {
    ACCESS_SECRET: process.env.JWT_ACCESS_SECRET || 'TIMESHEETSYSTEM_ACCESSSECRET',
    REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || 'TIMESHEETSYSTEM_REFRESHSECRET',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
  },
};
