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
  UseInterceptors,
  UploadedFiles,
  Request,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/config/storage.config';
import { SendFileDto } from './dto/send-file.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly ChatService: ChatService) { }

  @Get('chat_room/:id')
  @UseGuards(JwtAuthGuard)
  async getChatMessages(
    @Request() req: any,
    @Param('id') roomId: string,
    @Query('pageNo') pageNo: string,
    @Query('pageSize') pageSize: string,
  ) {
    const userId = req.user.id;
    return this.ChatService.getAllChatsInChatRoom(
      userId,
      roomId,
      Number(pageNo),
      Number(pageSize),
    );
  }

  @Get('chat_rooms')
  getUserChatRooms(@Request() req: any) {
    return this.ChatService.getUserChatRooms(req.user.id);
  }

 @Post('send_message')
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Request() req: Request, @Body() body: SendMessageDto) {
    const senderId = (req as any).user.id; // or use a custom type (better)
    return this.ChatService.sendMessage(senderId, body.receiverId, body.content);
  }

@Post('/uploadMessageFile')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  @UseGuards(JwtAuthGuard)
  async uploadMessageFile(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: Request,
    @Body() body: SendFileDto,

  ) {
    try {
      const senderId = (req as any).user.id;
      const receiverId = body.receiverId;
      if (!files || files.length === 0) {
        throw new BadRequestException('No files were uploaded.');
      }
      
      const results: any[] = [];

      if (files && files.length > 0) {
        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          let type: 'image' | 'audio' | 'video';

          if (file.mimetype.startsWith('image/')) {
            type = 'image';
          } else if (file.mimetype.startsWith('audio/')) {
            type = 'audio';
          } else if (file.mimetype.startsWith('video/')) {
            type = 'video';
          } else {
            continue;
          }

          const fileUrl = `/uploads/message/${type}/${file.filename}`;


          const result = await this.ChatService.uploadMessageFile(
            senderId,
            receiverId,
            type,
            fileUrl
          );
          results.push(result?.data,);
        }

        return {
          success: true,
          message: `${results.length} sent successfully`,
          data: results,
        }
      }
    } catch (error) {
      throw new InternalServerErrorException(error)
    }
  }  


  @Get('getUnreadCount')
  getUserMessagesUnreadCount(@Request() req) {
    return this.ChatService.getUserMessagesUnreadCount(req.user.id);
  }
}
