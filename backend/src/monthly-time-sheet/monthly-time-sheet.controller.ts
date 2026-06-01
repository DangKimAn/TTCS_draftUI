import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { MonthlyTimeSheetService } from './monthly-time-sheet.service';
import { DefaultResponse } from 'src/common/response.dto';
import GetTimeSheetDto from './dto/get-timesheet.dto';
import ReportTimesheetDto from './dto/report-timesheet.dto';
import { ExcelHelper } from 'src/common/excel.helper';
import {
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import CreateMonthlyTimeSheetDto from './dto/create-timesheet.dto';
import ReviewAuthGuards from 'src/auth/guards/reviwer.guard';
import ReviewMonthlyTimesheetDto from './dto/review-monthly-timesheet.dto';
import { RequestUser } from 'src/common/types';

interface AuthenticatedRequest extends Request {
  user?: RequestUser;
}

@Controller('time-sheet')
export class MonthlyTimeSheetController {
  constructor(private readonly timeSheetService: MonthlyTimeSheetService) {}

  @Get('/monthlyTimesheet/:userID')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me', 'manager', 'admin')
  @ApiOperation({
    summary: 'Get monthly timesheet (Role: me, manager of employee, admin)',
  })
  async getMonthlyTimesheet(
    @Param('userID') userID: string,
    @Query() getTimesheetDto: GetTimeSheetDto,
  ): Promise<DefaultResponse> {
    const { statusCode, message, data } =
      await this.timeSheetService.getMonthlyTimeSheet(userID, getTimesheetDto);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    if (statusCode === NOTFOUND_CODE) throw new NotFoundException(message);

    if (statusCode === CONFLIG_CODE) throw new ConflictException(message);

    throw new BadRequestException(message);
  }

  @Get('/review-list')
  @ApiOkResponse({
    description: 'Submitted monthly timesheets for manager review',
  })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('manager')
  @ApiOperation({
    summary: 'Get submitted monthly timesheets in current manager scope',
  })
  async getMonthlyTimesheetsForReview(
    @Query() getTimesheetDto: GetTimeSheetDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DefaultResponse> {
    const { statusCode, message, data } =
      await this.timeSheetService.getMonthlyTimesheetsForReview(
        getTimesheetDto.month,
        getTimesheetDto.year,
        req.user?.userID,
      );

    if (statusCode === OK_CODE) {
      return {
        statusCode,
        message,
        data,
      };
    }

    throw new BadRequestException(statusCode, message);
  }

  @Get('/report')
  @ApiOkResponse({ description: 'Timesheet report with filters and summary' })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('manager', 'admin')
  @ApiOperation({
    summary:
      'Get timesheet report by date range, employee, department and status',
  })
  async getTimesheetReport(
    @Query() reportQuery: ReportTimesheetDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<DefaultResponse> {
    const data = await this.timeSheetService.getTimesheetReport(
      reportQuery,
      req.user,
    );

    return {
      statusCode: OK_CODE,
      message: 'get timesheet report successfull',
      data,
    };
  }

  @Get('/export/:userID')
  @ApiOkResponse({ description: 'Export personal timesheet as CSV' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me')
  @ApiOperation({ summary: 'Export personal timesheet CSV (Role: me)' })
  async exportPersonalTimesheetCSV(
    @Param('userID') userID: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Query('format') format: string = 'csv',
    @Res() res: Response,
  ) {
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (Number.isNaN(monthNumber) || Number.isNaN(yearNumber)) {
      throw new BadRequestException('Invalid month or year');
    }
    const csvString = await this.timeSheetService.exportPersonalTimesheetCsv(
      userID,
      monthNumber,
      yearNumber,
      format,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="timesheet_${userID}_${monthNumber}_${yearNumber}.csv"`,
    );
    res.send(csvString);
  }

  @Get('/export-excel/:userID')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me')
  @ApiOperation({ summary: 'Export personal timesheet Excel (Role: me)' })
  async exportPersonalTimesheetExcel(
    @Param('userID') userID: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (Number.isNaN(monthNumber) || Number.isNaN(yearNumber)) {
      throw new BadRequestException('Invalid month or year');
    }
    const workbook = await this.timeSheetService.exportPersonalTimesheetExcel(
      userID,
      monthNumber,
      yearNumber,
    );
    await ExcelHelper.sendExcel(
      res,
      workbook,
      `timesheet_${userID}_${monthNumber}_${yearNumber}`,
    );
  }

  @Get('/export-department/:departmentID')
  @ApiOkResponse({ description: 'Export department timesheet as CSV' })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('managerOfDepartment', 'admin')
  @ApiOperation({
    summary: 'Export department timesheet CSV (Role: manager, admin)',
  })
  async exportDepartmentTimesheetCSV(
    @Param('departmentID') departmentID: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (Number.isNaN(monthNumber) || Number.isNaN(yearNumber)) {
      throw new BadRequestException('Invalid month or year');
    }
    const csvString = await this.timeSheetService.exportDepartmentTimesheetCsv(
      departmentID,
      monthNumber,
      yearNumber,
    );
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="timesheet_department_${departmentID}_${monthNumber}_${yearNumber}.csv"`,
    );
    res.send(csvString);
  }

  @Get('/export-department-excel/:departmentID')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('managerOfDepartment', 'admin')
  @ApiOperation({ summary: 'Export department timesheet Excel' })
  async exportDepartmentTimesheetExcel(
    @Param('departmentID') departmentID: string,
    @Query('month') month: string,
    @Query('year') year: string,
    @Res() res: Response,
  ) {
    const monthNumber = Number(month);
    const yearNumber = Number(year);
    if (Number.isNaN(monthNumber) || Number.isNaN(yearNumber)) {
      throw new BadRequestException('Invalid month or year');
    }
    const workbook = await this.timeSheetService.exportDepartmentTimesheetExcel(
      departmentID,
      monthNumber,
      yearNumber,
    );
    await ExcelHelper.sendExcel(
      res,
      workbook,
      `timesheet_department_${departmentID}_${monthNumber}_${yearNumber}`,
    );
  }

  @Post('/monthlyTimesheet/:userID')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me')
  @ApiOperation({
    summary: "while test login with 'me' role, not use in production",
  })
  async createMonthlyTimesheet(
    @Param('userID') userID: string,
    @Body() createMonthlyTimessheet: CreateMonthlyTimeSheetDto,
  ): Promise<DefaultResponse> {
    const { statusCode, message, data } =
      await this.timeSheetService.createMonthlyTimeSheet(
        userID,
        createMonthlyTimessheet,
      );
    if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data,
      };

    if (statusCode === NOTFOUND_CODE) throw new NotFoundException(message);

    if (statusCode === CONFLIG_CODE) throw new ConflictException(message);

    throw new BadRequestException(message);
  }

  @Patch('/submitMonthlyTimesheet/:monthlyTimesheetID')
  @UseGuards(JwtAuthGuard, ReviewAuthGuards)
  @ApiBearerAuth()
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @RequirePermission('me')
  async SubmitMonthlyTimesheet(
    @Param('monthlyTimesheetID', new ParseUUIDPipe())
    monthlyTImesheetID: string,
  ) {
    const { statusCode, message, data } =
      await this.timeSheetService.SubmitMonthlyTimesheet(monthlyTImesheetID);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    if (statusCode === NOTFOUND_CODE) throw new NotFoundException(message);

    if (statusCode === CONFLIG_CODE) throw new ConflictException(message);

    throw new BadRequestException(message);
  }

  @Patch('reviewMonthlyTimesheet/:monthlyTimesheetID')
  @ApiBearerAuth()
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()
  @UseGuards(JwtAuthGuard, ReviewAuthGuards)
  @RequirePermission('manager')
  async reviewMonthlyTimsheet(
    @Param('monthlyTimesheetID') monthlyTimesheetID: string,
    @Body() reviewMonthlyTimesheetDto: ReviewMonthlyTimesheetDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const { statusCode, message, data } =
      await this.timeSheetService.reviewMonthlyTimesheet(
        monthlyTimesheetID,
        reviewMonthlyTimesheetDto,
        req.user?.userID,
      );

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    if (statusCode === NOTFOUND_CODE) throw new NotFoundException(message);

    if (statusCode === CONFLIG_CODE) throw new ConflictException(message);

    throw new BadRequestException(message);
  }
}
