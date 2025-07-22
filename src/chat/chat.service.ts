// src/chat/chat.service.ts
import { BadRequestException, ForbiddenException, Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
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

  async search(params: {
    userId: string;
    pageNo: number;
    pageSize: number;
    senderId: string;
    receiverId: string;
    type: string;
    query: string;
    roomId: string;
  }) {
    const {
      pageNo,
      pageSize,
      senderId,
      receiverId,
      type,
      query,
      roomId,
    } = params;

    const where: Record<string, any> = {};

    if (!roomId) {
      throw new ForbiddenException("roomId is required")
    } else {
      where.roomId = roomId;
    }
    if (senderId) where.senderId = senderId;
    if (receiverId) where.receiverId = receiverId;
    if (type) where.type = type;
    if (query) where.message_text = { [Op.like]: `%${query}%` };

    where.isDelete = false;

    const options: any = {
      where,
      order: [['createdAt', 'DESC']],
       include: [
        {
          model: User,
          as: 'Sender',
          attributes: ['id', 'name', 'email', 'imageUrl']
        },
         {
          model: User,
          as: 'Receiver',
          attributes: ['id', 'name', 'email', 'imageUrl']
        }
      ]
    };

    if (pageNo && pageSize) {
      const page = parseInt(pageNo as any, 10)
      const limit = parseInt(pageSize as any, 10)
      options.offset = (page - 1) * limit;
      options.limit = limit;
    }

    const { count, rows } = await this.messageModel.findAndCountAll(options);

    return success('Fetch Successfully', rows, {

      ...(pageNo && pageSize
        ? { pageNo: Number(pageNo), pageSize: Number(pageSize) }
        : {}),
      total: count,
    })
  }

  async getUserChatRooms(
    userId: string,
    pageNo?: number,
    pageSize?: number
  ) {
    try {
      const where = {
        [Op.or]: [{ UserId1: userId }, { UserId2: userId }],
      };

      const queryOptions: any = {
        where,
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
              'type',
              'message_file_url',
              'SenderId',
              'ReceiverId',
              'timestamp',
              'read',
              'isDelete',
            ],
          },
        ],
        order: [['updatedAt', 'DESC']],
      };

      if (pageNo && pageSize) {
        queryOptions.limit = pageSize;
        queryOptions.offset = (pageNo - 1) * pageSize;
      }

      const [chatRooms, totalCount] = await Promise.all([
        this.chatRoomModel.findAll(queryOptions),
        this.chatRoomModel.count({ where }),
      ]);

      const data = chatRooms.map((room) => {
        const otherUser =
          room.UserId1 === userId ? room['user2'] : room['user1'];

        const unreadCount = room.Messages.filter(
          (msg) => !msg.read && msg.ReceiverId === userId,
        ).length;

        const lastMessage = [...room.Messages]
          .sort(
            (a, b) => +new Date(b.timestamp) - +new Date(a.timestamp),
          )[0];

        return {
          roomId: room.id,
          roomName: otherUser?.name ?? 'Unknown',
          receiver: {
            id: otherUser?.id,
            name: otherUser?.name,
            email: otherUser?.email,
            imageUrl: otherUser?.imageUrl,
          },
          unreadMessages: unreadCount,
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
        };
      });

      return success(
        'Chat rooms fetched successfully',
        data,
        {
          totals: totalCount,
          ...(pageNo && pageSize
            ? { pageNo, pageSize }
            : {}),
        }
      );
    } catch (error) {
      console.error('Error fetching user chat rooms:', error);
      return failure('Failed to fetch chat rooms');
    }
  }


  async getAllChatsInChatRoom(userId: string, roomId: string, pageNo?: number, pageSize?: number) {
    try {
      const [user1, user2] = roomId.split('-');
      if (!user1 || !user2) {
        throw new BadRequestException('Invalid roomId format.');
      }

      const receiverId = user1 === userId ? user2 : user1;

      const receiver = await this.userModel.findByPk(receiverId, {
        attributes: ['id', 'name', 'email', 'imageUrl'],
      });
      if (!receiver) {
        throw new NotFoundException('Receiver not found.');
      }

      const queryOptions: any = {
        where: { RoomId: roomId },
        order: [['timestamp', 'DESC']],
        include: [
          {
            model: User,
            as: 'Sender',
            attributes: ['id', 'name', 'email', 'imageUrl'],
          },
          {
            model: User,
            as: 'Receiver',
            attributes: ['id', 'name', 'email', 'imageUrl'],
          },
        ],
      };

      if (pageNo && pageSize) {
        queryOptions.limit = pageSize;
        queryOptions.offset = (pageNo - 1) * pageSize;
      }

      const messages = await this.messageModel.findAll(queryOptions);
      const totalCount = await this.messageModel.count({
        where: { RoomId: roomId },
      });

      const formattedMessages = messages.map((message) => ({
        id: message.id,
        type: message.type,
        message_text: message.message_text,
        message_file_url: message.message_file_url,
        editCount: message.editCount,
        isDelete: message.isDelete,
        timestamp: message.timestamp,
        Sender: {
          id: message.Sender.id,
          name: message.Sender.name,
          imageUrl: message.Sender.imageUrl,
        },
        Receiver: {
          id: message.Receiver.id,
          name: message.Receiver.name,
          imageUrl: message.Receiver.imageUrl,
        },
        isRead: message.read,
      }));

      const data = {
        receiver,
        messages: formattedMessages,
      };

      return success(
        `Chats with ${receiver.name} fetched successfully`,
        data,
        {
          totals: totalCount,
          ...(pageNo && pageSize ? { pageNo, pageSize } : {}),
        }
      );
    } catch (error) {
      throw new InternalServerErrorException(error);
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

  async sendMessage(senderId: string, receiverId: string, content: string, type?: 'text' | 'audio' | 'video' | 'image', fileUrl?: string) {
    try {
      if (senderId === receiverId) {
        throw new Error('You cannot send a message to yourself.');
      }

      const receiver = await User.findByPk(receiverId, { attributes: ['id', 'name', 'email', 'imageUrl'] });

      if (!receiver) {
        throw new NotFoundException("Receiver Not Found")
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

      const msg: any = {
        id: `msg-${Date.now()}`,
        RoomId: room.id,
        SenderId: senderId,
        ReceiverId: receiverId,
        message_text: content,
        type: type ?? 'text',
      };

      if (fileUrl) {
        msg.message_file_url = fileUrl;
      }

      const message = await this.messageModel.create(msg);

      return success("Message Created Successfully", message);

    } catch (error) {
      throw new InternalServerErrorException(error)
    }
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

  async editMessage(userId: string, id: string, message_text: string) {

    try {
      const message = await this.messageModel.findByPk(id, {
        attributes: [
          'id',
          'SenderId',
          'ReceiverId',
          'editCount',
          'editAt',
          'isDelete',
          'type',
          'createdAt',
        ],
      });

      if (!message) {
        throw new NotFoundException('Message Not Found');
      }

      if (message.SenderId !== userId || message.isDelete || message.type != 'text') {
        throw new ForbiddenException("You can't edit this message");
      }

      const createdAt = new Date(message.createdAt);
      const now = new Date();
      const diffMs = now.getTime() - createdAt.getTime();
      const diffMins = diffMs / (1000 * 60);

      if (diffMins > 15) {
        throw new ForbiddenException('You can no longer edit this message (time limit exceeded)');
      }

      message.message_text = message_text;
      message.editCount += 1;
      message.editAt = now;

      await message.save();

      return success('Message Edited Successfully', message);

    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }
  async deleteMessage(userId: string, id: string) {
    try {
      const message = await this.messageModel.findByPk(id, {
        attributes: [
          'id',
          'isDelete',
          'SenderId'
        ],
      });

      if (!message) {
        throw new NotFoundException('Message Not Found');
      }

      if (message.SenderId !== userId || message.isDelete) {
        throw new ForbiddenException({
          msg: `You can't edit this message`,
          userId,
          message
        });
      }

      message.isDelete = true;

      await message.save();

      return success('Message deleted Successfully', message);

    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

}
