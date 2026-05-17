import { IsOptional, IsString, IsUUID } from 'class-validator';

export default class DepartmentDto {
  @IsString()
  @IsUUID()
  departmentID: string;

  @IsString()
  departmentName: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  managerID?: string | null;
}
