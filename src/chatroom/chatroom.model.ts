// src/chatroom/chatroom.model.ts
import {
  Column,
  Table,
  Model,
  ForeignKey,
  BelongsTo,
  HasMany,
  PrimaryKey,
} from 'sequelize-typescript';
import { User } from '../user/user.model';
import { Message } from '../message/message.model';

interface ChatRoomCreationAttrs {
  id: string;
  UserId1: string;
  UserId2: string;
}

@Table
export class ChatRoom extends Model<ChatRoom, ChatRoomCreationAttrs> {
  @PrimaryKey
  @Column
  declare id: string;

  @ForeignKey(() => User)
  @Column
  declare UserId1: string;

  @ForeignKey(() => User)
  @Column
  declare UserId2: string;

  @BelongsTo(() => User, 'UserId1')
  declare user1: User;

  @BelongsTo(() => User, 'UserId2')
  declare user2: User;

  @HasMany(() => Message)
  declare Messages: Message[];
}
