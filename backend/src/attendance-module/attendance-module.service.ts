import { BadGatewayException, HttpException, Injectable, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import CheckInDto from './dto/checkIn.dto';
import ResponseDto, { AnotherError, DefaultResponse } from 'src/common/response.dto';
import { UserService } from 'src/user/user.service';
import UserDto from 'src/user/dto/user.dto';
import { BADREQUEST_CODE, CREATED_RESPONE, Interval_Server_Network_Exeception_Code, NOTFOUND_CODE, OK_CODE, PENDING } from 'src/common/code';
import { MonthlyTimeSheetService } from 'src/monthly-time-sheet/monthly-time-sheet.service';
import { NOTFOUND } from 'node:dns';
import { time, timeStamp } from 'node:console';
import { waitForDebugger } from 'node:inspector';
import { MonthlyTimesheeetResponeDto } from 'src/monthly-time-sheet/dto/monthly-tinesheet-respone.dto';
import { min } from 'class-validator';
import GetAttendenceDto from './dto/getAttendence.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class AttendanceModuleService {

    constructor(private readonly prismaService: PrismaService,
        private readonly userService: UserService,
        private readonly monthlyTimesheetService: MonthlyTimeSheetService
    ) {

    }





    async getAllAttedencOfMonth(userID: string, getAttedencOfMonth: GetAttendenceDto, tx?: Prisma.TransactionClient): Promise<DefaultResponse> {
        const { month, year } = getAttedencOfMonth

        const db: Prisma.TransactionClient = tx ?? this.prismaService
        const { statusCode, message, data } = await this.monthlyTimesheetService.getMonthlyTimeSheet(userID, getAttedencOfMonth, db);
        if (statusCode !== OK_CODE || data === undefined)
            return {
                statusCode, message: 'Dont have any attendence'
            }

        const allAttedencOfMonth = await this.prismaService.timesheetEntry.findMany({
            where: {
                monthlyTimesheetID: data.monthlyTimesheetID
            }
        })


        return {
            statusCode: OK_CODE,
            message: 'Get all attendence of month successfull !!!!',
            data: allAttedencOfMonth
        }
    }


    async checkIn(
        userID: string,
        IPAddress: string | undefined,
        tx?: Prisma.TransactionClient
    ): Promise<ResponseDto<any>> {

        if (!IPAddress) {
            return {
                statusCode: BADREQUEST_CODE,
                message: 'IP address is missing'
            };
        }

        try {
            const executeLogic = async (dbCtx: Prisma.TransactionClient): Promise<ResponseDto<any>> => {

                const userGet = await this.userService.getUserByUserID(userID, dbCtx);
                if (userGet.statusCode !== OK_CODE || !userGet.data) {
                    return {
                        statusCode: userGet.statusCode,
                        message: userGet.message || 'User not found'
                    };
                }

                const now = new Date();

                const currentDateString = [
                    now.getFullYear(),
                    String(now.getMonth() + 1).padStart(2, '0'),
                    String(now.getDate()).padStart(2, '0')
                ].join('-');


                let timesheet = await this.monthlyTimesheetService.getMonthlyTimeSheet(
                    userID,
                    { month: now.getMonth() + 1, year: now.getFullYear() },
                    dbCtx
                );

                if (timesheet.statusCode === NOTFOUND_CODE) {
                    timesheet = await this.monthlyTimesheetService.createMonthlyTimeSheet(
                        userID,
                        { month: now.getMonth() + 1, year: now.getFullYear() },
                        dbCtx
                    );
                }

                if (timesheet.statusCode !== CREATED_RESPONE || timesheet.statusCode !== OK_CODE || !timesheet.data) {
                    throw new BadGatewayException(timesheet.message || 'Failed to get/create monthly timesheet');
                }

                const monthlyTimesheetID = timesheet.data.monthlyTimesheetID;

                const lastEntry = await dbCtx.timesheetEntry.findFirst({
                    where: {
                        date: currentDateString,
                        monthlyTimesheetID: monthlyTimesheetID
                    },
                    orderBy: { checkIn: 'desc' }
                });

                if (!lastEntry || lastEntry.checkOut !== null) {
                    await dbCtx.timesheetEntry.create({
                        data: {
                            monthlyTimesheetID: monthlyTimesheetID,
                            date: currentDateString,
                            IPAddress,
                            checkIn: now,
                            status: PENDING
                        }
                    });

                    return {
                        statusCode: CREATED_RESPONE,
                        message: 'Check-in successful!'
                    };
                } else {
                    return {
                        statusCode: BADREQUEST_CODE,
                        message: 'You have already checked in. Please check out first before checking in again.'
                    };
                }
            };

            if (tx) {
                return await executeLogic(tx);
            }

            return await this.prismaService.$transaction(executeLogic);
        } catch (error) {

            console.error('Error in checkIn:', error);
            return {
                statusCode: Interval_Server_Network_Exeception_Code,
                message: 'Internal server error occurred during check-in'
            };
        }
    }
    async checkOut(
        userID: string, 
        IPAddress: string | undefined, 
        tx?: Prisma.TransactionClient
    ): Promise<ResponseDto<any>> {
        
        // 1. FAIL-FAST
        if (!IPAddress) {
            return {
                statusCode: BADREQUEST_CODE,
                message: 'IP address is missing'
            };
        }

        try {
            const executeLogic = async (dbCtx: Prisma.TransactionClient): Promise<ResponseDto<any>> => {
                
                // --- BƯỚC 1: KIỂM TRA USER ---
                const userGet = await this.userService.getUserByUserID(userID, dbCtx);
                if (userGet.statusCode !== OK_CODE || !userGet.data) {
                    return { statusCode: userGet.statusCode, message: userGet.message || 'User not found' };
                }

                const now = new Date();
                
                // Chuẩn hóa format ngày (YYYY-MM-DD)
                const currentDateString = [
                    now.getFullYear(),
                    String(now.getMonth() + 1).padStart(2, '0'),
                    String(now.getDate()).padStart(2, '0')
                ].join('-'); 

                // --- BƯỚC 2: LẤY BẢNG CÔNG THÁNG CỦA USER NÀY ---
                const timesheet = await this.monthlyTimesheetService.getMonthlyTimeSheet(
                    userID, 
                    { month: now.getMonth() + 1, year: now.getFullYear() }, 
                    dbCtx
                );

                // Nếu tháng này chưa có bảng công -> Chắc chắn chưa từng Check-in
                if (timesheet.statusCode !== OK_CODE || !timesheet.data) {
                    return { 
                        statusCode: BADREQUEST_CODE, 
                        message: 'You haven\'t checked in yet.' 
                    };
                }

                const monthlyTimesheetID = timesheet.data.monthlyTimesheetID;

                // --- BƯỚC 3: LẤY LƯỢT CHECK-IN MỚI NHẤT TRONG NGÀY ---
                // SỬA LỖI NGHIÊM TRỌNG: Đã thêm `monthlyTimesheetID` vào điều kiện where
                const lastEntry = await dbCtx.timesheetEntry.findFirst({
                    where: {
                        monthlyTimesheetID: monthlyTimesheetID,
                        date: currentDateString
                    },
                    orderBy: { checkIn: 'desc' } // Lấy bản ghi trễ nhất
                });

                // --- BƯỚC 4: KIỂM TRA CÁC ĐIỀU KIỆN ---
                // 1. Không có lượt chấm công nào, hoặc lượt gần nhất đã check-out rồi
                if (!lastEntry || lastEntry.checkOut !== null) {
                    return { 
                        statusCode: BADREQUEST_CODE, 
                        message: 'You haven\'t checked in or have already checked out.' 
                    };
                }

                // 2. Kiểm tra tính hợp lệ của IP
                if (lastEntry.IPAddress !== IPAddress) {
                    return {
                        statusCode: BADREQUEST_CODE,
                        message: 'Warning: IP address does not match the check-in IP address.'
                    };
                }

                // --- BƯỚC 5: CẬP NHẬT THỜI GIAN CHECK-OUT ---
                await dbCtx.timesheetEntry.update({
                    where: {
                        timesheetEntryID: lastEntry.timesheetEntryID
                    },
                    data: {
                        checkOut: now
                    }
                });

                return {
                    // Trả về 200 OK thay vì 201 CREATED (Vì hành động này là UPDATE chứ không tạo mới dòng nào cả)
                    statusCode: OK_CODE, 
                    message: 'Check-out successful!'
                };
            };

            // THỰC THI TRANSACTION
            if (tx) {
                return await executeLogic(tx); 
            }

            return await this.prismaService.$transaction(executeLogic); 

        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }
            
            console.error('Error in checkOut:', error);
            return {
                statusCode: Interval_Server_Network_Exeception_Code, 
                message: 'Internal server error occurred during check-out'
            };
        }
    }


    async GetAllEmployeeDindNotCheckOutOfDay(today: string, tx?: Prisma.TransactionClient): Promise<DefaultResponse> {

        const db: Prisma.TransactionClient = tx ?? this.prismaService
        const allEmployeeDidntCheckOut = await db.timesheetEntry.findMany({
            where: {
                date: today,
                checkOut: null
            }
        })

        if (allEmployeeDidntCheckOut.length === 0)
            return {
                statusCode: NOTFOUND_CODE,
                message: 'Dont have any employee weren\'t check out '
            }

        return {
            statusCode: OK_CODE,
            message: 'Get all employee were not check out successfull!!',
            data: allEmployeeDidntCheckOut
        }

    }
}
