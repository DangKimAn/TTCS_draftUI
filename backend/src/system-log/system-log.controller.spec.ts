import { Test, TestingModule } from '@nestjs/testing';
import { SystemLogController } from './system-log.controller';

describe('SystemLogController', () => {
  let controller: SystemLogController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemLogController],
    }).compile();

    controller = module.get<SystemLogController>(SystemLogController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
