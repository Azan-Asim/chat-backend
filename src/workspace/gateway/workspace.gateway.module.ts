import { Module } from "@nestjs/common";
import { WorkspaceChatGateway } from "./gateway";
import { WorkspaceMessageHandlersService } from "../handlers/workspace-message-handlers.service";
import { WorkspaceHandlersService } from "../handlers/workspace-handlers.service";
import { SequelizeModule } from "@nestjs/sequelize";
import { User } from "src/user/user.model";
import { WorkspaceModule } from "../workspace.module";

@Module({
  imports:[SequelizeModule.forFeature([User]), WorkspaceModule],
  providers: [WorkspaceChatGateway, WorkspaceMessageHandlersService, WorkspaceHandlersService]
})

export class WorkspaceGatewayModule {}