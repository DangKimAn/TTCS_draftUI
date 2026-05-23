import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

import { Prisma } from '@prisma/client';

@Injectable()
export class SystemLogService {
  constructor(private readonly prisma: PrismaService) {}

  async getAllLogs(
    limit: number = 200,
    skip: number = 0,
    startDate?: string,
    endDate?: string,
  ) {
    const where: Prisma.SystemLogWhereInput = {};
    if (startDate || endDate) {
      const createdAtFilter: Prisma.DateTimeFilter = {};
      if (startDate) {
        createdAtFilter.gte = new Date(startDate);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        createdAtFilter.lte = end;
      }
      where.createdAt = createdAtFilter;
    }

    const logs = await this.prisma.systemLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: skip,
      include: {
        user: {
          select: {
            username: true,
            email: true,
            linkAvatar: true,
          },
        },
      },
    });

    const total = await this.prisma.systemLog.count({ where });

    return {
      statusCode: 200,
      message: 'Lấy nhật ký hệ thống thành công',
      data: {
        logs,
        total,
        limit,
        skip,
      },
    };
  }

  async toggleAnomaly(logID: string) {
    const log = await this.prisma.systemLog.findUnique({ where: { logID } });
    if (!log) {
      return { statusCode: 404, message: 'Log không tồn tại' };
    }

    const updatedLog = await this.prisma.systemLog.update({
      where: { logID },
      data: { isAnomalous: !log.isAnomalous },
    });

    return {
      statusCode: 200,
      message: 'Đã cập nhật trạng thái log',
      data: updatedLog,
    };
  }
}
