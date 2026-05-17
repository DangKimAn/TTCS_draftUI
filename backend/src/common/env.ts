import * as dotenv from 'dotenv';

dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3000', 10),
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  DATABASE: {
    URL: process.env.DATABASE_URL,
    DIRECT_URL: process.env.DIRECT_URL,
    PORT: parseInt(process.env.DB_PORT || '5432', 10),
  },
  JWT: {
    ACCESS_SECRET:
      process.env.JWT_ACCESS_SECRET || 'TIMESHEETSYSTEM_ACCESSSECRET',
    REFRESH_SECRET:
      process.env.JWT_REFRESH_SECRET || 'TIMESHEETSYSTEM_REFRESHSECRET',
    EXPIRES_IN: process.env.JWT_EXPIRES_IN || '15m',
    REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },
  GOOGLE: {
    CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  },
  MICROSOFT: {
    CLIENT_ID: process.env.MICROSOFT_CLIENT_ID,
    CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET,
    TENANT_ID: process.env.MICROSOFT_TENANT_ID,
    CALLBACK_URL: process.env.MICROSOFT_CALLBACK_URL,
    SCOPES: process.env.MICROSOFT_SCOPES || 'openid profile email User.Read',
  },
  SSO: {
    SUCCESS_REDIRECT_URL: process.env.SSO_SUCCESS_REDIRECT_URL,
    ERROR_REDIRECT_URL: process.env.SSO_ERROR_REDIRECT_URL,
  },
  EMAIL: {
    PROVIDER: process.env.EMAIL_PROVIDER || 'log',
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: parseInt(process.env.SMTP_PORT || '587', 10),
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS,
    SMTP_FROM: process.env.SMTP_FROM || '"HRM System" <no-reply@hrm.com>',
  },
};
