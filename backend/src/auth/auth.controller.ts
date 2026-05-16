import {
  Get,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotAcceptableException,
  NotFoundException,
  Post,
  UnauthorizedException,
  UseGuards,
  Param,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import RegiesterDto from './dto/register.dto';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import UserDto from 'src/user/dto/user.dto';
import {
  ANOTHER_ERROR_RESPONE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  UNAUTHORIZED_CODE,
} from 'src/common/code';
import LoginDto from './dto/login.dto';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import AuthDto from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { Request } from 'express';

interface UserPayload {
  userID: string;
  username: string;
  email: string;
  roleId: string;
  departmentID?: string;
  role?: {
    nameRole: string;
  };
}

interface RequestWithUser extends Request {
  user: UserPayload;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  @Post('/register')
  @ApiNotFoundResponse()
  @ApiCreatedResponse()
  @ApiBadGatewayResponse()
  @ApiConflictResponse()
  async register(
    @Body() registerDto: RegiesterDto,
  ): Promise<ResponseDto<UserDto>> {
    const { statusCode, message, data }: ResponseDto<UserDto> =
      await this.authService.register(registerDto);
    if (statusCode === NOTFOUND_CODE)
      throw new NotAcceptableException(statusCode, message);
    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data,
      };

    throw new BadRequestException(statusCode, message);
  }

  @Post('/login')
  async login(@Body() loginDto: LoginDto): Promise<ResponseDto<AuthDto>> {
    const { statusCode, message, data }: ResponseDto<AuthDto> =
      await this.authService.login(loginDto);

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data,
      };
    throw new BadRequestException(statusCode, message);
  }

  @Post('/refreshToken/:userID')
  @ApiOkResponse()
  @ApiUnauthorizedResponse()
  @ApiBadGatewayResponse()
  @ApiConflictResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'for me',
  })
  async refreshToken(
    @Param('userID', new ParseUUIDPipe()) userID: string,
    @Body() token: RefreshTokenDto,
  ): Promise<ResponseDto<AuthDto>> {
    const { statusCode, message, data }: ResponseDto<AuthDto> =
      await this.authService.refreshToken(userID, token.refreshToken);
    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === UNAUTHORIZED_CODE)
      throw new UnauthorizedException(statusCode, message);
    if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data,
      };
    throw new BadRequestException(ANOTHER_ERROR_RESPONE);
  }

  @ApiOperation({
    summary: 'for me',
  })
  @ApiOkResponse()
  @UseGuards(JwtAuthGuard)
  @ApiUnauthorizedResponse()
  @ApiBadGatewayResponse()
  @ApiConflictResponse()
  @ApiNotFoundResponse()
  @ApiBearerAuth()
  @Post('/logout')
  async logout(
    @Req() request: RequestWithUser,
  ): Promise<ResponseDto<AnotherError>> {
    const userID = request.user?.userID;

    if (!userID) throw new UnauthorizedException('User is not authenticated');

    const { statusCode, message, data }: ResponseDto<AnotherError> =
      await this.authService.logout(userID);

    if (statusCode === NOTFOUND_CODE)
      throw new NotFoundException(statusCode, message);

    if (statusCode === CONFLIG_CODE)
      throw new ConflictException(statusCode, message);

    if (statusCode === UNAUTHORIZED_CODE)
      throw new UnauthorizedException(statusCode, message);
    if (statusCode === CREATED_RESPONE)
      return {
        statusCode,
        message,
        data,
      };
    throw new BadRequestException(ANOTHER_ERROR_RESPONE);
  }

  @Get('google')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Initiate Google SSO login' })
  googleAuth() {
    // Guard will handle redirection to Google
  }

  @Get('google/callback')
  @UseGuards(GoogleAuthGuard)
  @ApiOperation({ summary: 'Google SSO callback' })
  async googleAuthRedirect(@Req() req: RequestWithUser) {
    const user = req.user;
    if (!user?.email) {
      throw new UnauthorizedException('Google authentication failed');
    }

    const result = await this.authService.googleLogin(user.email);
    if (result.statusCode !== CREATED_RESPONE) {
      throw new UnauthorizedException(result.message);
    }

    return result;
  }
}
