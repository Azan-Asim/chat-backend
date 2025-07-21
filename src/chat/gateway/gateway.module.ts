import { forwardRef, Module } from "@nestjs/common";
import { ChatGateway } from "./gateway";
import { MessageHandlersService } from "../handlers/message-handlers.service";
import { RoomHandlersService } from "../handlers/room-handlers.service";
import { ChatModule } from "../chat.module";

@Module({
  imports: [forwardRef(()=> ChatModule)],
  providers: [ChatGateway, MessageHandlersService, RoomHandlersService]
})

export class GatewayModule {}