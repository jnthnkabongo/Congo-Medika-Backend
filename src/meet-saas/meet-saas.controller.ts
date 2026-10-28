import { Controller, Post, Body, UseGuards, Request, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { MeetSaaSService } from './meet-saas.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('meet-saas')
@UseGuards(JwtAuthGuard)
export class MeetSaaSController {
  constructor(
    private readonly meetSaaSService: MeetSaaSService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('meetings')
  @HttpCode(HttpStatus.OK)
  async createMeeting(@Body() body: { mode?: 'VIDEO' | 'AUDIO' }) {
    return {
      message: 'This endpoint should be called with a specific teleconsultation ID',
      note: 'Use POST /meet-saas/teleconsultations/:id/meeting instead',
    };
  }

  @Post('teleconsultations/:id/meeting')
  @HttpCode(HttpStatus.OK)
  async createMeetingForTeleconsultation(
    @Param('id') id: string,
    @Body() body: { mode?: 'VIDEO' | 'AUDIO' },
    @Request() req,
  ) {
    const mode = body.mode || 'VIDEO';
    const user = req.user;

    console.log('User from JWT:', user);

    // Utiliser l'externalRef directement depuis le JWT si disponible
    let userExternalRef: string | null = user.externalRef || null;
    let userOrganizationId: string | null = null;

    // Récupérer aussi l'organizationId depuis la DB
    if (user.sub) {
      if (user.role === 'doctor') {
        const doctor = await this.prisma.doctor.findUnique({
          where: { id: BigInt(user.sub) },
          select: { externalRef: true, organizationId: true },
        });
        userExternalRef = userExternalRef || doctor?.externalRef || null;
        userOrganizationId = doctor?.organizationId || null;
      } else if (user.role === 'patient') {
        const patient = await this.prisma.patient.findUnique({
          where: { id: BigInt(user.sub) },
          select: { externalRef: true, organizationId: true },
        });
        userExternalRef = userExternalRef || patient?.externalRef || null;
        userOrganizationId = patient?.organizationId || null;
      }
    }

    console.log('User externalRef:', userExternalRef);
    console.log('User organizationId:', userOrganizationId);

    return this.meetSaaSService.createMeetingForTeleconsultation(
      BigInt(id),
      mode,
      userExternalRef || undefined,
      userOrganizationId || undefined,
    );
  }
}
