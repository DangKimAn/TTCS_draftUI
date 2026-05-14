import { ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException, RequestTimeoutException } from '@nestjs/common';
import { Department, Prisma, User } from '@prisma/client';
import { UUID } from 'crypto';
import { PrismaService } from 'src/prisma/prisma.service';
import CreateUserDto from './dto/create-user.dto';
import { RoleService } from 'src/role/role.service';
import { BycyptHashedService } from 'src/common/bycypt-hashed/bycypt-hashed.service';
import ResponseDto, { AnotherError, DefaultResponse } from 'src/common/response.dto';
import { ANOTHER_ERROR_RESPONE, BADREQUEST_CODE, CONFLIG_CODE, CREATED_RESPONE, Interval_Server_Network_Exeception_Code, nameRole_emloyee, nameRole_manager, nameRole_noneRole, NOTFOUND_CODE, OK_CODE, UNAUTHORIZED_CODE } from 'src/common/code';
import { RoleDto } from 'src/role/dto/Role.dto';
import UserDto from './dto/user.dto';
import DepartmentDto from 'src/department/dto/department.dto';
import { DepartmentService } from 'src/department/department.service';
import updateUserDto from './dto/update-user.dto';
import FullUserDto from './dto/full-user.dto';
@Injectable()
export class UserService {

    constructor(
        private prismaService: PrismaService,
        private roleService: RoleService,
        private bcryptHashedService: BycyptHashedService,
        private departmentService: DepartmentService
    ) { }

    async getAllUser(): Promise<ResponseDto<UserDto[]>> {
        const users: UserDto[] = await this.prismaService.user.findMany({})
        return {
            statusCode: OK_CODE,
            message: 'get all users successfull',
            data: users
        };
    }


    async getUserByUserID(userID: string , tx ?: Prisma.TransactionClient): Promise<ResponseDto<FullUserDto>> {

        const db: Prisma.TransactionClient = tx === undefined ? this.prismaService : tx
        const user: FullUserDto | null = await db.user.findUnique({
            where: {
                userID
            }
        })
        if (!user)
            return {
                statusCode: NOTFOUND_CODE,
                message: "The user have userid is not found"
            }
        return {
            statusCode: OK_CODE,
            message: 'get user successfull',
            data: user
        };
    }

    async getUserByUserName(username: string ,tx ?: Prisma.TransactionClient ): Promise<ResponseDto<FullUserDto>> {
        const db: Prisma.TransactionClient = tx === undefined ? this.prismaService : tx

        const user: FullUserDto | null = await db.user.findUnique({
            where: {
                username
            }
        })
        if (!user)
            return {
                statusCode: NOTFOUND_CODE,
                message: "The user have username is not found"
            }

        return {
            statusCode: OK_CODE,
            message: 'get user successfull',
            data: user
        };
    }

    async getUserByEmail(email: string, tx ?: Prisma.TransactionClient): Promise<ResponseDto<FullUserDto>> {
        const db: Prisma.TransactionClient = tx === undefined ? this.prismaService : tx

        const user: FullUserDto | null = await db.user.findUnique({
            where: {
                email
            }
        })

        if (!user)

            return {
                statusCode: NOTFOUND_CODE,
                message: "The user have email is not found"
            }

        return {
            statusCode: OK_CODE,
            message: 'get user successfull',
            data: user
        };
    }

    async createUser(createUserDto: CreateUserDto): Promise<ResponseDto<UserDto> | AnotherError> {
        const {
            username, email, password, roleName, departmentName,
            linkAvatar, salaryCoefficient, birthday, remainDaysofLeave,
            totalDaysofLeave, isActive, refreshToken,
        } = createUserDto;

        try {
            // 1. Lấy và kiểm tra dữ liệu song song để tối ưu tốc độ
            const [existingUser, roleResult, deptResult] = await Promise.all([
                this.prismaService.user.findFirst({
                    where: { OR: [{ username }, { email }] }
                }),
                this.roleService.getRoleByRoleName(roleName || nameRole_emloyee),
                departmentName ? this.prismaService.department.findUnique({ where: { departmentName } }) : Promise.resolve(null)
            ]);

            // 2. Validate sớm
            if (existingUser) {
                return {
                    statusCode: CONFLIG_CODE, // Sửa lại typo CONFLIG_CODE nhé
                    message: existingUser.username === username ? "Username already exists" : "Email already exists"
                };
            }
            if (!roleResult || roleResult.statusCode !== OK_CODE || roleResult.data === undefined) {
                return { statusCode: NOTFOUND_CODE, message: 'Role not found' };
            }

            const isManagerAction: boolean = roleResult.data.nameRole === nameRole_manager ? true : false
            if (departmentName && !deptResult) {
                return { statusCode: NOTFOUND_CODE, message: 'Department not found' };
            }
            if (isManagerAction && departmentName === undefined) {
                return {
                    statusCode: BADREQUEST_CODE, // VD: 400
                    message: 'A Manager must be assigned to a department'
                };
            }

            // 3. Hash mật khẩu (Làm ngoài Transaction để tránh block DB)
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
                        salaryCoefficient,
                        birthday,
                        remainDaysofLeave,
                        totalDaysofLeave,
                        isActive,
                        refreshToken
                    }
                });

                if (isManagerAction && deptResult) {
                    await this.departmentService.handleManagerTransfer(tx, deptResult.departmentID, deptResult.managerID, user.userID);

                    await tx.department.update({
                        where: { departmentID: deptResult.departmentID },
                        data: { managerID: user.userID }
                    });
                }

                return user;
            });

            const { hashedPassword: _, ...userDto } = newUser;

            return {
                statusCode: CREATED_RESPONE, // HTTP 201
                message: isManagerAction ? 'Create User and assigned as Manager successfully' : 'Create User successfully',
                data: userDto as unknown as UserDto
            };

        } catch (error) {
            console.error('Error in createUser:', error);

            // Bắt lỗi Conflict từ handleManagerTransfer ném ra (nếu có)
            if (error instanceof HttpException) {
                return {
                    statusCode: error.getStatus(),
                    message: error.message
                } as any; // Ép kiểu tùy theo interface AnotherError của bạn
            }

            return {
                statusCode: BADREQUEST_CODE,
                message: 'another error'
            }; // Lỗi server 500
        }
    }
    async updateUser(userID: string, updateUserDto: updateUserDto): Promise<ResponseDto<UserDto>> {
        const {
            password, linkAvatar, salaryCoefficient, birthday,
            remainDaysofLeave, totalDaysofLeave, isActive,
            roleName, departmentName, refreshToken
        } = updateUserDto;

        try {
            // 1. Fetch dữ liệu hiện tại của User để làm cơ sở so sánh
            const existingUser = await this.prismaService.user.findUnique({
                where: { userID },
                include: { role: true } // Lấy kèm thông tin role hiện tại
            });

            if (!existingUser) return { statusCode: NOTFOUND_CODE, message: 'User not found' };

            // 2. Lấy Role và Department mới (nếu client có truyền vào)
            const roleResult = roleName ? await this.roleService.getRoleByRoleName(roleName) : null;
            if (roleName && (!roleResult || roleResult.statusCode !== OK_CODE)) {
                return { statusCode: NOTFOUND_CODE, message: 'Role not found' };
            }

            const deptResult = departmentName ? await this.departmentService.getDepartmentByDeparmentName(departmentName) : null;
            if (departmentName && (!deptResult || deptResult.statusCode !== OK_CODE)) {
                return { statusCode: NOTFOUND_CODE, message: 'Department not found' };
            }

            // --- BẮT ĐẦU XỬ LÝ LOGIC NGHIỆP VỤ ---
            // Xác định Role và Department cuối cùng mà User sẽ có sau khi update
            const targetRoleName = roleName ? roleName : existingUser.role.nameRole;
            const targetRoleID = roleResult ? roleResult.data?.roleID : existingUser.roleId;
            const targetDeptID = departmentName ? deptResult?.data?.departmentID : existingUser.departmentID;

            if (targetRoleName === nameRole_manager && !targetDeptID) {
                return {
                    statusCode: BADREQUEST_CODE, // VD: 400
                    message: 'A Manager must be assigned to a department'
                };
            }

            const hashedPassword = password ? await this.bcryptHashedService.hash(password) : undefined;

            const updatedUser = await this.prismaService.$transaction(async (tx) => {

                // Tìm xem User này hiện tại có đang làm Manager của phòng nào không
                const currentManagingDept = await tx.department.findFirst({
                    where: { managerID: userID }
                });

                if (targetRoleName === nameRole_emloyee) {
                    if (currentManagingDept) {
                        await tx.department.update({
                            where: { departmentID: currentManagingDept.departmentID },
                            data: { managerID: null }
                        });
                    }
                }

                if (targetRoleName === nameRole_manager && targetDeptID) {

                    if (currentManagingDept && currentManagingDept.departmentID !== targetDeptID) {
                        await tx.department.update({
                            where: { departmentID: currentManagingDept.departmentID },
                            data: { managerID: null }
                        });
                    }

                    // 2. TẬN DỤNG HÀM CŨ ĐỂ XỬ LÝ GHẾ SẾP Ở PHÒNG MỚI
                    const targetDept = await tx.department.findUnique({
                        where: { departmentID: targetDeptID }
                    });

                   
                    await this.departmentService.handleManagerTransfer(
                        tx,
                        targetDeptID,
                        targetDept?.managerID || null, 
                        userID                         
                    );
                }

               
                return await tx.user.update({
                    where: { userID },
                    data: {
                        hashedPassword,
                        roleId: targetRoleID,
                        departmentID: targetDeptID,
                        linkAvatar,
                        salaryCoefficient,
                        birthday,
                        remainDaysofLeave,
                        totalDaysofLeave,
                        isActive,
                        refreshToken
                    }
                });
            });
            // 5. Format DTO trả về (Che password)
            const { hashedPassword: _, ...userDto } = updatedUser;

            return {
                statusCode: OK_CODE,
                message: 'Update User successfully',
                data: userDto as unknown as UserDto
            };

        } catch (error) {
            console.error('Error in updateUser:', error);
            return {
                statusCode: Interval_Server_Network_Exeception_Code,
                message: 'Internal server error during update'
            };
        }
    }
   
    async deleteUser(userID: string): Promise<ResponseDto<UserDto>> {
    try {
        // Thực hiện lệnh xóa trực tiếp. 
        // Prisma sẽ tự động kiểm tra tồn tại và trả về data của user vừa bị xóa.
        const deletedUser = await this.prismaService.user.delete({
            where: { userID }
        });

        // Bóc tách hashedPassword ra trước khi trả về cho an toàn
        const { hashedPassword: _, ...userDto } = deletedUser;

        return {
            statusCode: OK_CODE,
            message: 'Delete user successfully',
            data: userDto as unknown as UserDto
        };

    } catch (error: any) {
        // Lỗi P2025 của Prisma: Bản ghi cần xóa không tồn tại (Thay thế cho getUserByUserID)
        if (error.code === 'P2025') {
            return {
                statusCode: NOTFOUND_CODE,
                message: 'User not found'
            };
        }

        // Lỗi P2003 của Prisma: Vi phạm khóa ngoại (Đang có bảng lương, chấm công...)
        if (error.code === 'P2003') {
            return {
                statusCode: CONFLIG_CODE, // 409 Conflict hoặc 400 Bad Request
                message: 'Cannot delete this user because they have related data (timesheets, payrolls, etc.)'
            };
        }

        // Bắt các lỗi server khác
        console.error('Error deleting user:', error);
        return {
            statusCode: Interval_Server_Network_Exeception_Code,
            message: 'Internal server error during deletion'
        };
    }
}

    async checkIsManager(userId: string): Promise<AnotherError> {
        const { statusCode, message, data }: ResponseDto<UserDto> = await this.getUserByUserID(userId);
        if (statusCode !== OK_CODE)
            return {
                statusCode,
                message: 'user id is not found'
            }

        const roleFetch: ResponseDto<RoleDto> = await this.roleService.findOne(data?.roleId || '');
        if (roleFetch.statusCode !== OK_CODE)
            return {
                statusCode, message
            }


        if (roleFetch.data?.nameRole.toLocaleLowerCase() === 'manager') {
            return {
                statusCode: BADREQUEST_CODE,
                message: "This user is manager at other department"
            }
        }
        return {
            statusCode: OK_CODE,
            message: "",
            data: true
        }
    }


    async checkAuthIsAdmin(currentUser): Promise<ResponseDto<DefaultResponse>> {
        console.log(currentUser)
        if (currentUser.roleId === undefined)
            return {
                statusCode: BADREQUEST_CODE,
                message: 'roleID is null'
            }
        const { statusCode, message, data } = await this.roleService.isAdmin(currentUser.roleId);

        return {
            statusCode,
            message
        }
    }

    async checkAuthIsMyManager(currentUser, input, type: string): Promise<AnotherError> {
        const { userID, departmentID } = currentUser;
        if (userID === undefined || departmentID === undefined)
            return {
                statusCode: BADREQUEST_CODE,
                message: "userID or departmentID is undefined"
            }

        const checkIsManager = await this.checkIsManager(userID);
        if (checkIsManager.statusCode !== OK_CODE)
            return {
                statusCode: checkIsManager.statusCode,
                message: checkIsManager.message
            }

        let user
        if (type === 'userID') {
            user = await this.getUserByUserID(input)
            if (user.statusCode !== OK_CODE)
                return {
                    message: user.message,
                    statusCode: user.statusCode
                }
        }
        else if (type === 'email') {
            user = await this.getUserByEmail(input)
            if (user.statusCode !== OK_CODE)
                return {
                    message: user.message,
                    statusCode: user.statusCode
                }
        }

        else if (type === 'username') {
            user = await this.getUserByUserName(input)
            if (user.statusCode !== OK_CODE)
                return {
                    message: user.message,
                    statusCode: user.statusCode
                }
        }
        if (user.data !== undefined) {
            if (user.data.departmentID === departmentID)
                return {
                    statusCode: OK_CODE,
                    message: "This is my manager"
                }
            else
                return {
                    statusCode: BADREQUEST_CODE,
                    message: "This is not my manager"
                }
        }

        return {
            statusCode: BADREQUEST_CODE,
            message: "Another error"
        }
    }



    async checkAuthIsManagerOfDepartment(currentUser, input): Promise<AnotherError> {

        const { userID, departmentID } = currentUser;

        if (userID === undefined || departmentID === undefined)
            return {
                statusCode: BADREQUEST_CODE,
                message: "userID or departmentID is undefined"
            }

        const checkIsManager = await this.checkIsManager(userID);
        if (checkIsManager.statusCode !== OK_CODE)
            return {
                statusCode: checkIsManager.statusCode,
                message: checkIsManager.message
            }

        if (departmentID === input)
            return {
                statusCode: OK_CODE,
                message: "This is my manager of department"
            }
        else {
            return {
                statusCode: BADREQUEST_CODE,
                message: "This is not manager of department"
            }
        }
    }
    async IsMe(currentUser, input, type: string): Promise<AnotherError> {
        const { userID, username, email } = currentUser
        if (type === 'userID') {
            if (userID == undefined)
                return {
                    statusCode: BADREQUEST_CODE,
                    message: "userID is undefined"
                }

            if (userID == input)
                return {
                    statusCode: OK_CODE,
                    message: "It's me!!!"
                }
            else
                return {
                    statusCode: BADREQUEST_CODE,
                    message: "It's not me"
                }
        }
        else if (type === 'email') {
            if (email == undefined)
                return {
                    statusCode: BADREQUEST_CODE,
                    message: "email is undefined"
                }

            if (email == input)
                return {
                    statusCode: OK_CODE,
                    message: "It's me!!!"
                }
            else
                return {
                    statusCode: BADREQUEST_CODE,
                    message: "It's not me"
                }
        }
        else if (type === 'username') {
            if (username == undefined)
                return {
                    statusCode: BADREQUEST_CODE,
                    message: "username is undefined"
                }

            if (username == input)
                return {
                    statusCode: OK_CODE,
                    message: "It's me!!!"
                }
            else
                return {
                    statusCode: BADREQUEST_CODE,
                    message: "It's not me"
                }
        }
        return {
            statusCode: BADREQUEST_CODE,
            message: 'Another Error'
        }
    }



    async getAllUserOfDepartment(departmentID: string): Promise<ResponseDto<UserDto[]>> {
        if (departmentID === undefined) {
            return {
                statusCode: BADREQUEST_CODE,
                message: "DepartmentID cannot undefined"
            }
        }

        const department = await this.departmentService.getDepartmentById(departmentID);
        if (department.statusCode !== OK_CODE)
            return {
                statusCode: department.statusCode,
                message: department.message
            }

        const users: UserDto[] = await this.prismaService.user.findMany({
            where:
            {
                departmentID
            }
        })

        return {
            statusCode: OK_CODE,
            message: "Get user by department is ok ",
            data: users
        }
    }


    async getManagerIdOfUserID(userID: string): Promise<DefaultResponse> {

        const userGet: ResponseDto<UserDto> = await this.getUserByUserID(userID)

        if (userGet.statusCode !== OK_CODE || userGet.data === undefined)
            return {
                statusCode: userGet.statusCode,
                message: userGet.message
            }

        if (userGet.data.departmentName == undefined)
            return {
                statusCode: NOTFOUND_CODE,
                message: 'user is not in any department'
            }
        const departmentGet: ResponseDto<DepartmentDto> = await this.departmentService.getDepartmentByDeparmentName(userGet.data.departmentName);

        if (departmentGet.statusCode !== OK_CODE || departmentGet.data === undefined)
            return {
                statusCode: departmentGet.statusCode,
                message: departmentGet.message
            }

        if (departmentGet.data.managerID === undefined)
            return {
                statusCode: NOTFOUND_CODE,
                message: 'This department dont have manager'
            }

        return {
            statusCode: OK_CODE,
            message: 'get departmentID successfull',
            data: {
                'managerID': departmentGet.data.managerID
            }
        }
    }
}



