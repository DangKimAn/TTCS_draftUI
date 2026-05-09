import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID } from "class-validator";


export default class UserDto{

    @IsString()
    @IsUUID()
    userID : string
    @ApiProperty({
        description : 'email',
        example : "abc@gmail.com",
        required : true
    })
    @IsString()
    @IsEmail()
    email : string 

     @ApiProperty({
        description : 'username',
        example : "hahaha",
        required : true
    })
    @IsString()
    username : string
   
    @IsString()
        @IsOptional()
        departmentName?:string
    
     @IsString()
        @IsOptional()
        roleId:string |null
    
};