import { Module } from '@nestjs/common';
import { WorkspaceController } from './workspace.controller';
import { WorkspaceService } from './workspace.service';
import { SequelizeModule } from '@nestjs/sequelize';
import { Workspace } from './models/workspace.model';
import { User } from 'src/user/user.model';
import { WorkspaceMember } from './models/workspaceMemeber.model';
import { Message } from 'src/message/message.model';
import { WorkspaceMessageHandlersService } from './handlers/workspace-message-handlers.service';
import { WorkspaceHandlersService } from './handlers/workspace-handlers.service';
import { MessageRead } from 'src/message/messageRead.model';

@Module({
  imports: [
    SequelizeModule.forFeature([Workspace, WorkspaceMember, User, Message, MessageRead]),
  ],
  controllers: [WorkspaceController],
  providers: [WorkspaceService, WorkspaceMessageHandlersService, WorkspaceHandlersService],
  exports: [WorkspaceService]
})
export class WorkspaceModule { }
