import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { BycyptHashedModule } from 'src/common/bycypt-hashed/bycypt-hashed.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { GoogleAuthGuard } from './guards/google-auth.guard';

import { EmailModule } from 'src/common/email.module';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy, GoogleAuthGuard],
  exports: [JwtStrategy, GoogleStrategy],
  imports: [
    forwardRef(() => UserModule),
    forwardRef(() => BycyptHashedModule),
    EmailModule,
    PrismaModule,
  ],
})
export class AuthModule {}
