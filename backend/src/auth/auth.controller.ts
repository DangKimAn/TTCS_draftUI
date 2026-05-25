import {
  Get,
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  NotFoundException,
  Post,
  UnauthorizedException,
  UseGuards,
  Param,
  ParseUUIDPipe,
  Req,
  Query,
  Res,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ApiBadGatewayResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';

import ResponseDto, { AnotherError } from 'src/common/response.dto';
import {
  ANOTHER_ERROR_RESPONE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
  UNAUTHORIZED_CODE,
} from 'src/common/code';
import LoginDto from './dto/login.dto';
import { RefreshTokenDto } from './dto/refreshToken.dto';
import AuthDto from './dto/auth.dto';
import {
  SendCodeDto,
  VerifyCodeDto,
  ResetPasswordDto,
} from './dto/forgot-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import type { Request } from 'express';
import type { Response } from 'express';

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
  async googleAuthRedirect(@Req() req: RequestWithUser, @Res() res: Response) {
    const user = req.user;
    if (!user?.email) {
      res.redirect(
        this.authService.buildSsoErrorRedirect(
          'google',
          'GOOGLE_SSO_FAILED',
          'Google authentication failed',
        ),
      );
      return;
    }

    const result = await this.authService.googleLogin(user.email);
    if (result.statusCode !== CREATED_RESPONE || !result.data) {
      res.redirect(
        this.authService.buildSsoErrorRedirect(
          'google',
          'GOOGLE_SSO_UNAUTHORIZED',
          result.message,
        ),
      );
      return;
    }

    res.redirect(
      this.authService.buildSsoSuccessRedirect('google', result.data),
    );
  }

  @Get('microsoft')
  @ApiOperation({ summary: 'Initiate Microsoft SSO login' })
  microsoftAuth(@Res() res: Response) {
    if (!this.authService.isMicrosoftConfigured()) {
      res.redirect(
        this.authService.buildSsoErrorRedirect(
          'microsoft',
          'MICROSOFT_SSO_NOT_CONFIGURED',
          'Microsoft SSO is missing client id, tenant id, client secret, or callback URL.',
        ),
      );
      return;
    }

    const state = this.authService.createOAuthState('microsoft');
    res.redirect(this.authService.getMicrosoftAuthorizationUrl(state));
  }

  @Get('microsoft/callback')
  @ApiOperation({ summary: 'Microsoft SSO callback' })
  async microsoftAuthRedirect(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Query('error_description') errorDescription: string | undefined,
    @Res() res: Response,
  ) {
    if (error) {
      res.redirect(
        this.authService.buildSsoErrorRedirect(
          'microsoft',
          error,
          errorDescription || 'Microsoft authentication failed.',
        ),
      );
      return;
    }

    if (!code || !this.authService.verifyOAuthState(state, 'microsoft')) {
      res.redirect(
        this.authService.buildSsoErrorRedirect(
          'microsoft',
          'MICROSOFT_SSO_INVALID_CALLBACK',
          'Microsoft callback is missing code or has an invalid state.',
        ),
      );
      return;
    }

    try {
      const result = await this.authService.microsoftLoginWithCode(code);

      if (result.statusCode !== CREATED_RESPONE || !result.data) {
        res.redirect(
          this.authService.buildSsoErrorRedirect(
            'microsoft',
            'MICROSOFT_SSO_UNAUTHORIZED',
            result.message,
          ),
        );
        return;
      }

      res.redirect(
        this.authService.buildSsoSuccessRedirect('microsoft', result.data),
      );
    } catch (callbackError) {
      res.redirect(
        this.authService.buildSsoErrorRedirect(
          'microsoft',
          'MICROSOFT_SSO_FAILED',
          callbackError instanceof Error
            ? callbackError.message
            : 'Microsoft authentication failed.',
        ),
      );
    }
  }

  // FORGOT PASSWORD OTP FLOW

  @Post('forgot-password/send-code')
  async sendResetCode(@Body() sendCodeDto: SendCodeDto) {
    const result = await this.authService.sendResetCode(sendCodeDto.email);
    if (result.statusCode === NOTFOUND_CODE) {
      throw new NotFoundException(result.message);
    }
    if (
      result.statusCode !== OK_CODE &&
      result.statusCode !== CREATED_RESPONE
    ) {
      throw new BadRequestException(result.message);
    }
    return result;
  }

  @Post('forgot-password/verify-code')
  async verifyResetCode(@Body() verifyCodeDto: VerifyCodeDto) {
    const result = await this.authService.verifyResetCode(
      verifyCodeDto.email,
      verifyCodeDto.code,
    );
    if (
      result.statusCode !== OK_CODE &&
      result.statusCode !== CREATED_RESPONE
    ) {
      throw new BadRequestException(result.message);
    }
    return result;
  }

  @Post('forgot-password/reset')
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    const result = await this.authService.resetPassword(
      resetPasswordDto.email,
      resetPasswordDto.code,
      resetPasswordDto.newPassword,
    );
    if (
      result.statusCode !== OK_CODE &&
      result.statusCode !== CREATED_RESPONE
    ) {
      throw new BadRequestException(result.message);
    }
    return result;
  }
}
