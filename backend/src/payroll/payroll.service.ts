import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { MonthlyTimesheetStatus, TimesheetStatus, Prisma } from '@prisma/client';
import { DefaultResponse } from 'src/common/response.dto';
import { ExcelHelper } from 'src/common/excel.helper';
import {
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';

export interface IPayrollExporter {
  export(payrolls: any[]): Promise<any>;
}

class CsvPayrollExporter implements IPayrollExporter {
  async export(payrolls: any[]): Promise<any> {
    const header = [
      'Payroll ID',
      'User Name',
      'Email',
      'Department',
      'Month',
      'Year',
      'Total Hours',
      'Total Extra Hours',
      'Total Salary',
    ].join(',');

    const rows = payrolls.map((p: any) => {
      return [
        p.payrollID,
        p.employee?.username || '',
        p.employee?.email || '',
        p.employee?.department?.departmentName || '',
        p.month,
        p.year,
        p.totalHours.toFixed(2),
        p.totalExtraHours.toFixed(2),
        p.totalSalaryByHours.toFixed(2),
      ]
        .map((field) => `"${field}"`)
        .join(',');
    });

    return [header, ...rows].join('\n');
  }
}

@Injectable()
export class PayrollService {
  private readonly logger = new Logger(PayrollService.name);

  constructor(private readonly prisma: PrismaService) {}

  async generatePayroll(monthlyTimesheetID: string): Promise<DefaultResponse> {
    try {
      const timesheet = await this.prisma.monthlyTimesheet.findUnique({
        where: { monthlyTimesheetID },
        include: {
          entries: true,
          employee: true,
        },
      });

      if (!timesheet) {
        return {
          statusCode: NOTFOUND_CODE,
          message: 'Monthly timesheet not found',
        };
      }

      if (timesheet.status !== MonthlyTimesheetStatus.APPROVED) {
        return {
          statusCode: CONFLIG_CODE,
          message: 'Can only generate payroll for approved timesheets',
        };
      }

      const existingPayroll = await this.prisma.payroll.findFirst({
        where: { monthlyTimesheetID },
      });

      if (existingPayroll) {
        return {
          statusCode: CONFLIG_CODE,
          message: 'Payroll for this timesheet already generated',
        };
      }

      let totalHours = 0;
      let totalExtraHours = 0;

      for (const entry of timesheet.entries) {
        if (entry.status === TimesheetStatus.APPROVED && entry.checkOut) {
          const checkIn = new Date(entry.checkIn);
          const checkOut = new Date(entry.checkOut);

          const hours =
            (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);

          if (hours > 8) {
            totalHours += 8;
            totalExtraHours += hours - 8;
          } else {
            totalHours += hours;
          }
        }
      }

      const salaryCoefficient = timesheet.employee.salaryCoefficient;

      if (!salaryCoefficient || salaryCoefficient <= 0) {
        this.logger.warn(
          `Cannot generate payroll for user ${timesheet.userID}: salaryCoefficient is missing or zero.`,
        );
        return {
          statusCode: 400,
          message: `Employee ${timesheet.employee.username} does not have a valid salary coefficient. Please update employee profile.`,
        };
      }

      // standard + 1.5x for OT
      const totalSalaryByHours =
        (totalHours + totalExtraHours * 1.5) * salaryCoefficient;

      const payroll = await this.prisma.payroll.create({
        data: {
          userID: timesheet.userID,
          month: timesheet.month,
          year: timesheet.year,
          monthlyTimesheetID,
          totalHours,
          totalExtraHours,
          totalSalaryByHours,
        },
      });

      return {
        statusCode: CREATED_RESPONE,
        message: 'Payroll generated successfully',
        data: payroll,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error generating payroll: ' + message);
      return { statusCode: 500, message: 'Internal server error' };
    }
  }

  async getMyPayroll(
    userID: string,
    month?: number,
    year?: number,
  ): Promise<DefaultResponse> {
    try {
      const filter: Prisma.PayrollWhereInput = { userID };
      if (month) filter.month = month;
      if (year) filter.year = year;

      const payrolls = await this.prisma.payroll.findMany({
        where: filter,
        include: {
          monthlyTimesheet: true,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      return {
        statusCode: OK_CODE,
        message: 'Get my payrolls successfully',
        data: payrolls,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error fetching user payroll: ' + message);
      return { statusCode: 500, message: 'Internal server error' };
    }
  }

  async getDepartmentPayroll(
    departmentID: string,
    month?: number,
    year?: number,
  ): Promise<DefaultResponse> {
    try {
      const departmentExists = await this.prisma.department.findUnique({
        where: { departmentID },
      });
      if (!departmentExists) {
        return { statusCode: NOTFOUND_CODE, message: 'Department not found' };
      }

      const filter: Prisma.PayrollWhereInput = {
        employee: { departmentID },
      };

      if (month) filter.month = month;
      if (year) filter.year = year;

      const payrolls = await this.prisma.payroll.findMany({
        where: filter,
        include: {
          employee: {
            select: { username: true, email: true, userID: true },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      return {
        statusCode: OK_CODE,
        message: 'Get department payrolls successfully',
        data: payrolls,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error fetching department payroll: ' + message);
      return { statusCode: 500, message: 'Internal server error' };
    }
  }

  async exportPayroll(
    month?: number,
    year?: number,
    format: string = 'json',
  ): Promise<any> {
    try {
      const filter: Prisma.PayrollWhereInput = {};
      if (month) filter.month = month;
      if (year) filter.year = year;

      const payrolls = await this.prisma.payroll.findMany({
        where: filter,
        include: {
          employee: {
            select: {
              username: true,
              email: true,
              department: { select: { departmentName: true } },
            },
          },
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      if (format.toLowerCase() === 'csv') {
        const exporter = new CsvPayrollExporter();
        const csvString = await exporter.export(payrolls);

        return {
          statusCode: OK_CODE,
          message: 'Exported payroll successfully (CSV)',
          data: csvString,
          isCsv: true,
        };
      }

      // Future: Add ExternalSystemPayrollExporter here
      // if (format.toLowerCase() === 'external') { ... }

      return {
        statusCode: OK_CODE,
        message: 'Exported payroll successfully (JSON)',
        data: payrolls,
        isCsv: false,
      };
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error('Error exporting payroll: ' + message);
      return {
        statusCode: 500,
        message: 'Internal server error',
      };
    }
  }

  async exportPayrollExcel(month?: number, year?: number): Promise<any> {
    const filter: Prisma.PayrollWhereInput = {};
    if (month) filter.month = month;
    if (year) filter.year = year;

    const payrolls = await this.prisma.payroll.findMany({
      where: filter,
      include: {
        employee: {
          select: {
            username: true,
            email: true,
            department: { select: { departmentName: true } },
          },
        },
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' },
      ],
    });

    return ExcelHelper.createPayrollWorkbook(payrolls, 'Payroll');
  }
}
