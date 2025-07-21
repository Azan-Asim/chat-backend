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

@WebSocketGateway({
  // transports: ['websocket'],
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly messageHandlers: MessageHandlersService,
    private readonly roomHandlers: RoomHandlersService,
  ) {}

  async handleConnection(socket: Socket) {
    let token = socket.handshake.auth?.token;

     if (!token) {
    const authHeader = socket.handshake.headers['authorization'];
    if (authHeader && authHeader.startsWith('Bearer ')) {
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
      (socket.data as any).user = decoded;
      socket.emit('welcome', {
        message: `Welcome user ${(socket.data as any).user.email}!`,
      });
      console.log('User authenticated:', {
        id: (socket.data as any).user.id,
        email: (socket.data as any).user.email,
      });
      
      this.messageHandlers.handle(this.server, socket);
      this.roomHandlers.handle(this.server, socket);

    } catch (err) {
      console.error('Authentication error:', err.message);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    console.log(`Socket disconnected: ${socket.id}`);
  }
}
