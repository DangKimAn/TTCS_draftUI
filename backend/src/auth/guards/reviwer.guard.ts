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
import { Request } from 'express';
import { OK_CODE } from 'src/common/code';
import { RequestUser } from 'src/common/types';
import { PrismaService } from 'src/prisma/prisma.service';
import { UserService } from 'src/user/user.service';

interface ReviewRequest extends Request<{ monthlyTimesheetID?: string }> {
  user: RequestUser;
}

function isManagerData(value: unknown): value is { managerID: string } {
  return (
    typeof value === 'object' &&
    value !== null &&
    'managerID' in value &&
    typeof value.managerID === 'string'
  );
}

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

    const request = context.switchToHttp().getRequest<ReviewRequest>();

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
        if (managerGet.statusCode !== OK_CODE || !managerGet.data) {
          throw new BadRequestException(managerGet.message);
        }

        const managerData = managerGet.data;
        if (!isManagerData(managerData)) {
          throw new BadRequestException(managerGet.message);
        }

        if (managerData.managerID === currentUser.userID) return true;
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
