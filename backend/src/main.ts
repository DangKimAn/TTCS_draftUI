import { ClassSerializerInterceptor, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { join } from 'path';
import { AppModule } from './app.module';
import { ResponseEnvelopeInterceptor } from './common/interceptors/response-envelope.interceptor';
import { SystemLogInterceptor } from './common/interceptors/system-log.interceptor';
import { PrismaService } from './prisma/prisma.service';
import { RealtimeService } from './realtime/realtime.service';

interface TrustProxyHttpServer {
  set(setting: 'trust proxy', value: boolean): void;
}

function parseCorsOrigins(value?: string): string[] {
  return (value || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
}

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.useStaticAssets(join(__dirname, '..', 'public'), {
    prefix: '/',
  });
  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  app.enableCors({
    origin: parseCorsOrigins(configService.get<string>('CORS_ORIGIN')),
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Timesheet Pro API')
    .setDescription(
      'API contract for attendance, timesheet, leave, HR, notification, warning and payroll workflows.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, document, {
    jsonDocumentUrl: 'api/docs-json',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const httpServer = app
    .getHttpAdapter()
    .getInstance() as unknown as TrustProxyHttpServer;
  httpServer.set('trust proxy', true);

  const prismaService = app.get(PrismaService);
  const realtimeService = app.get(RealtimeService);

  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new ResponseEnvelopeInterceptor(),
    new SystemLogInterceptor(prismaService, realtimeService),
  );

  const port = configService.get<number>('PORT') || 3000;
  await app.listen(port, '0.0.0.0');

  console.log(`Server running at http://localhost:${port}`);
  console.log(`Swagger docs at http://localhost:${port}/api/docs`);
  console.log(`OpenAPI JSON at http://localhost:${port}/api/docs-json`);
}

void bootstrap();
