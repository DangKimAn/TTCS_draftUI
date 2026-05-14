import { Controller, Get, Post, Body, Patch, Param, Delete, ParseUUIDPipe, UseGuards, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { UpdateNotificationDto } from './dto/update-notification.dto';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiCreatedResponse, ApiNotFoundResponse, ApiOkResponse } from '@nestjs/swagger';
import NotificationDto from './dto/notification.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import ResponseDto from 'src/common/response.dto';
import { CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE } from 'src/common/code';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) { }


  @Post('/sendNoti/:userID')
  @ApiBearerAuth()
  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)

  @RequirePermission('me')
  async sendNotification(@Param('userID', new ParseUUIDPipe()) userID: string, @Body() createNotificationDto: CreateNotificationDto): Promise<ResponseDto<NotificationDto>> {
    const { statusCode, message, data }: ResponseDto<NotificationDto> = await this.notificationService.sendNotification(userID, createNotificationDto);

    if (statusCode === CREATED_RESPONE)
      return {
        statusCode, message, data
      }

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    throw new BadRequestException(statusCode, message)
  }



  @Post('/getMysendNotis')
  @ApiBearerAuth()
  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()

  @UseGuards(JwtAuthGuard, UserAccessGaurd)

  @RequirePermission('me')
  async getAllMyNotifications() {

  }

  async getAllMySendNotifications() { }


  async getAllMyReceviedNotifications() { }
}
