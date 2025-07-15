import { Module } from "@nestjs/common";
import { ChatGateway } from "./gateway";
import { MessageHandlersService } from "../handlers/message-handlers.service";
import { RoomHandlersService } from "../handlers/room-handlers.service";

@Module({
  providers: [ChatGateway, MessageHandlersService, RoomHandlersService]
})

export class GatewayModule {}