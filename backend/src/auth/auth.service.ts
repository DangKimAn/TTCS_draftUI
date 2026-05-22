import { Injectable } from '@nestjs/common';
import UserDto from 'src/user/dto/user.dto';
import { UserService } from 'src/user/user.service';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import {
  BADREQUEST_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
  UNAUTHORIZED_CODE,
} from 'src/common/code';
import * as jwt from 'jsonwebtoken';
import LoginDto from './dto/login.dto';
import { BycyptHashedService } from 'src/common/bycypt-hashed/bycypt-hashed.service';
import AuthDto, { AuthUserDto } from './dto/auth.dto';
import FullUserDto from 'src/user/dto/full-user.dto';
import { ENV } from 'src/common/env';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import { EmailService } from 'src/common/email.service';

interface MicrosoftTokenResponse {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  id_token?: string;
  error?: string;
  error_description?: string;
}

interface MicrosoftProfileResponse {
  id?: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

interface OAuthStatePayload {
  provider: string;
  nonce: string;
  exp: number;
}

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private bcryptHashedservice: BycyptHashedService,
    private prismaService: PrismaService,
    private emailService: EmailService,
  ) {}

  async login(loginDto: LoginDto): Promise<ResponseDto<AuthDto>> {
    const { email, username, password }: LoginDto = loginDto;
    const loginIdentifier = (email || username || '').trim();

    if (!loginIdentifier)
      return {
        statusCode: BADREQUEST_CODE,
        message: 'Email or username is required',
      };

    let userResult: ResponseDto<FullUserDto> =
      await this.userService.getUserByEmail(loginIdentifier);

    if (userResult.statusCode !== OK_CODE && username)
      userResult = await this.userService.getUserByUserName(loginIdentifier);

    const { statusCode, message, data }: ResponseDto<FullUserDto> = userResult;
    if (statusCode !== OK_CODE)
      return {
        statusCode,
        message,
      };

    if (data !== undefined) {
      if (data?.isActive !== true)
        return {
          statusCode: UNAUTHORIZED_CODE,
          message: 'User account is inactive',
        };

      const hashed: string = data?.hashedPassword || '';

      if (!(await this.bcryptHashedservice.compare(password, hashed)))
        return {
          statusCode: BADREQUEST_CODE,
          message: 'The password is wrong',
        };

      const roleName = data?.role?.nameRole;
      const newAcessToken = this.genAccessToken(
        data?.username,
        data?.userID,
        data?.email,
        data?.roleId,
        data?.departmentID,
        roleName,
      );
      const newRefreshToken = this.genRefreshToken(
        data?.userID || '',
        data?.username || '',
        data?.email || '',
      );
      const userGet = await this.userService.updateUser(data?.userID || '', {
        refreshToken: newRefreshToken,
      });
      if (userGet.statusCode !== OK_CODE) return { statusCode, message };

      return {
        statusCode: CREATED_RESPONE,
        message: 'login successfull',
        data: {
          accessToken: newAcessToken,
          refreshToken: newRefreshToken,
          user: this.toAuthUser(data),
        },
      };
    }
    return { statusCode: BADREQUEST_CODE, message: 'another error' };
  }

  async googleLogin(email: string): Promise<ResponseDto<AuthDto>> {
    return this.ssoLogin(email, 'Google');
  }

  isGoogleConfigured(): boolean {
    return (
      this.isConfiguredValue(ENV.GOOGLE.CLIENT_ID) &&
      this.isConfiguredValue(ENV.GOOGLE.CLIENT_SECRET) &&
      this.isConfiguredValue(ENV.GOOGLE.CALLBACK_URL)
    );
  }

  isMicrosoftConfigured(): boolean {
    return (
      this.isConfiguredValue(ENV.MICROSOFT.CLIENT_ID) &&
      this.isConfiguredValue(ENV.MICROSOFT.CLIENT_SECRET) &&
      this.isConfiguredValue(ENV.MICROSOFT.TENANT_ID) &&
      this.isConfiguredValue(ENV.MICROSOFT.CALLBACK_URL)
    );
  }

  createOAuthState(provider: string): string {
    const payload: OAuthStatePayload = {
      provider,
      nonce: randomBytes(16).toString('hex'),
      exp: Date.now() + 10 * 60 * 1000,
    };
    const encodedPayload = Buffer.from(JSON.stringify(payload)).toString(
      'base64url',
    );
    const signature = this.signOAuthState(encodedPayload);

    return `${encodedPayload}.${signature}`;
  }

  verifyOAuthState(state: string | undefined, provider: string): boolean {
    if (!state) {
      return false;
    }

    const [encodedPayload, signature] = state.split('.');

    if (!encodedPayload || !signature) {
      return false;
    }

    const expectedSignature = this.signOAuthState(encodedPayload);
    const signatureBuffer = Buffer.from(signature);
    const expectedSignatureBuffer = Buffer.from(expectedSignature);

    if (
      signatureBuffer.length !== expectedSignatureBuffer.length ||
      !timingSafeEqual(signatureBuffer, expectedSignatureBuffer)
    ) {
      return false;
    }

    try {
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as OAuthStatePayload;

      return payload.provider === provider && payload.exp > Date.now();
    } catch {
      return false;
    }
  }

  getMicrosoftAuthorizationUrl(state: string): string {
    const url = new URL(
      `https://login.microsoftonline.com/${encodeURIComponent(
        ENV.MICROSOFT.TENANT_ID || '',
      )}/oauth2/v2.0/authorize`,
    );

    url.searchParams.set('client_id', ENV.MICROSOFT.CLIENT_ID || '');
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('redirect_uri', ENV.MICROSOFT.CALLBACK_URL || '');
    url.searchParams.set('response_mode', 'query');
    url.searchParams.set('scope', ENV.MICROSOFT.SCOPES);
    url.searchParams.set('state', state);

    return url.toString();
  }

  async microsoftLoginWithCode(code: string): Promise<ResponseDto<AuthDto>> {
    const token = await this.exchangeMicrosoftCode(code);

    if (!token.access_token) {
      return {
        statusCode: UNAUTHORIZED_CODE,
        message:
          token.error_description ||
          token.error ||
          'Microsoft token exchange failed',
      };
    }

    const profile = await this.fetchMicrosoftProfile(token.access_token);
    const email = profile.mail || profile.userPrincipalName;

    if (!email) {
      return {
        statusCode: UNAUTHORIZED_CODE,
        message: 'Microsoft account did not return an email address',
      };
    }

    return this.ssoLogin(email, 'Microsoft');
  }

  buildSsoSuccessRedirect(provider: string, auth: AuthDto): string {
    const url = new URL(this.getSsoRedirectUrl(true));
    url.searchParams.set('provider', provider);

    const fragment = new URLSearchParams({
      accessToken: auth.accessToken,
      refreshToken: auth.refreshToken,
    });

    return `${url.toString()}#${fragment.toString()}`;
  }

  buildSsoErrorRedirect(
    provider: string,
    code: string,
    message: string,
  ): string {
    const url = new URL(this.getSsoRedirectUrl(false));
    url.searchParams.set('provider', provider);
    url.searchParams.set('error', code);
    url.searchParams.set('message', message);

    return url.toString();
  }

  private async ssoLogin(
    email: string,
    provider: string,
  ): Promise<ResponseDto<AuthDto>> {
    const userResult = await this.userService.getUserByEmail(email);
    const { statusCode, data } = userResult;

    if (statusCode !== OK_CODE || !data) {
      return {
        statusCode: UNAUTHORIZED_CODE,
        message: 'User not found. Please contact administrator.',
      };
    }

    if (!data.isActive) {
      return {
        statusCode: UNAUTHORIZED_CODE,
        message: 'User account is inactive',
      };
    }

    const roleName = data.role?.nameRole;
    const accessToken = this.genAccessToken(
      data.username,
      data.userID,
      data.email,
      data.roleId,
      data.departmentID,
      roleName,
    );
    const refreshToken = this.genRefreshToken(
      data.userID,
      data.username || '',
      data.email,
    );

    await this.userService.updateUser(data.userID, { refreshToken });

    return {
      statusCode: CREATED_RESPONE,
      message: `${provider} login successful`,
      data: {
        accessToken,
        refreshToken,
        user: this.toAuthUser(data),
      },
    };
  }

  private signOAuthState(encodedPayload: string): string {
    return createHmac('sha256', ENV.JWT.ACCESS_SECRET)
      .update(encodedPayload)
      .digest('base64url');
  }

  private isConfiguredValue(value?: string | null): boolean {
    const normalized = String(value || '').trim();

    return (
      normalized.length > 0 &&
      normalized !== '...' &&
      !normalized.startsWith('your-') &&
      !normalized.includes('[PASSWORD]') &&
      !normalized.includes('[PROJECT-REF]')
    );
  }

  private getSsoRedirectUrl(isSuccess: boolean): string {
    const configuredUrl = isSuccess
      ? ENV.SSO.SUCCESS_REDIRECT_URL
      : ENV.SSO.ERROR_REDIRECT_URL;

    if (configuredUrl) {
      return configuredUrl;
    }

    const frontendOrigin = ENV.CORS_ORIGIN.split(',')[0]?.trim();
    return `${frontendOrigin || 'http://localhost:5173'}/auth/callback`;
  }

  private async exchangeMicrosoftCode(
    code: string,
  ): Promise<MicrosoftTokenResponse> {
    const tokenUrl = `https://login.microsoftonline.com/${encodeURIComponent(
      ENV.MICROSOFT.TENANT_ID || '',
    )}/oauth2/v2.0/token`;
    const body = new URLSearchParams({
      client_id: ENV.MICROSOFT.CLIENT_ID || '',
      client_secret: ENV.MICROSOFT.CLIENT_SECRET || '',
      code,
      grant_type: 'authorization_code',
      redirect_uri: ENV.MICROSOFT.CALLBACK_URL || '',
      scope: ENV.MICROSOFT.SCOPES,
    });

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
    });
    const payload = (await response.json()) as MicrosoftTokenResponse;

    if (!response.ok) {
      return {
        error: payload.error || String(response.status),
        error_description:
          payload.error_description || 'Microsoft token endpoint failed',
      };
    }

    return payload;
  }

  private async fetchMicrosoftProfile(
    accessToken: string,
  ): Promise<MicrosoftProfileResponse> {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=id,displayName,mail,userPrincipalName',
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new Error('Microsoft profile endpoint failed');
    }

    return (await response.json()) as MicrosoftProfileResponse;
  }

  genAccessToken(
    username: string | undefined,
    userID: string | undefined,
    email: string | undefined,
    roleId: string | null | undefined,
    departmentID: string | null | undefined,
    roleName?: string | null,
  ) {
    const payload = {
      userID,
      username,
      email,
      roleId,
      role: roleName,
      roleName,
      departmentID,
    };

    const acessToken = jwt.sign(payload, ENV.JWT.ACCESS_SECRET, {
      expiresIn: '15m',
    });

    return acessToken;
  }

  genRefreshToken(userID: string, username: string, email: string) {
    const payload = {
      userID,
      username,
      email,
    };

    const refreshToken = jwt.sign(payload, ENV.JWT.REFRESH_SECRET, {
      expiresIn: '7d',
    });

    return refreshToken;
  }

  async refreshToken(
    userID: string,
    refreshToken: string,
  ): Promise<ResponseDto<AuthDto>> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        ENV.JWT.REFRESH_SECRET,
      ) as jwt.JwtPayload & { userID?: string };

      if (decoded.userID !== userID)
        return {
          statusCode: UNAUTHORIZED_CODE,
          message: 'refreshToken khong dung ',
        };
    } catch {
      return {
        statusCode: UNAUTHORIZED_CODE,
        message: 'refreshToken is invalid or expired',
      };
    }

    const { statusCode, message, data }: ResponseDto<FullUserDto> =
      await this.userService.getUserByUserID(userID);

    if (statusCode != OK_CODE || data === undefined)
      return {
        statusCode,
        message,
      };

    if (data.refreshToken !== refreshToken)
      return {
        statusCode: UNAUTHORIZED_CODE,
        message: 'refreshToken khong dung ',
      };

    if (data.isActive !== true)
      return {
        statusCode: UNAUTHORIZED_CODE,
        message: 'User account is inactive',
      };

    const roleName = data.role?.nameRole;
    const newAcessToken: string = this.genAccessToken(
      data.username,
      data.userID,
      data.email,
      data?.roleId,
      data?.departmentID,
      roleName,
    );
    const newRefreshToken: string = this.genRefreshToken(
      data.userID,
      data.username,
      data.email,
    );

    const updateUser: ResponseDto<UserDto> = await this.userService.updateUser(
      data.userID,
      { refreshToken: newRefreshToken },
    );

    if (updateUser.statusCode !== OK_CODE)
      return {
        statusCode,
        message,
      };

    return {
      statusCode: CREATED_RESPONE,
      message: `update refreshToken successfull`,
      data: {
        refreshToken: newRefreshToken,
        accessToken: newAcessToken,
        user: this.toAuthUser(data),
      },
    };
  }

  async logout(userID: string): Promise<ResponseDto<AnotherError>> {
    await this.userService.updateUser(userID, { refreshToken: '' });

    return { statusCode: CREATED_RESPONE, message: 'log out successfully' };
  }

  private toAuthUser(data: FullUserDto): AuthUserDto {
    return {
      userID: data.userID,
      email: data.email,
      username: data.username,
      linkAvatar: data.linkAvatar,
      phone: data.phone,
      address: data.address,
      emergencyContact: data.emergencyContact,
      salaryCoefficient: data.salaryCoefficient,
      birthday: data.birthday,
      remainDaysofLeave: data.remainDaysofLeave,
      totalDaysofLeave: data.totalDaysofLeave,
      isActive: data.isActive,
      roleId: data.roleId,
      departmentID: data.departmentID,
      role: data.role,
      department: data.department,
    };
  }

  // FORGOT PASSWORD OTP FLOW

  async sendResetCode(email: string): Promise<ResponseDto<any>> {
    const userResult = await this.userService.getUserByEmail(email);
    if (userResult.statusCode !== OK_CODE || !userResult.data) {
      return {
        statusCode: NOTFOUND_CODE,
        message: 'User not found. Please contact administrator.',
      };
    }

    // Generate 6-digit OTP
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

    // Save to DB
    await this.prismaService.user.update({
      where: { userID: userResult.data.userID },
      data: {
        resetPasswordCode: code,
        resetPasswordExpires: expires,
      },
    });

    // Send Email
    await this.emailService.send({
      to: email,
      subject: '[HRM] Mã xác nhận đặt lại mật khẩu',
      text: `Xin chào ${userResult.data.username},\n\nMã xác nhận để đặt lại mật khẩu của bạn là: ${code}\n\nMã này sẽ hết hạn sau 5 phút.\nNếu bạn không yêu cầu đặt lại mật khẩu, xin vui lòng bỏ qua email này.\n\nTrân trọng,\nHệ thống HRM`,
    });

    return {
      statusCode: OK_CODE,
      message: 'If the email exists, a reset code has been sent.',
    };
  }

  async verifyResetCode(
    email: string,
    code: string,
  ): Promise<ResponseDto<any>> {
    const userResult = await this.userService.getUserByEmail(email);
    if (userResult.statusCode !== OK_CODE || !userResult.data) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'Invalid code or email.',
      };
    }

    const user = await this.prismaService.user.findUnique({
      where: { userID: userResult.data.userID },
    });

    if (!user || user.resetPasswordCode !== code) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'Invalid code or email.',
      };
    }

    if (!user.resetPasswordExpires || user.resetPasswordExpires < new Date()) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'Code has expired. Please request a new one.',
      };
    }

    return {
      statusCode: OK_CODE,
      message: 'Code is valid.',
    };
  }

  async resetPassword(
    email: string,
    code: string,
    newPassword: string,
  ): Promise<ResponseDto<any>> {
    // Verify code first
    const verifyResult = await this.verifyResetCode(email, code);
    if (verifyResult.statusCode !== OK_CODE) {
      return verifyResult;
    }

    const userResult = await this.userService.getUserByEmail(email);
    if (userResult.statusCode !== OK_CODE || !userResult.data) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'Invalid code or email.',
      };
    }

    // Hash the new password
    const hashedPassword = await this.bcryptHashedservice.hash(newPassword);

    // Update the password and clear the reset code
    await this.prismaService.user.update({
      where: { userID: userResult.data.userID },
      data: {
        hashedPassword: hashedPassword,
        resetPasswordCode: null,
        resetPasswordExpires: null,
      },
    });

    return {
      statusCode: OK_CODE,
      message: 'Password has been successfully reset.',
    };
  }
}
