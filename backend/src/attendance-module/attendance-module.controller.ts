import {
  BadRequestException,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { AttendanceModuleService } from './attendance-module.service';
import ResponseDto, {
  AnotherError,
  DefaultResponse,
} from 'src/common/response.dto';
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
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import type { Request } from 'express';
import GetAttendenceDto from './dto/getAttendence.dto';
import CheckInDto from './dto/checkIn.dto';
import CheckOutDto from './dto/checkOut.dto';
import { Body } from '@nestjs/common';

@Controller('attendance-module')
export class AttendanceModuleController {
  constructor(
    private readonly attendanceModuleService: AttendanceModuleService,
  ) {}

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({
    description: 'for me',
  })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Post('/checkIn/:userID')
  @RequirePermission('me')
  async checkIn(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Body() checkInDto: CheckInDto,
    @Req() req: Request,
  ): Promise<ResponseDto<AnotherError>> {
    const forwarded = req.headers['x-forwarded-for'];

    let ip: string | undefined = undefined;
    if (forwarded) {
      ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0];
    } else {
      ip = req.socket.remoteAddress;
    }

    const deviceInfo = checkInDto.deviceInfo || req.headers['user-agent'];

    const { statusCode, message } = await this.attendanceModuleService.checkIn(
      userID,
      ip,
      deviceInfo,
    );
    if (statusCode === CREATED_RESPONE || statusCode === OK_CODE)
      return { statusCode, message };
    if (statusCode == NOTFOUND_CODE) throw new NotFoundException(message);
    if (statusCode === CONFLIG_CODE) throw new ConflictException(message);

    throw new BadRequestException(message);
  }

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({
    description: 'for me',
  })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Post('/checkOut/:userID')
  @RequirePermission('me')
  async checkOut(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Body() checkOutDto: CheckOutDto,
    @Req() req: Request,
  ): Promise<ResponseDto<AnotherError>> {
    const forwarded = req.headers['x-forwarded-for'];

    let ip: string | undefined = undefined;
    if (forwarded) {
      ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded).split(',')[0];
    } else {
      ip = req.socket.remoteAddress;
    }

    const deviceInfo = checkOutDto.deviceInfo || req.headers['user-agent'];

    const { statusCode, message } = await this.attendanceModuleService.checkOut(
      userID,
      ip,
      deviceInfo,
    );
    if (statusCode === CREATED_RESPONE || statusCode === OK_CODE)
      return { statusCode, message };
    if (statusCode == NOTFOUND_CODE) throw new NotFoundException(message);
    if (statusCode === CONFLIG_CODE) throw new ConflictException(message);

    throw new BadRequestException(message);
  }

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({
    description: 'for me',
  })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Get('/getAllAttendenceOfMonth/:userID')
  @RequirePermission('me', 'manager', 'admin')
  async getAllEntryOfMonth(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Query() getAttendence: GetAttendenceDto,
  ): Promise<DefaultResponse> {
    const { statusCode, message, data } =
      await this.attendanceModuleService.getAllAttedencOfMonth(
        userID,
        getAttendence,
      );
    if (statusCode === OK_CODE) return { statusCode, message, data };
    if (statusCode == NOTFOUND_CODE) throw new NotFoundException(message);
    if (statusCode === CONFLIG_CODE) throw new ConflictException(message);

    throw new BadRequestException(message);
  }

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({
    description: 'for me',
  })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Get('/AllEmployeeNotCheckOutOfToday')
  @RequirePermission('admin')
  async GetAllEmployeeDindNotCheckOutOfDay(): Promise<DefaultResponse> {
    const now = new Date();
    const { statusCode, message, data } =
      await this.attendanceModuleService.GetAllEmployeeDidNotCheckOutBefore(
        now.toISOString().split('T')[0],
      );
    if (statusCode === OK_CODE) return { statusCode, message, data };
    if (statusCode == NOTFOUND_CODE) throw new NotFoundException(message);
    if (statusCode === CONFLIG_CODE) throw new ConflictException(message);

    throw new BadRequestException(message);
  }
}
