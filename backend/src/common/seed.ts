import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BycyptHashedModule } from 'src/common/bycypt-hashed/bycypt-hashed.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { PrismaService } from 'src/prisma/prisma.service';
import { SeedService } from './seed.service';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    BycyptHashedModule,
  ],
  providers: [SeedService],
})
class SeedRunnerModule {}

async function bootstrap() {
  process.env.SKIP_AUTO_SEED = 'true';
  const app = await NestFactory.createApplicationContext(SeedRunnerModule);

  try {
    const seedService = app.get(SeedService);
    await seedService.seedDemoData({ force: true });
  } finally {
    await app.get(PrismaService).$disconnect();
    await app.close();
  }
}

bootstrap().catch((error) => {
  console.error('[seed] Failed to seed demo data:', error);
  process.exit(1);
});
