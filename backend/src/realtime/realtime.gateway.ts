import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class RealtimeGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly configService: ConfigService) {}

  handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        client.disconnect();
        return;
      }

      const secret =
        this.configService.get<string>('JWT_ACCESS_SECRET') ||
        'TIMESHEETSYSTEM_ACCESSSECRET';
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;

      if (!payload || typeof payload !== 'object' || !('userID' in payload)) {
        client.disconnect();
        return;
      }

      const userID = String(payload.userID);
      void client.join(`user_${userID}`);

      if (
        typeof payload.roleName === 'string' &&
        payload.roleName.toLowerCase() === 'admin'
      ) {
        void client.join('admin_room');
      }

      console.log(
        `Client connected and joined room user_${userID}: ${client.id}`,
      );
    } catch (error: unknown) {
      console.error(
        'WebSocket connection error:',
        error instanceof Error ? error.message : 'Unknown error',
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    console.log(`Client disconnected: ${client.id}`);
  }
}
