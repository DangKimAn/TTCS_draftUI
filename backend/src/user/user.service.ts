import { Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { RoleService } from 'src/role/role.service';
import { BycyptHashedService } from 'src/common/bycypt-hashed/bycypt-hashed.service';
import ResponseDto, {
  AnotherError,
  DefaultResponse,
} from 'src/common/response.dto';
import {
  BADREQUEST_CODE,
  CONFLIG_CODE,
  CREATED_RESPONE,
  Interval_Server_Network_Exeception_Code,
  nameRole_emloyee,
  nameRole_manager,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import { RoleDto } from 'src/role/dto/Role.dto';
import UserDto from './dto/user.dto';
import DepartmentDto from 'src/department/dto/department.dto';
import { DepartmentService } from 'src/department/department.service';
import updateUserDto from './dto/update-user.dto';
import FullUserDto from './dto/full-user.dto';
import { RequestUser } from 'src/common/types';
import { SelfUpdateUserDto } from './dto/self-update-user.dto';
import { CloudinaryService } from 'src/common/cloudinary/cloudinary.service';

interface ImportEmployeeRow {
  rowNumber: number;
  username: string;
  email: string;
  password: string;
  departmentName?: string;
  title?: string;
  roleName: string;
  salaryCoefficient: number;
  leaveBalance: number;
  isActive: boolean;
}

interface ImportEmployeeError {
  row: number;
  message: string;
}

interface ImportEmployeesResult {
  importedCount: number;
  errors: ImportEmployeeError[];
}

type ImportSheetRow = unknown[];
type ImportDepartment = { departmentName: string };

@Injectable()
export class UserService {
  constructor(
    private prismaService: PrismaService,
    private roleService: RoleService,
    private bcryptHashedService: BycyptHashedService,
    private departmentService: DepartmentService,
    private cloudinaryService: CloudinaryService,
  ) {}

  async getAllUser(): Promise<ResponseDto<UserDto[]>> {
    const users: UserDto[] = await this.prismaService.user.findMany({});
    return {
      statusCode: OK_CODE,
      message: 'get all users successfull',
      data: users,
    };
  }

  async getUserByUserID(
    userID: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<FullUserDto>> {
    const db: Prisma.TransactionClient =
      tx === undefined ? this.prismaService : tx;
    const user: FullUserDto | null = await db.user.findUnique({
      where: {
        userID,
      },
      include: {
        role: true,
        department: {
          include: {
            manager: {
              select: { username: true, email: true },
            },
          },
        },
      },
    });
    if (!user)
      return {
        statusCode: NOTFOUND_CODE,
        message: 'The user have userid is not found',
      };
    return {
      statusCode: OK_CODE,
      message: 'get user successfull',
      data: user,
    };
  }

  async getUserByUserName(
    username: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<FullUserDto>> {
    const db: Prisma.TransactionClient =
      tx === undefined ? this.prismaService : tx;

    const user: FullUserDto | null = await db.user.findUnique({
      where: {
        username,
      },
      include: {
        role: true,
        department: {
          include: {
            manager: {
              select: { username: true, email: true },
            },
          },
        },
      },
    });
    if (!user)
      return {
        statusCode: NOTFOUND_CODE,
        message: 'The user have username is not found',
      };

    return {
      statusCode: OK_CODE,
      message: 'get user successfull',
      data: user,
    };
  }

  async getUserByEmail(
    email: string,
    tx?: Prisma.TransactionClient,
  ): Promise<ResponseDto<FullUserDto>> {
    const db: Prisma.TransactionClient =
      tx === undefined ? this.prismaService : tx;

    const user: FullUserDto | null = await db.user.findUnique({
      where: {
        email,
      },
      include: {
        role: true,
        department: {
          include: {
            manager: {
              select: { username: true, email: true },
            },
          },
        },
      },
    });

    if (!user)
      return {
        statusCode: NOTFOUND_CODE,
        message: 'The user have email is not found',
      };

    return {
      statusCode: OK_CODE,
      message: 'get user successfull',
      data: user,
    };
  }

  async createUser(
    createUserDto: CreateUserDto,
  ): Promise<ResponseDto<UserDto> | AnotherError> {
    const {
      username,
      email,
      password,
      roleName,
      departmentName,
      linkAvatar,
      phone,
      address,
      emergencyContact,
      salaryCoefficient,
      birthday,
      remainDaysofLeave,
      totalDaysofLeave,
      isActive,
      refreshToken,
    } = createUserDto;

    try {
      // 1. Lấy và kiểm tra dữ liệu song song để tối ưu tốc độ
      const [existingUser, roleResult, deptResult] = await Promise.all([
        this.prismaService.user.findFirst({
          where: { OR: [{ username }, { email }] },
        }),
        this.roleService.getRoleByRoleName(roleName || nameRole_emloyee),
        departmentName
          ? this.prismaService.department.findUnique({
              where: { departmentName },
            })
          : Promise.resolve(null),
      ]);

      // 2. Validate sớm
      if (existingUser) {
        return {
          statusCode: CONFLIG_CODE,
          message:
            existingUser.username === username
              ? 'Username already exists'
              : 'Email already exists',
        };
      }
      if (
        !roleResult ||
        roleResult.statusCode !== OK_CODE ||
        roleResult.data === undefined
      ) {
        return { statusCode: NOTFOUND_CODE, message: 'Role not found' };
      }

      const isManagerAction: boolean =
        roleResult.data.nameRole === nameRole_manager ? true : false;
      if (departmentName && !deptResult) {
        return { statusCode: NOTFOUND_CODE, message: 'Department not found' };
      }
      if (isManagerAction && departmentName === undefined) {
        return {
          statusCode: BADREQUEST_CODE, // VD: 400
          message: 'A Manager must be assigned to a department',
        };
      }

      // 3. Hash mật khẩu (Làm ngoài Transaction để tránh block DB)
      if (!password) {
        return { statusCode: BADREQUEST_CODE, message: 'Password is required' };
      }
      const hashedPassword = await this.bcryptHashedService.hash(password);

      // 4. Mở Transaction xử lý tạo User và Logic Chức vụ
      const newUser = await this.prismaService.$transaction(async (tx) => {
        // Bước 4.1: Tạo User với Role mặc định ban đầu (hoặc role truyền vào)
        const user = await tx.user.create({
          data: {
            username,
            email,
            hashedPassword,
            roleId: roleResult.data?.roleID || '',
            departmentID: deptResult?.departmentID || null,
            linkAvatar,
            phone,
            address,
            emergencyContact,
            salaryCoefficient,
            birthday,
            remainDaysofLeave,
            totalDaysofLeave,
            isActive,
            refreshToken,
          },
        });

        if (isManagerAction && deptResult) {
          await this.departmentService.handleManagerTransfer(
            tx,
            deptResult.departmentID,
            deptResult.managerID,
            user.userID,
          );

          await tx.department.update({
            where: { departmentID: deptResult.departmentID },
            data: { managerID: user.userID },
          });
        }

        return user;
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...userDto } = newUser;

      return {
        statusCode: CREATED_RESPONE, // HTTP 201
        message: isManagerAction
          ? 'Create User and assigned as Manager successfully'
          : 'Create User successfully',
        data: userDto as unknown as UserDto,
      };
    } catch (error: unknown) {
      console.error('Error in createUser:', error);

      // Bắt lỗi Conflict từ handleManagerTransfer ném ra (nếu có)
      if (
        error &&
        typeof error === 'object' &&
        'getStatus' in error &&
        typeof error.getStatus === 'function'
      ) {
        const nestError = error as { getStatus: () => number; message: string };
        return {
          statusCode: nestError.getStatus(),
          message: nestError.message,
        };
      }

      return {
        statusCode: BADREQUEST_CODE,
        message: 'another error',
      }; // Lỗi server 500
    }
  }

  async importEmployeesFromExcel(
    file: Express.Multer.File,
  ): Promise<ImportEmployeesResult> {
    if (!file) {
      return {
        importedCount: 0,
        errors: [{ row: 0, message: 'Vui long chon file Excel de import.' }],
      };
    }

    if (!isExcelFile(file.originalname)) {
      return {
        importedCount: 0,
        errors: [{ row: 0, message: 'Chi chap nhan file .xlsx hoac .xls.' }],
      };
    }

    let sheetRows: ImportSheetRow[] = [];

    try {
      const workbook = XLSX.read(file.buffer, { type: 'buffer' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = firstSheetName ? workbook.Sheets[firstSheetName] : null;
      sheetRows = worksheet
        ? (XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            defval: '',
            raw: false,
          }) as ImportSheetRow[])
        : [];
    } catch {
      return {
        importedCount: 0,
        errors: [{ row: 0, message: 'Khong the doc noi dung file Excel.' }],
      };
    }

    if (sheetRows.length < 2) {
      return {
        importedCount: 0,
        errors: [{ row: 0, message: 'File Excel chua co du lieu nhan vien.' }],
      };
    }

    const headerMap = buildHeaderMap(sheetRows[0]);
    const requiredHeaders = [
      'ho ten',
      'email',
      'mat khau tam thoi',
      'phong ban',
      'vai tro',
    ];
    const missingHeaders = requiredHeaders.filter(
      (header) => !headerMap.has(header),
    );

    if (missingHeaders.length > 0) {
      return {
        importedCount: 0,
        errors: [
          {
            row: 1,
            message: `Thieu cot bat buoc: ${missingHeaders.join(', ')}.`,
          },
        ],
      };
    }

    const [existingUsers, roles, departments] = await Promise.all([
      this.prismaService.user.findMany({
        select: { email: true, username: true },
      }),
      this.prismaService.role.findMany(),
      this.prismaService.department.findMany(),
    ]);
    const existingEmails = new Set(
      existingUsers.map((user) => user.email.trim().toLowerCase()),
    );
    const existingUsernames = new Set(
      existingUsers.map((user) => user.username.trim().toLowerCase()),
    );
    const rolesByName = new Map(
      roles.map((role) => [normalizeImportText(role.nameRole), role]),
    );
    const departmentsByName = new Map(
      departments.map((department) => [
        normalizeImportText(department.departmentName),
        department,
      ]),
    );
    registerDepartmentAliases(departmentsByName, departments);
    const seenEmails = new Set<string>();
    const seenUsernames = new Set<string>();
    const rows: ImportEmployeeRow[] = [];
    const errors: ImportEmployeeError[] = [];

    sheetRows.slice(1).forEach((row, index) => {
      const rowNumber = index + 2;

      if (isEmptyExcelRow(row)) {
        return;
      }

      const username = getCellValue(row, headerMap, 'ho ten');
      const email = getCellValue(row, headerMap, 'email').toLowerCase();
      const password = getCellValue(row, headerMap, 'mat khau tam thoi');
      const departmentName = getCellValue(row, headerMap, 'phong ban');
      const title = getCellValue(row, headerMap, 'chuc vu');
      const rawRoleName = getCellValue(row, headerMap, 'vai tro');
      const salaryCoefficient = parseImportNumber(
        getCellValue(row, headerMap, 'he so luong'),
        0,
      );
      const leaveBalance = parseImportNumber(
        getCellValue(row, headerMap, 'so ngay phep mac dinh'),
        12,
      );
      const isActive = parseImportStatus(getCellValue(row, headerMap, 'trang thai'));
      const normalizedRoleName = normalizeImportRole(rawRoleName);
      const matchedDepartment = departmentsByName.get(
        normalizeImportText(departmentName),
      );
      const rowErrors: string[] = [];

      if (!username) {
        rowErrors.push('Ho ten khong duoc trong');
      } else if (existingUsernames.has(username.toLowerCase())) {
        rowErrors.push('Ho ten/username da ton tai');
      } else if (seenUsernames.has(username.toLowerCase())) {
        rowErrors.push('Ho ten/username bi trung trong file');
      }

      if (!email) {
        rowErrors.push('Email khong duoc trong');
      } else if (!isValidEmail(email)) {
        rowErrors.push('Email khong hop le');
      } else if (existingEmails.has(email)) {
        rowErrors.push('Email da ton tai');
      } else if (seenEmails.has(email)) {
        rowErrors.push('Email bi trung trong file');
      }

      if (!password) {
        rowErrors.push('Mat khau tam thoi khong duoc trong');
      }

      if (!normalizedRoleName || !rolesByName.has(normalizeImportText(normalizedRoleName))) {
        rowErrors.push('Vai tro khong hop le');
      }

      if (!departmentName) {
        rowErrors.push('Phong ban khong duoc trong');
      } else if (!matchedDepartment) {
        rowErrors.push('Phong ban khong ton tai');
      }

      if (salaryCoefficient <= 0) {
        rowErrors.push('He so luong phai lon hon 0');
      }

      if (leaveBalance < 0) {
        rowErrors.push('So ngay phep mac dinh khong duoc am');
      }

      if (rowErrors.length > 0) {
        rowErrors.forEach((message) => errors.push({ row: rowNumber, message }));
        return;
      }

      seenEmails.add(email);
      seenUsernames.add(username.toLowerCase());
      rows.push({
        rowNumber,
        username,
        email,
        password,
        departmentName: matchedDepartment?.departmentName,
        title,
        roleName: normalizedRoleName,
        salaryCoefficient,
        leaveBalance,
        isActive,
      });
    });

    if (rows.length === 0 && errors.length === 0) {
      errors.push({ row: 0, message: 'File Excel khong co dong du lieu hop le.' });
    }

    if (errors.length > 0) {
      return { importedCount: 0, errors };
    }

    let importedCount = 0;
    const importErrors: ImportEmployeeError[] = [];

    for (const row of rows) {
      const result = await this.createUser({
        username: row.username,
        email: row.email,
        password: row.password,
        roleName: row.roleName,
        departmentName: row.departmentName,
        salaryCoefficient: row.salaryCoefficient,
        remainDaysofLeave: row.leaveBalance,
        totalDaysofLeave: row.leaveBalance,
        isActive: row.isActive,
      });

      if (result.statusCode === CREATED_RESPONE) {
        importedCount += 1;
      } else {
        importErrors.push({
          row: row.rowNumber,
          message: result.message || 'Khong the import nhan vien',
        });
      }
    }

    return { importedCount, errors: importErrors };
  }
  async updateUser(
    userID: string,
    updateUserDto: updateUserDto,
  ): Promise<ResponseDto<UserDto>> {
    const {
      password,
      linkAvatar,
      phone,
      address,
      emergencyContact,
      salaryCoefficient,
      birthday,
      remainDaysofLeave,
      totalDaysofLeave,
      isActive,
      roleName,
      departmentName,
      refreshToken,
    } = updateUserDto;

    try {
      // 1. Fetch dữ liệu hiện tại của User để làm cơ sở so sánh
      const existingUser = await this.prismaService.user.findUnique({
        where: { userID },
        include: { role: true }, // Lấy kèm thông tin role hiện tại
      });

      if (!existingUser)
        return { statusCode: NOTFOUND_CODE, message: 'User not found' };

      // 2. Lấy Role và Department mới (nếu client có truyền vào)
      const roleResult = roleName
        ? await this.roleService.getRoleByRoleName(roleName)
        : null;
      if (roleName && (!roleResult || roleResult.statusCode !== OK_CODE)) {
        return { statusCode: NOTFOUND_CODE, message: 'Role not found' };
      }

      const deptResult = departmentName
        ? await this.departmentService.getDepartmentByDeparmentName(
            departmentName,
          )
        : null;
      if (
        departmentName &&
        (!deptResult || deptResult.statusCode !== OK_CODE)
      ) {
        return { statusCode: NOTFOUND_CODE, message: 'Department not found' };
      }

      // --- BẮT ĐẦU XỬ LÝ LOGIC NGHIỆP VỤ ---
      // Xác định Role và Department cuối cùng mà User sẽ có sau khi update
      const targetRoleName = roleName ? roleName : existingUser.role.nameRole;
      const targetRoleID = roleResult
        ? roleResult.data?.roleID
        : existingUser.roleId;
      const targetDeptID = departmentName
        ? deptResult?.data?.departmentID
        : existingUser.departmentID;

      if (targetRoleName === nameRole_manager && !targetDeptID) {
        return {
          statusCode: BADREQUEST_CODE, // VD: 400
          message: 'A Manager must be assigned to a department',
        };
      }

      const hashedPassword = password
        ? await this.bcryptHashedService.hash(password)
        : undefined;

      const updatedUser = await this.prismaService.$transaction(async (tx) => {
        // Tìm xem User này hiện tại có đang làm Manager của phòng nào không
        const currentManagingDept = await tx.department.findFirst({
          where: { managerID: userID },
        });

        if (targetRoleName === nameRole_emloyee) {
          if (currentManagingDept) {
            await tx.department.update({
              where: { departmentID: currentManagingDept.departmentID },
              data: { managerID: null },
            });
          }
        }

        if (targetRoleName === nameRole_manager && targetDeptID) {
          if (
            currentManagingDept &&
            currentManagingDept.departmentID !== targetDeptID
          ) {
            await tx.department.update({
              where: { departmentID: currentManagingDept.departmentID },
              data: { managerID: null },
            });
          }

          // 2. TẬN DỤNG HÀM CŨ ĐỂ XỬ LÝ GHẾ SẾP Ở PHÒNG MỚI
          const targetDept = await tx.department.findUnique({
            where: { departmentID: targetDeptID },
          });

          await this.departmentService.handleManagerTransfer(
            tx,
            targetDeptID,
            targetDept?.managerID || null,
            userID,
          );
        }

        return await tx.user.update({
          where: { userID },
          data: {
            hashedPassword,
            roleId: targetRoleID,
            departmentID: targetDeptID,
            linkAvatar,
            phone,
            address,
            emergencyContact,
            salaryCoefficient,
            birthday,
            remainDaysofLeave,
            totalDaysofLeave,
            isActive,
            refreshToken,
          },
        });
      });
      // 5. Format DTO trả về (Che password)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...userDto } = updatedUser;

      return {
        statusCode: OK_CODE,
        message: 'Update User successfully',
        data: userDto as unknown as UserDto,
      };
    } catch (error) {
      console.error('Error in updateUser:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error during update',
      };
    }
  }

  async deactivateUser(userID: string): Promise<ResponseDto<UserDto>> {
    try {
      const updatedUser = await this.prismaService.user.update({
        where: { userID },
        data: { isActive: false },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...userDto } = updatedUser;
      return {
        statusCode: OK_CODE,
        message: 'Deactivate user successfully',
        data: userDto as unknown as UserDto,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'User not found',
        };
      }

      console.error('Error deactivating user:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error during deactivation',
      };
    }
  }

  async activateUser(userID: string): Promise<ResponseDto<UserDto>> {
    try {
      const updatedUser = await this.prismaService.user.update({
        where: { userID },
        data: { isActive: true },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...userDto } = updatedUser;
      return {
        statusCode: OK_CODE,
        message: 'Activate user successfully',
        data: userDto as unknown as UserDto,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'User not found',
        };
      }

      console.error('Error activating user:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error during activation',
      };
    }
  }

  async updateSelfProfile(
    userID: string,
    dto: SelfUpdateUserDto,
  ): Promise<ResponseDto<UserDto>> {
    const data: Prisma.UserUpdateInput = {};

    if (dto.linkAvatar !== undefined) data.linkAvatar = dto.linkAvatar;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.address !== undefined) data.address = dto.address;
    if (dto.emergencyContact !== undefined) {
      data.emergencyContact = dto.emergencyContact;
    }
    if (dto.birthday !== undefined) data.birthday = dto.birthday;
    if (dto.password !== undefined && dto.password.trim() !== '') {
      if (!dto.oldPassword) {
        return {
          statusCode: BADREQUEST_CODE,
          message: 'Vui lòng nhập mật khẩu cũ',
        };
      }

      const currentUser = await this.prismaService.user.findUnique({
        where: { userID },
        select: { hashedPassword: true },
      });

      if (!currentUser) {
        return { statusCode: NOTFOUND_CODE, message: 'User not found' };
      }

      const isMatch = await this.bcryptHashedService.compare(
        dto.oldPassword,
        currentUser.hashedPassword,
      );
      if (!isMatch) {
        return {
          statusCode: BADREQUEST_CODE,
          message: 'Mật khẩu cũ không chính xác',
        };
      }

      data.hashedPassword = await this.bcryptHashedService.hash(dto.password);
    }

    try {
      const updatedUser = await this.prismaService.user.update({
        where: { userID },
        data,
        include: { role: true, department: true },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...userDto } = updatedUser;
      return {
        statusCode: OK_CODE,
        message: 'Update self profile successfully',
        data: userDto as unknown as UserDto,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'User not found',
        };
      }

      console.error('Error updating self profile:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error during self profile update',
      };
    }
  }

  async uploadAvatar(
    userID: string,
    file: Express.Multer.File,
  ): Promise<ResponseDto<UserDto>> {
    try {
      const uploadResult = (await this.cloudinaryService.uploadFile(file)) as {
        secure_url?: string;
      };
      const linkAvatar = String(uploadResult.secure_url || '');

      const updatedUser = await this.prismaService.user.update({
        where: { userID },
        data: { linkAvatar },
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { hashedPassword: _, ...userDto } = updatedUser;
      return {
        statusCode: OK_CODE,
        message: 'Avatar uploaded successfully',
        data: userDto as unknown as UserDto,
      };
    } catch (error: unknown) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2025'
      ) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'User not found',
        };
      }

      console.error('Error uploading avatar:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Internal server error during avatar upload',
      };
    }
  }

  async deleteUser(userID: string): Promise<ResponseDto<UserDto>> {
    // Chuyển sang Deactivate thay vì Hard Delete để bảo vệ lịch sử dữ liệu theo yêu cầu
    return this.deactivateUser(userID);
  }

  async checkIsManager(userId?: string): Promise<AnotherError> {
    if (!userId)
      return {
        statusCode: BADREQUEST_CODE,
        message: 'userID is undefined',
      };

    const { statusCode, message, data }: ResponseDto<UserDto> =
      await this.getUserByUserID(userId);
    if (statusCode !== OK_CODE)
      return {
        statusCode,
        message: 'user id is not found',
      };

    const roleFetch: ResponseDto<RoleDto> = await this.roleService.findOne(
      data?.roleId || '',
    );
    if (roleFetch.statusCode !== OK_CODE)
      return {
        statusCode,
        message,
      };

    if (roleFetch.data?.nameRole.toLocaleLowerCase() === 'manager') {
      return {
        statusCode: OK_CODE,
        message: 'This user is manager',
      };
    }
    return {
      statusCode: BADREQUEST_CODE,
      message: 'This user is not manager',
    };
  }

  async checkAuthIsAdmin(
    currentUser: RequestUser,
  ): Promise<ResponseDto<DefaultResponse>> {
    const roleName = String(
      currentUser?.roleName || currentUser?.role || '',
    ).toLowerCase();
    if (roleName === 'admin' || roleName === 'hr')
      return {
        statusCode: OK_CODE,
        message: 'This role is admin/hr role',
      };

    if (currentUser.roleId === undefined)
      return {
        statusCode: BADREQUEST_CODE,
        message: 'roleID is null',
      };
    const { statusCode, message } = await this.roleService.isAdmin(
      currentUser.roleId,
    );

    return {
      statusCode,
      message,
    };
  }

  async checkAuthIsMyManager(
    currentUser: RequestUser,
    input: string,
    type: string,
  ): Promise<AnotherError> {
    const { userID, departmentID } = currentUser;
    if (userID === undefined || departmentID === undefined)
      return {
        statusCode: BADREQUEST_CODE,
        message: 'userID or departmentID is undefined',
      };

    const checkIsManager = await this.checkIsManager(userID);
    if (checkIsManager.statusCode !== OK_CODE)
      return {
        statusCode: checkIsManager.statusCode,
        message: checkIsManager.message,
      };

    let userResult: ResponseDto<FullUserDto> | null = null;
    if (type === 'userID') {
      userResult = await this.getUserByUserID(input);
    } else if (type === 'email') {
      userResult = await this.getUserByEmail(input);
    } else if (type === 'username') {
      userResult = await this.getUserByUserName(input);
    }

    if (!userResult || userResult.statusCode !== OK_CODE) {
      return {
        message: userResult?.message || 'User not found',
        statusCode: userResult?.statusCode || NOTFOUND_CODE,
      };
    }

    if (userResult.data !== undefined) {
      if (userResult.data.departmentID === departmentID)
        return {
          statusCode: OK_CODE,
          message: 'This is my manager',
        };
      else
        return {
          statusCode: BADREQUEST_CODE,
          message: 'This is not my manager',
        };
    }

    return {
      statusCode: BADREQUEST_CODE,
      message: 'Another error',
    };
  }

  async checkAuthIsManagerOfDepartment(
    currentUser: RequestUser,
    input: string,
  ): Promise<AnotherError> {
    const { userID, departmentID } = currentUser;

    if (userID === undefined || departmentID === undefined)
      return {
        statusCode: BADREQUEST_CODE,
        message: 'userID or departmentID is undefined',
      };

    const checkIsManager = await this.checkIsManager(userID);
    if (checkIsManager.statusCode !== OK_CODE)
      return {
        statusCode: checkIsManager.statusCode,
        message: checkIsManager.message,
      };

    if (departmentID === input)
      return {
        statusCode: OK_CODE,
        message: 'This is my manager of department',
      };
    else {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'This is not manager of department',
      };
    }
  }
  IsMe(currentUser: RequestUser, input: string, type: string): AnotherError {
    const { userID, username, email } = currentUser;
    if (type === 'userID') {
      if (userID == undefined)
        return {
          statusCode: BADREQUEST_CODE,
          message: 'userID is undefined',
        };

      if (userID == input)
        return {
          statusCode: OK_CODE,
          message: "It's me!!!",
        };
      else
        return {
          statusCode: BADREQUEST_CODE,
          message: "It's not me",
        };
    } else if (type === 'email') {
      if (email == undefined)
        return {
          statusCode: BADREQUEST_CODE,
          message: 'email is undefined',
        };

      if (email == input)
        return {
          statusCode: OK_CODE,
          message: "It's me!!!",
        };
      else
        return {
          statusCode: BADREQUEST_CODE,
          message: "It's not me",
        };
    } else if (type === 'username') {
      if (username == undefined)
        return {
          statusCode: BADREQUEST_CODE,
          message: 'username is undefined',
        };

      if (username == input)
        return {
          statusCode: OK_CODE,
          message: "It's me!!!",
        };
      else
        return {
          statusCode: BADREQUEST_CODE,
          message: "It's not me",
        };
    }
    return {
      statusCode: BADREQUEST_CODE,
      message: 'Another Error',
    };
  }

  async getAllUserOfDepartment(
    departmentID: string,
  ): Promise<ResponseDto<UserDto[]>> {
    if (departmentID === undefined) {
      return {
        statusCode: BADREQUEST_CODE,
        message: 'DepartmentID cannot undefined',
      };
    }

    const department =
      await this.departmentService.getDepartmentById(departmentID);
    if (department.statusCode !== OK_CODE)
      return {
        statusCode: department.statusCode,
        message: department.message,
      };

    const users: UserDto[] = await this.prismaService.user.findMany({
      where: {
        departmentID,
      },
    });

    return {
      statusCode: OK_CODE,
      message: 'Get user by department is ok ',
      data: users,
    };
  }

  async getManagerIdOfUserID(
    userID: string,
    tx?: Prisma.TransactionClient,
  ): Promise<DefaultResponse> {
    const userGet: ResponseDto<UserDto> = await this.getUserByUserID(
      userID,
      tx,
    );

    if (userGet.statusCode !== OK_CODE || userGet.data === undefined)
      return {
        statusCode: userGet.statusCode,
        message: userGet.message,
      };

    if (userGet.data.departmentID == undefined)
      return {
        statusCode: NOTFOUND_CODE,
        message: 'user is not in any department',
      };
    const departmentGet: ResponseDto<DepartmentDto> =
      await this.departmentService.getDepartmentById(
        userGet.data.departmentID,
        tx,
      );

    if (
      departmentGet.statusCode !== OK_CODE ||
      departmentGet.data === undefined
    )
      return {
        statusCode: departmentGet.statusCode,
        message: departmentGet.message,
      };

    if (departmentGet.data.managerID === undefined)
      return {
        statusCode: NOTFOUND_CODE,
        message: 'This department dont have manager',
      };

    return {
      statusCode: OK_CODE,
      message: 'get departmentID successfull',
      data: {
        managerID: departmentGet.data.managerID,
      },
    };
  }
}

function buildHeaderMap(row: ImportSheetRow): Map<string, number> {
  const map = new Map<string, number>();

  row.forEach((cell, index) => {
    const header = normalizeImportText(getRawCellValue(cell));
    if (header) {
      map.set(header, index);
    }
  });

  return map;
}

function getCellValue(
  row: ImportSheetRow,
  headerMap: Map<string, number>,
  header: string,
): string {
  const colNumber = headerMap.get(header);

  if (colNumber === undefined) {
    return '';
  }

  return getRawCellValue(row[colNumber]).trim();
}

function getRawCellValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === 'object') {
    if ('text' in value && value.text) {
      return String(value.text);
    }

    if ('result' in value && value.result !== undefined) {
      return String(value.result);
    }

    if ('richText' in value && Array.isArray(value.richText)) {
      return value.richText.map((item) => item.text).join('');
    }
  }

  return String(value);
}

function isEmptyExcelRow(row: ImportSheetRow): boolean {
  return row.every((value) => !getRawCellValue(value));
}

function isExcelFile(fileName?: string): boolean {
  return /\.(xlsx|xls)$/i.test(fileName || '');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeImportText(value?: string): string {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function normalizeImportKey(value?: string): string {
  return normalizeImportText(value).replace(/[^a-z0-9]+/g, '');
}

function registerDepartmentAliases(
  departmentsByName: Map<string, ImportDepartment>,
  departments: ImportDepartment[],
): void {
  departments.forEach((department) => {
    const key = normalizeImportKey(department.departmentName);
    const aliases: string[] = [];

    if (
      key.includes('kythuat') ||
      key.includes('kathuat') ||
      key.includes('thuaat') ||
      key.includes('thuat') ||
      key === 'it'
    ) {
      aliases.push('phong ky thuat', 'it', 'engineering');
    }

    if (
      key.includes('nhansu') ||
      key.includes('nhansa') ||
      key.includes('nhaans') ||
      key === 'hr'
    ) {
      aliases.push('phong nhan su', 'hr', 'human resources');
    }

    if (key.includes('kinhdoanh') || key.includes('sales')) {
      aliases.push('phong kinh doanh', 'sales', 'business');
    }

    aliases.forEach((alias) => {
      departmentsByName.set(normalizeImportText(alias), department);
    });
  });
}

function normalizeImportRole(value: string): string {
  const normalized = normalizeImportText(value).replace(/[\s_-]+/g, '');

  if (normalized === 'hr' || normalized === 'admin' || normalized === 'hradmin') {
    return 'admin';
  }

  if (normalized === 'manager' || normalized === 'quanly') {
    return 'manager';
  }

  if (normalized === 'employee' || normalized === 'nhanvien') {
    return 'employee';
  }

  return value.trim();
}

function parseImportNumber(value: string, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number(value.replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseImportStatus(value: string): boolean {
  const normalized = normalizeImportText(value).replace(/[\s_-]+/g, '');

  if (!normalized) {
    return true;
  }

  return !['inactive', 'khonghoatdong', 'vohieuhoa', 'false', '0'].includes(
    normalized,
  );
}
