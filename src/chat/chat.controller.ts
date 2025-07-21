// src/chat/chat.controller.ts
import {
  Controller,
  Get,
  Param,
  Post,
  Body,
  UseGuards,
  Query,
  UseInterceptors,
  UploadedFiles,
  Request,
  BadRequestException,
  InternalServerErrorException,
  Patch,
  Delete,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SendMessageDto } from './dto/send-message.dto';
import { FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/config/storage.config';
import { SendFileDto } from './dto/send-file.dto';
import { editMessageDto } from './dto/edit-message.dto';

@Controller('chat')
@UseGuards(JwtAuthGuard)
export class ChatController {
  constructor(private readonly ChatService: ChatService) { }

  @Get('chatRooms/:id')
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

  @Get('chatRooms')
  getUserChatRooms(
    @Request() req: any,
    @Query('pageNo') pageNo: string,
    @Query('pageSize') pageSize: string,
  ) {
    const userId = req.user.id;

    return this.ChatService.getUserChatRooms(
      userId,
      Number(pageNo),
      Number(pageSize),
    );
  }

  @Post('/sendMessage')
  @UseInterceptors(FilesInterceptor('files', 10, multerOptions))
  @UseGuards(JwtAuthGuard)
  async sendMessage(
    @UploadedFiles() files: Express.Multer.File[],
    @Request() req: Request,
    @Body() body: SendMessageDto
  ) {
    const senderId = (req as any).user.id;

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

        const result = await this.ChatService.sendMessage(
          senderId,
          body.receiverId,
          body.content || '',
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

    if ((!files || files.length === 0) && body.content?.trim()) {
      return this.ChatService.sendMessage(
        senderId,
        body.receiverId,
        body.content
      );
    }

    throw new BadRequestException('No content or valid files provided.');
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

  @Patch('editMessage/:id')
  editMessage(
    @Request() req:any,
    @Param('id') id:string,
    @Body() body:editMessageDto
  ) {
    return this.ChatService.editMessage(req, id, body);
  }

  @Delete('deleteMessage/:id')
  delteMessage(
    @Request() req:any,
    @Param('id') id:string,
  ) {
    return this.ChatService.deleteMessage(req, id);
  }

  @Get('getUnreadCount')
  getUserMessagesUnreadCount(@Request() req) {
    return this.ChatService.getUserMessagesUnreadCount(req.user.id);
  }
}
