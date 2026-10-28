import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMessagesByRoomId(roomId: string, userId?: string, userRole?: 'patient' | 'doctor') {
    const teleconsultation = await this.prisma.teleconsultation.findUnique({
      where: { roomId },
    });

    if (!teleconsultation) {
      throw new NotFoundException('Téléconsultation non trouvée');
    }

    // Vérifier l'accès si userId et userRole sont fournis
    if (userId && userRole) {
      const userIdBigInt = BigInt(userId);
      const hasAccess =
        (userRole === 'patient' && teleconsultation.patientId === userIdBigInt) ||
        (userRole === 'doctor' && teleconsultation.doctorId === userIdBigInt);

      if (!hasAccess) {
        throw new ForbiddenException('Accès non autorisé à cette téléconsultation');
      }
    }

    const messages = await this.prisma.message.findMany({
      where: {
        teleconsultationId: teleconsultation.id,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    return messages.map((message) => ({
      id: message.id.toString(),
      uuid: message.uuid,
      teleconsultationId: message.teleconsultationId.toString(),
      senderType: message.senderType,
      senderId: message.senderId.toString(),
      type: message.type,
      content: message.content,
      audioUrl: message.audioUrl,
      audioDuration: message.audioDuration,
      readAt: message.readAt,
      createdAt: message.createdAt,
    }));
  }
}
