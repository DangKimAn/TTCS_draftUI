import * as ExcelJS from 'exceljs';
import { Response } from 'express';

export class ExcelHelper {
  static async sendExcel(
    res: Response,
    workbook: ExcelJS.Workbook,
    filename: string,
  ) {
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}.xlsx"`,
    );

    await workbook.xlsx.write(res);
    res.end();
  }

  static createTimesheetWorkbook(data: any[], title: string): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Timesheet');

    worksheet.columns = [
      { header: 'Date', key: 'date', width: 15 },
      { header: 'Check In', key: 'checkIn', width: 20 },
      { header: 'Check Out', key: 'checkOut', width: 20 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Device Info', key: 'deviceInfo', width: 30 },
      { header: 'Notes', key: 'notes', width: 20 },
    ];

    // Style header
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };

    data.forEach((entry) => {
      worksheet.addRow({
        date: entry.date,
        checkIn: entry.checkIn ? new Date(entry.checkIn).toLocaleString() : '',
        checkOut: entry.checkOut ? new Date(entry.checkOut).toLocaleString() : '',
        status: entry.status,
        deviceInfo: entry.deviceInfo || '',
        notes: entry.notes || '',
      });
    });

    return workbook;
  }

  static createPayrollWorkbook(data: any[], title: string): ExcelJS.Workbook {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Payroll');

    worksheet.columns = [
      { header: 'Employee', key: 'employee', width: 25 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Month/Year', key: 'monthYear', width: 15 },
      { header: 'Total Hours', key: 'totalHours', width: 15 },
      { header: 'Extra Hours', key: 'totalExtraHours', width: 15 },
      { header: 'Total Salary', key: 'totalSalary', width: 20 },
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFCCEEFF' },
    };

    data.forEach((p) => {
      worksheet.addRow({
        employee: p.employee?.username || '',
        email: p.employee?.email || '',
        department: p.employee?.department?.departmentName || '',
        monthYear: `${p.month}/${p.year}`,
        totalHours: p.totalHours.toFixed(2),
        totalExtraHours: p.totalExtraHours.toFixed(2),
        totalSalary: p.totalSalaryByHours.toFixed(2),
      });
    });

    return workbook;
  }
}
