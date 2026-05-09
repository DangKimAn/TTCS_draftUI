import { ApiProperty } from "@nestjs/swagger";
import { IsString, IsUUID } from "class-validator";

export default class CheckInDto{


    @ApiProperty(
        {
            description : 'userID',
            example : 'sdhus-sdushd-sdsudh-ushduhd',
            required: true
        }
    )
    @IsString()
    @IsUUID()

    userID: string
}