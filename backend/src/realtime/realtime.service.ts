import { Injectable } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';

@Injectable()
export class RealtimeService {
  constructor(private readonly realtimeGateway: RealtimeGateway) {}

  emitToUser(userID: string, event: string, payload: any) {
    this.realtimeGateway.server.to(`user_${userID}`).emit(event, payload);
  }
}
