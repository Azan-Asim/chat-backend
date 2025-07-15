import {
  Table,
  Column,
  Model,
  PrimaryKey,
  HasMany,
  DataType,
  ForeignKey,
  BelongsTo,
} from 'sequelize-typescript';
import { WorkspaceMember } from './workspaceMemeber.model';
import { User } from 'src/user/user.model';
import { Message } from 'src/message/message.model';

@Table
export class Workspace extends Model {
  @PrimaryKey
  @Column
  declare id: string;

  @Column
  declare name: string;

  @Column({
    type: DataType.ENUM('public', 'private'),
  })
  declare type: 'public' | 'private';

  @ForeignKey(() => User)
  @Column
  declare createdBy: string;

  @BelongsTo(() => User, { as: 'creator', foreignKey: 'createdBy' })
  creator: User;


  @HasMany(() => WorkspaceMember, { as: 'members', foreignKey: 'workspaceId' })
  members: WorkspaceMember[];

  @HasMany(() => Message, { foreignKey: 'workspaceId' })
  messages: Message[]
}
