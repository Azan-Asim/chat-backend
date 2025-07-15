import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import * as jwt from 'jsonwebtoken';
import { WorkspaceMessageHandlersService } from '../handlers/workspace-message-handlers.service';
import { WorkspaceHandlersService } from '../handlers/workspace-handlers.service';
import { InjectModel } from '@nestjs/sequelize';
import { User } from 'src/user/user.model';

@WebSocketGateway({
  // transports: ['websocket'],
  namespace: '/workspace',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
})
export class WorkspaceChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(
    private readonly workspaceMessageHandlers: WorkspaceMessageHandlersService,
    private readonly workspaceHandlers: WorkspaceHandlersService,
    @InjectModel(User) private UserModel: typeof User
  ) { }

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
      const user = await User.findByPk(decoded.id, {
        attributes: ['id', 'name', 'email']
      });
      (socket.data as any).user = user;
      socket.emit('welcome', {
        message: `Welcome user ${(socket.data as any).user.email}! at workspace`,
      });
      console.log('User authenticated at workspace:', {
        id: (socket.data as any).user.id,
        email: (socket.data as any).user.email,
        name: (socket.data as any).user.name,
      });

      this.workspaceMessageHandlers.handle(this.server, socket);
      this.workspaceHandlers.handle(this.server, socket);

    } catch (err) {
      console.error('Authentication error:', err.message);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    console.log(`Socket disconnected from workspace: ${socket.id}`);
  }
}
