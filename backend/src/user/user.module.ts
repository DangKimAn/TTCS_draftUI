import { forwardRef, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { EmployeeImportController, UserController } from './user.controller';
import { RoleModule } from 'src/role/role.module';
import { DepartmentModule } from 'src/department/department.module';
import { BycyptHashedModule } from 'src/common/bycypt-hashed/bycypt-hashed.module';
import { AuthModule } from 'src/auth/auth.module';
import { CloudinaryModule } from 'src/common/cloudinary/cloudinary.module';

@Module({
  controllers: [UserController, EmployeeImportController],
  providers: [UserService],
  imports: [
    forwardRef(() => RoleModule),
    forwardRef(() => DepartmentModule),
    BycyptHashedModule,
    forwardRef(() => AuthModule),
    CloudinaryModule,
  ],
  exports: [UserService],
})
export class UserModule {}
