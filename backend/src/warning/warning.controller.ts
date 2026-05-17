import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  UseGuards,
} from '@nestjs/common';
import { WarningService } from './warning.service';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOperation,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UserAccessGaurd } from 'src/auth/guards/access.guard';
import { RequirePermission } from 'src/common/require-permissions.decorator';
import { CreateWarningDto } from './dto/create-warning.dto';
import WarningDto from './dto/warning.dto';
import ResponseDto from 'src/common/response.dto';
import { CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE } from 'src/common/code';

@Controller('warning')
export class WarningController {
  constructor(private readonly warningService: WarningService) {}

  @Post('/sendWarning')
  @ApiOperation({
    summary: 'Send an employee warning as an admin',
  })
  @ApiBearerAuth()
  @ApiCreatedResponse()
  @ApiNotFoundResponse()
  @ApiBadRequestResponse()
  @ApiConflictResponse()
  @UseGuards(JwtAuthGuard, UserAccessGaurd)
  @RequirePermission('admin')
  async seandWarning(
    @Body() createWarningDto: CreateWarningDto,
  ): Promise<ResponseDto<WarningDto>> {
    const { statusCode, message, data }: ResponseDto<WarningDto> =
      await this.warningService.sendWarning(createWarningDto);

    if (statusCode === CREATED_RESPONE)
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
}
