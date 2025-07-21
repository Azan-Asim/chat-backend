import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { ChatRoom } from 'src/chatroom/chatroom.model';
import { Message } from 'src/message/message.model';
import { User } from 'src/user/user.model';
import { Op } from 'sequelize';
import { ChatService } from '../chat.service';

@Injectable()
export class MessageHandlersService {
  private activeRooms: Map<string, string[]> = new Map();

  constructor(
    private readonly chatService: ChatService
  ) { }

  handle(server: Server, socket: Socket) {
    this.handleSendMessage(server, socket);
    this.handleEditMessage(server, socket);
    // this.handleDeleteMessage(server, socket);
    this.handleJoinChatRoom(socket);
    this.handleLeaveChatRoom(socket);
    this.handleDisconnect();
  }

  private handleSendMessage(server: Server, socket: Socket) {
    socket.on('sendMessage', async ({ receiverId, message_text, message_file_url, type }) => {
      try {
        const senderId = socket.data.user.id;

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
          message_text: message_text || '',
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
            Sender: sender,
            Receiver: receiver,
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
          socket.emit('sendMessage_Error', { message: `Receiver ${receiverId} is not connected.` });
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
            type: message.type,
            message_text: message.message_text,
            message_file_url: message_file_url,
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
  
  private handleEditMessage(server: Server, socket: Socket) {
  socket.on('editMessage', async ({ id, message_text }) => {
    try {
      const userId: string = socket.data.user.id;

      if (!id || !message_text) {
        socket.emit('error', { message: 'Invalid edit payload' });
        return;
      }

      const edited = await this.chatService.editMessage(userId, id, message_text);

      if (!edited.message) {
        socket.emit('error', { message: 'Message not found after editing' });
        return;
      }

      const updatedMsg = await Message.findByPk(id, {
        include: [
          { model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'imageUrl'] },
          { model: User, as: 'Receiver', attributes: ['id', 'name', 'email', 'imageUrl'] },
        ],
        attributes: [
          'id',
          'SenderId',
          'ReceiverId',
          'editCount',
          'editAt',
          'isDelete',
          'type',
          'createdAt',
          'message_text',
          'message_file_url',
        ],
      });

      if (!updatedMsg) {
        socket.emit('error', { message: 'Message not found in DB' });
        return;
      }

      const room = await ChatRoom.findOne({
        where: {
          [Op.or]: [
            { UserId1: userId, UserId2: updatedMsg.Receiver.id },
            { UserId1: updatedMsg.Receiver.id, UserId2: userId },
          ],
        },
      });

      if (!room) {
        socket.emit('error', { message: 'Room not found' });
        return;
      }

      const messagePayload = {
        message: {
          id: updatedMsg.id,
          message_text: updatedMsg.message_text,
          type: updatedMsg.type,
          editCount: updatedMsg.editCount,
          message_file_url: updatedMsg.message_file_url,
          Sender: updatedMsg.Sender,
          Receiver: updatedMsg.Receiver,
          timestamp: updatedMsg.createdAt,
          isRead: false,
        },
      };

      socket.emit('receiveMessage', messagePayload);

      const receiverSocket = Array.from(server.sockets.sockets.values()).find(
        (s: Socket & { data?: { user?: { id?: string } } }) =>
          s.data?.user?.id === updatedMsg.ReceiverId
      );

      if (receiverSocket) {
        receiverSocket.emit('receiveMessage', messagePayload);
      }

      const latestInRoom = await Message.findOne({
        where: { RoomId: room.id },
        order: [['createdAt', 'DESC']],
      });

      if (!latestInRoom) {
        socket.emit('error', { message: 'Latest message in room not found' });
        return;
      }

      const senderUnreadCount = await Message.count({
        where: { read: false, ReceiverId: updatedMsg.Sender.id, RoomId: room.id },
      });
      const receiverUnreadCount = await Message.count({
        where: { read: false, ReceiverId: updatedMsg.Receiver.id, RoomId: room.id },
      });

      const updatedRoomForSender = {
        roomId: room.id,
        lastMessage: {
          senderId: latestInRoom.SenderId,
          receiverId: latestInRoom.ReceiverId,
          type: latestInRoom.type,
          message_text: latestInRoom.message_text,
          message_file_url: latestInRoom.message_file_url,
          timestamp: latestInRoom.createdAt,
          isRead: false,
        },
        unreadMessages: senderUnreadCount,
      };

      const updatedRoomForReceiver = {
        roomId: room.id,
        lastMessage: {
          senderId: latestInRoom.SenderId,
          receiverId: latestInRoom.ReceiverId,
          type: latestInRoom.type,
          message_text: latestInRoom.message_text,
          message_file_url: latestInRoom.message_file_url,
          timestamp: latestInRoom.createdAt,
          isRead: false,
        },
        unreadMessages: receiverUnreadCount,
      };

      socket.emit('newMessage', updatedRoomForSender);
      if (receiverSocket) {
        receiverSocket.emit('newMessage', updatedRoomForReceiver);
      }

    } catch (err: any) {
      console.error('Error editing message:', err);
      socket.emit('error', { message: err.message || 'Failed to edit message' });
    }
  });
}


  // private handleDeleteMessage(server: Server, socket: Socket) {
  //   socket.on('sendMessage', async ({ receiverId, message_text, message_file_url, type }) => {
  //     try {
  //       const senderId = socket.data.user.id;

  //       if (senderId === receiverId) {
  //         return socket.emit('error', { message: 'You cannot send a message to yourself.' });
  //       }

  //       const receiver = await User.findByPk(receiverId, { attributes: ['id', 'name', 'email', 'imageUrl'] });
  //       if (!receiver) {
  //         return socket.emit('sendMessage_Error', { message: "Receiver Not Found" });
  //       }

  //       let room = await ChatRoom.findOne({
  //         where: {
  //           [Op.or]: [
  //             { UserId1: senderId, UserId2: receiverId },
  //             { UserId1: receiverId, UserId2: senderId },
  //           ],
  //         },

  //         include: [
  //           { model: User, as: 'user1', attributes: ['id', 'name', 'email', 'imageUrl'] },
  //           { model: User, as: 'user2', attributes: ['id', 'name', 'email', 'imageUrl'] },
  //         ],
  //       });

  //       if (!room) {
  //         room = await ChatRoom.create({
  //           id: `${senderId}-${receiverId}`,
  //           UserId1: senderId,
  //           UserId2: receiverId,
  //         });
  //       }

  //       const msg = {
  //         id: `msg-${Date.now()}`,
  //         RoomId: room.id,
  //         SenderId: senderId,
  //         ReceiverId: receiverId,
  //         message_text: message_text || '',
  //         type: type || 'text',
  //         message_file_url: message_file_url || null,
  //       }

  //       const message = await Message.create(msg);

  //       const sender = await User.findByPk(senderId, { attributes: ['id', 'name', 'email', 'imageUrl'] });

  //       const messagePayload = {
  //         roomId: room.id,
  //         message: {
  //           id: message.id,
  //           message_text: message.message_text,
  //           type: message.type,
  //           message_file_url: message_file_url,
  //           Sender: sender,
  //           Receiver: receiver,
  //           timestamp: message.createdAt,
  //           isRead: false,
  //         },
  //       };

  //       // Emit to sender
  //       socket.emit('receiveMessage', messagePayload);

  //       const receiverSocket = Array.from(server.sockets.sockets.values()).find(
  //         (s: any) => s.data?.user?.id === receiverId
  //       );

  //       if (receiverSocket) {
  //         receiverSocket.emit('receiveMessage', messagePayload);

  //         const usersInRoom = this.activeRooms.get(room.id) || [];
  //         if (usersInRoom.includes(receiverId)) {
  //           await Message.update({ read: true }, { where: { id: message.id } });
  //           messagePayload.message.isRead = true;

  //           socket.emit('messageRead', { roomId: room.id, messageId: message.id });
  //           receiverSocket.emit('messageRead', { roomId: room.id, messageId: message.id });
  //         }
  //       } else {
  //         socket.emit('sendMessage_Error', { message: `Receiver ${receiverId} is not connected.` });
  //       }

  //       const senderUnreadCount = await Message.count({
  //         where: { read: false, ReceiverId: senderId, RoomId: room.id },
  //       });
  //       const receiverUnreadCount = await Message.count({
  //         where: { read: false, ReceiverId: receiverId, RoomId: room.id },
  //       });

  //       const updatedRoomForSender = {
  //         roomId: room.id,
  //         lastMessage: {
  //           senderId,
  //           receiverId,
  //           type: message.type,
  //           message_text: message.message_text,
  //           message_file_url: message_file_url,
  //           timestamp: message.createdAt,
  //           isRead: messagePayload.message.isRead,
  //         },
  //         unreadMessages: senderUnreadCount,
  //       };

  //       const updatedRoomForReceiver = {
  //         roomId: room.id,
  //         lastMessage: {
  //           senderId,
  //           receiverId,
  //           type: message.type,
  //           message_text: message.message_text,
  //           message_file_url: message_file_url,
  //           timestamp: message.createdAt,
  //           isRead: messagePayload.message.isRead,
  //         },
  //         unreadMessages: receiverUnreadCount,
  //       };

  //       socket.emit('newMessage', updatedRoomForSender);
  //       if (receiverSocket) {
  //         receiverSocket.emit('newMessage', updatedRoomForReceiver);
  //       }
  //     } catch (err) {
  //       console.error('Error sending message:', err);
  //     }
  //   });
  // }

  private handleJoinChatRoom(socket: Socket) {
    socket.on('joinChatRoom', (roomId: string) => {
      if (!this.activeRooms.has(roomId)) {
        this.activeRooms.set(roomId, []);
      }

      const users = this.activeRooms.get(roomId) ?? [];
      if (!users.includes(socket.data.user.id)) {
        users.push(socket.data.user.id);
      }
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
