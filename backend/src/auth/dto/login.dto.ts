import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsString } from "class-validator";

export default class LoginDto{

    @IsString()
    @ApiProperty({
        example :"dangkiman123@gmail.com",
        description :'email',
        required : true
    })
    username: string

    @ApiProperty({
        example :"123123",
        description :'email',
        required : true
    })
    @IsString()
    password : string
}