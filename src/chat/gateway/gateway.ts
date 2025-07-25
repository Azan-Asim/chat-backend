import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { MessageHandlersService } from '../handlers/message-handlers.service';
import { RoomHandlersService } from '../handlers/room-handlers.service';
import { CallHandlersService } from '../handlers/call-handler.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly onlineUsers = new Map<string, Set<string>>(); // userId -> socketIds
  private readonly socketUserMap = new Map<string, string>();    // socketId -> userId

  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messageHandlers: MessageHandlersService,
    private readonly roomHandlers: RoomHandlersService,
    private readonly callHandlers: CallHandlersService,
  ) { }

  async handleConnection(socket: Socket) {
    let token = socket.handshake.auth?.token;

    if (!token) {
      const authHeader = socket.handshake.headers['authorization'];
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.slice(7);
      }
    }

    if (!token) {
      console.error('Authentication error: No token provided');
      socket.disconnect();
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = (decoded as any).id;

      socket.data.user = decoded;

      console.log('✅ User connected:', { userId, socketId: socket.id });

      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)?.add(socket.id);
      this.socketUserMap.set(socket.id, userId);

      socket.emit('welcome', {
        message: `Welcome user ${(decoded as any).email}!`,
      });

      this.messageHandlers.handle(this.server, socket);
      this.roomHandlers.handle(this.server, socket);
      this.callHandlers.handle(this.server, socket, this.onlineUsers, this.socketUserMap);

    } catch (err: any) {
      console.error('❌ Auth error:', err.message);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const userId = this.socketUserMap.get(socket.id);
    if (userId) {
      const userSockets = this.onlineUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          this.onlineUsers.delete(userId);
        }
      }
      this.socketUserMap.delete(socket.id);
      console.log(`❌ Disconnected: ${userId} (${socket.id})`);
    } else {
      console.log(`❌ Disconnected unknown socket: ${socket.id}`);
    }
  }
}
