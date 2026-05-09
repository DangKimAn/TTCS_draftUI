import { BadRequestException, Body, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { MonthlyTimeSheetService } from './monthly-time-sheet.service';
import { DefaultResponse } from 'src/common/response.dto';
import GetTimeSheetDto from './dto/get-timesheet.dto';
import { CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE } from 'src/common/code';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import CreateMonthlyTimeSheetDto from './dto/create-timesheet.dto';
import SubmitMonthlyTimesheetDto from './dto/submit-monthly-timesheet.dto';
import { DefaultArgs } from '@prisma/client/runtime/client';
import ReviewAuthGuards from 'src/auth/guards/reviwer.guard';
import ReviewMonthlyTimesheetDto from './dto/review-monthly-timesheet.dto';

@Controller('time-sheet')
export class MonthlyTimeSheetController {
  constructor(private readonly timeSheetService: MonthlyTimeSheetService) { }


  @Get('/monthlyTimesheet/:userID')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)

  @RequirePermission('me')
  @ApiOperation({ summary: "while test login with 'me' role, not use in production" })

  async getMonthlyTimesheet(@Param('userID') userID: string, @Query() getTimesheetDto: GetTimeSheetDto): Promise<DefaultResponse> {

    const { statusCode, message, data } = await this.timeSheetService.getMonthlyTimeSheet(userID, getTimesheetDto);
    if (statusCode === OK_CODE)
      return {
        statusCode, message, data
      }

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message);
  }





  @Post('/monthlyTimesheet/:userID')
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)

  @RequirePermission('me')
  @ApiOperation({ summary: "while test login with 'me' role, not use in production" })
  async createMonthlyTimesheet(@Param('userID') userID: string, @Body() createMonthlyTimessheet: CreateMonthlyTimeSheetDto): Promise<DefaultResponse> {

    const { statusCode, message, data } = await this.timeSheetService.createMonthlyTimeSheet(userID, createMonthlyTimessheet);
    if (statusCode === CREATED_RESPONE)
      return {
        statusCode, message, data
      }

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message);
  }


  @Patch('/submitMonthlyTimesheet/:monthlyTimesheetID')

  @UseGuards(JwtAuthGuard, ReviewAuthGuards)

  @ApiBearerAuth()
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()

  @RequirePermission('me')
  async SubmitMonthlyTimesheet(@Param('monthlyTimesheetID' , new ParseUUIDPipe()) monthlyTImesheetID : string ){
     const { statusCode, message, data } = await this.timeSheetService.SubmitMonthlyTimesheet(monthlyTImesheetID);
    if (statusCode === OK_CODE)
      return {
        statusCode, message, data
      }

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message);
  }


  @Patch('reviewMonthlyTimesheet/:monthlyTimesheetID')


  @ApiBearerAuth()
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBadRequestResponse()

  @UseGuards(JwtAuthGuard , ReviewAuthGuards)
  @RequirePermission('manager')
  async reviewMonthlyTimsheet(@Param('monthlyTimesheetID') monthlyTimesheetID : string , @Body() reviewMonthlyTimesheetDto : ReviewMonthlyTimesheetDto) {
    const {statusCode ,message,data} = await this.timeSheetService.reviewMonthlyTimesheet(monthlyTimesheetID, reviewMonthlyTimesheetDto)


    if (statusCode === OK_CODE)
      return {
        statusCode, message, data
      }

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message);
  }
}
