import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Message } from 'src/message/message.model';
import { User } from 'src/user/user.model';
import { Workspace } from '../models/workspace.model';
import { WorkspaceMember } from '../models/workspaceMemeber.model';
import { CryptUtil } from 'src/utils/crypt.util';
import { MessageRead } from 'src/message/messageRead.model';
import { WorkspaceService } from '../workspace.service';

@Injectable()
export class WorkspaceMessageHandlersService {
  constructor(private readonly WorkspaceService: WorkspaceService) { }
  private activeRooms: Map<string, string[]> = new Map();

  handle(server: Server, socket: Socket, onlineUsers: Map<string, Set<string>>) {
    this.handleSendMessage(server, socket, onlineUsers);
    this.handleJoinWorkspace(socket);
    this.handleLeaveWorkspace(socket);
    this.handleDisconnect();
  }

  private handleSendMessage(server: Server, socket: Socket, onlineUsers: Map<string, Set<string>>) {
    socket.on('sendMessage', async ({ workspaceId, content, message_file_url, type }) => {
      try {
        const senderId = socket.data.user.id;

        const workspace = await Workspace.findOne({ where: { id: workspaceId } });
        if (!workspace) {
          return socket.emit('sendMessage_Error', { message: "Workspace Not Found" });
        }

        const isMember = await WorkspaceMember.findOne({ where: { workspaceId, userId: senderId } });
        if (!isMember) {
          return socket.emit('sendMessage_Error', { message: "You are not a member of this workspace" });
        }

        const msg = {
          id: `workspace-msg-${Date.now()}-${CryptUtil.generateId()}`,
          workspaceId,
          SenderId: senderId,
          message_text: content || '',
          type: type || 'text',
          message_file_url: message_file_url || null,
        };

        // Create message
        const message = await Message.create(msg);

        // Mark sender as having read their own message
        const messageRead = await MessageRead.create({
          id: `${message.id}-${senderId}`,
          messageId: message.id,
          userId: senderId,
          readAt: new Date()
        });

        // Get sender info
        const sender = await User.findByPk(senderId, {
          attributes: ['id', 'name', 'email', 'imageUrl']
        });

        let senderReadUser = {};

        if (sender) {
          senderReadUser = {
            id: sender.id,
            name: sender.name,
            email: sender.email,
            imageUrl: sender.imageUrl
          };
        }


        const messagePayload = {
          workspaceId,
          message: {
            id: message.id,
            message_text: message.message_text,
            SenderId: senderId,
            Sender: sender,
            timestamp: message.createdAt,
            isRead: true,
            messageReads: [
              {
                userId: senderId,
                readAt: messageRead.readAt,
                user: senderReadUser
              }
            ]
          }
        };

        socket.emit('receiveMessage', messagePayload);
        socket.to(workspaceId).emit('receiveMessage', messagePayload);


        const workspaceMembers = await User.findAll({
          include: [{
            model: WorkspaceMember,
            as: 'member',
            where: { workspaceId }
          }],
          attributes: ['id', 'name', 'email', 'imageUrl']
        });

        const lastMessage = await Message.findOne({
          where: { workspaceId },
          order: [['createdAt', 'DESC']],
        });

        for (const member of workspaceMembers) {
          const memberId = member.id;

          // if (memberId === senderId) continue;   // if not have to send to the sender 

          const unread = await this.WorkspaceService.getWorkspaceUnreadCount(workspaceId, memberId);

          const sockets = onlineUsers.get(memberId);
          if (sockets) {
            for (const socketId of sockets) {
              server.to(socketId).emit("newMessage", {
                workspaceId,
                lastMessage,
                unreadMessages: unread.unreadedCount,
              });
            }
          }
        }


      } catch (err) {
        console.error('Error sending message:', err);
      }
    });
  }

  private handleJoinWorkspace(socket: Socket) {
    socket.on('joinWorkspace', (workspaceId: string) => {

      socket.join(workspaceId);

      if (!this.activeRooms.has(workspaceId)) {
        this.activeRooms.set(workspaceId, []);
      }
      const users = this.activeRooms.get(workspaceId) ?? [];
      if (!users.includes(socket.data.user.id)) {
        users.push(socket.data.user.id);
      }
      this.activeRooms.set(workspaceId, users);
    });
  }


  private handleLeaveWorkspace(socket: Socket) {
    socket.on('leaveWorkspace', (workspaceId: string) => {
      socket.leave(workspaceId);

      const userId = socket.data.user?.id;
      if (!workspaceId || !userId) return;

      const users = this.activeRooms.get(workspaceId) ?? [];

      const updatedUsers = users.filter(id => id !== userId);

      if (updatedUsers.length > 0) {
        this.activeRooms.set(workspaceId, updatedUsers);
      } else {
        this.activeRooms.delete(workspaceId);
      }

      console.log(`User ${userId} left workspace ${workspaceId}`);
      console.log(`Current users in workspace ${workspaceId}:`, updatedUsers);
    });
  }

  private handleDisconnect() {
    this.activeRooms.forEach((users, roomId) => {
      this.activeRooms.set(
        roomId,
        users.filter(id => id !== id)
      );
      if ((this.activeRooms.get(roomId)?.length ?? 0) === 0) {
        this.activeRooms.delete(roomId);
      }
    });
  }
}
