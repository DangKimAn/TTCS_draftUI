import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { RoleModule } from 'src/role/role.module';
import { DepartmentModule } from 'src/department/department.module';
import { BycyptHashedModule } from 'src/common/bycypt-hashed/bycypt-hashed.module';
import { AuthModule } from 'src/auth/auth.module';

@Module({
  controllers: [UserController],
  providers: [UserService],
  imports :[forwardRef(() => RoleModule),
  forwardRef(() => DepartmentModule),
  BycyptHashedModule,
forwardRef(()=> AuthModule)],
  exports :[UserService]
})
export class UserModule {}
