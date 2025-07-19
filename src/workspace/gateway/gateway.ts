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
  private readonly onlineUsers = new Map<string, Set<string>>();

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

      const userId = (socket.data as any).user.id
      if (!this.onlineUsers.has(userId)) {
        this.onlineUsers.set(userId, new Set());
      }
      this.onlineUsers.get(userId)!.add(socket.id);

      console.log(`[ONLINE] User ${userId} now has ${this.onlineUsers.get(userId)!.size} sockets`);

      this.workspaceMessageHandlers.handle(this.server, socket, this.onlineUsers);
      this.workspaceHandlers.handle(this.server, socket, this.onlineUsers);

    } catch (err) {
      console.error('Authentication error:', err.message);
      socket.disconnect();
    }
  }

  handleDisconnect(socket: Socket) {
    const user = socket.data?.user;

    if (user) {
      const userId = user.id;
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
          console.log(`[OFFLINE] User ${userId} is now offline`);
        } else {
          console.log(`[ONLINE] User ${userId} still has ${sockets.size} sockets`);
        }
      }
    }

    console.log(`Socket disconnected from workspace: ${socket.id}`);
  }
}
