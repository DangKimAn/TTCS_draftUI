import { Injectable } from '@nestjs/common';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { Role } from '@prisma/client';
import ResponseDto from 'src/common/response.dto';
import {
  BADREQUEST_CODE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import { RoleDto } from './dto/Role.dto';

@Injectable()
export class RoleService {
  constructor(private prismaService: PrismaService) {}
  async create(createRoleDto: CreateRoleDto): Promise<ResponseDto<RoleDto>> {
    console.log('Inide role.service.create()');

    const { statusCode }: ResponseDto<RoleDto> = await this.getRoleByRoleName(
      createRoleDto.nameRole,
    );

    if (statusCode === OK_CODE)
      return {
        statusCode: CONFLIG_CODE,
        message: `Name role existed`,
      };

    const role: Role = await this.prismaService.role.create({
      data: {
        nameRole: createRoleDto.nameRole, // Tên field trong database : Giá trị từ DTO
      },
    });

    return {
      statusCode: CREATED_RESPONE,
      message: 'Created successfully',
      data: role,
    };
  }

  async findAll(): Promise<ResponseDto<RoleDto[]>> {
    const roles: RoleDto[] | null = await this.prismaService.role.findMany();

    return {
      statusCode: OK_CODE,
      message:
        roles.length === 0
          ? 'Hiện chưa có role nào'
          : 'Lấy danh sách role thành công',
      data: roles,
    };
  }

  async findOne(roleID: string): Promise<ResponseDto<RoleDto>> {
    const role: RoleDto | null = await this.prismaService.role.findUnique({
      where: {
        roleID,
      },
    });
    if (!role) {
      return {
        statusCode: NOTFOUND_CODE,
        message: 'Role id is not exist',
      };
    }

    return {
      statusCode: OK_CODE,
      message: `Get role  id = ${roleID} successfull`,
      data: role,
    };
  }

  async update(
    id: string,
    updateRoleDto: UpdateRoleDto,
  ): Promise<ResponseDto<RoleDto>> {
    const findRoleByID: ResponseDto<RoleDto> = await this.findOne(id);
    if (
      findRoleByID.statusCode === NOTFOUND_CODE ||
      findRoleByID.data === undefined
    )
      return {
        statusCode: NOTFOUND_CODE,
        message: `Role id is not exist`,
      };

    if (findRoleByID.data.nameRole === updateRoleDto.nameRole)
      return {
        statusCode: CONFLIG_CODE,
        message: 'The name role is the same',
      };

    const findRoleByRoleName: ResponseDto<RoleDto> =
      await this.getRoleByRoleName(updateRoleDto.nameRole);
    if (findRoleByRoleName.statusCode === OK_CODE)
      return {
        statusCode: CONFLIG_CODE,
        message: `The role's name must be unique`,
      };

    try {
      const newRole = await this.prismaService.role.update({
        where: {
          roleID: id,
        },
        data: {
          nameRole: updateRoleDto.nameRole,
        },
      });
      return {
        statusCode: OK_CODE,
        message: `update role have id = ${id} successfull`,
        data: newRole,
      };
    } catch (err: unknown) {
      console.error('Error updating role:', err);
    }
    return {
      statusCode: BADREQUEST_CODE,
      message: 'Another error!!!',
    };
  }

  async remove(id: string): Promise<ResponseDto<RoleDto>> {
    try {
      // 1. Kiểm tra xem có User nào đang sử dụng Role này không (Nghiệp vụ quan trọng)
      const usersInRole = await this.prismaService.user.count({
        where: { roleId: id },
      });

      if (usersInRole > 0) {
        return {
          statusCode: BADREQUEST_CODE,
          message: 'Cannot delete role: There are users assigned to this role',
        };
      }

      await this.prismaService.role.delete({
        where: { roleID: id },
      });

      return {
        statusCode: OK_CODE,
        message: `Delete role with id = ${id} successfully`,
      };
    } catch (error: unknown) {
      const code = getPrismaErrorCode(error);
      // 3. Xử lý lỗi P2025 (Record to delete does not exist) của Prisma
      if (code === 'P2025') {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Role ID does not exist',
        };
      }

      throw error;
    }
  }

  async getRoleByRoleName(nameRole: string): Promise<ResponseDto<RoleDto>> {
    const role: RoleDto | null = await this.prismaService.role.findUnique({
      where: {
        nameRole,
      },
    });
    if (!role)
      return {
        statusCode: NOTFOUND_CODE,
        message: `The nameRole = ${nameRole} is not found`,
      };

    return {
      statusCode: OK_CODE,
      message: `get role successfull`,
      data: role,
    };
  }

  async isAdmin(roleID: string): Promise<ResponseDto<RoleDto>> {
    const { statusCode, message, data }: ResponseDto<RoleDto> =
      await this.findOne(roleID);
    if (statusCode !== OK_CODE)
      return {
        statusCode,
        message,
      };

    if (data !== undefined) {
      if (data.nameRole.toLocaleLowerCase() !== 'admin')
        return {
          statusCode: BADREQUEST_CODE,
          message: 'This role is not admin role',
        };
      return {
        statusCode: OK_CODE,
        message: 'This role is admin role',
      };
    }
    return {
      statusCode: BADREQUEST_CODE,
      message: 'Another error!!!',
    };
  }

  async isManager(roleID: string): Promise<ResponseDto<RoleDto>> {
    const { statusCode, message, data }: ResponseDto<RoleDto> =
      await this.findOne(roleID);
    if (statusCode !== OK_CODE)
      return {
        statusCode,
        message,
      };

    if (data !== undefined) {
      if (data.nameRole.toLocaleLowerCase() !== 'manager')
        return {
          statusCode: BADREQUEST_CODE,
          message: 'This role is not manager role',
        };
      return {
        statusCode: OK_CODE,
        message: 'This role is manager role',
      };
    }
    return {
      statusCode: BADREQUEST_CODE,
      message: 'Another error!!!',
    };
  }
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
