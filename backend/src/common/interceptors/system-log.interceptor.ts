/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
  HttpException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from '../../realtime/realtime.service';

@Injectable()
export class SystemLogInterceptor implements NestInterceptor {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService?: RealtimeService,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest();

    // Bỏ qua các request GET và OPTIONS để tránh làm đầy database bằng các log rác
    // chỉ lấy dữ liệu hiển thị cho Frontend.
    if (request.method === 'GET' || request.method === 'OPTIONS') {
      return next.handle();
    }

    const { ip, method, originalUrl, user, body, params } = request;
    const response = ctx.getResponse();

    // Loại bỏ các thông tin nhạy cảm trước khi lưu log
    const safeBody = { ...body };
    if (safeBody.password) safeBody.password = '***';
    if (safeBody.newPassword) safeBody.newPassword = '***';
    if (safeBody.oldPassword) safeBody.oldPassword = '***';

    const logToDatabase = async (
      statusCode: number,
      responseMessage: string,
      resData?: any,
    ) => {
      try {
        // Ghi lại chính xác Route thay vì chỉ lấy Entity (vd: /api/auth/login)
        const entity = originalUrl.split('?')[0];

        // Cố gắng tìm ID của đối tượng bị tác động từ Params
        const entityID =
          params.id ||
          params.userID ||
          params.departmentID ||
          params.roleID ||
          null;

        // Trích xuất userID (nếu request.user trống do chưa đăng nhập, thử lấy từ response data)
        const logUserID =
          user?.userID ||
          resData?.data?.user?.userID ||
          resData?.user?.userID ||
          resData?.data?.userID ||
          resData?.userID ||
          null;

        const newLog = await this.prisma.systemLog.create({
          data: {
            action: method, // POST, PUT, PATCH, DELETE
            entity: entity,
            entityID: entityID,
            details: JSON.stringify({ path: originalUrl, body: safeBody }),
            ipAddress: ip || null,
            userID: logUserID,
            statusCode: statusCode,
            responseMessage: responseMessage,
          },
        });

        if (this.realtimeService) {
          this.realtimeService.emitToAdmin('new_system_log', newLog);
        }
      } catch (error) {
        console.error('Lỗi khi ghi log hệ thống:', error);
      }
    };

    return next.handle().pipe(
      tap({
        next: (resData) => {
          // Lấy statusCode từ object trả về (nếu có) hoặc từ HTTP Response
          const statusCode = resData?.statusCode || response.statusCode;
          const message = resData?.message || 'Success';
          logToDatabase(statusCode, message, resData).catch(console.error);
        },
        error: (err) => {
          // Lấy statusCode từ Exception (ví dụ: NotFoundException sẽ có mã 404)
          const statusCode =
            err instanceof HttpException ? err.getStatus() : 500;
          const message = err.message || 'Internal Server Error';
          logToDatabase(statusCode, message).catch(console.error);
        },
      }),
    );
  }
}
