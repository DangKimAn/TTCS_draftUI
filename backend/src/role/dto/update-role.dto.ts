import { PartialType } from '@nestjs/mapped-types';
import { CreateRoleDto } from './create-role.dto';
import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateRoleDto extends PartialType(CreateRoleDto) {

    @ApiProperty({
        description: 'The role\'s name',
        example: 'ADMIN',
        required: true
    })
    @IsString({ message: "nameRole phai la string" })
    nameRole: string
}
