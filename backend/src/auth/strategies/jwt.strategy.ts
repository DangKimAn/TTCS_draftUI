import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') ||
        'TIMESHEETSYSTEM_ACCESSSECRET',
    });
  }

  async validate(payload: any) {
    if (!payload.userID) {
      throw new UnauthorizedException('Token is invalid');
    }

    return {
      userID: payload.userID,
      username: payload.username,
      email: payload.email,
      roleId: payload.roleId,
      role: payload.role || payload.roleName,
      roleName: payload.roleName || payload.role,
      departmentID: payload.departmentID,
    };
  }
}
