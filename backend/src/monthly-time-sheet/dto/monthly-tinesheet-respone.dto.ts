import { IsBoolean, IsString, IsUUID } from 'class-validator';

export class MonthlyTimesheeetResponeDto {
  @IsUUID()
  @IsString()
  monthlyTimesheetID: string;

  @IsBoolean()
  canSubmit: boolean;

  @IsBoolean()
  isSubmitted: boolean;

  @IsString()
  status?: string;

  month?: number;

  year?: number;

  userID?: string;

  reasonReject?: string | null;

  reviewedAt?: Date | null;

  // @IsUUID()
  // @IsString()
  // userID : string

  // @IsString()
  // @IsUUID()

  // reviewerID: string
}
