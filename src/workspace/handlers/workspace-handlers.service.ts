import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Message } from 'src/message/message.model';
import { MessageRead } from 'src/message/messageRead.model';
import { User } from 'src/user/user.model';

@Injectable()
export class WorkspaceHandlersService {
  handle(server: Server, socket: Socket) {
    this.handleReadMessage(server, socket);
    this.handleTyping(socket);
    this.handleStopTyping(socket);
  }

  private handleTyping(socket: Socket) {
    socket.on('typing', (workspaceId: string) => {
      const user = socket.data.user;

      if (!workspaceId || !user?.id) {
        return;
      }

      socket.to(workspaceId).emit('userTyping', {
        workspaceId,
        userId: user.id,
        name: user.name,
      });
    });
  }

  private handleStopTyping(socket: Socket) {
    socket.on('stopTyping', (workspaceId: string) => {
      const user = socket.data.user;

      if (!workspaceId || !user?.id) {
        return;
      }

      // Broadcast to all in the room *except the sender*
      socket.to(workspaceId).emit('userStopTyping', {
        workspaceId,
        userId: user.id,
      });
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
    });
  }

}
