import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatRoom } from 'src/chatroom/chatroom.model';
import { Message } from 'src/message/message.model';
import { User } from 'src/user/user.model';
import { Op } from 'sequelize';

@Injectable()
export class MessageHandlersService {
  private activeRooms: Map<string, string[]> = new Map();

  handle(server: Server, socket: Socket) {
    this.handleSendMessage(server, socket);
    this.handleJoinChatRoom(socket);
    this.handleLeaveChatRoom(socket);
    this.handleDisconnect();
  }

  private handleSendMessage(server: Server, socket: Socket) {
    socket.on('sendMessage', async ({ receiverId, content, message_file_url, type }) => {
      try {
        const senderId = socket.data.user.id;
        console.log({ senderId, receiverId, content });

        if (senderId === receiverId) {
          return socket.emit('error', { message: 'You cannot send a message to yourself.' });
        }

        const receiver = await User.findByPk(receiverId, { attributes: ['id', 'name', 'email', 'imageUrl'] });
        if (!receiver) {
          return socket.emit('sendMessage_Error', { message: "Receiver Not Found" });
        }

        let room = await ChatRoom.findOne({
          where: {
            [Op.or]: [
              { UserId1: senderId, UserId2: receiverId },
              { UserId1: receiverId, UserId2: senderId },
            ],
          },

          include: [
            { model: User, as: 'user1', attributes: ['id', 'name', 'email', 'imageUrl'] },
            { model: User, as: 'user2', attributes: ['id', 'name', 'email', 'imageUrl'] },
          ],
        });

        if (!room) {
          room = await ChatRoom.create({
            id: `${senderId}-${receiverId}`,
            UserId1: senderId,
            UserId2: receiverId,
          });
        }

        const msg = {
          id: `msg-${Date.now()}`,
          RoomId: room.id,
          SenderId: senderId,
          ReceiverId: receiverId,
          message_text: content || '',
          type: type || 'text',
          message_file_url: message_file_url || null,
        }

        const message = await Message.create(msg);

        const sender = await User.findByPk(senderId, { attributes: ['id', 'name', 'email', 'imageUrl'] });

        const messagePayload = {
          roomId: room.id,
          message: {
            id: message.id,
            message_text: message.message_text,
            type: message.type,
            message_file_url: message_file_url,
            sender,
            receiver,
            timestamp: message.createdAt,
            isRead: false,
          },
        };

        // Emit to sender
        socket.emit('receiveMessage', messagePayload);

        const receiverSocket = Array.from(server.sockets.sockets.values()).find(
          (s: any) => s.data?.user?.id === receiverId
        );

        if (receiverSocket) {
          receiverSocket.emit('receiveMessage', messagePayload);

          const usersInRoom = this.activeRooms.get(room.id) || [];
          if (usersInRoom.includes(receiverId)) {
            await Message.update({ read: true }, { where: { id: message.id } });
            messagePayload.message.isRead = true;

            socket.emit('messageRead', { roomId: room.id, messageId: message.id });
            receiverSocket.emit('messageRead', { roomId: room.id, messageId: message.id });
          }
        } else {
          console.log(`Receiver ${receiverId} is not connected.`);
        }

        const senderUnreadCount = await Message.count({
          where: { read: false, ReceiverId: senderId, RoomId: room.id },
        });
        const receiverUnreadCount = await Message.count({
          where: { read: false, ReceiverId: receiverId, RoomId: room.id },
        });

        const updatedRoomForSender = {
          roomId: room.id,
          lastMessage: {
            senderId,
            receiverId,
            content: message.message_text,
            timestamp: message.createdAt,
            isRead: messagePayload.message.isRead,
          },
          unreadMessages: senderUnreadCount,
        };

        const updatedRoomForReceiver = {
          roomId: room.id,
          lastMessage: {
            senderId,
            receiverId,
            type: message.type,
            message_text: message.message_text,
            message_file_url: message_file_url,
            timestamp: message.createdAt,
            isRead: messagePayload.message.isRead,
          },
          unreadMessages: receiverUnreadCount,
        };

        socket.emit('newMessage', updatedRoomForSender);
        if (receiverSocket) {
          receiverSocket.emit('newMessage', updatedRoomForReceiver);
        }
      } catch (err) {
        console.error('Error sending message:', err);
      }
    });
  }

  private handleJoinChatRoom(socket: Socket) {
    socket.on('joinChatRoom', (roomId: string) => {
      if (!this.activeRooms.has(roomId)) {
        this.activeRooms.set(roomId, []);
      }

      const users = this.activeRooms.get(roomId) ?? [];
      if (!users.includes(socket.data.user.id)) {
        users.push(socket.data.user.id);
      }

      // console.log(`User ${socket.data.user.id} joined room ${roomId}`);
      // console.log(this.activeRooms);
    });
  }

  private handleLeaveChatRoom(socket: Socket) {
    socket.on('leaveChatRoom', (roomId: string) => {
      if (this.activeRooms.has(roomId)) {
        const users = (this.activeRooms.get(roomId) ?? []).filter(id => id !== socket.data.user.id);
        if (users.length === 0) {
          this.activeRooms.delete(roomId);
        } else {
          this.activeRooms.set(roomId, users);
        }
      }
    });
  }

  private handleDisconnect() {
    this.activeRooms.forEach((users, roomId) => {
      this.activeRooms.set(
        roomId,
        users.filter(id => id !== id) // Note: requires socket passed here if you want per socket cleanup
      );
      if ((this.activeRooms.get(roomId)?.length ?? 0) === 0) {
        this.activeRooms.delete(roomId);
      }
    });
  }
}
