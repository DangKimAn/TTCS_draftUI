import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OK_CODE } from 'src/common/code';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';

@Injectable()
export default class ReviewAuthGuards implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prismaService: PrismaService,
    private readonly userService: UserService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const allowedPermission = this.reflector.get<string[]>(
      'permission',
      context.getHandler(),
    );

    if (!allowedPermission) return true;

    const request = context.switchToHttp().getRequest();

    const currentUser = request.user;

    const { monthlyTimesheetID } = request.params;

    if (monthlyTimesheetID === undefined)
      throw new UnauthorizedException(
        'The monthlyTimesheetID cannot undefined',
      );

    for (const permission of allowedPermission) {
      if (permission === 'manager') {
        const monthlyTimesheet =
          await this.prismaService.monthlyTimesheet.findFirst({
            where: {
              monthlyTimesheetID,
            },
          });

        if (monthlyTimesheet === null)
          throw new NotFoundException('monthlyTimesheetID is not found');

        if (monthlyTimesheet.isSubmitted === false)
          throw new BadRequestException(
            'This monthly timesheet was not submitted',
          );

        const managerGet = await this.userService.getManagerIdOfUserID(
          monthlyTimesheet.userID,
        );
        if (
          managerGet.statusCode !== OK_CODE ||
          managerGet.data === undefined ||
          managerGet.data.managerID === undefined
        )
          throw new BadRequestException(managerGet.message);

        if (managerGet.data.managerID === currentUser.userID) return true;
      } else if (permission === 'me') {
        const monthlyTimesheet =
          await this.prismaService.monthlyTimesheet.findFirst({
            where: {
              monthlyTimesheetID,
            },
          });

        if (monthlyTimesheet === null)
          throw new NotFoundException('monthlyTimesheetID is not found');

        if (currentUser.userID === monthlyTimesheet.userID) return true;
      }
    }

    throw new ForbiddenException(
      "You don't have permission to access this user's data!",
    );
  }
}
