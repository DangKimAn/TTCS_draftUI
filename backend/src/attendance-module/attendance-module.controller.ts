import { BadRequestException, ConflictException, Controller, Get, NotFoundException, Param, ParseUUIDPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AttendanceModuleService } from './attendance-module.service';
import ResponseDto, { AnotherError, DefaultResponse } from 'src/common/response.dto';
import { ANOTHER_ERROR_RESPONE, CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE } from 'src/common/code';
import { NotFoundError } from 'rxjs';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import type { Request } from 'express';
import GetAttendenceDto from './dto/getAttendence.dto';

@Controller('attendance-module')
export class AttendanceModuleController {
  constructor(private readonly attendanceModuleService: AttendanceModuleService) { }


  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({
    description: 'for me'
  })
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Post('/checkIn/:userID')

  @RequirePermission('me')
  async checkIn(@Param('userID', new ParseUUIDPipe()) userID: string, @Req() req: Request): Promise<ResponseDto<AnotherError>> {


    const forwarded = req.headers['x-forwarded-for'];

    console.log(forwarded)
    let ip: string | undefined = undefined
    if (forwarded) {
      ip = (forwarded as string).split(',')[0];
    }
    else {
      ip = req.socket.remoteAddress;
    }
    const { statusCode, message, data } = await this.attendanceModuleService.checkIn(userID, ip)
    if (statusCode === CREATED_RESPONE)
      return { statusCode, message }
    if (statusCode == NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message)
  }




  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({
    description: 'for me'
  })
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Post('/checkOut/:userID')

  @RequirePermission('me')
  async checkOut(@Param('userID', new ParseUUIDPipe()) userID: string, @Req() req: Request): Promise<ResponseDto<AnotherError>> {


    const forwarded = req.headers['x-forwarded-for'];

    console.log(forwarded)
    let ip: string | undefined = undefined
    if (forwarded) {
      ip = (forwarded as string).split(',')[0];
    }
    else {
      ip = req.socket.remoteAddress;
    }
    const { statusCode, message, data } = await this.attendanceModuleService.checkOut(userID, ip)
    if (statusCode === CREATED_RESPONE)
      return { statusCode, message }
    if (statusCode == NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message)
  }


  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({
    description: 'for me'
  })
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Get('/getAllAttendenceOfMonth/:userID')

  @RequirePermission('me')
 async getAllEntryOfMonth(@Param('userID' , new ParseUUIDPipe()) userID : string , @Query() getAttendence :GetAttendenceDto  ) :Promise<DefaultResponse>{
    const {statusCode, message , data} = await this.attendanceModuleService.getAllAttedencOfMonth(userID , getAttendence);
     if (statusCode === OK_CODE)
      return { statusCode, message , data}
    if (statusCode == NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message)
    }


    @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({
    description: 'for me'
  })
  @ApiBadRequestResponse()

  @ApiBearerAuth()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Get('/AllEmployeeNotCheckOutOfToday')

  @RequirePermission('admin')
 async GetAllEmployeeDindNotCheckOutOfDay( ) :Promise<DefaultResponse>{

    const now = new Date()
    console.log(now.toLocaleDateString())
    const {statusCode, message , data} = await this.attendanceModuleService.GetAllEmployeeDindNotCheckOutOfDay(now.toLocaleDateString());
     if (statusCode === OK_CODE)
      return { statusCode, message , data}
    if (statusCode == NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message)
    }

}
