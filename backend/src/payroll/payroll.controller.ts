import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
  Res,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { PayrollService } from './payroll.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import { GetPayrollQueryDto } from './dto/get-payroll-query.dto';
import { ExportPayrollQueryDto } from './dto/export-payroll-query.dto';
import {
  CREATED_RESPONE,
  OK_CODE,
  NOTFOUND_CODE,
  CONFLIG_CODE,
} from 'src/common/code';
import { DefaultResponse } from 'src/common/response.dto';
import { ExcelHelper } from 'src/common/excel.helper';

@ApiTags('payroll')
@Controller('payroll')
export class PayrollController {
  constructor(private readonly payrollService: PayrollService) {}

  @ApiOperation({
    description: 'Tạo bảng lương từ timesheet đã duyệt (Role: admin)',
  })
  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Post('/generate/:monthlyTimesheetID')
  async generatePayroll(
    @Param('monthlyTimesheetID', new ParseUUIDPipe())
    monthlyTimesheetID: string,
  ): Promise<DefaultResponse> {
    const response =
      await this.payrollService.generatePayroll(monthlyTimesheetID);

    if (
      response.statusCode === CREATED_RESPONE ||
      response.statusCode === OK_CODE
    )
      return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);
    if (response.statusCode === CONFLIG_CODE)
      throw new ConflictException(response.statusCode, response.message);

    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({ description: 'Xem bảng lương cá nhân (Role: me)' })
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me')
  @Get('/user/:userID')
  async getMyPayroll(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Query() query: GetPayrollQueryDto,
  ): Promise<DefaultResponse> {
    const response = await this.payrollService.getMyPayroll(
      userID,
      query.month,
      query.year,
    );

    if (response.statusCode === OK_CODE) return response;
    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({
    description: 'Xem bảng lương theo phòng ban (Role: manager, admin)',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('managerOfDepartment', 'admin') // Hoặc RequirePermission('manager', 'admin') tùy logic dự án
  @Get('/department/:departmentID')
  async getDepartmentPayroll(
    @Param('departmentID', new ParseUUIDPipe()) departmentID: string,
    @Query() query: GetPayrollQueryDto,
  ): Promise<DefaultResponse> {
    const response = await this.payrollService.getDepartmentPayroll(
      departmentID,
      query.month,
      query.year,
    );

    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);
    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({ description: 'Xuất báo cáo lương (Role: admin)' })
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Get('/export')
  async exportPayroll(
    @Query() query: ExportPayrollQueryDto,
    @Res() res: Response,
  ) {
    const result = await this.payrollService.exportPayroll(
      query.month,
      query.year,
      query.format,
    );

    if (result.statusCode !== OK_CODE) {
      throw new BadRequestException(result.message);
    }

    if (result.isCsv) {
      res.set({
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payroll_report_${query.month || 'all'}_${query.year || 'all'}.csv"`,
      });
      if (result.warnings?.length) {
        res.set('X-Export-Warning', result.warnings.join(' | '));
      }
      res.send(result.data);
      return;
    }

    res.json(result);
  }

  @ApiOperation({ description: 'Xuất báo cáo lương Excel (Role: admin)' })
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Get('/export-excel')
  async exportPayrollExcel(
    @Query() query: ExportPayrollQueryDto,
    @Res() res: Response,
  ) {
    try {
      const workbook = await this.payrollService.exportPayrollExcel(
        query.month,
        query.year,
      );
      await ExcelHelper.sendExcel(
        res,
        workbook,
        `payroll_report_${query.month || 'all'}_${query.year || 'all'}`,
      );
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Invalid payroll export query',
      );
    }
  }
}
