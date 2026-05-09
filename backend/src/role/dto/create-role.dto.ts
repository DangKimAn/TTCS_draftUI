import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateRoleDto {

    @ApiProperty({
        description: 'The role\'s name',
        example: 'ADMIN',
        required: true
    })
    @IsString({ message: "nameRole phai la string" })
    nameRole: string
}
