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
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import { DefaultResponse } from 'src/common/response.dto';
import { TimesheetStatus } from '@prisma/client';
import { CreateRequestCorrectionDto } from './dto/create-request-correction.dto';
import { ReviewRequestCorrectionDto } from './dto/review-request-correction.dto';
import { RequestCorrectionService } from './request-correction.service';

interface RequestWithUser extends Request {
  user?: {
    userID?: string;
  };
}

@ApiTags('request-correction')
@Controller('request-correction')
export class RequestCorrectionController {
  constructor(
    private readonly requestCorrectionService: RequestCorrectionService,
  ) {}

  @ApiOperation({
    description:
      'Employee creates a correction request for their monthly timesheet or entry',
  })
  @ApiCreatedResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me')
  @Post('/:userID')
  async createCorrection(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Body() dto: CreateRequestCorrectionDto,
  ): Promise<DefaultResponse> {
    const response = await this.requestCorrectionService.createRequest(
      userID,
      dto,
    );
    return this.returnOrThrow(response);
  }

  @ApiOperation({ description: 'Employee views their correction requests' })
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me')
  @Get('/my/:userID')
  async getMyCorrections(
    @Param('userID', new ParseUUIDPipe()) userID: string,
  ): Promise<DefaultResponse> {
    const response = await this.requestCorrectionService.getMyRequests(userID);
    return this.returnOrThrow(response);
  }

  @ApiOperation({
    description:
      'Manager views pending correction requests in their department',
  })
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('managerOfDepartment', 'admin')
  @Get('/department/:departmentID')
  async getDepartmentCorrections(
    @Param('departmentID', new ParseUUIDPipe()) departmentID: string,
    @Query('status') status = 'pending',
  ): Promise<DefaultResponse> {
    const normalizedStatus = this.parseTimesheetStatus(status);
    const response = await this.requestCorrectionService.getDepartmentRequests(
      departmentID,
      normalizedStatus,
    );
    return this.returnOrThrow(response);
  }

  @ApiOperation({
    description: 'Manager approves or rejects a correction request',
  })
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('manager', 'admin')
  @Patch('/review/:requestCorrectionID')
  async reviewCorrection(
    @Param('requestCorrectionID', new ParseUUIDPipe())
    requestCorrectionID: string,
    @Body() dto: ReviewRequestCorrectionDto,
    @Req() request: RequestWithUser,
  ): Promise<DefaultResponse> {
    const reviewerID = request.user?.userID;

    if (!reviewerID) {
      throw new BadRequestException('User information not found in request');
    }

    const response = await this.requestCorrectionService.reviewRequest(
      requestCorrectionID,
      reviewerID,
      dto,
    );
    return this.returnOrThrow(response);
  }

  private parseTimesheetStatus(status: string): TimesheetStatus {
    const normalizedStatus = String(status || TimesheetStatus.PENDING)
      .trim()
      .toUpperCase();

    if (
      Object.values(TimesheetStatus).includes(
        normalizedStatus as TimesheetStatus,
      )
    ) {
      return normalizedStatus as TimesheetStatus;
    }

    throw new BadRequestException(`Invalid correction status: ${status}`);
  }

  private returnOrThrow(response: DefaultResponse): DefaultResponse {
    if (
      response.statusCode === OK_CODE ||
      response.statusCode === CREATED_RESPONE
    ) {
      return response;
    }

    if (response.statusCode === NOTFOUND_CODE) {
      throw new NotFoundException(response.message);
    }

    if (response.statusCode === CONFLIG_CODE) {
      throw new ConflictException(response.message);
    }

    throw new BadRequestException(response.message);
  }
}
