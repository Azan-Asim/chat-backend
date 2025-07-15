// src/chat/chat.controller.ts
import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Request } from 'express';
import { SendMessageDto } from './dto/send-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly chatService: ChatService) { }

  @Get('chat_room/:id')
  @UseGuards(JwtAuthGuard)
  async getChatMessages(
    @Req() req: Request,
    @Param('id') roomId: string,
    @Query('pageNo') pageNo: string,
    @Query('pageSize') pageSize: string,
  ) {
    const userId = req.user.id;
    return this.chatService.getAllChatsInChatRoom(
      userId,
      roomId,
      Number(pageNo),
      Number(pageSize),
    );
  }

  @Get('chat_rooms')
  getUserChatRooms(@Req() req) {
    return this.chatService.getUserChatRooms(req.user.id);
  }

 @Post('send_message')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Req() req: Request, @Body() body: SendMessageDto) {
    const senderId = (req as any).user.id; // or use a custom type (better)
    return this.chatService.sendMessage(senderId, body.receiverId, body.content);
  }

  @Get('getUnreadCount')
  getUserMessagesUnreadCount(@Req() req) {
    return this.chatService.getUserMessagesUnreadCount(req.user.id);
  }
}
