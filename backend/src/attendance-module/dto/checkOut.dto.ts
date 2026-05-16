import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export default class CheckOutDto {
  @ApiProperty({
    description: 'Information about the device/browser used for check-out',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) ...',
    required: false,
  })
  @IsString()
  @IsOptional()
  deviceInfo?: string;
}
