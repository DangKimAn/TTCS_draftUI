import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import {
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
  UNAUTHORIZED_CODE,
} from 'src/common/code';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import ResponseDto from 'src/common/response.dto';
import { CreateNotificationDto } from './dto/create-notification.dto';
import NotificationDto from './dto/notification.dto';
import { NotificationService } from './notification.service';

@Controller('notification')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Post('/sendNoti/:userID')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Send a notification as the current user (role: me)',
  })
  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  @ApiForbiddenResponse()
  @UseGuards(JwtAuthGuard)
  async sendNotification(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Body() createNotificationDto: CreateNotificationDto,
    @GetUser('userID') currentUserID: string,
  ): Promise<ResponseDto<NotificationDto>> {
    this.assertMe(userID, currentUserID);

    const response = await this.notificationService.sendNotification(
      userID,
      createNotificationDto,
    );
    if (response.statusCode === CREATED_RESPONE) {
      return response;
    }

    this.throwFromResponse(response.statusCode, response.message);
  }

  @Get('/received/:userID')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get received notifications (role: me)' })
  @ApiOkResponse({ description: 'Get received notifications successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse()
  @UseGuards(JwtAuthGuard)
  async getAllMyReceviedNotifications(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @GetUser('userID') currentUserID: string,
  ): Promise<ResponseDto<NotificationDto[]>> {
    this.assertMe(userID, currentUserID);

    const response =
      await this.notificationService.getReceivedNotifications(userID);
    if (response.statusCode === OK_CODE) {
      return response;
    }

    this.throwFromResponse(response.statusCode, response.message);
  }

  @Get('/sent/:userID')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get sent notifications (role: me)' })
  @ApiOkResponse({ description: 'Get sent notifications successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse()
  @UseGuards(JwtAuthGuard)
  async getAllMySendNotifications(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @GetUser('userID') currentUserID: string,
  ): Promise<ResponseDto<NotificationDto[]>> {
    this.assertMe(userID, currentUserID);

    const response =
      await this.notificationService.getSentNotifications(userID);
    if (response.statusCode === OK_CODE) {
      return response;
    }

    this.throwFromResponse(response.statusCode, response.message);
  }

  @Patch('/read/:notificationID')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Mark notification as read (role: me)' })
  @ApiOkResponse({ description: 'Mark notification as read successfully' })
  @ApiNotFoundResponse({ description: 'Notification not found' })
  @ApiForbiddenResponse()
  @UseGuards(JwtAuthGuard)
  async markAsRead(
    @Param('notificationID', new ParseUUIDPipe()) notificationID: string,
    @GetUser('userID') currentUserID: string,
  ): Promise<ResponseDto<NotificationDto>> {
    const response = await this.notificationService.markAsRead(
      notificationID,
      currentUserID,
    );
    if (response.statusCode === OK_CODE) {
      return response;
    }

    this.throwFromResponse(response.statusCode, response.message);
  }

  @Get('/unread-count/:userID')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get unread notification count (role: me)' })
  @ApiOkResponse({ description: 'Get unread count successfully' })
  @ApiNotFoundResponse({ description: 'User not found' })
  @ApiForbiddenResponse()
  @UseGuards(JwtAuthGuard)
  async getUnreadCount(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @GetUser('userID') currentUserID: string,
  ): Promise<ResponseDto<{ count: number }>> {
    this.assertMe(userID, currentUserID);

    const response = await this.notificationService.getUnreadCount(userID);
    if (response.statusCode === OK_CODE) {
      return response;
    }

    this.throwFromResponse(response.statusCode, response.message);
  }

  private assertMe(userID: string, currentUserID?: string): void {
    if (!currentUserID || currentUserID !== userID) {
      throw new ForbiddenException(
        'You can only access your own notifications',
      );
    }
  }

  private throwFromResponse(statusCode: number, message: string): never {
    if (statusCode === NOTFOUND_CODE) {
      throw new NotFoundException(message);
    }

    if (statusCode === CONFLIG_CODE) {
      throw new ConflictException(message);
    }

    if (statusCode === UNAUTHORIZED_CODE) {
      throw new ForbiddenException(message);
    }

    throw new BadRequestException(message);
  }
}
