import { Injectable, UnauthorizedException } from "@nestjs/common";

import { AuthGuard } from "@nestjs/passport";
import { PassportStrategy } from "@nestjs/passport";

import { ExtractJwt, Strategy } from "passport-jwt"
import { ENV } from "src/common/env";
@Injectable()
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
}