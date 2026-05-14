import { Controller } from '@nestjs/common';
import { BycyptHashedService } from './bycypt-hashed.service';

@Controller('bycypt-hashed')
export class BycyptHashedController {
  constructor(private readonly bycyptHashedService: BycyptHashedService) {}
}
