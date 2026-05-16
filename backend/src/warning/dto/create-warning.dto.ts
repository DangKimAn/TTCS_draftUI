import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional } from 'class-validator';
import { WarningLevel } from '@prisma/client';

export class CreateWarningDto {
  @ApiProperty()
  @IsString()
  @IsUUID()
  userID: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiProperty({ enum: WarningLevel, default: WarningLevel.LOW })
  @IsEnum(WarningLevel)
  @IsOptional()
  level?: WarningLevel;
}
