import {
  Controller,
  Get,
  Query,
  UseGuards,
  DefaultValuePipe,
  ParseIntPipe,
  Patch,
  Param,
} from '@nestjs/common';
import { SystemLogService } from './system-log.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from '../auth/guards/access.guard';
import { RequirePermission } from '../common/require-permissions.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('system-log')
@ApiBearerAuth()
@Controller('system-log')
export class SystemLogController {
  constructor(private readonly systemLogService: SystemLogService) {}

  @Get('all')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @ApiOperation({ summary: 'Get all system logs (Admin only)' })
  async getAllLogs(
    @Query('limit', new DefaultValuePipe(200), ParseIntPipe) limit: number,
    @Query('skip', new DefaultValuePipe(0), ParseIntPipe) skip: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.systemLogService.getAllLogs(limit, skip, startDate, endDate);
  }

  @Patch('toggle-anomaly/:id')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @ApiOperation({ summary: 'Toggle anomalous status of a system log' })
  async toggleAnomaly(@Param('id') id: string) {
    return this.systemLogService.toggleAnomaly(id);
  }
}
