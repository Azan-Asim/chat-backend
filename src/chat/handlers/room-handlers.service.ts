import { Injectable } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { Message } from 'src/message/message.model';

@Injectable()
export class RoomHandlersService {
  handle(server: Server, socket: Socket) {
    this.handleJoinChatRoom(server, socket);
    this.handleTyping(socket);
    this.handleStopTyping(socket);
    this.handleMessageRead(server, socket);
  }

  private handleJoinChatRoom(server: Server, socket: Socket) {
    socket.on('joinChatRoom', async (roomId: string) => {
      try {
        const user = socket.data.user;
        if (!user?.id) {
          return socket.emit('error', { message: 'User is not authenticated' });
        }

        const userId = user.id;
        const [user1Id, user2Id] = roomId.split('-').map(String);

        if (![user1Id, user2Id].includes(userId)) {
          return socket.emit('error', { message: 'Unauthorized access to room' });
        }

        socket.join(roomId);

        const unreadMessages = await Message.count({
          where: { RoomId: roomId, ReceiverId: userId, read: false },
        });

        await Message.update(
          { read: true },
          { where: { RoomId: roomId, ReceiverId: userId, read: false } }
        );

        const lastMessage = await Message.findOne({
          where: { RoomId: roomId },
          order: [['createdAt', 'DESC']],
        });

        const updatedRoomForSender = {
          roomId,
          senderId: user1Id,
          receiverId: user2Id,
          lastMessage: lastMessage
            ? {
              senderId: lastMessage.SenderId,
              receiverId: lastMessage.ReceiverId,
              message_text: lastMessage.message_text,
              message_file_url: lastMessage.message_file_url,
              type: lastMessage.type,
              isDelete: lastMessage.isDelete,
              timestamp: lastMessage.timestamp,
            }
            : null,
          unreadMessages: userId === user1Id ? 0 : undefined,
        };

        const updatedRoomForReceiver = {
          roomId,
          lastMessage: lastMessage
            ? {
              senderId: lastMessage.SenderId,
              receiverId: lastMessage.ReceiverId,
              message_text: lastMessage.message_text,
              message_file_url: lastMessage.message_file_url,
              type: lastMessage.type,
              timestamp: lastMessage.timestamp,
            }
            : null,
          unreadMessages: userId === user2Id ? 0 : undefined,
        };

        const senderSocket = Array.from(server.sockets.sockets.values()).find(
          (s: any) => s.data?.user?.id === user1Id
        );
        const receiverSocket = Array.from(server.sockets.sockets.values()).find(
          (s: any) => s.data?.user?.id === user2Id
        );

        if (senderSocket) {
          senderSocket.emit('chatRoomUpdated', updatedRoomForSender);
        }
        if (receiverSocket) {
          receiverSocket.emit('chatRoomUpdated', updatedRoomForReceiver);
        }

      } catch (err) {
        console.error('Error in joinChatRoom:', err);
        socket.emit('error', { message: 'Failed to join chat room' });
      }
    });
  }

  private handleTyping(socket: Socket) {
    socket.on('typing', ({ roomId }: { roomId: string }) => {
      try {
        const user = socket.data.user;
        if (!user?.id || !roomId) return;

        socket.to(roomId).emit('typing', { roomId, senderId: user.id });
      } catch (err) {
        console.error('Error in typing:', err);
      }
    });
  }

  private handleStopTyping(socket: Socket) {
    socket.on('stopTyping', ({ roomId }: { roomId: string }) => {
      try {
        const user = socket.data.user;
        if (!user?.id || !roomId) return;

        socket.to(roomId).emit('stopTyping', { roomId, senderId: user.id });
      } catch (err) {
        console.error('Error in stopTyping:', err);
      }
    });
  }

  private handleMessageRead(server: Server, socket: Socket) {
    socket.on('messageRead', async ({ roomId }: { roomId: string }) => {
      try {
        const user = socket.data.user;
        if (!user?.id || !roomId) return;

        await Message.update(
          { read: true },
          { where: { RoomId: roomId, ReceiverId: user.id, read: false } }
        );

        server.to(roomId).emit('userMessageRead', {
          roomId,
          userId: user.id,
        });
      } catch (err) {
        console.error('Error in messageRead:', err);
      }
    });
  }
}
