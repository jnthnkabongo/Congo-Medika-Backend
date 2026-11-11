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

  constructor(private readonly jwtService: JwtService) {}

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
  }
}
