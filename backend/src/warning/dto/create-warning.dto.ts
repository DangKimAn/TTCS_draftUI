import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

export class CreateWarningDto {

    @ApiProperty()
    @IsString()
    @IsUUID()
    userID : string 

    @ApiProperty()
    @IsString()
    content: string
}


