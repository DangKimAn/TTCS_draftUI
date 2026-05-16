import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import request from 'supertest';
import * as jwt from 'jsonwebtoken';
import { AppModule } from './../src/app.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { BycyptHashedService } from 'src/common/bycypt-hashed/bycypt-hashed.service';
import { ENV } from 'src/common/env';

interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

describe('Auth Refresh Flow (e2e)', () => {
  jest.setTimeout(30000);
  let app: INestApplication;
  let prisma: PrismaService;
  let bcrypt: BycyptHashedService;

  let testUser: { userID: string; email: string } | null = null;
  let accessToken: string;
  let refreshToken: string;

  beforeAll(async () => {
    // Fix for Supabase pooler issue: prepared statement already exists
    if (
      process.env.DATABASE_URL &&
      !process.env.DATABASE_URL.includes('pgbouncer=true')
    ) {
      process.env.DATABASE_URL =
        process.env.DATABASE_URL +
        (process.env.DATABASE_URL.includes('?') ? '&' : '?') +
        'pgbouncer=true';
    }

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    app.useGlobalInterceptors(
      new ClassSerializerInterceptor(app.get(Reflector)),
    );

    process.env.SKIP_AUTO_SEED = 'true';
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    bcrypt = app.get<BycyptHashedService>(BycyptHashedService);

    // Setup Role
    const role = await prisma.role.upsert({
      where: { nameRole: 'employee' },
      update: {},
      create: { nameRole: 'employee' },
    });

    // Create Test User
    const hashedPassword = await bcrypt.hash('password123');
    testUser = await prisma.user.upsert({
      where: { email: 'refresh_test@example.com' },
      update: {
        isActive: true,
        hashedPassword,
        roleId: role.roleID,
      },
      create: {
        email: 'refresh_test@example.com',
        username: 'refresh_test',
        hashedPassword,
        isActive: true,
        roleId: role.roleID,
      },
    });
  });

  afterAll(async () => {
    if (testUser) {
      await prisma.user.deleteMany({
        where: { email: 'refresh_test@example.com' },
      });
    }
    await app.close();
  });

  it('should login, fail with expired token, refresh token, and succeed with new token', async () => {
    // 1. Login
    const loginRes = await request(app.getHttpServer() as request.App)
      .post('/api/auth/login')
      .send({
        email: 'refresh_test@example.com',
        password: 'password123',
      });

    expect(loginRes.status).toBe(201);
    const loginBody = loginRes.body as ApiResponse<{
      accessToken: string;
      refreshToken: string;
      user: { userID: string };
    }>;
    const loginData = loginBody.data;
    accessToken = loginData.accessToken;
    refreshToken = loginData.refreshToken;
    const userID = loginData.user.userID;

    expect(accessToken).toBeDefined();
    expect(refreshToken).toBeDefined();

    // 2. Verify Access Token works initially
    const initialAccess = await request(app.getHttpServer() as request.App)
      .get(`/api/user/getByID/${userID}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(initialAccess.status).toBe(200);

    // 3. Simulate Access Token Expiration
    // We manually create an expired token using the same secret
    const decodedPayload = jwt.decode(accessToken) as Record<string, any>;
    const payload = decodedPayload ? { ...decodedPayload } : {};
    delete payload.iat;
    delete payload.exp;

    const expiredToken = jwt.sign(payload, ENV.JWT.ACCESS_SECRET, {
      expiresIn: '-1s',
    });

    // 4. Verify expired token fails
    const expiredAccess = await request(app.getHttpServer() as request.App)
      .get(`/api/user/getByID/${userID}`)
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(expiredAccess.status).toBe(401);

    // 5. Use Refresh Token to get a new pair
    const refreshRes = await request(app.getHttpServer() as request.App)
      .post(`/api/auth/refreshToken/${userID}`)
      .send({
        refreshToken: refreshToken,
      });

    expect(refreshRes.status).toBe(201);
    const refreshBody = refreshRes.body as ApiResponse<{
      accessToken: string;
      refreshToken: string;
    }>;
    const newAccessToken = refreshBody.data.accessToken;
    const newRefreshToken = refreshBody.data.refreshToken;

    expect(newAccessToken).toBeDefined();
    expect(newAccessToken).not.toBe(accessToken);
    expect(newRefreshToken).toBeDefined();
    expect(newRefreshToken).not.toBe(refreshToken);

    // 6. Verify new Access Token works
    const newAccess = await request(app.getHttpServer() as request.App)
      .get(`/api/user/getByID/${userID}`)
      .set('Authorization', `Bearer ${newAccessToken}`);

    expect(newAccess.status).toBe(200);
    const newAccessBody = newAccess.body as ApiResponse<{ email: string }>;
    expect(newAccessBody.data.email).toBe('refresh_test@example.com');
  });
});
