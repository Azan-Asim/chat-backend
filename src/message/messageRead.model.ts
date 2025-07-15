import {
  Column,
  Table,
  Model,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
} from 'sequelize-typescript';
import { Message } from './message.model';
import { User } from 'src/user/user.model';

@Table
export class MessageRead extends Model {
  @PrimaryKey
  @Column
  declare id: string;

  @ForeignKey(() => Message)
  @Column
  declare messageId: string;

  @ForeignKey(() => User)
  @Column
  declare userId: string;

  @BelongsTo(() => Message)
  message: Message;

  @BelongsTo(() => User)
  user: User;

  @Column
  declare readAt: Date;
}
