import { IsBoolean, IsDataURI, IsDate, IsOptional, IsString, IsUUID } from "class-validator";

export default class NotificationDto {


    @IsString()
    @IsUUID()
    notificationID : string
    @IsString()
    @IsUUID()
    senderID : string 

    @IsString()
    @IsUUID()
    receiverID : string

    @IsString()
    content: string 

    @IsDate()
    createdAt : Date

    @IsBoolean()
    isRead: boolean

    @IsOptional()
    @IsString()
    relatedType? : string | null

}