import { Injectable } from '@nestjs/common';
import RegiesterDto from './dto/register.dto';
import UserDto from 'src/user/dto/user.dto';
import { UserService } from 'src/user/user.service';
import ResponseDto, { AnotherError } from 'src/common/response.dto';
import {
  BADREQUEST_CODE,
  CREATED_RESPONE,
  OK_CODE,
  UNAUTHORIZED_CODE,
} from 'src/common/code';
import * as jwt from 'jsonwebtoken';
import LoginDto from './dto/login.dto';
import { BycyptHashedService } from 'src/common/bycypt-hashed/bycypt-hashed.service';
import AuthDto from './dto/auth.dto';
import FullUserDto from 'src/user/dto/full-user.dto';
import { ENV } from 'src/common/env';

@Injectable()
export class AuthService {
  constructor(
    private userService: UserService,
    private bcryptHashedservice: BycyptHashedService,
  ) {}
  async register(registerDto: RegiesterDto): Promise<ResponseDto<UserDto>> {
    const { email, username, password, departmentName }: RegiesterDto =
      registerDto;

    const { statusCode, message, data }: ResponseDto<UserDto> | AnotherError =
      await this.userService.createUser({
        email,
        username,
        password,
        departmentName,
      });
    if (statusCode !== CREATED_RESPONE)
      return {
        statusCode,
        message,
      };

    return {
      statusCode,
      message,
      data,
    };
  }

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
      const newAcessToken = await this.genAccessToken(
        data?.username,
        data?.userID,
        data?.email,
        data?.roleId,
        data?.departmentID,
        roleName,
      );
      const newRefreshToken = await this.genRefreshToken(
        data?.userID || '',
        data?.username || '',
        data?.email || '',
      );
      const userGet = await this.userService.updateUser(data?.userID || '', {
        refreshToken: newRefreshToken,
      });
      if (userGet.statusCode !== OK_CODE) return { statusCode, message };

      const {
        hashedPassword: _,
        refreshToken: __,
        ...user
      } = data;
      return {
        statusCode: CREATED_RESPONE,
        message: 'login successfull',
        data: {
          accessToken: newAcessToken,
          refreshToken: newRefreshToken,
          user: user,
        },
      };
    }
    return { statusCode: BADREQUEST_CODE, message: 'another error' };
  }

  async googleLogin(email: string): Promise<ResponseDto<AuthDto>> {
    const userResult = await this.userService.getUserByEmail(email);
    const { statusCode, message, data } = userResult;

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
    const accessToken = await this.genAccessToken(
      data.username,
      data.userID,
      data.email,
      data.roleId,
      data.departmentID,
      roleName,
    );
    const refreshToken = await this.genRefreshToken(
      data.userID,
      data.username || '',
      data.email,
    );

    await this.userService.updateUser(data.userID, { refreshToken });

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { hashedPassword: _, refreshToken: __, ...user } = data;
    return {
      statusCode: CREATED_RESPONE,
      message: 'Google login successful',
      data: {
        accessToken,
        refreshToken,
        user,
      },
    };
  }

  async genAccessToken(
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

  async genRefreshToken(userID: string, username: string, email: string) {
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
    const newAcessToken: string = await this.genAccessToken(
      data.username,
      data.userID,
      data.email,
      data?.roleId,
      data?.departmentID,
      roleName,
    );
    const newRefreshToken: string = await this.genRefreshToken(
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

    const { hashedPassword: _, refreshToken: __, ...user } = data;

    return {
      statusCode: CREATED_RESPONE,
      message: `update refreshToken successfull`,
      data: {
        refreshToken: newRefreshToken,
        accessToken: newAcessToken,
        user: {
          ...user,
          role: data.role,
          roleName,
        },
      },
    };
  }

  async logout(userID: string): Promise<ResponseDto<AnotherError>> {
    await this.userService.updateUser(userID, { refreshToken: '' });

    return { statusCode: CREATED_RESPONE, message: 'log out successfully' };
  }
}
