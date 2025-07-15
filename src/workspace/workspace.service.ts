import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Workspace } from './models/workspace.model';
import { User } from 'src/user/user.model';
import { failure, success } from 'src/utils/response.helper';
import { WorkspaceMember } from './models/workspaceMemeber.model';
import { UpdateWorkspaceDto } from './dto/updateWorkspace.dto';
import { CryptUtil } from 'src/utils/crypt.util';
import { Message } from 'src/message/message.model';
import { MessageRead } from 'src/message/messageRead.model';
import { Sequelize } from 'sequelize-typescript';

@Injectable()
export class WorkspaceService {
  constructor(
    @InjectModel(Workspace) private workspaceModel: typeof Workspace,
    @InjectModel(WorkspaceMember) private workspaceMemberModel: typeof WorkspaceMember,
    @InjectModel(Message) private messageModel: typeof Message,
    @InjectModel(User) private userModel: typeof User,
    @InjectModel(MessageRead) private messageReadModel: typeof MessageRead,
  ) { }

  async getAllPublicWorkspaces(req: any, pageNo?: number, pageSize?: number) {
    const userId = req.user.id
    try {
      const where = { type: 'public' };

      const totalCount = await this.workspaceModel.count({ where });

      const queryOptions: any = {
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'imageUrl'],
          },
          {
            model: Message,
            as: 'messages',
            attributes: [
              'message_text',
              'SenderId',
              'workspaceId',
              'type',
              'timestamp',
              'read',
            ],
            separate: true,
            limit: 1,
            order: [['timestamp', 'DESC']],
          },
          {
            model: WorkspaceMember,
            as: 'members',
            include: [
              {
                model: User,
                as: 'member',
                attributes: ['id', 'name', 'email', 'imageUrl'],
              },
            ],
          },
        ],
      };

      if (pageNo && pageSize) {
        queryOptions.limit = pageSize;
        queryOptions.offset = (pageNo - 1) * pageSize;
      }

      const publicWorkspaces = await this.workspaceModel.findAll(queryOptions);

     const allUnreadedCount = await Promise.all(
        publicWorkspaces.map(w => this.getWorkspaceUnreadCount(w.id, userId))
      );

      const transformed = publicWorkspaces.map(workspace => {
        const w = workspace.toJSON();

        const unreadInfo = allUnreadedCount.find(
          u => u.workspaceId === w.id
        );

        w.unreadedCount = unreadInfo ? unreadInfo.unreadedCount : 0;

        w.lastMessage = w.messages?.[0] || null;

        delete w.messages;

        return w;
      });


      return success(
        'Private Workspaces fetched successfully',
        transformed,
        {
          aa: allUnreadedCount,
          totals: totalCount,
          ...(pageNo && pageSize
            ? { pageNo, pageSize }
            : {}),
        }
      );


    } catch (error) {
      return failure(error.message || 'Failed to fetch public workspaces');
    }
  }

  async createPublicWorkspace(req: any, name: string) {
    const userId = req.user.id
    try {
      const newWorkspace = await this.workspaceModel.create({
        id: CryptUtil.generateId(),
        name,
        type: 'public',
        createdBy: userId,
      });

      await this.workspaceMemberModel.create({
        id: CryptUtil.generateId(),
        workspaceId: newWorkspace.id,
        userId: userId,
        type: 'admin',
      });

      return success('Public workspace created successfully', newWorkspace);
    } catch (error) {
      return failure(error.message || 'Failed to create public workspace');
    }
  }

  async addUserInPublicWorkspace(req: any, workspaceId: string, userId: string) {
    const reqUserId = req.user.id;
    try {
      const privateWorkspace = await this.workspaceModel.findOne({
        where: { type: 'public', id: workspaceId },
      });

      if (!privateWorkspace) {
        return failure('Public workspace not found');
      }

      const existingMember = await this.workspaceMemberModel.findOne({
        where: {
          workspaceId,
          userId,
        },
      });

      if (existingMember) {
        return failure('User is already a member of the private workspace');
      }

      const newMember = await this.workspaceMemberModel.create({
        id: CryptUtil.generateId(),
        workspaceId,
        userId,
        type: 'member',
      });

      return success(
        'User added to private workspace successfully',
        newMember
      );
    } catch (error) {
      return failure(error.message || 'Failed to add user to private workspace');
    }
  }

  async getAllPrivateWorkspaces(pageNo?: number, pageSize?: number) {
    try {
      const where = { type: 'private' };

      const totalCount = await this.workspaceModel.count({ where });

      const queryOptions: any = {
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'imageUrl'],
          },
          {
            model: WorkspaceMember,
            as: 'members',
            include: [
              {
                model: User,
                as: 'member',
                attributes: ['id', 'name', 'email', 'imageUrl'],
              },
            ],
          },
        ],
      };

      if (pageNo && pageSize) {
        queryOptions.limit = pageSize;
        queryOptions.offset = (pageNo - 1) * pageSize;
      }

      const publicWorkspaces = await this.workspaceModel.findAll(queryOptions);

      return success(
        'Private Workspaces fetched successfully',
        publicWorkspaces,
        {
          totals: totalCount,
          ...(pageNo && pageSize
            ? { pageNo, pageSize }
            : {}),
        }
      );
    } catch (error) {
      return failure(error.message || 'Failed to fetch private workspaces');
    }
  }

  async createPrivateWorkspace(req: any, name: string) {
    const userId = req.user.id
    try {
      const newWorkspace = await this.workspaceModel.create({
        id: CryptUtil.generateId(),
        name,
        type: 'private',
        createdBy: userId,
      });

      await this.workspaceMemberModel.create({
        id: CryptUtil.generateId(),
        workspaceId: newWorkspace.id,
        userId: userId,
        type: 'admin',
      });

      return success('Private workspace created successfully', newWorkspace);
    } catch (error) {
      return failure(error.message || 'Failed to create private workspace');
    }
  }

  async getUserPrivateWorkspaces(req: any, pageNo?: number, pageSize?: number) {
    const userId = req.user.id
    try {
      const where = { type: 'private' };

      const totalCount = await this.workspaceModel.count({
        where,
        include: [
          {
            model: WorkspaceMember,
            as: 'members',
            where: { userId },
          },
        ],
      });
      const queryOptions: any = {
        where,
        include: [
          {
            model: User,
            as: 'creator',
            attributes: ['id', 'name', 'email', 'imageUrl'],
          },
          {
            model: Message,
            as: 'messages',
            attributes: [
              'message_text',
              'SenderId',
              'workspaceId',
              'type',
              'timestamp',
              'read',
            ],
            separate: true,
            limit: 1,
            order: [['timestamp', 'DESC']],
          },
          {
            model: WorkspaceMember,
            as: 'members',
            where: { userId },
            include: [
              {
                model: User,
                as: 'member',
                attributes: ['id', 'name', 'email', 'imageUrl'],
              },
            ],
          },
        ],
      };

      if (pageNo && pageSize) {
        queryOptions.limit = pageSize;
        queryOptions.offset = (pageNo - 1) * pageSize;
      }

      const privateWorkspaces = await this.workspaceModel.findAll(queryOptions);

      const allUnreadedCount = await Promise.all(
        privateWorkspaces.map(w => this.getWorkspaceUnreadCount(w.id, userId))
      );

      const transformed = privateWorkspaces.map(workspace => {
        const w = workspace.toJSON();

        const unreadInfo = allUnreadedCount.find(
          u => u.workspaceId === w.id
        );

        w.unreadedCount = unreadInfo ? unreadInfo.unreadedCount : 0;

        w.lastMessage = w.messages?.[0] || null;

        delete w.messages;

        return w;
      });


      return success(
        'Private Workspaces fetched successfully',
        transformed,
        {
          aa: allUnreadedCount,
          totals: totalCount,
          ...(pageNo && pageSize
            ? { pageNo, pageSize }
            : {}),
        }
      );

    } catch (error) {
      return failure(error.message || 'Failed to fetch private workspaces');
    }
  }

  async addUserInPrivateWorkspace(req: any, workspaceId: string, userId: string) {
    const reqUserId = req.user.id;
    try {
      const privateWorkspace = await this.workspaceModel.findOne({
        where: { type: 'private', id: workspaceId },
      });

      if (!privateWorkspace) {
        return failure('Private workspace not found');
      }

      const isAdmin = await this.workspaceMemberModel.findOne({
        where: { userId: reqUserId, type: "admin" }
      })

      if (!isAdmin) {
        return failure('Only Admin can Add Members');
      }

      const existingMember = await this.workspaceMemberModel.findOne({
        where: {
          workspaceId,
          userId,
        },
      });

      console.log(existingMember)
      if (existingMember) {
        return failure('User is already a member of the private workspace');
      }

      const newMember = await this.workspaceMemberModel.create({
        id: CryptUtil.generateId(),
        workspaceId,
        userId,
        type: 'member',
      });

      return success(
        'User added to private workspace successfully',
        newMember
      );
    } catch (error) {
      return failure(error.message || 'Failed to add user to private workspace');
    }
  }

  async getWorkspaceById(req: any, id: string) {
    const userId = req?.user?.id ?? null;

    const singleWorkspace = await this.workspaceModel.findOne({
      where: { id },
      include: [
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'imageUrl'],
        },
        {
          model: WorkspaceMember,
          as: 'members',
          include: [
            {
              model: User,
              as: 'member',
              attributes: ['id', 'name', 'email', 'imageUrl'],
            },
          ],
        },
      ],
    });

    if (!singleWorkspace) {
      return failure('Workspace not found');
    }

    let isMember = false;
    const plainWorkspace = singleWorkspace.toJSON();
    if (userId && plainWorkspace.members) {
      console.log(plainWorkspace.members)
      isMember = plainWorkspace.members.some(
        (m) => m.userId === userId,
      );
    }

    return success('Workspace fetched successfully', {
      workspace: singleWorkspace,
      isMember: userId ? isMember : undefined,
    });
  }

  async updateWorkspaceById(req: any, id: string, updateWorkspaceDto: UpdateWorkspaceDto) {
    const userId = req.user.id

    const workspace = await this.workspaceModel.findOne({
      where: { id },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    console.log("wwwwU", userId)
    console.log("wwww", workspace)
    if (workspace.createdBy !== userId) {
      throw new ForbiddenException('You are not allowed to update this workspace');
    }

    await workspace.update(updateWorkspaceDto);

    return success('Workspace updated successfully', {
      workspace: workspace.toJSON(),
    });
  }

  async deleteWorkspaceById(req: any, workspaceId: string) {
    const userId = req.user.id;

    const workspace = await this.workspaceModel.findOne({
      where: { id: workspaceId },
      include: [
        {
          model: WorkspaceMember,
          as: 'members',
          attributes: ['userId', 'type'],
          include: [{
            model: User,
            as: "member"
          }]
        },
      ],
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const plainWorkspace = workspace.toJSON();

    const isCreator = plainWorkspace.createdBy === userId;

    const isAdmin = plainWorkspace.members.some(
      (m) => m.userId === userId && m.role === 'admin',
    );
    console.log(plainWorkspace)
    if (!isCreator && !isAdmin) {
      throw new ForbiddenException(
        'Only the creator or an admin can delete this workspace',
      );
    }

    await workspace.destroy();

    return success('Workspace deleted successfully', workspace);
  }


  async deleteWorkspaceMember(req: any, workspaceId: string, memberId: string) {
    const userId = req.user.id
    const member = await this.workspaceMemberModel.findOne({
      where: { workspaceId, userId: memberId },
    });

    if (!member) {
      throw new NotFoundException('Member not found in this workspace');
    }

    const workspace = await this.workspaceModel.findOne({ where: { id: workspaceId } });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    if (workspace.createdBy !== userId && userId !== memberId) {
      throw new ForbiddenException('You are not allowed to remove this member');
    }

    await member.destroy();

    return success('Member removed successfully', member);
  }

  // chat related methods

  async sendMessage(senderId: string, workspaceId: string, content: string) {

    const workspace = await this.workspaceModel.findOne({
      where: { id: workspaceId },
    });

    if (!workspace) {
      throw new NotFoundException('Workspace not found');
    }

    const isMember = await this.workspaceMemberModel.findOne({
      where: { workspaceId, userId: senderId },
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const message = await this.messageModel.create({
      id: `workspace-msg-${Date.now()}-${CryptUtil.generateId()}`,
      workspaceId: workspace.id,
      SenderId: senderId,
      message_text: content,
      type: 'workspace'
    });

    return success("Message Created Successfully", message);
  }

  async getWorkspaceChats(
    req: any,
    id: string,
    pageNo?: number,
    pageSize?: number
  ) {
    const userId = req.user.id;

    const isMember = await this.workspaceMemberModel.findOne({
      where: { workspaceId: id, userId },
    });

    if (!isMember) {
      throw new ForbiddenException('You are not a member of this workspace');
    }

    const singleWorkspace = await this.workspaceModel.findOne({
      where: { id },
      include: [
        {
          model: this.userModel,
          as: 'creator',
          attributes: ['id', 'name', 'email', 'imageUrl'],
        },
      ],
    });

    if (!singleWorkspace) {
      return failure('Workspace not found');
    }

    const totalCount = await this.messageModel.count({
      where: { workspaceId: id },
    });

    const messageQuery: any = {
      where: { workspaceId: id },
      order: [['timestamp', 'DESC']],
    };

    if (pageNo && pageSize) {
      messageQuery.limit = pageSize;
      messageQuery.offset = (pageNo - 1) * pageSize;
    }

    const members = await this.workspaceMemberModel.findAll({
      where: { workspaceId: id },
      attributes: ['userId'],
    });
    const memberIds = members.map(m => m.userId);

    const messages = await this.messageModel.findAll({
      ...messageQuery,
      include: [
        {
          model: User,
          as: 'Sender',
          attributes: ['id', 'name', 'email', 'imageUrl'],
        },
        {
          model: MessageRead,
          as: 'messageReads',
          attributes: ['userId', 'readAt'],
          include: [
            {
              model: User,
              as: 'user',
              attributes: ['id', 'name', 'email', 'imageUrl'],
            },
          ],
        },
      ],
    });

    const enrichedMessages = messages.map(msg => {
      const msgJSON = msg.toJSON();
      const readers = msgJSON.messageReads.map(r => r.userId);
      const allRead = memberIds.every(mid => readers.includes(mid));
      return {
        ...msgJSON,
        allRead,
      };
    });

    const workspace = singleWorkspace.toJSON();
    workspace.messages = enrichedMessages;

    return success(
      'Workspace fetched successfully',
      workspace,
      {
        totalCount,
        ...(pageNo && pageSize
          ? { pageNo, pageSize }
          : {}),
      }
    );
  }

  async getWorkspaceUnreadCount(workspaceId: string, userId: string) {
    // console.log(workspaceId, userId)
    try {
      const unreadMessages = await this.messageModel.findAll({
        where: { workspaceId },
        include: [
          {
            model: this.messageReadModel,
            as: 'messageReads',
            required: false,
            where: { userId },
          },
          {
            model: this.workspaceModel,
            attributes: ['id', 'name']
          },
        ],
        group: ['Message.id'],
        having: Sequelize.literal('COUNT(`messageReads`.`id`) = 0'),
      });
      return { unreadedCount: unreadMessages.length, workspaceId };

    } catch (error) {
      console.error('Error getting unread count:', error);
      throw error;
    }
  }

}
