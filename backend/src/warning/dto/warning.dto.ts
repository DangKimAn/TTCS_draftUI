import { IsDate, IsOptional, IsString, IsUUID } from 'class-validator';

export default class WarningDto {
  @IsString()
  @IsUUID()
  warningID: string;

  @IsString()
  @IsUUID()
  userID: string;

  @IsString()
  content: string | null;

  @IsDate()
  createdAt: Date;

  @IsOptional()
  @IsString()
  level?: string | null;
}
