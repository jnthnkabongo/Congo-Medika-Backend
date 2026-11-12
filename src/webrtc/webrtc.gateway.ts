import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

interface AuthenticatedSocket extends Socket {
  user?: {
    sub: string;
    role: string;
    email: string;
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  namespace: '/webrtc',
})
export class WebRTCGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private connectedUsers = new Map<string, string>(); // userId -> socketId

  constructor(
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        return;
      }

      const decoded = this.jwtService.verify(token);
      client.user = decoded;
      this.connectedUsers.set(decoded.sub, client.id);

      console.log(`User ${decoded.sub} (${decoded.role}) connected to WebRTC gateway`);
    } catch (error) {
      console.error('WebSocket authentication error:', error);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      this.connectedUsers.delete(client.user.sub);
      console.log(`User ${client.user.sub} disconnected from WebRTC gateway`);
    }
  }

  @SubscribeMessage('initiateCall')
  handleInitiateCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      targetUserId: string;
      targetUserRole: string;
      teleconsultationId: string;
      callType: 'audio' | 'video';
    },
  ) {
    if (!client.user) return;

    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (!targetSocketId) {
      client.emit('error', { message: 'Target user not connected' });
      return;
    }

    this.server.to(targetSocketId).emit('incomingCall', {
      callerId: client.user.sub,
      callerRole: client.user.role,
      callerEmail: client.user.email,
      teleconsultationId: data.teleconsultationId,
      callType: data.callType,
    });

    console.log(`Call initiated from ${client.user.sub} to ${data.targetUserId}`);
    this.persistCallInitiated(client.user, data).catch((e) =>
      console.error('Erreur persistance appel (initiate):', e),
    );
  }

  @SubscribeMessage('acceptCall')
  handleAcceptCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callerId: string; teleconsultationId: string },
  ) {
    if (!client.user) return;

    const callerSocketId = this.connectedUsers.get(data.callerId);
    if (!callerSocketId) {
      client.emit('error', { message: 'Caller not connected' });
      return;
    }

    this.server.to(callerSocketId).emit('callAccepted', {
      calleeId: client.user.sub,
      teleconsultationId: data.teleconsultationId,
    });

    console.log(`Call accepted by ${client.user.sub} for caller ${data.callerId}`);
    this.persistCallAccepted(client.user, data).catch((e) =>
      console.error('Erreur persistance appel (accept):', e),
    );
  }

  @SubscribeMessage('rejectCall')
  handleRejectCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { callerId: string; teleconsultationId: string },
  ) {
    if (!client.user) return;

    const callerSocketId = this.connectedUsers.get(data.callerId);
    if (!callerSocketId) return;

    this.server.to(callerSocketId).emit('callRejected', {
      calleeId: client.user.sub,
      teleconsultationId: data.teleconsultationId,
    });

    console.log(`Call rejected by ${client.user.sub} for caller ${data.callerId}`);
    this.persistCallRejected(client.user, data).catch((e) =>
      console.error('Erreur persistance appel (reject):', e),
    );
  }

  @SubscribeMessage('callOffer')
  handleCallOffer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      targetUserId: string;
      sdp: string;
      type: string;
      callType?: string;
      isRenegotiation?: boolean;
    },
  ) {
    if (!client.user) return;

    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (!targetSocketId) {
      client.emit('error', { message: 'Target user not connected' });
      return;
    }

    this.server.to(targetSocketId).emit('callOffer', {
      callerId: client.user.sub,
      sdp: data.sdp,
      type: data.type,
      ...(data.callType ? { callType: data.callType } : {}),
      isRenegotiation: data.isRenegotiation === true,
    });

    console.log(`SDP offer sent from ${client.user.sub} to ${data.targetUserId}`);
  }

  @SubscribeMessage('callAnswer')
  handleCallAnswer(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      targetUserId: string;
      sdp: string;
      type: string;
      callType?: string;
      isRenegotiation?: boolean;
    },
  ) {
    if (!client.user) return;

    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (!targetSocketId) {
      client.emit('error', { message: 'Target user not connected' });
      return;
    }

    this.server.to(targetSocketId).emit('callAnswer', {
      calleeId: client.user.sub,
      sdp: data.sdp,
      type: data.type,
      ...(data.callType ? { callType: data.callType } : {}),
      isRenegotiation: data.isRenegotiation === true,
    });

    console.log(`SDP answer sent from ${client.user.sub} to ${data.targetUserId}`);
  }

  @SubscribeMessage('iceCandidate')
  handleIceCandidate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: {
      targetUserId: string;
      candidate: string;
      sdpMid: string;
      sdpMLineIndex: number;
    },
  ) {
    if (!client.user) return;

    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (!targetSocketId) {
      client.emit('error', { message: 'Target user not connected' });
      return;
    }

    this.server.to(targetSocketId).emit('iceCandidate', {
      senderId: client.user.sub,
      targetUserId: data.targetUserId,
      candidate: data.candidate,
      sdpMid: data.sdpMid,
      sdpMLineIndex: data.sdpMLineIndex,
    });

    console.log(`ICE candidate sent from ${client.user.sub} to ${data.targetUserId}`);
  }

  @SubscribeMessage('endCall')
  handleEndCall(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { targetUserId: string; teleconsultationId: string },
  ) {
    if (!client.user) return;

    const targetSocketId = this.connectedUsers.get(data.targetUserId);
    if (!targetSocketId) return;

    this.server.to(targetSocketId).emit('callEnded', {
      callerId: client.user.sub,
      teleconsultationId: data.teleconsultationId,
    });

    console.log(`Call ended by ${client.user.sub} for ${data.targetUserId}`);
    this.persistCallEnded(client.user, data).catch((e) =>
      console.error('Erreur persistance appel (end):', e),
    );
  }

  private async persistCallInitiated(
    user: { sub: string; role: string },
    data: {
      targetUserId: string;
      targetUserRole: string;
      teleconsultationId: string;
      callType: 'audio' | 'video';
    },
  ) {
    const teleconsultation = await this.prisma.teleconsultation.findUnique({
      where: { id: BigInt(data.teleconsultationId) },
      select: { id: true, roomId: true },
    });
    if (!teleconsultation) {
      console.warn(
        `Téléconsultation ${data.teleconsultationId} introuvable, appel non enregistré`,
      );
      return;
    }

    // Éviter les doublons si initiateCall est renvoyé
    const existing = await this.prisma.call.findFirst({
      where: {
        teleconsultationId: teleconsultation.id,
        callerId: BigInt(user.sub),
        status: 'calling',
      },
    });
    if (existing) return;

    await this.prisma.call.create({
      data: {
        uuid: randomUUID(),
        teleconsultationId: teleconsultation.id,
        callerType: user.role as any,
        callerId: BigInt(user.sub),
        receiverType: data.targetUserRole as any,
        receiverId: BigInt(data.targetUserId),
        type: data.callType,
        roomId: teleconsultation.roomId,
        status: 'calling',
      },
    });
    console.log(`Appel ${data.callType} enregistré en base (calling)`);
  }

  private async persistCallAccepted(
    user: { sub: string; role: string },
    data: { callerId: string; teleconsultationId: string },
  ) {
    await this.prisma.call.updateMany({
      where: {
        teleconsultationId: BigInt(data.teleconsultationId),
        callerId: BigInt(data.callerId),
        status: 'calling',
      },
      data: { status: 'active', startedAt: new Date() },
    });
  }

  private async persistCallRejected(
    user: { sub: string; role: string },
    data: { callerId: string; teleconsultationId: string },
  ) {
    await this.prisma.call.updateMany({
      where: {
        teleconsultationId: BigInt(data.teleconsultationId),
        callerId: BigInt(data.callerId),
        status: 'calling',
      },
      data: { status: 'rejected', endedAt: new Date() },
    });
  }

  private async persistCallEnded(
    user: { sub: string; role: string },
    data: { targetUserId: string; teleconsultationId: string },
  ) {
    const userId = BigInt(user.sub);

    const call = await this.prisma.call.findFirst({
      where: {
        teleconsultationId: BigInt(data.teleconsultationId),
        status: { in: ['calling', 'active'] },
        OR: [
          { callerId: userId },
          { receiverId: userId },
        ],
      },
      orderBy: { createdAt: 'desc' },
    });
    if (!call) return;

    // Un appel raccroché avant réponse = manqué
    const status =
      call.status === 'calling'
        ? ('missed' as const)
        : ('completed' as const);

    await this.prisma.call.update({
      where: { id: call.id },
      data: { status, endedAt: new Date() },
    });
    console.log(`Appel ${call.type} clôturé en base (${status})`);
  }
}
