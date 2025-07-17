import { BadRequestException, Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Request, UploadedFile, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
// import { OptionalJwtAuthGuard } from 'src/auth/OptionalJwtAuthGuard';
import { UpdateWorkspaceDto } from './dto/updateWorkspace.dto';
import { AddUserToPublicWorkspaceDto } from './dto/addUserToPublicWorkspace.dto';
import { AddUserToPrivateWorkspaceDto } from './dto/addUserToPrivateWorkspace.dto copy';
import { SendMessageDto } from './dto/sendMessage.dto';
import * as path from 'path';
import * as fs from 'fs';
import { CryptUtil } from 'src/utils/crypt.util';
import { diskStorage } from 'multer';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { multerOptions } from 'src/config/storage.config';

@Controller('workspace')
export class WorkspaceController {
  constructor(private readonly WorkspaceService: WorkspaceService) { }

  @Get('public')
  @UseGuards(JwtAuthGuard)
  async getPublicWorkspace(
    @Request() req: any,
    @Query('pageNo') pageNo: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.WorkspaceService.getAllPublicWorkspaces(req, Number(pageNo), Number(pageSize))
  }

  @Post('public/createWorkspace')
  @UseGuards(JwtAuthGuard)
  async createPublicWorkspace(
    @Request() req: any,
    @Body('name') name: string,
  ) {
    return this.WorkspaceService.createPublicWorkspace(req, name)
  }

  @Post('/addUser')
  @UseGuards(JwtAuthGuard)
  async addUserToWorkspace(
    @Request() req: any,
    @Body() body: AddUserToPublicWorkspaceDto,
  ) {
    const { workspaceId, userId } = body;
    return this.WorkspaceService.addUserToWorkspace(req, workspaceId, userId);
  }


  @Get('private')
  @UseGuards(JwtAuthGuard)
  async getPrivateWorkspace(
    @Request() req: any,
    @Query('pageNo') pageNo: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.WorkspaceService.getAllPrivateWorkspaces(Number(pageNo), Number(pageSize))
  }
  @Get('private/userWorkspaces')
  @UseGuards(JwtAuthGuard)
  async getUserPrivateWorkspaces(
    @Request() req: any,
    @Query('pageNo') pageNo: string,
    @Query('pageSize') pageSize: string,
  ) {
    return this.WorkspaceService.getUserPrivateWorkspaces(req, Number(pageNo), Number(pageSize))
  }

  @Post('private/createWorkspace')
  @UseGuards(JwtAuthGuard)
  async createPrivateWorkspace(
    @Request() req: any,
    @Body('name') name: string,
  ) {
    return this.WorkspaceService.createPrivateWorkspace(req, name)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @UseGuards(JwtAuthGuard)
  async getWorkspaceById(@Request() req: any, @Param('id') id: string) {
    return this.WorkspaceService.getWorkspaceById(req, id);
  }

  @Patch('/:id')
  @UseGuards(JwtAuthGuard)
  async updateWorkspaceById(
    @Request() req: any,
    @Param('id') id: string,
    @Body() updateWorkspaceDto: UpdateWorkspaceDto,
  ) {
    return this.WorkspaceService.updateWorkspaceById(req, id, updateWorkspaceDto);
  }

  @Delete('private/:id')
  @UseGuards(JwtAuthGuard)
  async deleteWorkspaceById(
    @Request() req: any,
    @Param('id') id: string
  ) {
    return this.WorkspaceService.deleteWorkspaceById(req, id);
  }

  @Delete(':workspaceId/member/:memberId')
  @UseGuards(JwtAuthGuard)
  async deleteWorkspaceMember(
    @Request() req: any,
    @Param('workspaceId') workspaceId: string,
    @Param('memberId') memberId: string
  ) {
    return this.WorkspaceService.deleteWorkspaceMember(req, workspaceId, memberId);
  }


  // message Related Routes

  @Post('chats/sendMessage')
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

        const result = await this.WorkspaceService.sendMessage(
          senderId,
          body.workspaceId,
          body.content || '',
          type,
          fileUrl
        );
        results.push(result?.data,);
      }

      return  {
          success: true,
          message: `${results.length} sent successfully`,
          data: results,
        }
    }

    if ((!files || files.length === 0) && body.content?.trim()) {
      return this.WorkspaceService.sendMessage(
        senderId,
        body.workspaceId,
        body.content
      );
    }

    throw new BadRequestException('No content or valid files provided.');
  }


  @Get('chats/:id')
  @UseGuards(JwtAuthGuard)
  async getWorkspaceChats(
    @Request() req: any,
    @Param('id') id: string,
    @Query('pageNo') pageNo?: number,
    @Query('pageSize') pageSize?: number,
  ) {
    return this.WorkspaceService.getWorkspaceChats(req, id, Number(pageNo), Number(pageSize));
  }


  // rooms related routes

  @Get('members/:id')
  @UseGuards(JwtAuthGuard)
  async getWorkspaceMembers(
    @Request() req: Request,
    @Param('id') id: string,
    @Query('pageNo') pageNo: string,
    @Query('pageSize') pageSize: string,) {
    const userId = (req as any).user.id;
    const workspaceId = id
    return this.WorkspaceService.getWorkspaceMembers(userId, workspaceId, Number(pageNo), Number(pageSize))
  }


  @Post('/updateWorkspacePicture/:id')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/workspaces',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${CryptUtil.generateId()}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          cb(new BadRequestException('Only image files (jpg, png, jpeg) are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  async updateWorkspacePicture(
    @Request() req: Request,
    @Param('id') id: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/workspaces/${file.filename}` : null;
    try {
      return await this.WorkspaceService.updateWorkspacePicture(
        id,
        req,
        imageUrl,
      );
    } catch (err) {
      if (file) {
        const filePath = path.join(process.cwd(), 'uploads', 'workspaces', file.filename);
        fs.unlink(filePath, (unlinkErr) => {
          if (unlinkErr) {
            console.error(`Failed to delete unused image: ${filePath}`, unlinkErr);
          }
        });
      }
      throw err; // rethrow original error
    }
  }

  @Patch('/updateMembertype/:id')
  @UseGuards(JwtAuthGuard)
  async updateMembertype(
    @Param('id') memberId: string,
    @Req() req: any,
  ) {
    return this.WorkspaceService.toggleUpdateMemberType(
      memberId,
      req.user.id,
    );
  }

  @Delete('/member/:id')
  @UseGuards(JwtAuthGuard)
  async deleteMemberById(
    @Param('id') memberId: string,
    @Req() req: any,
  ) {
    return this.WorkspaceService.deleteMemberById(
      memberId,
      req.user.id,
    );
  }

}