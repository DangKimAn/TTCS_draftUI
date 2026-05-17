import FullUserDto from 'src/user/dto/full-user.dto';

export type AuthUserDto = Omit<
  FullUserDto,
  'hashedPassword' | 'refreshToken' | 'acessToken'
>;

export default class AuthDto {
  accessToken: string;
  refreshToken: string;

  user: AuthUserDto | undefined;
}
