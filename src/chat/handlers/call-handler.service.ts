import { Injectable } from '@nestjs/common';
import { Op } from 'sequelize';
import { Server, Socket } from 'socket.io';
import { ChatRoom } from 'src/chatroom/chatroom.model';
import { User } from 'src/user/user.model';

@Injectable()
export class CallHandlersService {
  handle(
    server: Server,
    socket: Socket,
    onlineUsers: Map<string, Set<string>>,
    socketUserMap: Map<string, string>,
  ) {
    this.setupSocketListeners(server, socket, onlineUsers, socketUserMap);
  }

  private setupSocketListeners(
    server: Server,
    socket: Socket,
    onlineUsers: Map<string, Set<string>>,
    socketUserMap: Map<string, string>,
  ) {
    // WebRTC signaling events
    socket.on('offer', async (data) =>
      this.handleOffer(server, socket, data, onlineUsers, socketUserMap),
    );

    socket.on('answer', async (data) =>
      this.handleAnswer(server, socket, data, onlineUsers, socketUserMap),
    );

    socket.on('ice-candidate', async (data) =>
      this.handleIceCandidate(server, socket, data, onlineUsers, socketUserMap),
    );

    socket.on('end-call', async (data) =>
      this.handleEndCall(server, socket, data, onlineUsers, socketUserMap),
    );
  }

  private async handleOffer(
    server: Server,
    socket: Socket,
    data: { to: string; sdp: any },
    onlineUsers: Map<string, Set<string>>,
    socketUserMap: Map<string, string>,
  ) {
    const fromUserId = socketUserMap.get(socket.id);

    const user = await User.findByPk(fromUserId, {
      attributes: ['id', 'name', 'imageUrl', 'email']
    })

     let room = await ChatRoom.findOne({
              where: {
                [Op.or]: [
                  { UserId1: fromUserId, UserId2: data.to },
                  { UserId1: data.to, UserId2: fromUserId },
                ],
              },
    
              include: [
                { model: User, as: 'user1', attributes: ['id', 'name', 'email', 'imageUrl'] },
                { model: User, as: 'user2', attributes: ['id', 'name', 'email', 'imageUrl'] },
              ],
            });

    const targetSockets = onlineUsers.get(data.to);

    if (targetSockets && targetSockets.size > 0) {
      targetSockets.forEach((targetSocketId) => {
        server.to(targetSocketId).emit('offer', {
          from: user,
          roomId: room?.id,
          sdp: data.sdp,
        });
      });
    } else {
      console.warn(`⚠️ User ${data.to} is offline`);
    }
  }

  private async handleAnswer(
    server: Server,
    socket: Socket,
    data: { to: string; sdp: any },
    onlineUsers: Map<string, Set<string>>,
    socketUserMap: Map<string, string>,
  ) {
    console.log(data)
    const fromUserId = socketUserMap.get(socket.id);
    console.log(`✅ Answer from ${fromUserId} to ${data.to}`);

    const targetSocketIds = onlineUsers.get(data.to);
    if (targetSocketIds && targetSocketIds.size > 0) {
      targetSocketIds.forEach((targetSocketId) => {
        server.to(targetSocketId).emit('answer', {
          from: fromUserId,
          sdp: data.sdp,
        });
      });
    }
  }

  private async handleIceCandidate(
    server: Server,
    socket: Socket,
    data: { to: string; candidate: any },
    onlineUsers: Map<string, Set<string>>,
    socketUserMap: Map<string, string>,
  ) {
    const fromUserId = socketUserMap.get(socket.id);
    console.log(`🌐 ICE Candidate from ${fromUserId} to ${data.to}`);

    const targetSocketIds = onlineUsers.get(data.to);
    if (targetSocketIds && targetSocketIds.size > 0) {
      targetSocketIds.forEach((targetSocketId) => {
        server.to(targetSocketId).emit('ice-candidate', {
          from: fromUserId,
          candidate: data.candidate,
        });
      });
    }
  }

  private async handleEndCall(
    server: Server,
    socket: Socket,
    data: { to: string },
    onlineUsers: Map<string, Set<string>>,
    socketUserMap: Map<string, string>,
  ) {
    const fromUserId = socketUserMap.get(socket.id);
    console.log(`🔚 End call from ${fromUserId} to ${data.to}`);

    const targetSocketIds = onlineUsers.get(data.to);
    if (targetSocketIds && targetSocketIds.size > 0) {
      targetSocketIds.forEach((targetSocketId) => {
        server.to(targetSocketId).emit('end-call', {
          from: fromUserId,
        });
      });
    }
  }
}
