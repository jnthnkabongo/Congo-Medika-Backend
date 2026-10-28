import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';

export interface CreateMeetingOptions {
  title: string;
  description?: string;
  mode: 'VIDEO' | 'AUDIO';
  scheduledAt?: string;
  endedAt?: string;
  duration?: number;
  maxParticipants?: number;
}

export interface MeetSaaSMeetingResponse {
  meetingId: string;
  title: string;
  description: string;
  mode: string;
  scheduledAt: string;
  endedAt: string;
  duration: number;
  maxParticipants: number;
  createdAt: string;
  updatedAt: string;
  token?: string;
  organizationId?: string;
}

@Injectable()
export class MeetSaaSService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async createMeeting(options: CreateMeetingOptions): Promise<MeetSaaSMeetingResponse> {
    try {
      const apiKey = this.configService.get<string>('MEET_SAAS_API_KEY');
      const apiSecret = this.configService.get<string>('MEET_SAAS_API_SECRET');

      if (!apiKey || !apiSecret) {
        throw new HttpException('Meet SaaS API credentials not configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Générer un meetingId unique
      const meetingId = randomUUID();

      console.log('Creating Meet SaaS meeting with options:', { ...options, meetingId });

      const response = await axios.post(
        // 'https://api.meet-saas.com/api/v1/public/meetings',
        'https://stax.verstands.dev/api/v1/public/meetings',
        {
          meetingId: meetingId,
          title: options.title,
          description: options.description || 'Téléconsultation CongoMedika',
          mode: options.mode,
          scheduledAt: options.scheduledAt,
          endedAt: options.endedAt,
          duration: options.duration || 60,
          maxParticipants: options.maxParticipants || 2,
        },
        {
          headers: {
            'x-api-key': apiKey,
            'x-api-secret': apiSecret,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Meet SaaS meeting created:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error creating Meet SaaS meeting:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data?.message?.join(', ') || error.response?.data?.error || 'Failed to create Meet SaaS meeting',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async createMeetingForTeleconsultation(teleconsultationId: bigint, mode: 'VIDEO' | 'AUDIO' = 'VIDEO', userExternalRef?: string, userOrganizationId?: string) {
    try {
      console.log(`Creating Meet SaaS meeting for teleconsultation ${teleconsultationId}`);

      // Récupérer la téléconsultation avec les détails du docteur et patient
      const teleconsultation = await this.prisma.teleconsultation.findUnique({
        where: { id: teleconsultationId },
        include: {
          doctor: {
            select: { firstName: true, lastName: true, externalRef: true, organizationId: true },
          },
          patient: {
            select: { firstName: true, lastName: true, externalRef: true, organizationId: true },
          },
          appointment: {
            select: { appointmentDate: true, startTime: true, endTime: true },
          },
        },
      });

      if (!teleconsultation) {
        throw new HttpException('Teleconsultation not found', HttpStatus.NOT_FOUND);
      }

      console.log('Teleconsultation data:', {
        doctorId: teleconsultation.doctorId,
        patientId: teleconsultation.patientId,
        doctor: teleconsultation.doctor,
        patient: teleconsultation.patient,
      });

      // Créer le titre de la réunion
      const title = `Consultation Dr. ${teleconsultation.doctor.lastName} - ${teleconsultation.patient.firstName} ${teleconsultation.patient.lastName}`;

      // Calculer les dates si un rendez-vous existe
      let scheduledAt: string | undefined;
      let endedAt: string | undefined;
      let duration = 60; // 60 minutes par défaut

      if (teleconsultation.appointment) {
        const appointmentDate = teleconsultation.appointment.appointmentDate;
        const startTime = teleconsultation.appointment.startTime;
        const endTime = teleconsultation.appointment.endTime;

        console.log('Appointment details:', { appointmentDate, startTime, endTime });

        // Extraire l'heure au format HH:mm:ss depuis les objets Date de TIME
        const startTimeStr = startTime.toTimeString().split(' ')[0]; // "15:29:28"
        const endTimeStr = endTime.toTimeString().split(' ')[0]; // "15:59:28"

        // Formater la date en YYYY-MM-DD
        const dateStr = appointmentDate.toISOString().split('T')[0]; // "2026-10-20"

        // Combiner date et heure
        const combinedStart = `${dateStr}T${startTimeStr}`;
        const combinedEnd = `${dateStr}T${endTimeStr}`;

        console.log('Combined dates:', { combinedStart, combinedEnd });

        const startDate = new Date(combinedStart);
        const endDate = new Date(combinedEnd);

        console.log('Parsed dates:', { startDate, endDate, isValidStart: !isNaN(startDate.getTime()), isValidEnd: !isNaN(endDate.getTime()) });

        if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime())) {
          scheduledAt = startDate.toISOString();
          endedAt = endDate.toISOString();

          // Calculer la durée en minutes
          duration = Math.floor((endDate.getTime() - startDate.getTime()) / 60000);
        } else {
          console.warn('Invalid appointment dates, using default dates');
          // Utiliser des dates par défaut si les dates sont invalides
          const now = new Date();
          const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
          scheduledAt = now.toISOString();
          endedAt = inOneHour.toISOString();
        }
      } else {
        // Si pas de rendez-vous, utiliser des dates par défaut (maintenant + 1 heure)
        console.log('No appointment found, using default dates');
        const now = new Date();
        const inOneHour = new Date(now.getTime() + 60 * 60 * 1000);
        scheduledAt = now.toISOString();
        endedAt = inOneHour.toISOString();
      }

      // Créer la réunion Meet SaaS
      const meeting = await this.createMeeting({
        title,
        description: 'Téléconsultation CongoMedika',
        mode,
        scheduledAt,
        endedAt,
        duration,
        maxParticipants: 2,
      });

      // Mettre à jour la téléconsultation avec le meetingId
      await this.prisma.teleconsultation.update({
        where: { id: teleconsultationId },
        data: { meetingId: meeting.meetingId },
      });

      console.log(`Teleconsultation ${teleconsultationId} updated with meetingId: ${meeting.meetingId}`);

      // Générer le token Meet SaaS pour cette réunion
      try {
        // Utiliser l'externalRef de l'utilisateur passé en paramètre en priorité
        const externalRef = userExternalRef || teleconsultation.doctor.externalRef || teleconsultation.patient.externalRef;

        // Utiliser l'organizationId de l'utilisateur connecté en priorité
        const organizationId = userOrganizationId || teleconsultation.doctor.organizationId || teleconsultation.patient.organizationId;

        console.log('Token generation parameters:', {
          userExternalRef,
          userOrganizationId,
          doctorExternalRef: teleconsultation.doctor.externalRef,
          patientExternalRef: teleconsultation.patient.externalRef,
          selectedExternalRef: externalRef,
          doctorOrgId: teleconsultation.doctor.organizationId,
          patientOrgId: teleconsultation.patient.organizationId,
          selectedOrgId: organizationId,
        });

        if (organizationId && externalRef) {
          const meetSaaSToken = await this.generateMeetSaaSToken(meeting.meetingId, organizationId, externalRef);
          console.log('Meet SaaS token generated for meeting:', meetSaaSToken);

          // Inclure le token et organizationId dans la réponse
          return {
            ...meeting,
            token: meetSaaSToken.token,
            organizationId: organizationId,
          };
        } else {
          console.warn('No organizationId or externalRef found, skipping token generation');
          // Retourner quand même le meetingId pour que le frontend puisse l'utiliser
          return {
            ...meeting,
            organizationId: organizationId,
          };
        }
      } catch (error) {
        console.error('Error generating Meet SaaS token for meeting:', error);
        // Retourner la réunion avec organizationId même si la génération échoue
        return {
          ...meeting,
          organizationId: userOrganizationId || teleconsultation.doctor.organizationId || teleconsultation.patient.organizationId,
        };
      }
    } catch (error) {
      console.error('Error creating meeting for teleconsultation:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to create meeting for teleconsultation', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async generateMeetSaaSToken(meetingId: string, organizationId: string, externalRef: string): Promise<{ token: string; userId: string; name: string; expiresIn: number }> {
    try {
      const apiKey = this.configService.get<string>('MEET_SAAS_API_KEY');
      const apiSecret = this.configService.get<string>('MEET_SAAS_API_SECRET');

      if (!apiKey || !apiSecret) {
        throw new HttpException('Meet SaaS API credentials not configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      console.log('Generating Meet SaaS token for meeting:', { meetingId, organizationId, externalRef });

      const response = await axios.post(
        // 'https://api.meet-saas.com/api/v1/public/auth/token',
        'https://stax.verstands.dev/api/v1/public/auth/token',
        {
          meetingId: meetingId,
          externalRef: externalRef,
        },
        {
          headers: {
            'x-api-key': apiKey,
            'x-api-secret': apiSecret,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Meet SaaS token generated:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('Error generating Meet SaaS token:', error.response?.data || error.message);
      throw new HttpException(
        error.response?.data?.message?.join(', ') || error.response?.data?.error || 'Failed to generate Meet SaaS token',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
