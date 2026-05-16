import { Role } from '@prisma/client';
import { IsAscii, IsNumber, IsOptional, IsString } from 'class-validator';
import DepartmentDto from 'src/department/dto/department.dto';
import { RoleDto } from 'src/role/dto/Role.dto';
import UserDto from 'src/user/dto/user.dto';

// class ResponseDtoRole{

//     @IsNumber()
//     statusCode : number  = 400

//     @IsString()
//     message :  string = 'aonther code '

//     @IsOptional()
//     data?: RoleDto| null
// }

// class ResponseDtoListRole{
//      @IsNumber()
//     statusCode : number  = 400

//     @IsString()
//     message :  string = 'aonther code '

//     @IsOptional()
//     data?: RoleDto[] | null
// }

// class ResponseDtoDepartment{

//     @IsNumber()
//     statusCode : number  = 400

//     @IsString()
//     message :  string =''

//     @IsOptional()
//     data?: DepartmentDto| null
// }

// class ResponseDtoListDepartment{
//      @IsNumber()
//     statusCode : number  = 400

//     @IsString()
//     message :  string =''

//     @IsOptional()
//     data?: DepartmentDto[] | null
// }

// class ResponseDtoUser{
//      @IsNumber()
//     statusCode : number  = 400

//     @IsString()
//     message :  string =''

//     @IsOptional()
//     data?: UserDto | null
// }
// class ResponseDtoListUser{
//      @IsNumber()
//     statusCode : number  = 400

//     @IsString()
//     message :  string  = ''

//     @IsOptional()
//     data?: UserDto[] |null
// }

export default class ResponseDto<T> {
  statusCode: number;
  message: string;
  data?: T;

  constructor(partial: Partial<ResponseDto<T>>) {
    if (!partial.statusCode || !partial.message) {
      throw new Error('Missing required fields');
    }
    Object.assign(this, partial);
  }
}

class AnotherError {
  @IsNumber()
  statusCode: number = 400;

  @IsString()
  message: string = 'aonther code ';

  data?;
}

class DefaultResponse {
  @IsNumber()
  statusCode: number;

  @IsString()
  message: string;

  data?: unknown;
}

export { AnotherError, DefaultResponse };
