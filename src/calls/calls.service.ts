import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CallsService {
  constructor(private prisma: PrismaService) {}

  async getUserCalls(user: any) {
    const userId = user.sub;
    const userRole = user.role;

    const calls = await this.prisma.call.findMany({
      where: {
        OR: [
          {
            callerType: userRole as any,
            callerId: BigInt(userId),
          },
          {
            receiverType: userRole as any,
            receiverId: BigInt(userId),
          },
        ],
      },
      include: {
        teleconsultation: {
          include: {
            patient: true,
            doctor: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return calls.map((call) => ({
      id: call.id.toString(),
      uuid: call.uuid,
      type: call.type,
      status: call.status,
      startedAt: call.startedAt?.toISOString() || null,
      endedAt: call.endedAt?.toISOString() || null,
      createdAt: call.createdAt?.toISOString() || null,
      duration: call.endedAt && call.startedAt
        ? Math.floor(
            (new Date(call.endedAt).getTime() -
              new Date(call.startedAt).getTime()) /
              1000,
          )
        : null,
      callerType: call.callerType,
      callerId: call.callerId.toString(),
      receiverType: call.receiverType,
      receiverId: call.receiverId.toString(),
      teleconsultation: call.teleconsultation
        ? {
            id: call.teleconsultation.id.toString(),
            patientId: call.teleconsultation.patientId.toString(),
            doctorId: call.teleconsultation.doctorId.toString(),
            patient: call.teleconsultation.patient
              ? {
                  id: call.teleconsultation.patient.id.toString(),
                  firstName: call.teleconsultation.patient.firstName,
                  lastName: call.teleconsultation.patient.lastName,
                }
              : null,
            doctor: call.teleconsultation.doctor
              ? {
                  id: call.teleconsultation.doctor.id.toString(),
                  firstName: call.teleconsultation.doctor.firstName,
                  lastName: call.teleconsultation.doctor.lastName,
                }
              : null,
          }
        : null,
    }));
  }

  async getAllCalls(user: any) {
    if (user.role !== 'doctor') {
      throw new Error('Accès non autorisé');
    }

    const calls = await this.prisma.call.findMany({
      include: {
        teleconsultation: {
          include: {
            patient: true,
            doctor: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return calls.map((call) => ({
      id: call.id.toString(),
      uuid: call.uuid,
      type: call.type,
      status: call.status,
      startedAt: call.startedAt?.toISOString() || null,
      endedAt: call.endedAt?.toISOString() || null,
      createdAt: call.createdAt?.toISOString() || null,
      duration: call.endedAt && call.startedAt
        ? Math.floor(
            (new Date(call.endedAt).getTime() -
              new Date(call.startedAt).getTime()) /
              1000,
          )
        : null,
      callerType: call.callerType,
      callerId: call.callerId.toString(),
      receiverType: call.receiverType,
      receiverId: call.receiverId.toString(),
      teleconsultation: call.teleconsultation
        ? {
            id: call.teleconsultation.id.toString(),
            patientId: call.teleconsultation.patientId.toString(),
            doctorId: call.teleconsultation.doctorId.toString(),
            patient: call.teleconsultation.patient
              ? {
                  id: call.teleconsultation.patient.id.toString(),
                  firstName: call.teleconsultation.patient.firstName,
                  lastName: call.teleconsultation.patient.lastName,
                }
              : null,
            doctor: call.teleconsultation.doctor
              ? {
                  id: call.teleconsultation.doctor.id.toString(),
                  firstName: call.teleconsultation.doctor.firstName,
                  lastName: call.teleconsultation.doctor.lastName,
                }
              : null,
          }
        : null,
    }));
  }
}
