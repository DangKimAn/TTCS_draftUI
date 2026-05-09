import UserDto from "src/user/dto/user.dto"

export default class AuthDto {
    accessToken: string 
    refreshToken: string 

    user : UserDto | undefined
}