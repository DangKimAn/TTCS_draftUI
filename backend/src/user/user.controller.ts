import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Req,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { Request } from 'express';
import { RequestUser } from 'src/common/types';
import { UserService } from './user.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { CreateUserDto } from './dto/create-user.dto';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import {
  ANOTHER_ERROR_RESPONE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import UserDto from './dto/user.dto';
import updateUserDto from './dto/update-user.dto';
import { SelfUpdateUserDto } from './dto/self-update-user.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @ApiOkResponse({
    description: 'get all users successfull',
  })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'for admin',
  })
  @Get('/')
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  async getAllUser(): Promise<ResponseDto<UserDto[]> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<UserDto[]> =
      await this.userService.getAllUser();
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };
    return ANOTHER_ERROR_RESPONE;
  }

  @ApiOkResponse({
    description: 'get user successfull',
  })
  @ApiNotFoundResponse({
    description: 'The user have userid is not found',
  })
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'for admin or my manger or me',
  })
  @RequirePermission('admin', 'manager', 'me')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @Get('/getByID/:userID')
  async getUserByID(
    @Param('userID', new ParseUUIDPipe()) userID: string,
  ): Promise<ResponseDto<UserDto> | AnotherError> {
    const { statusCode, message, data } =
      await this.userService.getUserByUserID(userID);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    return ANOTHER_ERROR_RESPONE;
  }
  @ApiOperation({
    summary: 'for admin or my manger or me',
  })
  @Get('/getByUsername/:username')
  @ApiOkResponse({
    description: 'get user successfull',
  })
  @ApiNotFoundResponse({
    description: 'The user have username is not found',
  })
  @ApiBearerAuth()
  @RequirePermission('admin', 'manager', 'me')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  async getUserByUsername(
    @Param('username') useranme: string,
  ): Promise<ResponseDto<UserDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<UserDto> =
      await this.userService.getUserByUserName(useranme);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    return ANOTHER_ERROR_RESPONE;
  }
  @ApiOperation({
    summary: 'for admin or my manger or me',
  })
  @Get('/getByEmail/:email')
  @ApiOkResponse({
    description: 'get user successfull',
  })
  @ApiNotFoundResponse({
    description: 'The user have email is not found',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin', 'manager', 'me')
  async getUserByEmail(
    @Param('email') email: string,
  ): Promise<ResponseDto<UserDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<UserDto> =
      await this.userService.getUserByEmail(email);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    return ANOTHER_ERROR_RESPONE;
  }

  @ApiOperation({
    summary: 'for admin or manager of department',
  })
  @Get('/getByDepartment/:departmentID')
  @ApiOkResponse({
    description: 'get user successfull',
  })
  @ApiNotFoundResponse({
    description: 'The user have email is not found',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin', 'managerOfDepartment')
  async getUserAllUserByDepartmentID(
    @Param('departmentID') departmentID: string,
  ): Promise<ResponseDto<UserDto[]> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<UserDto[]> =
      await this.userService.getAllUserOfDepartment(departmentID);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    return ANOTHER_ERROR_RESPONE;
  }
  @Post('/')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @ApiOkResponse({ description: 'create user successfull !!!' })
  @ApiConflictResponse({
    description: 'Conflict',
  })
  @ApiNotFoundResponse({
    description: 'Not found',
  })
  async createUser(
    @Body() createUserDto: CreateUserDto,
  ): Promise<ResponseDto<UserDto> | AnotherError> {
    const response = await this.userService.createUser(createUserDto);
    const { statusCode, message, data } = response as ResponseDto<UserDto>;
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === CREATED_RESPONE) return { statusCode, message, data };
    throw new BadRequestException(ANOTHER_ERROR_RESPONE);
  }

  @ApiOperation({
    summary: 'for current authenticated user',
    description:
      'Allows a user to update only personal profile fields: avatar, phone, address, emergency contact, birthday.',
  })
  @ApiBearerAuth()
  @Patch('/me')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @UseGuards(JwtAuthGuard)
  async updateMe(
    @Req() req: Request & { user: RequestUser },
    @Body() selfUpdateDto: SelfUpdateUserDto,
  ): Promise<ResponseDto<UserDto>> {
    const userID = req.user?.userID;
    if (!userID) {
      throw new BadRequestException('User information not found in request');
    }

    const { statusCode, message, data }: ResponseDto<UserDto> =
      await this.userService.updateSelfProfile(userID, selfUpdateDto);

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    throw new BadRequestException(statusCode, message);
  }

  @ApiOperation({
    summary: 'Upload avatar for current authenticated user',
  })
  @ApiBearerAuth()
  @Post('/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('file'))
  async uploadAvatar(
    @Req() req: Request & { user: RequestUser },
    @UploadedFile() file: Express.Multer.File,
  ): Promise<ResponseDto<UserDto>> {
    const userID = req.user?.userID;
    if (!userID) {
      throw new BadRequestException('User information not found in request');
    }
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const { statusCode, message, data } = await this.userService.uploadAvatar(
      userID,
      file,
    );

    if (statusCode === OK_CODE) {
      return { statusCode, message, data };
    }
    throw new BadRequestException(message);
  }

  @ApiOperation({
    summary: 'for admin or my manger or me',
  })
  @ApiBearerAuth()
  @Patch(':userID')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  async updateUser(
    @Param('userID', new ParseUUIDPipe()) id: string,
    @Body() updateUserDto: updateUserDto,
  ): Promise<ResponseDto<UserDto>> {
    const { statusCode, message, data }: ResponseDto<UserDto> =
      await this.userService.updateUser(id, updateUserDto);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    throw new BadRequestException(ANOTHER_ERROR_RESPONE);
  }

  @ApiOperation({
    summary: 'for admin',
  })
  @ApiBearerAuth()
  @Patch('/deactivate/:userID')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  async deactivateUser(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Req() req: Request & { user: RequestUser },
  ): Promise<ResponseDto<UserDto>> {
    if (req.user.userID === userID) {
      throw new BadRequestException('Cannot deactivate your own account');
    }
    const { statusCode, message, data }: ResponseDto<UserDto> =
      await this.userService.deactivateUser(userID);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    throw new BadRequestException(statusCode, message);
  }

  @ApiOperation({
    summary: 'for admin',
  })
  @ApiBearerAuth()
  @Patch('/activate/:userID')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  async activateUser(
    @Param('userID', new ParseUUIDPipe()) userID: string,
  ): Promise<ResponseDto<UserDto>> {
    const { statusCode, message, data }: ResponseDto<UserDto> =
      await this.userService.activateUser(userID);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    throw new BadRequestException(statusCode, message);
  }

  @ApiOperation({
    summary: 'HARD DELETE user - FOR TECHNICAL ADMIN ONLY',
    description:
      'Warning: This permanently deletes user data. Use /deactivate/:userID for normal offboarding.',
    deprecated: true,
  })
  @ApiBearerAuth()
  @Delete(':userID')
  @ApiBadRequestResponse()
  @ApiNotFoundResponse()
  @ApiOkResponse()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  async deleteUser(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Req() req: Request & { user: RequestUser },
  ): Promise<ResponseDto<UserDto>> {
    if (req.user.userID === userID) {
      throw new BadRequestException('Cannot delete your own account');
    }
    const { statusCode, message }: ResponseDto<UserDto> =
      await this.userService.deleteUser(userID);
    if (statusCode === NOTFOUND_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
      };

    throw new BadRequestException(statusCode, message);
  }
}

@Controller('employees')
export class EmployeeImportController {
  constructor(private readonly userService: UserService) {}

  @ApiOperation({
    summary: 'Import employees from Excel for admin',
  })
  @ApiBearerAuth()
  @Post('/import')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @UseInterceptors(FileInterceptor('file'))
  async importEmployees(@UploadedFile() file: Express.Multer.File): Promise<
    ResponseDto<{
      importedCount: number;
      errors: Array<{ row: number; message: string }>;
      successes: Array<{ row: number; userID: string; username: string }>;
    }>
  > {
    const result = await this.userService.importEmployeesFromExcel(file);

    if (result.errors.length > 0 && result.importedCount === 0) {
      throw new BadRequestException({
        message: 'Import Excel that bai. Vui long kiem tra cac dong loi.',
        errors: result.errors,
        successes: [],
      });
    }

    return {
      statusCode: OK_CODE,
      message:
        result.errors.length > 0
          ? `Da import ${result.importedCount} nhan vien, mot so dong bi loi.`
          : `Da import thanh cong ${result.importedCount} nhan vien.`,
      data: result,
    };
  }
}
