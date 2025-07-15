import { Injectable } from '@nestjs/common';
import { Sequelize } from 'sequelize';
import { Server, Socket } from 'socket.io';
import { Message } from 'src/message/message.model';
import { MessageRead } from 'src/message/messageRead.model';
import { User } from 'src/user/user.model';
// import { Workspace } from '../models/workspace.model';
import { WorkspaceService } from '../workspace.service';
import { WorkspaceMember } from '../models/workspaceMemeber.model';

@Injectable()
export class WorkspaceHandlersService {
  constructor(private readonly WorkspaceService: WorkspaceService) { }

  handle(server: Server, socket: Socket, onlineUsers: Map<string, Set<string>>) {
    this.handleReadMessage(server, socket);
    this.handleTyping(server, socket, onlineUsers);
    this.handleStopTyping(server, socket, onlineUsers);
  }

  private async handleTyping(
    server: Server,
    socket: Socket,
    onlineUsers: Map<string, Set<string>>
  ) {
    socket.on('typing', async (workspaceId: string) => {
      const user = socket.data.user;

      if (!workspaceId || !user?.id) {
        return;
      }

      try {
        const workspaceMembers = await User.findAll({
          include: [{
            model: WorkspaceMember,
            as: 'member',
            where: { workspaceId }
          }],
          attributes: ['id', 'name', 'email']
        });

        for (const member of workspaceMembers) {
          const memberId = member.id;
          if (memberId === user.id) continue;

          const sockets = onlineUsers.get(memberId);
          if (!sockets) continue;

          for (const socketId of sockets) {
            server.to(socketId).emit('userTyping', {
              workspaceId,
              userId: user.id,
              name: user.name,
            });
          }
        }
      } catch (err) {
        console.error('Error handling typing:', err);
      }
    });
  }

  private async handleStopTyping(
    server: Server,
    socket: Socket,
    onlineUsers: Map<string, Set<string>>
  ) {
    socket.on('stopTyping', async (workspaceId: string) => {
      const user = socket.data.user;

      if (!workspaceId || !user?.id) {
        return;
      }

      try {
        const workspaceMembers = await User.findAll({
          include: [{
            model: WorkspaceMember,
            as: 'member',
            where: { workspaceId }
          }],
          attributes: ['id', 'name', 'email']
        });

        for (const member of workspaceMembers) {
          const memberId = member.id;
          if (memberId === user.id) continue;

          const sockets = onlineUsers.get(memberId);
          if (!sockets) continue;

          for (const socketId of sockets) {
            server.to(socketId).emit('userStopTyping', {
              workspaceId,
              userId: user.id,
            });
          }
        }
      } catch (err) {
        console.error('Error handling stopTyping:', err);
      }
    });
  }


  private handleReadMessage(server: Server, socket: Socket) {
    const userId = socket.data.user.id
    socket.on('readMessage', async ({ workspaceId, messageId }) => {
      console.log("socket readMessage")
      console.log({ workspaceId, messageId, userId })
      if (!workspaceId || !messageId || !userId) return;

      const now = new Date();

      const isRead = MessageRead.findOne({
        where: { messageId }
      })
      console.log('already read')
      await MessageRead.upsert({
        id: `${messageId}-${userId}`,
        messageId,
        userId,
        readAt: now,
      });
      const user = await User.findByPk(userId, {
        attributes: ['id', 'name', 'email', 'imageUrl']
      })
      server.to(workspaceId).emit('messageRead', {
        messageId,
        userId,
        user,
        readAt: now,
      });

      const unreadedCount = await this.WorkspaceService.getWorkspaceUnreadCount(workspaceId, userId)
      const lastMessage = await Message.findOne({
        where: { workspaceId },
        order: [['createdAt', 'DESC']],
      });

      const msg = lastMessage?.toJSON()
      server.emit('newMessage', { workspaceId, lastMessage, unreadMessages: unreadedCount })
    });
  }
}
