import { BadRequestException, Headers, Body, ConflictException, Controller, Delete, Get, NotFoundException, Param, ParseUUIDPipe, Patch, Post, UseGuards, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { ApiBadRequestResponse, ApiBearerAuth, ApiConflictResponse, ApiNotFoundResponse, ApiOkResponse, ApiOperation, ApiUnauthorizedResponse } from '@nestjs/swagger';
import CreateUserDro from './dto/create-user.dto';
import { UUID } from 'crypto';
import { deserialize } from 'v8';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import { ANOTHER_ERROR_RESPONE, CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE } from 'src/common/code';
import UserDto from './dto/user.dto';
import updateUserDto from './dto/update-user.dto';
import UpdateDepartmentDto from 'src/department/dto/update-department.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { GetUser } from 'src/common/decorators/get-user.decorator';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { Reflector } from '@nestjs/core';
import { RequirePermission } from 'src/common/require-permissions.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @ApiOkResponse({
    description: 'get all users successfull'
  })
  @ApiBearerAuth()
  @ApiOperation({
      summary :'for admin'
    })
  @Get('/')
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  async getAllUser(): Promise<ResponseDto<UserDto[]> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<UserDto[]> = await this.userService.getAllUser();
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data
      }
    return ANOTHER_ERROR_RESPONE
  }

  @ApiOkResponse({
    description: 'get user successfull'
  })

  @ApiNotFoundResponse({
    description: "The user have userid is not found"
  })

  @ApiUnauthorizedResponse()
  @ApiBearerAuth()
   @ApiOperation({
      summary :'for admin or my manger or me'
    })
  @RequirePermission('admin', 'manager', 'me')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Get('/getByID/:userID')
  async getUserByID(@Param("userID", new ParseUUIDPipe()) userID: string): Promise<ResponseDto<UserDto> | AnotherError> {
    const { statusCode, message, data } = await this.userService.getUserByUserID(userID)
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data
      }

    return ANOTHER_ERROR_RESPONE
  }
   @ApiOperation({
      summary :'for admin or my manger or me'
    })
  @Get('/getByUsername/:username')
  @ApiOkResponse({
    description: 'get user successfull'
  })

  @ApiNotFoundResponse({
    description: "The user have username is not found"
  })
  @ApiBearerAuth()
  @RequirePermission('admin', 'manager', 'me')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  async getUserByUsername(@Param("username") useranme: string): Promise<ResponseDto<UserDto> | AnotherError> {

    const { statusCode, message, data }: ResponseDto<UserDto> = await this.userService.getUserByUserName(useranme)
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data
      }

    return ANOTHER_ERROR_RESPONE

  }
   @ApiOperation({
      summary :'for admin or my manger or me'
    })
  @Get('/getByEmail/:email')
  @ApiOkResponse({
    description: 'get user successfull'
  })

  @ApiNotFoundResponse({
    description: "The user have email is not found"
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin', 'manager', 'me')
  async getUserByEmail(@Param("email") email: string): Promise<ResponseDto<UserDto> | AnotherError> {


    console.log("email : " + email)
    const { statusCode, message, data }: ResponseDto<UserDto> = await this.userService.getUserByEmail(email)
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data
      }

    return ANOTHER_ERROR_RESPONE

  }

   @ApiOperation({
      summary :'for admin or manager of department'
    })

  @Get('/getByDepartment/:departmentID')
  @ApiOkResponse({
    description: 'get user successfull'
  })

  @ApiNotFoundResponse({
    description: "The user have email is not found"
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin', 'managerOfDepartment')
  async getUserAllUserByDepartmentID(@Param("departmentID") departmentID: string): Promise<ResponseDto<UserDto> | AnotherError> {


    const { statusCode, message, data }: ResponseDto<UserDto[]> = await this.userService.getAllUserOfDepartment(departmentID)
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data
      }

    return ANOTHER_ERROR_RESPONE

  }
  @Post('/')
  @ApiOkResponse(
    { description: 'create user successfull !!!' }
  )
  @ApiConflictResponse({
    description: "Conflict",
  })
  @ApiNotFoundResponse({
    description: "Not found",
  })

  async createUser(@Body() createUserDto: CreateUserDro): Promise<ResponseDto<UserDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<UserDto> | AnotherError = await this.userService.createUser(createUserDto);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === CREATED_RESPONE)
      return { statusCode, message, data }
    throw new BadRequestException(ANOTHER_ERROR_RESPONE)
  }

   @ApiOperation({
      summary :'for admin or my manger or me'
    })
  @ApiBearerAuth()
  @Patch(':userID')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin', 'manager', 'me')
  async updateUser(@Param('userID', new ParseUUIDPipe()) id: string, @Body() updateUserDto: updateUserDto
  ): Promise<ResponseDto<UserDto>> {
    const { statusCode, message, data }: ResponseDto<UserDto> = await this.userService.updateUser(id, updateUserDto);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message)

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message)

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data
      }

    throw new BadRequestException(ANOTHER_ERROR_RESPONE)
    // return ANOTHER_ERROR_RESPONE;
  }

   @ApiOperation({
      summary :'for admin or my manger or me'
    })
  @ApiBearerAuth()
  @Delete(':userID')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @ApiBadRequestResponse()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin', 'manager', 'me')
  async deleteUser(@Param('userID', new ParseUUIDPipe()) userID: string
  ): Promise<ResponseDto<UserDto>> {


    const { statusCode, message }: ResponseDto<UserDto> = await this.userService.deleteUser(userID);
    if (statusCode === NOTFOUND_CODE)
      throw new ConflictException(statusCode, message)

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message
      }

    throw new BadRequestException(statusCode, message);
  }
}
