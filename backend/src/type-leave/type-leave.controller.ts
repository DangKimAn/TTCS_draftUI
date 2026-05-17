import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  Delete,
  ParseUUIDPipe,
  UseGuards,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { TypeLeaveService } from './type-leave.service';
import { CreateTypeLeaveDto } from './dto/create-type-leave.dto';
import { UpdateTypeLeaveDto } from './dto/update-type-leave.dto';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiConflictResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import {
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import { DefaultResponse } from 'src/common/response.dto';

@ApiTags('type-leave')
@Controller('type-leave')
export class TypeLeaveController {
  constructor(private readonly typeLeaveService: TypeLeaveService) {}

  @ApiOperation({ description: 'Lấy tất cả loại nghỉ phép' })
  @ApiOkResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('me', 'manager', 'admin')
  @Get()
  async getAllTypeLeaves(
    @Query('includeInactive') includeInactive?: string,
  ): Promise<DefaultResponse> {
    const response = await this.typeLeaveService.getAllTypeLeaves(
      includeInactive === 'true',
    );
    if (response.statusCode === OK_CODE) return response;
    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({ description: 'Kích hoạt lại loại nghỉ phép' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Patch(':typeLeaveID/activate')
  async activateTypeLeave(
    @Param('typeLeaveID', new ParseUUIDPipe()) typeLeaveID: string,
  ): Promise<DefaultResponse> {
    const response = await this.typeLeaveService.setTypeLeaveActive(
      typeLeaveID,
      true,
    );
    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);
    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({
    description: 'Vô hiệu hóa loại nghỉ phép, không xóa lịch sử',
  })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Patch(':typeLeaveID/deactivate')
  async deactivateTypeLeave(
    @Param('typeLeaveID', new ParseUUIDPipe()) typeLeaveID: string,
  ): Promise<DefaultResponse> {
    const response = await this.typeLeaveService.setTypeLeaveActive(
      typeLeaveID,
      false,
    );
    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);
    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({ description: 'Lấy chi tiết 1 loại nghỉ phép' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Get(':typeLeaveID')
  async getTypeLeave(
    @Param('typeLeaveID', new ParseUUIDPipe()) typeLeaveID: string,
  ): Promise<DefaultResponse> {
    const response = await this.typeLeaveService.getTypeLeave(typeLeaveID);
    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);
    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({ description: 'Tạo loại nghỉ phép mới' })
  @ApiCreatedResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Post()
  async createTypeLeave(
    @Body() createDto: CreateTypeLeaveDto,
  ): Promise<DefaultResponse> {
    const response = await this.typeLeaveService.createTypeLeave(createDto);
    if (
      response.statusCode === CREATED_RESPONE ||
      response.statusCode === OK_CODE
    )
      return response;
    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({ description: 'Cập nhật loại nghỉ phép' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Patch(':typeLeaveID')
  async updateTypeLeave(
    @Param('typeLeaveID', new ParseUUIDPipe()) typeLeaveID: string,
    @Body() updateDto: UpdateTypeLeaveDto,
  ): Promise<DefaultResponse> {
    const response = await this.typeLeaveService.updateTypeLeave(
      typeLeaveID,
      updateDto,
    );
    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);
    throw new BadRequestException(response.statusCode, response.message);
  }

  @ApiOperation({ description: 'Vô hiệu hóa loại nghỉ phép, giữ lịch sử' })
  @ApiOkResponse()
  @ApiNotFoundResponse()
  @ApiConflictResponse()
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  @Delete(':typeLeaveID')
  async deleteTypeLeave(
    @Param('typeLeaveID', new ParseUUIDPipe()) typeLeaveID: string,
  ): Promise<DefaultResponse> {
    const response = await this.typeLeaveService.deleteTypeLeave(typeLeaveID);
    if (response.statusCode === OK_CODE) return response;
    if (response.statusCode === NOTFOUND_CODE)
      throw new NotFoundException(response.statusCode, response.message);
    if (response.statusCode === CONFLIG_CODE)
      throw new ConflictException(response.statusCode, response.message);
    throw new BadRequestException(response.statusCode, response.message);
  }
}
