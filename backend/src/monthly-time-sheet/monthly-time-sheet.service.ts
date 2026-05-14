import { BadRequestException, ConflictException, HttpException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import CreateMonthlyTimeSheetDto from './dto/create-timesheet.dto';
import ResponseDto, { DefaultResponse } from 'src/common/response.dto';
import { BADREQUEST_CODE, CONFLIG_CODE, CREATED_RESPONE, NOTFOUND_CODE, OK_CODE, DRAFT, SUBMITTED, ACCEPTED, REJECTED, Interval_Server_Network_Exeception_Code } from 'src/common/code';
import { catchError, NotFoundError } from 'rxjs';
import GetMonthlyTimeSheetDto from './dto/get-timesheet.dto';
import { UserService } from 'src/user/user.service';
import { DepartmentService } from 'src/department/department.service';
import { runInThisContext } from 'vm';
import { MonthlyTimesheeetResponeDto } from './dto/monthly-tinesheet-respone.dto';
import { timeStamp } from 'console';
import SubmitMonthlyTimesheetDto from './dto/submit-monthly-timesheet.dto';
import { SubscriptionLoggable } from 'rxjs/internal/testing/SubscriptionLoggable';
import ReviewMonthlyTimesheetDto from './dto/review-monthly-timesheet.dto';
import { ApiCallbacks } from '@nestjs/swagger';
import { NotificationService } from 'src/notification/notification.service';
import { nowVN } from 'src/common/time';
import { reportUnhandledError } from 'rxjs/internal/util/reportUnhandledError';
import { Prisma } from '@prisma/client';
import { toUSVString } from 'util';

@Injectable()
export class MonthlyTimeSheetService {

    constructor(private readonly prismaService: PrismaService,
        private readonly userService: UserService,
        private readonly departmentService: DepartmentService,
        private readonly notificationService: NotificationService
    ) {

    }

    async getMonthlyTimeSheet(userID: string, getMonthlyTimeSheetDto: GetMonthlyTimeSheetDto, tx?: Prisma.TransactionClient): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> {
        const { month, year } = getMonthlyTimeSheetDto;

        const dCbt: Prisma.TransactionClient = tx ?? this.prismaService
        const timesheet = await dCbt.monthlyTimesheet.findFirst({
            where: {
                userID,
                month,
                year
            }
        })


        if (timesheet === null)
            return {
                statusCode: NOTFOUND_CODE,
                message: "This timesheet isnt exist"
            }
        return {
            statusCode: OK_CODE,
            message: "get timesheet successfull",
            data: {
                monthlyTimesheetID: timesheet.monthlyTimesheetID,
                canSubmit: timesheet.canSubmit,
                isSubmitted: timesheet.isSubmitted
            }
        }
    }
    async createMonthlyTimeSheet(userID: string, createMonthlyTimeSheetDto: CreateMonthlyTimeSheetDto, tx?: Prisma.TransactionClient): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> {
        const { month, year } = createMonthlyTimeSheetDto

        try {
            const executeLogic = async (dCbt: Prisma.TransactionClient): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> => {
                const { statusCode, message, data } = await this.getMonthlyTimeSheet(userID, { month: createMonthlyTimeSheetDto.month, year: createMonthlyTimeSheetDto.year }, dCbt);
                if (statusCode === OK_CODE)
                    throw new ConflictException(message)

                const user = await this.userService.getUserByUserID(userID, dCbt)
                if (user.statusCode !== OK_CODE || user.data === undefined || user.data.departmentID === null || user.data.departmentID === undefined)
                    throw new BadRequestException(user.message)

                const department = await this.departmentService.getDepartmentById(user.data.departmentID, dCbt);
                if (department.statusCode !== OK_CODE || department.data === undefined)
                    throw new BadRequestException(department.message)


                const reviewerID = department.data.managerID;
                if (reviewerID === undefined || reviewerID === null)
                    throw new BadRequestException("Please update managerID for this department before create monthly timesheet for this user !!!! ")

                if (statusCode === NOTFOUND_CODE) {
                    const timesheet = await dCbt.monthlyTimesheet.create({
                        data: {
                            userID,
                            month,
                            year,
                            status: DRAFT
                        }
                    })

                    return {
                        statusCode: CREATED_RESPONE,
                        message: 'Created successfull',
                        data: {
                            monthlyTimesheetID: timesheet.monthlyTimesheetID,
                            canSubmit: timesheet.canSubmit,
                            isSubmitted: timesheet.isSubmitted
                        }
                    }
                }

                throw new BadRequestException('Another Error!!!!')
            }

            if (tx)
                return await executeLogic(tx)
            return await this.prismaService.$transaction(async (tx) => executeLogic(tx))

        }
        catch (error) {

            console.error('Error in checkIn:', error);
            return {
                statusCode: Interval_Server_Network_Exeception_Code,
                message: 'Internal server error occurred during check-in'
            };
        }

    }



    async SubmitMonthlyTimesheet(monthlyTimesheetID: string, tx?: Prisma.TransactionClient): Promise<DefaultResponse> {

        try {


            const executeLogic = async (dCbt): Promise<DefaultResponse> => {
                const monthGet = await dCbt.monthlyTimesheet.findUnique({
                    where: {
                        monthlyTimesheetID
                    }
                })

                if (monthGet === undefined || monthGet?.userID === undefined) {
                    throw new NotFoundException('monthly timesheet is not found')
                }

                if (monthGet?.isSubmitted === true)
                    throw new BadRequestException('You were submit this timesheet')

                if (monthGet?.canSubmit === false)
                    throw new BadRequestException('This monthly timesheet cannot be  submitted ')

                await dCbt.monthlyTimesheet.update({
                    where: {
                        monthlyTimesheetID: monthGet?.monthlyTimesheetID
                    },
                    data: {
                        isSubmitted: true,
                        canSubmit: false,
                        status: SUBMITTED
                    }
                })

                const userGet = await this.userService.getUserByUserID(monthGet?.userID, dCbt);

                if (userGet?.statusCode !== OK_CODE || userGet.data === undefined || userGet.data?.departmentID === null || userGet.data?.departmentID === undefined)
                    throw new NotFoundException("please at departmentID to this employee")

                const department = await this.departmentService.getDepartmentById(userGet.data?.departmentID, dCbt);

                if (department?.statusCode != OK_CODE || department.data === undefined || department.data?.managerID === undefined || department.data?.managerID === null)
                    throw new NotFoundException("Please add managerID to this department ")
                const notificationGet = await this.notificationService.sendNotification(userGet.data?.userID || '',
                    {

                        receiverID: department.data.managerID,
                        content: `New  monthly timesheet need  be reviewed.
            from employee has userID = ${userGet.data?.userID}
            at ${nowVN}`
                    }, dCbt
                )
                if (notificationGet.statusCode !== OK_CODE)
                    throw new BadRequestException(notificationGet.message)

                return {
                    statusCode: OK_CODE,
                    message: 'submit monthly timesheet successfull'
                }

            }

            if (tx)
                return await executeLogic(tx)

            return await this.prismaService.$transaction(async (tx) => executeLogic(tx))
        } catch (error) {
            if (error instanceof HttpException) {
                throw error;
            }

            // Các lỗi không lường trước (Database rớt mạng, v.v.)
            console.error('Error submitting timesheet:', error);
            return {
                statusCode: Interval_Server_Network_Exeception_Code, // Hoặc HTTP 500
                message: 'Internal server error occurred'
            };
        }

    }

    async reviewMonthlyTimesheet(monthlyTimesheetID: string, reviewMonthlyTimesheetDto: ReviewMonthlyTimesheetDto, tx?: Prisma.TransactionClient): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> {
        const { accept, reasonReject } = reviewMonthlyTimesheetDto
        try {
            const executeLogic = async (dCbt: Prisma.TransactionClient): Promise<ResponseDto<MonthlyTimesheeetResponeDto>> => {
                const monthGet = await dCbt.monthlyTimesheet.findUnique({
                    where: {
                        monthlyTimesheetID
                    }
                })

                if (monthGet === undefined || monthGet?.userID === undefined || monthGet.userID === null)
                    throw new NotFoundException('Not found ')

                if (monthGet?.isSubmitted === false)
                    throw new BadRequestException('This monthly was not submitted ')

                const now = new Date()
                const monthlyTimesheetUpdate = await dCbt.monthlyTimesheet.update({
                    where: {
                        monthlyTimesheetID: monthGet?.monthlyTimesheetID
                    },
                    data: {
                        status: accept ? ACCEPTED : REJECTED,
                        reasonReject: accept ? null : reasonReject,
                        canSubmit: accept ? false : true,
                        isSubmitted: accept ? true : false,
                        reviewedAt: now
                    }
                })


                const userGet = await this.userService.getUserByUserID(monthGet?.userID, dCbt);

                if (userGet?.statusCode !== OK_CODE || userGet.data === undefined || userGet.data?.departmentID === null || userGet.data?.departmentID === undefined)
                    throw new NotFoundException("please at departmentID to this employee")

                const department = await this.departmentService.getDepartmentById(userGet.data?.departmentID, dCbt);

                if (department?.statusCode != OK_CODE || department.data === undefined || department.data?.managerID === undefined || department.data?.managerID === null)
                    throw new NotFoundException("Please add managerID to this department ")
                const notificationGet = await this.notificationService.sendNotification(department.data.managerID || '',
                    {
                        receiverID: userGet.data.userID,
                        content: `Your monthly timesheet has monthlytimsheetID= ${monthlyTimesheetUpdate.monthlyTimesheetID}and 
                        was created at ${monthlyTimesheetUpdate.createdAt} which was ${accept === false ? 'rejected' : 'accept'} by your manager at ${monthlyTimesheetUpdate.reviewedAt}
                        ${accept === false && `with reason was: ${monthlyTimesheetUpdate.reasonReject}`}`,

                    }, dCbt
                )
                if (notificationGet.statusCode !== OK_CODE)
                    throw new BadRequestException(notificationGet.message)

                return {
                    statusCode: OK_CODE,
                    message: 'submit monthly timesheet successfull'
                }

            }

            if (tx)
                return await executeLogic(tx)

            return await this.prismaService.$transaction(async (tx) => executeLogic(tx))

        } catch (error) {
            if (error instanceof HttpException)
                throw error
            // Các lỗi không lường trước (Database rớt mạng, v.v.)
            console.error('Error submitting timesheet:', error);
            return {
                statusCode: Interval_Server_Network_Exeception_Code, // Hoặc HTTP 500
                message: 'Internal server error occurred'
            };
        }
    }


}


