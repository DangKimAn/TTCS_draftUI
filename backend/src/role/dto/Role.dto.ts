import { IsString, IsUUID } from 'class-validator';

export class RoleDto {
  @IsUUID()
  roleID: string;
  @IsString()
  nameRole: string;
}
