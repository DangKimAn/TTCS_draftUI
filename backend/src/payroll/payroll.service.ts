import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  MonthlyTimesheetStatus,
  TimesheetStatus,
  Prisma,
} from '@prisma/client';
import { DefaultResponse } from 'src/common/response.dto';
import { ExcelHelper } from 'src/common/excel.helper';
import {
  CONFLIG_CODE,
  CREATED_RESPONE,
  NOTFOUND_CODE,
  OK_CODE,
} from 'src/common/code';
import * as ExcelJS from 'exceljs';

const LARGE_EXPORT_WARNING_THRESHOLD = 5000;

const payrollExportInclude = Prisma.validator<Prisma.PayrollInclude>()({
  employee: {
    select: {
      userID: true,
      username: true,
      email: true,
      salaryCoefficient: true,
      departmentID: true,
      department: { select: { departmentID: true, departmentName: true } },
    },
  },
  monthlyTimesheet: {
    select: {
      monthlyTimesheetID: true,
      status: true,
      reviewedAt: true,
    },
  },
});

type PayrollExportRow = Prisma.PayrollGetPayload<{
  include: typeof payrollExportInclude;
}>;

type PayrollExportResult =
  | (DefaultResponse & { data: string; isCsv: true; warnings?: string[] })
  | (DefaultResponse & {
      data: PayrollExportRow[];
      isCsv: false;
      meta?: PayrollExportMeta;
    })
  | (DefaultResponse & { isCsv?: false });

export interface IPayrollExporter {
  export(payrolls: PayrollExportRow[]): string;
}

export interface PayrollExportMeta {
  count: number;
  warnings: string[];
  externalIntegration: 'not_configured';
}

export interface IExternalPayrollExporter {
  providerName: string;
  export(payrolls: PayrollExportRow[]): Promise<{
    sent: boolean;
    message: string;
  }>;
}

export class NotConfiguredExternalPayrollExporter implements IExternalPayrollExporter {
  providerName = 'not_configured';

  export(): Promise<{ sent: boolean; message: string }> {
    return Promise.resolve({
      sent: false,
      message:
        'External payroll integration is not configured. Current scope supports CSV, Excel and JSON export only.',
    });
  }
}

class CsvPayrollExporter implements IPayrollExporter {
  export(payrolls: PayrollExportRow[]): string {
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

    const rows = payrolls.map((p) => {
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
        .map((field) => this.escapeCsv(field))
        .join(',');
    });

    return [header, ...rows].join('\n');
  }

  private escapeCsv(value: string | number): string {
    return `"${String(value).replace(/"/g, '""')}"`;
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
      const periodError = this.validatePeriod(month, year);
      if (periodError) return periodError;

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
      const periodError = this.validatePeriod(month, year);
      if (periodError) return periodError;

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
  ): Promise<PayrollExportResult> {
    try {
      const periodError = this.validatePeriod(month, year);
      if (periodError) return periodError;

      const filter: Prisma.PayrollWhereInput = {};
      if (month) filter.month = month;
      if (year) filter.year = year;

      const payrolls = await this.prisma.payroll.findMany({
        where: filter,
        include: {
          ...payrollExportInclude,
        },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
      });

      const warnings = this.buildExportWarnings(payrolls);
      if (format.toLowerCase() === 'csv') {
        const exporter = new CsvPayrollExporter();
        const csvString = exporter.export(payrolls);

        return {
          statusCode: OK_CODE,
          message: payrolls.length
            ? 'Exported payroll successfully (CSV)'
            : 'No payroll data matched the selected period',
          data: csvString,
          isCsv: true,
          warnings,
        };
      }

      // Future: Add ExternalSystemPayrollExporter here
      // if (format.toLowerCase() === 'external') { ... }

      return {
        statusCode: OK_CODE,
        message: payrolls.length
          ? 'Exported payroll successfully (JSON)'
          : 'No payroll data matched the selected period',
        data: payrolls,
        isCsv: false,
        meta: {
          count: payrolls.length,
          warnings,
          externalIntegration: 'not_configured',
        },
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

  async exportPayrollExcel(
    month?: number,
    year?: number,
  ): Promise<ExcelJS.Workbook> {
    const periodError = this.validatePeriod(month, year);
    if (periodError) {
      throw new Error(periodError.message);
    }

    const filter: Prisma.PayrollWhereInput = {};
    if (month) filter.month = month;
    if (year) filter.year = year;

    const payrolls = await this.prisma.payroll.findMany({
      where: filter,
      include: {
        ...payrollExportInclude,
      },
      orderBy: [{ year: 'desc' }, { month: 'desc' }],
    });

    return ExcelHelper.createPayrollWorkbook(payrolls, 'Payroll');
  }

  private validatePeriod(
    month?: number,
    year?: number,
  ): DefaultResponse | null {
    if (
      month !== undefined &&
      (!Number.isInteger(month) || month < 1 || month > 12)
    ) {
      return {
        statusCode: 400,
        message: 'Payroll month must be between 1 and 12',
      };
    }

    if (year !== undefined && (!Number.isInteger(year) || year < 2000)) {
      return { statusCode: 400, message: 'Payroll year must be 2000 or later' };
    }

    return null;
  }

  private buildExportWarnings(payrolls: PayrollExportRow[]): string[] {
    const warnings: string[] = [];

    if (payrolls.length > LARGE_EXPORT_WARNING_THRESHOLD) {
      warnings.push(
        `Export contains ${payrolls.length} rows. Consider splitting by month or department, or moving export to a background job before production scale.`,
      );
    }

    const missingSalaryCount = payrolls.filter((payroll) => {
      const salaryCoefficient = payroll.employee?.salaryCoefficient;
      return !salaryCoefficient || salaryCoefficient <= 0;
    }).length;

    if (missingSalaryCount > 0) {
      warnings.push(
        `${missingSalaryCount} payroll rows have missing or zero salaryCoefficient on the employee record.`,
      );
    }

    return warnings;
  }
}
