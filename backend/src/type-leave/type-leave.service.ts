import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateTypeLeaveDto } from './dto/create-type-leave.dto';
import { UpdateTypeLeaveDto } from './dto/update-type-leave.dto';
import { DefaultResponse } from 'src/common/response.dto';
import {
  CONFLIG_CODE,
  CREATED_RESPONE,
  Interval_Server_Network_Exeception_Code,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';

@Injectable()
export class TypeLeaveService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    if (process.env.ENABLE_TYPE_LEAVE_LEGACY_SEED !== 'true') {
      return;
    }

    // Seed data mặc định: ['Nghỉ phép năm' (1), 'Nghỉ không lương' (0), 'Nghỉ ốm' (1), 'Nghỉ cưới' (1)]
    try {
      const count = await this.prisma.typeLeave.count();
      if (count === 0) {
        console.log('Seeding default TypeLeave data...');
        await this.prisma.typeLeave.createMany({
          data: [
            { code: 'AL', nameTypeLeave: 'Nghỉ phép năm', hasSalary: 1 },
            { code: 'UP', nameTypeLeave: 'Nghỉ không lương', hasSalary: 0 },
            { code: 'SL', nameTypeLeave: 'Nghỉ ốm', hasSalary: 1 },
            { code: 'ML', nameTypeLeave: 'Nghỉ cưới', hasSalary: 1 },
          ],
        });
        console.log('Seeding default TypeLeave data completed.');
      }
    } catch (error: any) {
      console.error('Error seeding TypeLeave data:', error);
    }
  }

  async getAllTypeLeaves(): Promise<DefaultResponse> {
    try {
      const typeLeaves = await this.prisma.typeLeave.findMany();
      return {
        statusCode: OK_CODE,
        message: 'Lấy danh sách loại nghỉ phép thành công',
        data: typeLeaves,
      };
    } catch (error: any) {
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Lỗi server',
      };
    }
  }

  async getTypeLeave(typeLeaveID: string): Promise<DefaultResponse> {
    try {
      const typeLeave = await this.prisma.typeLeave.findUnique({
        where: { typeLeaveID },
      });

      if (!typeLeave) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Không tìm thấy loại nghỉ phép',
        };
      }

      return {
        statusCode: OK_CODE,
        message: 'Lấy chi tiết loại nghỉ phép thành công',
        data: typeLeave,
      };
    } catch (error: any) {
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Lỗi server',
      };
    }
  }

  async createTypeLeave(
    createDto: CreateTypeLeaveDto,
  ): Promise<DefaultResponse> {
    try {
      const existingCode = await this.prisma.typeLeave.findUnique({
        where: { code: createDto.code },
      });
      if (existingCode) {
        return {
          statusCode: CONFLIG_CODE,
          message: 'Mã loại nghỉ đã tồn tại',
        };
      }

      const newTypeLeave = await this.prisma.typeLeave.create({
        data: createDto,
      });

      return {
        statusCode: CREATED_RESPONE,
        message: 'Tạo loại nghỉ phép thành công',
        data: newTypeLeave,
      };
    } catch (error: any) {
      console.error('Error creating type leave:', error);
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Lỗi server',
      };
    }
  }

  async updateTypeLeave(
    typeLeaveID: string,
    updateDto: UpdateTypeLeaveDto,
  ): Promise<DefaultResponse> {
    try {
      const typeLeave = await this.prisma.typeLeave.findUnique({
        where: { typeLeaveID },
      });

      if (!typeLeave) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Không tìm thấy loại nghỉ phép',
        };
      }

      const updatedTypeLeave = await this.prisma.typeLeave.update({
        where: { typeLeaveID },
        data: updateDto,
      });

      return {
        statusCode: OK_CODE,
        message: 'Cập nhật loại nghỉ phép thành công',
        data: updatedTypeLeave,
      };
    } catch (error: any) {
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Lỗi server',
      };
    }
  }

  async deleteTypeLeave(typeLeaveID: string): Promise<DefaultResponse> {
    try {
      const typeLeave = await this.prisma.typeLeave.findUnique({
        where: { typeLeaveID },
        include: { applications: true },
      });

      if (!typeLeave) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Không tìm thấy loại nghỉ phép',
        };
      }

      if (typeLeave.applications.length > 0) {
        return {
          statusCode: CONFLIG_CODE,
          message: 'Không thể xóa do đã có đơn xin nghỉ phép sử dụng loại này',
        };
      }

      await this.prisma.typeLeave.delete({
        where: { typeLeaveID },
      });

      return {
        statusCode: OK_CODE,
        message: 'Xóa loại nghỉ phép thành công',
      };
    } catch (error: any) {
      return {
        statusCode: Interval_Server_Network_Exeception_Code,
        message: 'Lỗi server',
      };
    }
  }
}
