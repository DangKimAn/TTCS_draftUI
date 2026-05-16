import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID } from 'class-validator';

export class CreateNotificationDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  receiverID: string;

  @ApiProperty()
  @IsString()
  content: string;
}
