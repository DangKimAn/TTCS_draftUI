import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  ConflictException,
  NotFoundException,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { RoleService } from './role.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
} from '@nestjs/swagger';
import {
  ANOTHER_ERROR_RESPONE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import { RoleDto } from './dto/Role.dto';
// import { AnotherError, ResponseDto<RoleDto[]>, ResponseDto<RoleDto> } from 'src/common/response.dto';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
@Controller('role')
export class RoleController {
  constructor(private readonly roleService: RoleService) {}

  @Post()
  @ApiOperation({
    summary: 'for admin',
  })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiCreatedResponse({
    description: 'Create Role successfull',
  })
  @ApiConflictResponse({
    description: 'Name role existed',
  })
  async create(
    @Body() createRoleDto: CreateRoleDto,
  ): Promise<ResponseDto<RoleDto> | AnotherError> {
    console.log('Inide role.controller.create()');
    const { statusCode, message, data }: ResponseDto<RoleDto> =
      await this.roleService.create(createRoleDto);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);
    else if (statusCode === CREATED_RESPONE) {
      return {
        statusCode,
        message,
        data,
      };
    }
    return ANOTHER_ERROR_RESPONE;
  }

  @Get()
  @ApiOperation({
    summary: 'for admin',
  })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiOkResponse({
    description: 'Get all roles successfull',
  })
  async findAll(): Promise<ResponseDto<RoleDto[]> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<RoleDto[]> =
      await this.roleService.findAll(); // Đổi users -> roles
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };
    return ANOTHER_ERROR_RESPONE;
  }

  @ApiOkResponse({
    description: 'Get role id  = ?? successfull',
  })
  @ApiNotFoundResponse({
    description: 'Role id is not exist',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed (uuid is expected)',
  })
  @ApiOperation({
    summary: 'for admin',
  })
  @Get('getRoleByID/:id')
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  async findOne(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ResponseDto<RoleDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<RoleDto> =
      await this.roleService.findOne(id);
    if (statusCode === NOTFOUND_CODE) {
      throw new NotFoundException('Role id is not exist ');
    }
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };
    return ANOTHER_ERROR_RESPONE;
  }

  @ApiOperation({
    summary: 'for admin',
  })
  @ApiOkResponse({
    description: 'Update  role have id  = ?? successfull',
  })
  @ApiNotFoundResponse({
    description: 'Role id is not exist',
  })
  @ApiBadRequestResponse({
    description: 'update role not successfully',
  })
  @ApiConflictResponse({
    description: "The role's name must be unique",
  })
  @Patch(':id')
  @ApiOperation({
    summary: 'for admin',
  })
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() updateRoleDto: UpdateRoleDto,
  ): Promise<ResponseDto<RoleDto> | AnotherError> {
    const response = await this.roleService.update(id, updateRoleDto);
    const { statusCode, message, data } = response;
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);
    if (statusCode == NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    return ANOTHER_ERROR_RESPONE;
  }

  @ApiOkResponse({
    description: 'Delete role have id  = ?? successfull',
  })
  @ApiNotFoundResponse({
    description: 'Role id is not exist',
  })
  @ApiBadRequestResponse({
    description: 'Validation failed (uuid is expected)',
  })
  @ApiOperation({
    summary: 'for admin',
  })
  @Delete(':id')
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  async remove(
    @Param('id', new ParseUUIDPipe()) id: string,
  ): Promise<ResponseDto<RoleDto> | AnotherError> {
    const { statusCode, message }: ResponseDto<RoleDto> =
      await this.roleService.remove(id);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
      };
    throw new BadRequestException(message);
  }

  @ApiOperation({
    summary: 'for admin',
  })
  @Get('/getRoleByNameRole/:nameRole')
  @ApiBearerAuth()
  @RequirePermission('admin')
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @ApiOkResponse({
    description: 'get role successfull',
  })
  @ApiNotFoundResponse({
    description: 'The nameRole = ?? is not found',
  })
  async getRoleBYNameRole(
    @Param('nameRole') nameRole: string,
  ): Promise<ResponseDto<RoleDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<RoleDto> =
      await this.roleService.getRoleByRoleName(nameRole);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(`The nameRole = ${nameRole} is not found`);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    throw new BadRequestException(message);
  }
}
