import { Module } from "@nestjs/common";
import { WorkspaceChatGateway } from "./gateway";
import { WorkspaceMessageHandlersService } from "../handlers/workspace-message-handlers.service";
import { WorkspaceHandlersService } from "../handlers/workspace-handlers.service";
import { SequelizeModule } from "@nestjs/sequelize";
import { User } from "src/user/user.model";

@Module({
  imports:[SequelizeModule.forFeature([User])],
  providers: [WorkspaceChatGateway, WorkspaceMessageHandlersService, WorkspaceHandlersService]
})

export class WorkspaceGatewayModule {}