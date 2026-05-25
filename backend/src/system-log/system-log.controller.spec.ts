import { Test, TestingModule } from '@nestjs/testing';
import { SystemLogController } from './system-log.controller';
import { SystemLogService } from './system-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from '../auth/guards/access.guard';

describe('SystemLogController', () => {
  let controller: SystemLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemLogController],
      providers: [
        {
          provide: SystemLogService,
          useValue: {
            getAllLogs: jest.fn(),
            toggleAnomaly: jest.fn(),
          },
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(UserAccessGaurd)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<SystemLogController>(SystemLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
