import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Request, UseGuards } from '@nestjs/common';
import { WorkspaceService } from './workspace.service';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
// import { OptionalJwtAuthGuard } from 'src/auth/OptionalJwtAuthGuard';
import { UpdateWorkspaceDto } from './dto/updateWorkspace.dto';
import { AddUserToPublicWorkspaceDto } from './dto/addUserToPublicWorkspace.dto';
import { AddUserToPrivateWorkspaceDto } from './dto/addUserToPrivateWorkspace.dto copy';
import { SendMessageDto } from './dto/sendMessage.dto';

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

  @Post('/public/addUser')
  @UseGuards(JwtAuthGuard)
  async addUserInPublicWorkspace(
    @Request() req: any,
    @Body() body: AddUserToPublicWorkspaceDto,
  ) {
    const { workspaceId, userId } = body;
    return this.WorkspaceService.addUserInPublicWorkspace(req, workspaceId, userId);
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

  @Post('private/addUser')
  @UseGuards(JwtAuthGuard)
  async addUserInPrivateWorkspace(
    @Request() req: any,
    @Body() body: AddUserToPrivateWorkspaceDto,
  ) {
    const { workspaceId, userId } = body;
    return this.WorkspaceService.addUserInPrivateWorkspace(req, workspaceId, userId)
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @UseGuards(JwtAuthGuard)
  async getWorkspaceById(@Request() req: any, @Param('id') id: string) {
    return this.WorkspaceService.getWorkspaceById(req, id);
  }

  @Patch('private/:id')
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
  @UseGuards(JwtAuthGuard)
  async sendMessage(@Request() req: Request, @Body() body: SendMessageDto) {
    const senderId = (req as any).user.id; // or use a custom type (better)
    return this.WorkspaceService.sendMessage(senderId, body.workspaceId, body.content);
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
  
}