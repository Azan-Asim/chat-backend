import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ChatModule } from './chat/chat.module';
import { DatabaseModule } from './db/db.module';
import { WorkspaceModule } from './workspace/workspace.module';
import { ConfigModule } from '@nestjs/config';
import { GatewayModule } from './chat/gateway/gateway.module';
import { UserModule } from './user/user.module';
import { WorkspaceGatewayModule } from './workspace/gateway/workspace.gateway.module';

@Module({
  imports: [ConfigModule.forRoot({
    isGlobal: true,
  }),
    ChatModule,
    DatabaseModule,
    WorkspaceModule,
    GatewayModule,
    WorkspaceGatewayModule,
    UserModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
