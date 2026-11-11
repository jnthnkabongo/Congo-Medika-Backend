import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class AppointmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAppointment(
    patientId: bigint,
    doctorId: bigint,
    appointmentDate: string,
    startTime: string,
    endTime: string,
    reason?: string,
  ) {
    // Vérifier que le patient et le médecin existent
    const patient = await this.prisma.patient.findUnique({
      where: { id: patientId },
    });

    if (!patient) {
      throw new Error('Patient non trouvé');
    }

    const doctor = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });

    if (!doctor) {
      throw new Error('Médecin non trouvé');
    }

    // Créer l'appointment
    const appointment = await this.prisma.appointment.create({
      data: {
        uuid: randomUUID(),
        patientId,
        doctorId,
        appointmentDate: new Date(appointmentDate),
        startTime: new Date(`1970-01-01T${startTime}`),
        endTime: new Date(`1970-01-01T${endTime}`),
        reason,
        status: 'pending',
      },
      include: {
        patient: true,
        doctor: true,
      },
    });

    return {
      id: appointment.id.toString(),
      uuid: appointment.uuid,
      patientId: appointment.patientId.toString(),
      doctorId: appointment.doctorId.toString(),
      appointmentDate: appointment.appointmentDate.toISOString(),
      startTime: appointment.startTime.toISOString().substring(11, 16), // HH:MM
      endTime: appointment.endTime.toISOString().substring(11, 16), // HH:MM
      reason: appointment.reason,
      status: appointment.status,
      patient: {
        id: appointment.patient.id.toString(),
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        email: appointment.patient.email,
      },
      doctor: {
        id: appointment.doctor.id.toString(),
        firstName: appointment.doctor.firstName,
        lastName: appointment.doctor.lastName,
        email: appointment.doctor.email,
      },
    };
  }

  async getUserAppointments(user: any) {
    const userId = BigInt(user.sub);
    const userRole = user.role;

    const appointments = await this.prisma.appointment.findMany({
      where: userRole === 'patient'
        ? { patientId: userId }
        : { doctorId: userId },
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return appointments.map((appointment) => ({
      id: appointment.id.toString(),
      uuid: appointment.uuid,
      patientId: appointment.patientId.toString(),
      doctorId: appointment.doctorId.toString(),
      appointmentDate: appointment.appointmentDate.toISOString(),
      startTime: appointment.startTime.toISOString().substring(11, 16), // HH:MM
      endTime: appointment.endTime.toISOString().substring(11, 16), // HH:MM
      reason: appointment.reason,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      patient: {
        id: appointment.patient.id.toString(),
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        email: appointment.patient.email,
      },
      doctor: {
        id: appointment.doctor.id.toString(),
        firstName: appointment.doctor.firstName,
        lastName: appointment.doctor.lastName,
        email: appointment.doctor.email,
      },
    }));
  }

  async getAllAppointments(user: any) {
    if (user.role !== 'doctor') {
      throw new Error('Accès non autorisé');
    }

    const appointments = await this.prisma.appointment.findMany({
      include: {
        patient: true,
        doctor: true,
      },
      orderBy: [
        { appointmentDate: 'asc' },
        { startTime: 'asc' },
      ],
    });

    return appointments.map((appointment) => ({
      id: appointment.id.toString(),
      uuid: appointment.uuid,
      patientId: appointment.patientId.toString(),
      doctorId: appointment.doctorId.toString(),
      appointmentDate: appointment.appointmentDate.toISOString(),
      startTime: appointment.startTime.toISOString().substring(11, 16), // HH:MM
      endTime: appointment.endTime.toISOString().substring(11, 16), // HH:MM
      reason: appointment.reason,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      patient: {
        id: appointment.patient.id.toString(),
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        email: appointment.patient.email,
      },
      doctor: {
        id: appointment.doctor.id.toString(),
        firstName: appointment.doctor.firstName,
        lastName: appointment.doctor.lastName,
        email: appointment.doctor.email,
      },
    }));
  }

  async getAppointmentById(id: string, user: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: BigInt(id) },
      include: {
        patient: true,
        doctor: true,
      },
    });

    if (!appointment) {
      throw new Error('Rendez-vous non trouvé');
    }

    // Vérifier que l'utilisateur a accès à ce rendez-vous
    const userId = BigInt(user.sub);
    const userRole = user.role;

    if (userRole === 'patient' && appointment.patientId !== userId) {
      throw new Error('Accès non autorisé');
    }

    return {
      id: appointment.id.toString(),
      uuid: appointment.uuid,
      patientId: appointment.patientId.toString(),
      doctorId: appointment.doctorId.toString(),
      appointmentDate: appointment.appointmentDate.toISOString(),
      startTime: appointment.startTime.toISOString().substring(11, 16), // HH:MM
      endTime: appointment.endTime.toISOString().substring(11, 16), // HH:MM
      reason: appointment.reason,
      status: appointment.status,
      paymentStatus: appointment.paymentStatus,
      patient: {
        id: appointment.patient.id.toString(),
        firstName: appointment.patient.firstName,
        lastName: appointment.patient.lastName,
        email: appointment.patient.email,
      },
      doctor: {
        id: appointment.doctor.id.toString(),
        firstName: appointment.doctor.firstName,
        lastName: appointment.doctor.lastName,
        email: appointment.doctor.email,
      },
    };
  }

  async updateAppointment(id: string, data: {
    appointmentDate?: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
    status?: string;
  }, user: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: BigInt(id) },
    });

    if (!appointment) {
      throw new Error('Rendez-vous non trouvé');
    }

    // Vérifier que l'utilisateur a accès à ce rendez-vous
    const userId = BigInt(user.sub);
    const userRole = user.role;

    if (userRole === 'patient' && appointment.patientId !== userId) {
      throw new Error('Accès non autorisé');
    }

    const updateData: any = {};
    if (data.appointmentDate) {
      updateData.appointmentDate = new Date(data.appointmentDate);
    }
    if (data.startTime) {
      updateData.startTime = new Date(`1970-01-01T${data.startTime}`);
    }
    if (data.endTime) {
      updateData.endTime = new Date(`1970-01-01T${data.endTime}`);
    }
    if (data.reason !== undefined) {
      updateData.reason = data.reason;
    }
    if (data.status) {
      updateData.status = data.status as any;
    }

    const updatedAppointment = await this.prisma.appointment.update({
      where: { id: BigInt(id) },
      data: updateData,
      include: {
        patient: true,
        doctor: true,
      },
    });

    return {
      id: updatedAppointment.id.toString(),
      uuid: updatedAppointment.uuid,
      patientId: updatedAppointment.patientId.toString(),
      doctorId: updatedAppointment.doctorId.toString(),
      appointmentDate: updatedAppointment.appointmentDate.toISOString(),
      startTime: updatedAppointment.startTime.toISOString().substring(11, 16), // HH:MM
      endTime: updatedAppointment.endTime.toISOString().substring(11, 16), // HH:MM
      reason: updatedAppointment.reason,
      status: updatedAppointment.status,
      paymentStatus: updatedAppointment.paymentStatus,
      patient: {
        id: updatedAppointment.patient.id.toString(),
        firstName: updatedAppointment.patient.firstName,
        lastName: updatedAppointment.patient.lastName,
        email: updatedAppointment.patient.email,
      },
      doctor: {
        id: updatedAppointment.doctor.id.toString(),
        firstName: updatedAppointment.doctor.firstName,
        lastName: updatedAppointment.doctor.lastName,
        email: updatedAppointment.doctor.email,
      },
    };
  }

  async deleteAppointment(id: string, user: any) {
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: BigInt(id) },
    });

    if (!appointment) {
      throw new Error('Rendez-vous non trouvé');
    }

    // Vérifier que l'utilisateur a accès à ce rendez-vous
    const userId = BigInt(user.sub);
    const userRole = user.role;

    if (userRole === 'patient' && appointment.patientId !== userId) {
      throw new Error('Accès non autorisé');
    }

    await this.prisma.appointment.delete({
      where: { id: BigInt(id) },
    });

    return { message: 'Rendez-vous supprimé avec succès' };
  }
}
