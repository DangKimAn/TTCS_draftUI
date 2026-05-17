import {
  ConflictException,
  forwardRef,
  HttpException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import CreateDepartmentDto from './dto/createDepartment.dto';
import DepartmentDto from './dto/department.dto';
// import { ResponseDtoListDepartment, ResponseDtoDepartment} from 'src/common/response.dto';
import ResponseDto from 'src/common/response.dto';
import {
  BADREQUEST_CODE,
  CREATED_RESPONE,
  nameRole_emloyee,
  nameRole_manager,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import { UserService } from 'src/user/user.service';
import UpdateDepartmentDto from './dto/update-department.dto';
import { RoleService } from 'src/role/role.service';
@Injectable()
export class DepartmentService {
  constructor(
    private prismaService: PrismaService,
    @Inject(forwardRef(() => UserService))
    private userService: UserService,
    private readonly roleService: RoleService,
  ) {}

  async findAll(): Promise<ResponseDto<DepartmentDto[]>> {
    const departments: DepartmentDto[] | undefined =
      await this.prismaService.department.findMany();
    return {
      statusCode: OK_CODE,
      message: 'Get all department successfull',
      data: departments,
    };
  }

  async createDepartment(
    DepartmentDto: CreateDepartmentDto,
  ): Promise<ResponseDto<DepartmentDto>> {
    const { departmentName, managerID } = DepartmentDto;

    try {
      const { statusCode, message, data } =
        await this.prismaService.$transaction(
          async (tx): Promise<ResponseDto<DepartmentDto>> => {
            const departmentGet = await tx.department.findUnique({
              where: {
                departmentName,
              },
            });

            if (departmentGet)
              throw new ConflictException('This department name is exist');

            const newDepartment = await tx.department.create({
              data: {
                departmentName,
                managerID,
              },
            });

            if (managerID !== undefined) {
              const managerGet = await tx.user.findUnique({
                where: {
                  userID: managerID,
                },
              });

              if (managerGet === null)
                throw new NotFoundException('This managerID is not found ');

              const managerRoleGet = await tx.role.findUnique({
                where: {
                  nameRole: nameRole_manager,
                },
              });

              if (!managerRoleGet)
                throw new NotFoundException('Please create manager role !!!');
              if (managerRoleGet.roleID === managerGet.roleId) {
                throw new ConflictException(
                  'This managerID is manager of another departmnet!!',
                );
              }

              await tx.user.update({
                where: {
                  userID: managerGet.userID,
                },
                data: {
                  roleId: managerRoleGet.roleID,
                  departmentID: newDepartment.departmentID,
                },
              });
            }

            return {
              statusCode: CREATED_RESPONE,
              message: 'Create Department Succeessfull !!!!',
              data: newDepartment,
            };
          },
        );

      return {
        statusCode,
        message,
        data,
      };
    } catch (error) {
      // Nếu là Exception mình chủ động ném ra thì throw tiếp để NestJS Filter xử lý
      if (error instanceof HttpException) throw error;

      // Nếu là lỗi lạ (DB sập,...) thì trả về lỗi 500 hoặc log lại
      throw new InternalServerErrorException(getErrorMessage(error));
    }
  }

  async getDepartmentById(
    departmentID: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<DepartmentDto>> {
    const db = tx ?? this.prismaService;
    const department: DepartmentDto | null = await db.department.findUnique({
      where: {
        departmentID,
      },
    });

    if (!department)
      return {
        statusCode: NOTFOUND_CODE,
        message: `departmentID = ${departmentID} is NOT FOUND`,
      };
    return {
      statusCode: OK_CODE,
      message: `get department has id = ${departmentID} is successfull`,
      data: department,
    };
  }

  async getDepartmentByDeparmentName(
    departmentName: string,
  ): Promise<ResponseDto<DepartmentDto>> {
    const department: DepartmentDto | null =
      await this.prismaService.department.findUnique({
        where: {
          departmentName,
        },
      });

    if (!department)
      return {
        statusCode: NOTFOUND_CODE,
        message: `The department has name = ${departmentName} is not found`,
      };

    return {
      statusCode: OK_CODE,
      message: `Get department has departmentName = ${departmentName} successfull`,
      data: department,
    };
  }

  async updateDepartment(
    id: string,
    dto: UpdateDepartmentDto,
  ): Promise<ResponseDto<DepartmentDto>> {
    const { departmentName, managerID } = dto;

    try {
      return await this.prismaService.$transaction(async (tx) => {
        const currentDept = await tx.department.findUnique({
          where: { departmentID: id },
        });
        if (!currentDept) throw new NotFoundException('Department not found');

        if (departmentName && departmentName !== currentDept.departmentName) {
          const nameCheck = await tx.department.findUnique({
            where: { departmentName },
          });
          if (nameCheck)
            throw new ConflictException('Department name already exists');
        }

        // Gọi hàm dùng chung truyền `tx` vào
        if (managerID !== undefined && managerID !== currentDept.managerID) {
          await this.handleManagerTransfer(
            tx,
            id,
            currentDept.managerID,
            managerID,
          );
        }

        const updatedDepartment = await tx.department.update({
          where: { departmentID: id },
          data: { departmentName, managerID },
        });

        return {
          statusCode: OK_CODE,
          message: 'Update Department Successful',
          data: updatedDepartment,
        };
      });
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new InternalServerErrorException(getErrorMessage(error));
    }
  }

  async deleteDepartment(id: string): Promise<ResponseDto<DepartmentDto>> {
    try {
      await this.prismaService.department.delete({
        where: { departmentID: id },
      });

      return {
        statusCode: OK_CODE,
        message: 'Delete Department Successfully',
      };
    } catch (error: unknown) {
      const code = getPrismaErrorCode(error);
      // Bắt lỗi vi phạm khóa ngoại của Prisma (Mã P2003)
      if (code === 'P2003') {
        return {
          statusCode: BADREQUEST_CODE, // Hoặc CONFLICT_CODE (409)
          message:
            'Cannot delete this department because there are still employees in it.',
        };
      }

      // Bắt lỗi không tìm thấy phòng ban (Mã P2025)
      if (code === 'P2025') {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Department not found.',
        };
      }

      // Các lỗi server khác
      throw new InternalServerErrorException(getErrorMessage(error));
    }
  }

  async handleManagerTransfer(
    tx: Prisma.TransactionClient,
    departmentID: string,
    currentManagerID: string | null,
    newManagerID: string | null,
  ) {
    // 1. Giáng chức Manager cũ (nếu có)
    if (currentManagerID && currentManagerID !== newManagerID) {
      const employeeRole = await tx.role.findUnique({
        where: { nameRole: nameRole_emloyee },
      });

      if (!employeeRole) {
        throw new NotFoundException('Employee role not found');
      }

      await tx.user.update({
        where: { userID: currentManagerID },
        data: { roleId: employeeRole.roleID },
      });
    }

    if (newManagerID) {
      const newManager = await tx.user.findUnique({
        where: { userID: newManagerID },
      });
      if (!newManager) throw new NotFoundException('New Manager not found');

      const managerRole = await tx.role.findUnique({
        where: { nameRole: nameRole_manager },
      });

      if (!managerRole) {
        throw new NotFoundException('Manager role not found');
      }

      if (
        newManager.roleId === managerRole.roleID &&
        newManager.departmentID !== departmentID
      ) {
        throw new ConflictException(
          'This user is already managing another department',
        );
      }

      await tx.user.update({
        where: { userID: newManagerID },
        data: {
          roleId: managerRole.roleID,
          departmentID: departmentID,
        },
      });
    }
  }
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Internal Server Error';
}

function getPrismaErrorCode(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return undefined;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === 'string' ? code : undefined;
}
