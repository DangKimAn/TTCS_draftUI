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
  UseGuards,
} from '@nestjs/common';
import { DepartmentService } from './department.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import CreateDepartmentDto from './dto/createDepartment.dto';
import {
  ANOTHER_ERROR_RESPONE,
  BADREQUEST_CODE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import DepartmentDto from './dto/department.dto';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import UpdateDepartmentDto from './dto/update-department.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserService } from 'src/user/user.service';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';

@Controller('department')
export class DepartmentController {
  constructor(
    private readonly departmentService: DepartmentService,
    private userService: UserService,
  ) {}
  @ApiOkResponse({
    description: 'Get all user successfull',
  })
  @ApiUnauthorizedResponse({
    description: "user isn't an admin",
  })
  @Get('')
  @ApiOperation({
    summary: 'for admin',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  async findAll(): Promise<ResponseDto<DepartmentDto[]> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<DepartmentDto[]> =
      await this.departmentService.findAll();
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    return ANOTHER_ERROR_RESPONE;
  }

  @Get('/byID/:departmentID')
  @ApiOperation({
    summary: 'for admin or manger of department',
  })
  @ApiOkResponse({
    description: `Get department have id = ?? successfully`,
  })
  @ApiNotFoundResponse({
    description: 'The department have id = ?? is not exist',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin', 'managerOfDepartment')
  async getDepartmentById(
    @Param('departmentID', new ParseUUIDPipe()) departmentID: string,
  ): Promise<ResponseDto<DepartmentDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<DepartmentDto> =
      await this.departmentService.getDepartmentById(departmentID);
    if (statusCode === NOTFOUND_CODE) throw new NotFoundException(message);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };

    return ANOTHER_ERROR_RESPONE;
  }

  @Post('')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @ApiCreatedResponse({
    description: 'Create department successfully',
  })
  @ApiBadRequestResponse({
    description: 'The name of department is existed',
  })
  @ApiConflictResponse({
    description: 'The id of manager is not exist',
  })
  async createDepartment(
    @Body() createDepartmentDto: CreateDepartmentDto,
  ): Promise<ResponseDto<DepartmentDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<DepartmentDto> =
      await this.departmentService.createDepartment(createDepartmentDto);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException({
        message,
      });

    if (statusCode === NOTFOUND_CODE) {
      throw new NotFoundException(message);
    }

    if (statusCode === BADREQUEST_CODE) {
      throw new BadRequestException({
        message,
      });
    } else if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data: data,
      };
    throw new BadRequestException(ANOTHER_ERROR_RESPONE);
  }

  @Get('byDepartmentName/:departmentName')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @ApiOperation({
    summary: 'Get department by departmentName for admin',
  })
  @ApiOkResponse({
    description: 'Get department by departmentName is successfull !!',
  })
  @ApiNotFoundResponse({
    description: 'The department have name = ?? is not exist',
  })
  async getDepartmentByDepartmentName(
    @Param('departmentName') departmentName: string,
  ): Promise<ResponseDto<DepartmentDto> | AnotherError> {
    const { statusCode, message, data }: ResponseDto<DepartmentDto> =
      await this.departmentService.getDepartmentByDeparmentName(departmentName);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException({
        statusCode,
        message,
      });
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };
    return ANOTHER_ERROR_RESPONE;
  }

  @Patch(':departmentID')
  @ApiOperation({
    summary: 'for admin or manger of department',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @ApiOkResponse()
  @ApiBadRequestResponse({})
  @ApiBadRequestResponse({})
  @ApiConflictResponse({})
  async updateDepartment(
    @Param('departmentID', new ParseUUIDPipe()) departmentID: string,
    @Body() updateDepartmentDto: UpdateDepartmentDto,
  ): Promise<ResponseDto<DepartmentDto>> {
    const { statusCode, message, data }: ResponseDto<DepartmentDto> =
      await this.departmentService.updateDepartment(
        departmentID,
        updateDepartmentDto,
      );

    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
        data,
      };
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    throw new BadRequestException(statusCode, message);
  }

  @Delete(':departmentID')
  @ApiOperation({
    summary: 'for admin or manger of department',
  })
  @ApiOkResponse()
  @ApiBadRequestResponse({})
  @ApiBadRequestResponse({})
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  async deleteDepartment(
    @Param('departmentID') departmentID: string,
  ): Promise<ResponseDto<DepartmentDto>> {
    const { statusCode, message }: ResponseDto<DepartmentDto> =
      await this.departmentService.deleteDepartment(departmentID);
    if (statusCode === OK_CODE)
      return {
        statusCode,
        message,
      };
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    throw new BadRequestException(statusCode, message);
  }
}
