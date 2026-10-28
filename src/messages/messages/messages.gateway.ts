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
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  user: {
    sub: string;
    uuid: string;
    email: string;
    role: 'patient' | 'doctor';
  };
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {}

  private async validateToken(client: Socket): Promise<boolean> {
    const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

    console.log('WebSocket Auth - Token reçu:', token ? `${token.substring(0, 20)}...` : 'null');

    if (!token) {
      console.log('WebSocket Auth - Token manquant');
      return false;
    }

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      console.log('WebSocket Auth - Token validé pour:', payload.email);
      (client as AuthenticatedSocket).user = payload;
      return true;
    } catch (error) {
      console.log('WebSocket Auth - Erreur de validation:', error instanceof Error ? error.message : String(error));
      return false;
    }
  }

  async handleConnection(client: AuthenticatedSocket) {
    const isValid = await this.validateToken(client);

    if (!isValid || !client.user) {
      console.log('Client connecté sans authentification valide');
      client.disconnect();
      return;
    }

    console.log(`Client connecté: ${client.user.email} (${client.user.role})`);
    // Rejoindre les téléconsultations actives de l'utilisateur
    const activeTeleconsultations = await this.prisma.teleconsultation.findMany({
      where: {
        status: { in: ['waiting', 'active'] },
        OR: [
          { patientId: BigInt(client.user.sub) },
          { doctorId: BigInt(client.user.sub) },
        ],
      },
    });

    activeTeleconsultations.forEach((tc) => {
      client.join(tc.roomId);
      console.log(`Client ${client.user.email} rejoint la room ${tc.roomId}`);
    });
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.user) {
      console.log(`Client déconnecté: ${client.user.email}`);
    } else {
      console.log('Client déconnecté (non authentifié)');
    }
  }

  @SubscribeMessage('joinRoom')
  async handleJoinRoom(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string },
  ) {
    // Vérifier que l'utilisateur a le droit de rejoindre cette room
    const teleconsultation = await this.prisma.teleconsultation.findUnique({
      where: { roomId: data.roomId },
    });

    if (!teleconsultation) {
      client.emit('error', { message: 'Téléconsultation non trouvée' });
      return;
    }

    const userId = BigInt(client.user.sub);
    const hasAccess =
      (client.user.role === 'patient' && teleconsultation.patientId === userId) ||
      (client.user.role === 'doctor' && teleconsultation.doctorId === userId);

    if (!hasAccess) {
      client.emit('error', { message: 'Accès non autorisé à cette téléconsultation' });
      return;
    }

    client.join(data.roomId);
    client.emit('joinedRoom', { roomId: data.roomId });
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { roomId: string; type: 'text' | 'audio'; content?: string; audioUrl?: string; audioDuration?: number },
  ) {
    // Vérifier l'accès à la téléconsultation
    const teleconsultation = await this.prisma.teleconsultation.findUnique({
      where: { roomId: data.roomId },
    });

    if (!teleconsultation) {
      client.emit('error', { message: 'Téléconsultation non trouvée' });
      return;
    }

    const userId = BigInt(client.user.sub);
    const hasAccess =
      (client.user.role === 'patient' && teleconsultation.patientId === userId) ||
      (client.user.role === 'doctor' && teleconsultation.doctorId === userId);

    if (!hasAccess) {
      client.emit('error', { message: 'Accès non autorisé' });
      return;
    }

    // Sauvegarder le message dans la base de données
    const { randomUUID } = await import('crypto');
    const message = await this.prisma.message.create({
      data: {
        uuid: randomUUID(),
        teleconsultationId: teleconsultation.id,
        senderType: client.user.role,
        senderId: userId,
        type: data.type,
        content: data.content,
        audioUrl: data.audioUrl,
        audioDuration: data.audioDuration,
      },
      include: {
        teleconsultation: {
          select: {
            patientId: true,
            doctorId: true,
          },
        },
      },
    });

    // Diffuser le message à tous les clients dans la room
    this.server.to(data.roomId).emit('newMessage', {
      id: message.id.toString(),
      uuid: message.uuid,
      teleconsultationId: teleconsultation.id.toString(),
      senderType: message.senderType,
      senderId: message.senderId.toString(),
      type: message.type,
      content: message.content,
      audioUrl: message.audioUrl,
      audioDuration: message.audioDuration,
      readAt: message.readAt,
      createdAt: message.createdAt,
    });
  }

  @SubscribeMessage('markAsRead')
  async handleMarkAsRead(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string },
  ) {
    const message = await this.prisma.message.findUnique({
      where: { id: BigInt(data.messageId) },
    });

    if (!message) {
      client.emit('error', { message: 'Message non trouvé' });
      return;
    }

    // Seul le destinataire peut marquer comme lu
    const userId = BigInt(client.user.sub);
    const isRecipient =
      (client.user.role === 'patient' && message.senderType === 'doctor') ||
      (client.user.role === 'doctor' && message.senderType === 'patient');

    if (!isRecipient) {
      client.emit('error', { message: 'Action non autorisée' });
      return;
    }

    await this.prisma.message.update({
      where: { id: message.id },
      data: { readAt: new Date() },
    });

    // Notifier l'expéditeur que le message a été lu
    this.server.emit('messageRead', { messageId: data.messageId });
  }
}
