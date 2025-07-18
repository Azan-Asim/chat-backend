// src/message/message.model.ts
import {
  Column,
  Table,
  Model,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  Default,
  DataType,
  HasMany,
} from 'sequelize-typescript';
import { ChatRoom } from '../chatroom/chatroom.model';
import { User } from '../user/user.model';
import { Workspace } from 'src/workspace/models/workspace.model';
import { MessageRead } from './messageRead.model';

interface MessageCreationAttrs {
  id: string;
  RoomId?: string;
  SenderId: string;
  ReceiverId?: string;
  workspaceId?: string;
  message_text: string;
  message_file_url?: string;
  type?: 'text' | 'audio' | 'video' | 'image';
}

@Table
export class Message extends Model<Message, MessageCreationAttrs> {
  @PrimaryKey
  @Column
  declare id: string;

  @Column({ type: 'LONGTEXT' })
  declare message_text: string;

  @Column
  declare message_file_url: string;

  @Default(false)
  @Column
  declare read: boolean;

  @Default(() => new Date())
  @Column
  declare timestamp: Date;

  @Column({
    type: DataType.ENUM('text', 'audio', 'video', 'image'),
    defaultValue: 'text',
  })
  declare type: 'text' | 'audio' | 'video' | 'image';

  @ForeignKey(() => ChatRoom)
  @Column
  declare RoomId: string;

  @ForeignKey(() => User)
  @Column
  declare SenderId: string;

  @ForeignKey(() => User)
  @Column
  declare ReceiverId: string;

  @ForeignKey(() => Workspace)
  @Column
  declare workspaceId: string;

  @BelongsTo(() => ChatRoom)
  declare chatRoom: ChatRoom;

  @BelongsTo(() => User, 'SenderId')
  declare Sender: User;

  @BelongsTo(() => User, 'ReceiverId')
  declare Receiver: User;

  @BelongsTo(() => Workspace, 'workspaceId')
  declare workspace: Workspace;

 @HasMany(() => MessageRead)
  messageReads: MessageRead[];
}
