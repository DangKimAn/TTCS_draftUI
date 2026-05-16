import { forwardRef, Module } from '@nestjs/common';
import { DepartmentService } from './department.service';
import { DepartmentController } from './department.controller';
import { UserModule } from 'src/user/user.module';
import { RoleService } from 'src/role/role.service';
import { RoleModule } from 'src/role/role.module';

@Module({
  controllers: [DepartmentController],
  providers: [DepartmentService],
  exports: [DepartmentService],
  imports: [forwardRef(() => UserModule), forwardRef(() => RoleModule)],
})
export class DepartmentModule {}
