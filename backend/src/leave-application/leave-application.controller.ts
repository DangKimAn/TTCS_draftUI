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
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { RequestUser } from 'src/common/types';
import { LeaveApplicationService } from './leave-application.service';
import { CreateLeaveApplicationDto } from './dto/create-leave-application.dto';
import { ReviewLeaveApplicationDto } from './dto/review-leave-application.dto';
import { DefaultResponse } from 'src/common/response.dto';
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
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';

interface RequestWithUser extends Request {
  user?: RequestUser;
}

@ApiTags('leave-application')
@Controller('leave-application')
export class LeaveApplicationController {
  constructor(
    private readonly leaveApplicationService: LeaveApplicationService,
  ) {}

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({ description: 'Nhân viên gửi đơn nghỉ' })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me')
  @Post('/:userID')
  async createLeaveApplication(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Body() createDto: CreateLeaveApplicationDto,
  ): Promise<DefaultResponse> {
    const response = await this.leaveApplicationService.createLeaveApplication(
      userID,
      createDto,
    );

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

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({ description: 'Xem số dư phép' })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me', 'manager', 'admin')
  @Get('/balance/:userID')
  async getLeaveBalance(
    @Param('userID', new ParseUUIDPipe()) userID: string,
  ): Promise<DefaultResponse> {
    const response = await this.leaveApplicationService.getLeaveBalance(userID);

    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);

    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({ description: 'Xem đơn nghỉ của mình' })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me')
  @Get('/my/:userID')
  async getMyLeaveApplications(
    @Param('userID', new ParseUUIDPipe()) userID: string,
  ): Promise<DefaultResponse> {
    const response =
      await this.leaveApplicationService.getMyLeaveApplications(userID);

    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);

    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({ description: 'Manager xem đơn của phòng' })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('managerOfDepartment')
  @Get('/department/:departmentID')
  async getDepartmentLeaveApplications(
    @Param('departmentID', new ParseUUIDPipe()) departmentID: string,
  ): Promise<DefaultResponse> {
    const response =
      await this.leaveApplicationService.getDepartmentLeaveApplications(
        departmentID,
      );

    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);

    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({ description: 'HR xem tất cả đơn' })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Get('/all')
  async getAllLeaveApplications(): Promise<DefaultResponse> {
    const response =
      await this.leaveApplicationService.getAllLeaveApplications();

    if (response.statusCode === OK_CODE) return response;

    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiOperation({ description: 'Manager duyệt/từ chối đơn nghỉ' })
  @ApiBadRequestResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('manager')
  @Patch('/review/:leaveApplicationID')
  async reviewLeaveApplication(
    @Param('leaveApplicationID', new ParseUUIDPipe())
    leaveApplicationID: string,
    @Body() reviewDto: ReviewLeaveApplicationDto,
    @Req() req: RequestWithUser,
  ): Promise<DefaultResponse> {
    // Cast user info from request. Note: We assume the JWT strategy attaches user to req.user
    const user = req.user;
    const reviewerID = user?.userID;

    if (!reviewerID) {
      throw new BadRequestException('User information not found in request');
    }

    const response = await this.leaveApplicationService.reviewLeaveApplication(
      leaveApplicationID,
      reviewerID,
      reviewDto,
    );

    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);
    if (response.statusCode === CONFLIG_CODE)
      throw new ConflictException(response.statusCode, response.message);

    throw new BadRequestException(response.statusCode, response.message);
  }
}
