import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TeleconsultationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeleconsultation(appointmentId: number, user: any) {
    // Vérifier que l'appointment existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: BigInt(appointmentId) },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    // L'appelant doit être le patient ou le médecin du rendez-vous
    const callerId = BigInt(user.sub);
    const isParty =
      appointment.patientId === callerId || appointment.doctorId === callerId;
    if (!isParty) {
      throw new ForbiddenException(
        `Accès refusé : le rendez-vous ${appointmentId} n'appartient pas à l'utilisateur ${user.sub}`,
      );
    }

    // Les ids viennent du rendez-vous (source de vérité), jamais du body
    const patientId = appointment.patientId;
    const doctorId = appointment.doctorId;

    // Vérifier si une téléconsultation existe déjà pour cet appointment
    const existingTeleconsultation = await this.prisma.teleconsultation.findUnique({
      where: { appointmentId: BigInt(appointmentId) },
    });

    if (existingTeleconsultation) {
      if (
        existingTeleconsultation.patientId === patientId &&
        existingTeleconsultation.doctorId === doctorId
      ) {
        console.log(
          `[Teleconsultations] Téléconsultation existante retournée pour appointmentId=${appointmentId} (roomId=${existingTeleconsultation.roomId})`,
        );
        return existingTeleconsultation;
      }
      // Téléconsultation incohérente (ids ne correspondant pas au rendez-vous)
      // → correction en place pour préserver roomId/messages
      console.warn(
        `[Teleconsultations] Téléconsultation ${existingTeleconsultation.id} incohérente ` +
          `(patientId=${existingTeleconsultation.patientId}≠${patientId}, ` +
          `doctorId=${existingTeleconsultation.doctorId}≠${doctorId}) — correction`,
      );
      return this.prisma.teleconsultation.update({
        where: { id: existingTeleconsultation.id },
        data: { patientId, doctorId },
      });
    }

    // Générer un roomId unique
    const roomId = `room-${uuidv4()}`;
    console.log(
      `[Teleconsultations] Création - appointmentId=${appointmentId}, patientId=${patientId}, doctorId=${doctorId}, roomId=${roomId}`,
    );

    // Créer la téléconsultation
    const teleconsultation = await this.prisma.teleconsultation.create({
      data: {
        uuid: uuidv4(),
        appointmentId: BigInt(appointmentId),
        patientId,
        doctorId,
        roomId,
        status: 'waiting',
      },
      include: {
        patient: true,
        doctor: true,
        appointment: true,
      },
    });

    return {
      id: teleconsultation.id.toString(),
      uuid: teleconsultation.uuid,
      appointmentId: teleconsultation.appointmentId.toString(),
      patientId: teleconsultation.patientId.toString(),
      doctorId: teleconsultation.doctorId.toString(),
      roomId: teleconsultation.roomId,
      meetingId: teleconsultation.meetingId,
      status: teleconsultation.status,
      startedAt: teleconsultation.startedAt,
      endedAt: teleconsultation.endedAt,
      createdAt: teleconsultation.createdAt,
      updatedAt: teleconsultation.updatedAt,
      patient: {
        id: teleconsultation.patient.id.toString(),
        firstName: teleconsultation.patient.firstName,
        lastName: teleconsultation.patient.lastName,
        email: teleconsultation.patient.email,
      },
      doctor: {
        id: teleconsultation.doctor.id.toString(),
        firstName: teleconsultation.doctor.firstName,
        lastName: teleconsultation.doctor.lastName,
        email: teleconsultation.doctor.email,
      },
    };
  }

  async getTeleconsultationsByPatient(patientId: number) {
    console.log(`[Teleconsultations] Recherche pour patientId=${patientId}`);
    const teleconsultations = await this.prisma.teleconsultation.findMany({
      where: { patientId: BigInt(patientId) },
      include: {
        patient: true,
        doctor: {
          include: {
            specialty: true,
          },
        },
        appointment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const result = teleconsultations.map((teleconsultation) => ({
      id: teleconsultation.id.toString(),
      uuid: teleconsultation.uuid,
      appointmentId: teleconsultation.appointmentId.toString(),
      patientId: teleconsultation.patientId.toString(),
      doctorId: teleconsultation.doctorId.toString(),
      roomId: teleconsultation.roomId,
      meetingId: teleconsultation.meetingId,
      status: teleconsultation.status,
      startedAt: teleconsultation.startedAt,
      endedAt: teleconsultation.endedAt,
      createdAt: teleconsultation.createdAt,
      updatedAt: teleconsultation.updatedAt,
      patient: {
        id: teleconsultation.patient.id.toString(),
        firstName: teleconsultation.patient.firstName,
        lastName: teleconsultation.patient.lastName,
        email: teleconsultation.patient.email,
      },
      doctor: {
        id: teleconsultation.doctor.id.toString(),
        firstName: teleconsultation.doctor.firstName,
        lastName: teleconsultation.doctor.lastName,
        email: teleconsultation.doctor.email,
        specialty: teleconsultation.doctor.specialty?.name,
      },
      appointment: {
        id: teleconsultation.appointment.id.toString(),
        appointmentDate: teleconsultation.appointment.appointmentDate,
        startTime: teleconsultation.appointment.startTime,
        endTime: teleconsultation.appointment.endTime,
        reason: teleconsultation.appointment.reason,
        status: teleconsultation.appointment.status,
      },
    }));

    console.log(
      `[Teleconsultations] ${result.length} téléconsultation(s) pour patientId=${patientId}` +
        (result.length > 0
          ? ` — doctorIds: ${result.map((t) => t.doctorId).join(', ')}`
          : ''),
    );
    return result;
  }

  async getTeleconsultationsByDoctor(doctorId: number) {
    const teleconsultations = await this.prisma.teleconsultation.findMany({
      where: { doctorId: BigInt(doctorId) },
      include: {
        patient: true,
        doctor: {
          include: {
            specialty: true,
          },
        },
        appointment: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return teleconsultations.map((teleconsultation) => ({
      id: teleconsultation.id.toString(),
      uuid: teleconsultation.uuid,
      appointmentId: teleconsultation.appointmentId.toString(),
      patientId: teleconsultation.patientId.toString(),
      doctorId: teleconsultation.doctorId.toString(),
      roomId: teleconsultation.roomId,
      meetingId: teleconsultation.meetingId,
      status: teleconsultation.status,
      startedAt: teleconsultation.startedAt,
      endedAt: teleconsultation.endedAt,
      createdAt: teleconsultation.createdAt,
      updatedAt: teleconsultation.updatedAt,
      patient: {
        id: teleconsultation.patient.id.toString(),
        firstName: teleconsultation.patient.firstName,
        lastName: teleconsultation.patient.lastName,
        email: teleconsultation.patient.email,
      },
      doctor: {
        id: teleconsultation.doctor.id.toString(),
        firstName: teleconsultation.doctor.firstName,
        lastName: teleconsultation.doctor.lastName,
        email: teleconsultation.doctor.email,
        specialty: teleconsultation.doctor.specialty?.name,
      },
      appointment: {
        id: teleconsultation.appointment.id.toString(),
        appointmentDate: teleconsultation.appointment.appointmentDate,
        startTime: teleconsultation.appointment.startTime,
        endTime: teleconsultation.appointment.endTime,
        reason: teleconsultation.appointment.reason,
        status: teleconsultation.appointment.status,
      },
    }));
  }

  async getTeleconsultationById(id: number, userId?: string, userRole?: 'patient' | 'doctor') {
    const teleconsultation = await this.prisma.teleconsultation.findUnique({
      where: { id: BigInt(id) },
      include: {
        patient: true,
        doctor: {
          include: {
            specialty: true,
          },
        },
        appointment: true,
      },
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

    return {
      id: teleconsultation.id.toString(),
      uuid: teleconsultation.uuid,
      appointmentId: teleconsultation.appointmentId.toString(),
      patientId: teleconsultation.patientId.toString(),
      doctorId: teleconsultation.doctorId.toString(),
      roomId: teleconsultation.roomId,
      meetingId: teleconsultation.meetingId,
      status: teleconsultation.status,
      startedAt: teleconsultation.startedAt,
      endedAt: teleconsultation.endedAt,
      createdAt: teleconsultation.createdAt,
      updatedAt: teleconsultation.updatedAt,
      patient: {
        id: teleconsultation.patient.id.toString(),
        firstName: teleconsultation.patient.firstName,
        lastName: teleconsultation.patient.lastName,
        email: teleconsultation.patient.email,
      },
      doctor: {
        id: teleconsultation.doctor.id.toString(),
        firstName: teleconsultation.doctor.firstName,
        lastName: teleconsultation.doctor.lastName,
        email: teleconsultation.doctor.email,
        specialty: teleconsultation.doctor.specialty?.name,
      },
      appointment: {
        id: teleconsultation.appointment.id.toString(),
        appointmentDate: teleconsultation.appointment.appointmentDate,
        startTime: teleconsultation.appointment.startTime,
        endTime: teleconsultation.appointment.endTime,
        reason: teleconsultation.appointment.reason,
        status: teleconsultation.appointment.status,
      },
    };
  }
}
