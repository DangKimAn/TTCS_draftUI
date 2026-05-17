import {
  IsBoolean,
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export default class NotificationDto {
  @IsString()
  @IsUUID()
  notificationID: string;
  @IsString()
  @IsUUID()
  @IsOptional()
  senderID?: string | null;

  @IsString()
  @IsUUID()
  receiverID: string;

  @IsString()
  content: string;

  @IsDate()
  createdAt: Date;

  @IsBoolean()
  isRead: boolean;

  @IsOptional()
  @IsString()
  relatedType?: string | null;
}
