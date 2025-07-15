import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Message } from 'src/message/message.model';
import { User } from 'src/user/user.model';
import { Workspace } from '../models/workspace.model';
import { WorkspaceMember } from '../models/workspaceMemeber.model';
import { CryptUtil } from 'src/utils/crypt.util';
import { MessageRead } from 'src/message/messageRead.model';

@Injectable()
export class WorkspaceMessageHandlersService {
  private activeRooms: Map<string, string[]> = new Map();

  handle(server: Server, socket: Socket) {
    this.handleSendMessage(server, socket);
    this.handleJoinWorkspace(socket);
    this.handleLeaveWorkspace(socket);
    this.handleDisconnect();
  }

  private handleSendMessage(server: Server, socket: Socket) {
    socket.on('sendMessage', async ({ workspaceId, content }) => {
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

        // Create message
        const message = await Message.create({
          id: `workspace-msg-${Date.now()}-${CryptUtil.generateId()}`,
          workspaceId,
          SenderId: senderId,
          message_text: content,
          type: 'workspace'
        });

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

        // Send to sender & others
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


        // const memberIds = workspaceMembers.map(u => u.id);
        // const workspaceMembersSockets = Array.from(server.sockets.values()).filter(
        //   (s: any) => memberIds.includes(s.data?.user?.id)
        // );

        // console.log(workspaceMembersSockets)

        // if (workspaceMembersSockets.length) {
        //   workspaceMembersSockets.forEach(socket => {
        //     socket.emit('receiveMessage', messagePayload);
        //   });
        // }

        //   const usersInRoom = this.activeRooms.get(room.id) || [];
        //   if (usersInRoom.includes(receiverId)) {
        //     await Message.update({ read: true }, { where: { id: message.id } });
        //     messagePayload.message.isRead = true;

        //     socket.emit('messageRead', { roomId: room.id, messageId: message.id });
        //     receiverSocket.emit('messageRead', { roomId: room.id, messageId: message.id });
        //   }
        // } else {
        //   console.log(`Receiver ${receiverId} is not connected.`);
        // }

        // const senderUnreadCount = await Message.count({
        //   where: { read: false, ReceiverId: senderId, RoomId: room.id },
        // });
        // const receiverUnreadCount = await Message.count({
        //   where: { read: false, ReceiverId: receiverId, RoomId: room.id },
        // });

        // const updatedRoomForSender = {
        //   roomId: room.id,
        //   lastMessage: {
        //     senderId,
        //     receiverId,
        //     content: message.message_text,
        //     timestamp: message.createdAt,
        //     isRead: messagePayload.message.isRead,
        //   },
        //   unreadMessages: senderUnreadCount,
        // };

        // const updatedRoomForReceiver = {
        //   roomId: room.id,
        //   lastMessage: {
        //     senderId,
        //     receiverId,
        //     content: message.message_text,
        //     timestamp: message.createdAt,
        //     isRead: messagePayload.message.isRead,
        //   },
        //   unreadMessages: receiverUnreadCount,
        // };

        // socket.emit('newMessage', updatedRoomForSender);
        // if (receiverSocket) {
        //   receiverSocket.emit('newMessage', updatedRoomForReceiver);
        // }
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
