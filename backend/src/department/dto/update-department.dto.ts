import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID } from 'class-validator';

export default class UpdateDepartmentDto {
  @ApiProperty({
    description: 'Name of departmnent',
    example: 'HR',
    required: false,
  })
  @IsOptional()
  @IsString()
  departmentName?: string | undefined;

  @ApiProperty({
    description: "ID of department's manager",
    example: 'ff6a2995-6910-464d-a564-f3df8507f991',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  managerID?: string | undefined;
}
