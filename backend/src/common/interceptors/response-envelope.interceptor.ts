import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import type { Response } from 'express';
import { map, Observable } from 'rxjs';

interface ResponseEnvelope<T> {
  statusCode: number;
  message: string;
  data?: T;
}

@Injectable()
export class ResponseEnvelopeInterceptor<T> implements NestInterceptor<
  T,
  ResponseEnvelope<T> | T
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ResponseEnvelope<T> | T> {
    const response = context.switchToHttp().getResponse<Response>();

    return next.handle().pipe(
      map((payload) => {
        if (payload === undefined || response.headersSent) {
          return payload;
        }

        if (this.isEnvelope(payload)) {
          return payload;
        }

        return {
          statusCode: response.statusCode,
          message: 'success',
          data: payload,
        };
      }),
    );
  }

  private isEnvelope(payload: unknown): payload is ResponseEnvelope<T> {
    return Boolean(
      payload &&
      typeof payload === 'object' &&
      'statusCode' in payload &&
      'message' in payload,
    );
  }
}
