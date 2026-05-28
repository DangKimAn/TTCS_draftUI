import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  async pingDatabase(): Promise<{ status: string; message: string }> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'success', message: 'Database connected successfully' };
    } catch {
      return { status: 'error', message: 'Database connection failed' };
    }
  }
}
