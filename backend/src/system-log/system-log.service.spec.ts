import { Test, TestingModule } from '@nestjs/testing';
import { SystemLogService } from './system-log.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SystemLogService', () => {
  let service: SystemLogService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemLogService,
        {
          provide: PrismaService,
          useValue: {
            systemLog: {
              findMany: jest.fn(),
              count: jest.fn(),
              findUnique: jest.fn(),
              update: jest.fn(),
            },
          },
        },
      ],
    }).compile();

    service = module.get<SystemLogService>(SystemLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
