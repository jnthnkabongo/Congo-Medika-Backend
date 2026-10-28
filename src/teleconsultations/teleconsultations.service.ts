import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class TeleconsultationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createTeleconsultation(data: {
    appointmentId: number;
    patientId: number;
    doctorId: number;
  }) {
    // Vérifier que l'appointment existe
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: BigInt(data.appointmentId) },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Rendez-vous non trouvé');
    }

    // Vérifier si une téléconsultation existe déjà pour cet appointment
    const existingTeleconsultation = await this.prisma.teleconsultation.findUnique({
      where: { appointmentId: BigInt(data.appointmentId) },
    });

    if (existingTeleconsultation) {
      return existingTeleconsultation;
    }

    // Générer un roomId unique
    const roomId = `room-${uuidv4()}`;

    // Créer la téléconsultation
    const teleconsultation = await this.prisma.teleconsultation.create({
      data: {
        uuid: uuidv4(),
        appointmentId: BigInt(data.appointmentId),
        patientId: BigInt(data.patientId),
        doctorId: BigInt(data.doctorId),
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
