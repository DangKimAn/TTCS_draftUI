import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UserModule } from 'src/user/user.module';
import { BycyptHashedModule } from 'src/common/bycypt-hashed/bycypt-hashed.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports:[JwtStrategy],
  imports : [forwardRef(() => UserModule), forwardRef(()=> BycyptHashedModule)]
})
export class AuthModule {}
