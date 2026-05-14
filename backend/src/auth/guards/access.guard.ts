import { BadRequestException, CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { permission } from "process";
import { Observable } from "rxjs";
import { OK_CODE } from "src/common/code";
import { UserService } from "src/user/user.service";
@Injectable()
export class UserAccessGaurd implements CanActivate {
    constructor(private readonly userService: UserService,
        private reflector: Reflector
    ) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {

        const allowedPermission = this.reflector.get<string[]>('permission', context.getHandler());

        if (!allowedPermission)
            return true


        const request = context.switchToHttp().getRequest();
        const currentUser = request.user;

        const { userID, email, username ,departmentID } = request.params;
        

        // 2. Xác định input và type để tránh check thừa những giá trị undefined
        let input: string = '';
        let type: string = '';

        if (userID) {
            input = userID;
            type = 'userID';
        } else if (email) {
            input = email;
            type = 'email';
        } else if (username) {
            input = username;
            type = 'username';
        } 
        // 3. Thực hiện check quyền (Chỉ check 3 lần tối đa)

        for (const permission of allowedPermission) {
            if (permission === 'admin')
                if ((await this.userService.checkAuthIsAdmin(currentUser)).statusCode === OK_CODE) {
                    return true;
                }
            if (permission === 'manager')
                if ((await this.userService.IsMe(currentUser, input, type)).statusCode === OK_CODE) {
                    return true;
                }

            if (permission === 'me')
                if ((await this.userService.checkAuthIsMyManager(currentUser, input, type)).statusCode === OK_CODE) {
                    return true;
                }

            if (permission === 'managerOfDepartment')
                if((await this.userService.checkAuthIsManagerOfDepartment(currentUser , input)).statusCode === OK_CODE)
                    return true;
        }

        throw new ForbiddenException("You don't have permission to access this user's data!");
    }
}

