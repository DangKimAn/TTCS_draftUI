import { Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ENV } from 'src/common/env';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: ENV.JWT.ACCESS_SECRET || 'SECRET',
    });
  }

  async validate(payload: any) {
    if (!payload.userID) {
      throw new UnauthorizedException('Token không hợp lệ');
    }
    return { 
      userID: payload.userID, 
      username: payload.username,
      email: payload.email, 
      roleId: payload.roleId ,
      departmentID : payload.departmentID
    };
  }
}