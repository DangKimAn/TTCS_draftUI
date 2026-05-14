import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsBoolean, IsDate, IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString } from "class-validator";


export default class CreateUserDto{

    @ApiProperty({
        description : 'email',
        example : "abc@gmail.com",
        required : true
    })
    @IsEmail()
    email : string 

     @ApiProperty({
        description : 'username',
        example : "hahaha",
        required : true
    })
    @IsString()
    username : string
     @ApiProperty({
        description : 'password',
        example : "hacked by me",
        required : true
    })
    @IsString()
    password: string
    
     @ApiProperty({
        description : 'linkAvatar',
        example : "",
        required : false
    })

    @IsString()
    @IsOptional()
    linkAvatar?:string | undefined
     @ApiProperty({
        description : 'salaryCoefficient',
        example : "0.01",
        required : false
    })
    
    @IsNumber()
    @IsOptional()
    salaryCoefficient?:number |undefined
     @ApiProperty({
        description : 'birthday',
        example : "04/10/2005",
        required : false
    })
    @Type(() => Date)
    @IsDate()
    @IsOptional()
    birthday?:Date | undefined

     @ApiProperty({
        description : 'remainDaysofLeaves',
        example : "12",
        required : false
    })
    @IsInt()
    @IsOptional()
    remainDaysofLeave?:number | undefined

     @ApiProperty({
        description : 'totalDayOfLeaves',
        example : "12",
        required : false
    })
    @IsInt()
    @IsOptional()
    totalDaysofLeave ?:number | undefined

     @ApiProperty({
        description : 'isActive',
        example : "true",
        required : false
    })
    @IsBoolean()
    @IsOptional()
    isActive?:boolean |undefined

     @ApiProperty({
        description : 'roleName',
        example : "admin",
        required : false
    })
    @IsString()
    @IsOptional()
    roleName?:string | undefined

     @ApiProperty({
        description : 'departmentName',
        example : "IT",
        required : false
    })
    @IsString()
    @IsOptional()
    departmentName?:string | undefined

    @IsString()
    @IsOptional()
    refreshToken?:string | undefined
};