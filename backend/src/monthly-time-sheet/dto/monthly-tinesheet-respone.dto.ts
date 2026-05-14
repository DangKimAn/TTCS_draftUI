import { IsBoolean, IsISBN, IsString, IsUUID } from "class-validator";

export class MonthlyTimesheeetResponeDto{
    @IsUUID()
    @IsString()

    monthlyTimesheetID : string


    @IsBoolean()
    canSubmit : boolean

    @IsBoolean()

    isSubmitted:boolean

    // @IsUUID()
    // @IsString()
    // userID : string 

    // @IsString()
    // @IsUUID()

    // reviewerID: string
}