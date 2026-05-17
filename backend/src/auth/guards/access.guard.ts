import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { OK_CODE } from 'src/common/code';
import { RequestUser } from 'src/common/types';
import { UserService } from 'src/user/user.service';

type TargetType = 'userID' | 'email' | 'username' | 'departmentID' | '';
interface UserAccessRequest extends Request {
  user: RequestUser;
  params: {
    userID?: string;
    email?: string;
    username?: string;
    departmentID?: string;
  };
}

@Injectable()
export class UserAccessGaurd implements CanActivate {
  constructor(
    private readonly userService: UserService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedPermissions = this.reflector.getAllAndOverride<string[]>(
      'permission',
      [context.getHandler(), context.getClass()],
    );

    if (!allowedPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<UserAccessRequest>();
    const currentUser = request.user;
    const { userID, email, username, departmentID } = request.params;
    const { input, type } = this.resolveTarget({
      userID,
      email,
      username,
      departmentID,
    });

    for (const permission of allowedPermissions) {
      if (
        permission === 'admin' &&
        (await this.userService.checkAuthIsAdmin(currentUser)).statusCode ===
          OK_CODE
      ) {
        return true;
      }

      if (
        permission === 'me' &&
        (!input ||
          this.userService.IsMe(currentUser, input, type).statusCode ===
            OK_CODE)
      ) {
        return true;
      }

      if (permission === 'manager') {
        const managerCheck =
          input && type !== 'departmentID'
            ? await this.userService.checkAuthIsMyManager(
                currentUser,
                input,
                type,
              )
            : await this.userService.checkIsManager(currentUser?.userID);

        if (managerCheck.statusCode === OK_CODE) {
          return true;
        }
      }

      if (
        permission === 'managerOfDepartment' &&
        (
          await this.userService.checkAuthIsManagerOfDepartment(
            currentUser,
            input,
          )
        ).statusCode === OK_CODE
      ) {
        return true;
      }
    }

    throw new ForbiddenException(
      "You don't have permission to access this resource.",
    );
  }

  private resolveTarget(params: {
    userID?: string;
    email?: string;
    username?: string;
    departmentID?: string;
  }): { input: string; type: TargetType } {
    if (params.userID) {
      return { input: params.userID, type: 'userID' };
    }

    if (params.email) {
      return { input: params.email, type: 'email' };
    }

    if (params.username) {
      return { input: params.username, type: 'username' };
    }

    if (params.departmentID) {
      return { input: params.departmentID, type: 'departmentID' };
    }

    return { input: '', type: '' };
  }
}
