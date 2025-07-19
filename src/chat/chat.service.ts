// src/chat/chat.service.ts
import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { ChatRoom } from '../chatroom/chatroom.model';
import { Message } from '../message/message.model';
import { User } from '../user/user.model';
import { Op } from 'sequelize';
import { failure, success } from 'src/utils/response.helper';

@Injectable()
export class ChatService {
  constructor(
    @InjectModel(ChatRoom) private chatRoomModel: typeof ChatRoom,
    @InjectModel(Message) private messageModel: typeof Message,
    @InjectModel(User) private userModel: typeof User,
  ) { }

  async getUserChatRooms(userId: string) {
    try {
      const chatRooms = await this.chatRoomModel.findAll({
        where: {
          [Op.or]: [{ UserId1: userId }, { UserId2: userId }],
        },
        include: [
          {
            model: User,
            as: 'user1',
            attributes: ['id', 'name', 'email', 'imageUrl'],
          },
          {
            model: User,
            as: 'user2',
            attributes: ['id', 'name', 'email', 'imageUrl'],
          },
          {
            model: Message,
            attributes: [
              'message_text',
              'SenderId',
              'ReceiverId',
              'timestamp',
              'read',
            ],
          },
        ],
      });

      const data = chatRooms.map((room) => {
        const otherUser =
          room.UserId1 === userId ? room['user2'] : room['user1'];

        const unreadCount = room.Messages.filter(
          (msg) => !msg.read && msg.ReceiverId === userId,
        ).length;

        const lastMessage = [...room.Messages].sort(
          (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp),
        )[0];

        return {
          roomId: room.id,
          roomName: otherUser ? otherUser.name : 'Unknown',
          receiver: {
            id: otherUser.id,
            name: otherUser.name,
            email: otherUser.email,
            imageUrl: otherUser.imageUrl,
          },
          unreadMessages: unreadCount,
          lastMessage: lastMessage
            ? {
              senderId: lastMessage.SenderId,
              receiverId: lastMessage.ReceiverId,
              content: lastMessage.message_text,
              timestamp: lastMessage.timestamp,
            }
            : null,
        };
      });

      return success("Chat rooms fetched successfully", data)
    } catch (error) {
      console.error('Error fetching user chat rooms:', error);

      return failure("Failed to fetch chat rooms")
    }
  }


  async getAllChatsInChatRoom(userId: string, roomId: string, pageNo: number, pageSize: number) {
    // console.log(userId, roomId, pageNo, pageSize)
    try {
      const [user1, user2] = roomId.split('-');
      const receiverId = user1 === userId ? user2 : user1;

      if (!receiverId) throw new Error('Unable to determine the receiver ID.');

      const receiver = await this.userModel.findByPk(receiverId, {
        attributes: ['id', 'name', 'email', 'imageUrl'],
      });

      if (!receiver) throw new Error('Receiver not found.');

      const offset = (pageNo - 1) * pageSize;

      const messages = await this.messageModel.findAll({
        where: { RoomId: roomId },
        offset: Number(offset),
        limit: Number(pageSize),
        order: [['timestamp', 'DESC']],
        include: [
          { model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'imageUrl'] },
          { model: User, as: 'Receiver', attributes: ['id', 'name', 'email', 'imageUrl'] },
        ],
      });

      const totalmessages = await this.messageModel.count({
        where: { RoomId: roomId },
      });

      const formattedMessages = messages.map((message) => ({
        id: message.id,
        content: message.message_text,
        timestamp: message.timestamp,
        sender: {
          id: message.Sender.id,
          name: message.Sender.name,
          imageUrl: message.Sender.imageUrl,
        },
        receiver: {
          id: message.Receiver.id,
          name: message.Receiver.name,
          imageUrl: message.Receiver.imageUrl,
        },
        isRead: message.read,
      }));

      const data = {
        totalmessages,
        receiver,
        messages: formattedMessages,
      }
      return success(`All Chats with ${receiver.name} retrived from pageNo ${pageNo}`, data)
    } catch (error) {

    }
  }

  async getUserMessagesUnreadCount(userId: string) {
    try {
      const messages = await this.messageModel.findAll({
        where: {
          ReceiverId: userId,
          read: false,
        },
        include: [
          { model: User, as: 'Sender', attributes: ['id', 'name', 'email', 'imageUrl'] },
          { model: User, as: 'Receiver', attributes: ['id', 'name', 'email', 'imageUrl'] },
        ],
        order: [['timestamp', 'ASC']],
      });
      const data = { unreadMessagesCount: messages.length }
      return success("No. of Unreaded Message", data)
    } catch (error) {
      return failure("Failed to get Unreaded Count")
    }
  }

  async sendMessage(senderId: string, receiverId: string, content: string) {
    if (senderId === receiverId) {
      throw new Error('You cannot send a message to yourself.');
    }

    let room = await this.chatRoomModel.findOne({
      where: {
        [Op.or]: [
          { UserId1: senderId, UserId2: receiverId },
          { UserId1: receiverId, UserId2: senderId },
        ],
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'name', 'email', 'imageUrl'],
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'name', 'email', 'imageUrl'],
        },
      ],
    });

    if (!room) {
      room = await this.chatRoomModel.create({
        id: `${senderId}-${receiverId}`,
        UserId1: senderId,
        UserId2: receiverId,
      });
    }

    const message = await this.messageModel.create({
      id: `msg-${Date.now()}`,
      RoomId: room.id,
      SenderId: senderId,
      ReceiverId: receiverId,
      message_text: content,
      type: 'text'
    });

    return message;
  }

  async uploadMessageFile(
    senderId: string,
    receiverId: string,
    type: 'audio' | 'video' | 'image',
    fileUrl?: string
  ) {
    if (!receiverId) {
      throw new BadRequestException('Receiver ID is required.');
    }

    if (senderId === receiverId) {
      throw new BadRequestException('You cannot send a message to yourself.');
    }

    if (!fileUrl) {
      throw new BadRequestException('File URL is required.');
    }

    const receiver = await this.userModel.findByPk(receiverId);
    if (!receiver) {
      throw new NotFoundException('Receiver not found.');
    }

    let room = await this.chatRoomModel.findOne({
      where: {
        [Op.or]: [
          { UserId1: senderId, UserId2: receiverId },
          { UserId1: receiverId, UserId2: senderId },
        ],
      },
      include: [
        {
          model: User,
          as: 'user1',
          attributes: ['id', 'name', 'email', 'imageUrl'],
        },
        {
          model: User,
          as: 'user2',
          attributes: ['id', 'name', 'email', 'imageUrl'],
        },
      ],
    });

    if (!room) {
      room = await this.chatRoomModel.create({
        id: `${senderId}-${receiverId}`,
        UserId1: senderId,
        UserId2: receiverId,
      });
    }

    return success('File uploaded successfully.', {
      fileUrl,
      senderId,
      receiverId,
      roomId: room.id,
      type,
    });
  }

}
