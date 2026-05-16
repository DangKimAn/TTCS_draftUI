import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { BycyptHashedModule } from 'src/common/bycypt-hashed/bycypt-hashed.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, GoogleStrategy],
  exports: [JwtStrategy, GoogleStrategy],
  imports: [forwardRef(() => UserModule), forwardRef(() => BycyptHashedModule)],
})
export class AuthModule {}
