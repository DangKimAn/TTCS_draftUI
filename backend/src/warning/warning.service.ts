import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';
import { CreateWarningDto } from './dto/create-warning.dto';
import ResponseDto, { DefaultResponse } from 'src/common/response.dto';
import WarningDto from './dto/warning.dto';
import { CREATED_RESPONE, OK_CODE } from 'src/common/code';
import { AttendanceModuleService } from 'src/attendance-module/attendance-module.service';
import { Cron } from '@nestjs/schedule';

@Injectable()
export class WarningService {
  constructor (private readonly userService : UserService,
    private readonly prismaService : PrismaService,
    private readonly attendenceService : AttendanceModuleService
  ){}
  async sendWarning(createWarningDto : CreateWarningDto) : Promise<ResponseDto<WarningDto>> {

    const now = new Date()
    const {userID , content}=  createWarningDto

    const userGet = await this.userService.getUserByUserID(userID)

    if (userGet.statusCode !== OK_CODE || userGet.data === undefined)
      return{
        statusCode : userGet.statusCode,
        message : userGet.message
      }
    

    
    
    const warning:  WarningDto = await this.prismaService.warning.create({
      data :{
        userID ,
        content,
      }
    })

    return {
      statusCode : CREATED_RESPONE,
      message:'Created warning successfull !!!!',
      data : warning
    }

  }


  @Cron('0 30 14 * * *' ,{
  })
  async warningEmployeeMissedCheckOut() :Promise<ResponseDto<DefaultResponse>>{
    const now = new Date()
    console.log('cron' + now)
    const {statusCode,message,data} = await this.attendenceService.GetAllEmployeeDindNotCheckOutOfDay(now.toLocaleDateString())
    if (statusCode !== OK_CODE || data!== undefined){
      return {statusCode,message}
    }


    if (data.length === 0 )
      return { 
    statusCode : OK_CODE, 
    message:"Don't have any employee missed check out"
  }

    for (var i of data)
    {
      var sendWarning = await this.sendWarning({userID : data.userID , content : `Missed checked out in day ${now.toLocaleDateString()}`})
      if (sendWarning.statusCode !== CREATED_RESPONE)
        return{
      statusCode : sendWarning.statusCode,
    message: 'sendWarning not successfull because' + sendWarning.message}
    }

    return {
      statusCode : CREATED_RESPONE,
      message:'Send warning successfull!!!'
    }
    

  } 
}
