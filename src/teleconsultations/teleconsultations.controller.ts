import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { TeleconsultationsService } from './teleconsultations.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';

@Controller('teleconsultations')
@UseGuards(JwtAuthGuard)
export class TeleconsultationsController {
  constructor(private readonly teleconsultationsService: TeleconsultationsService) {}

  @Post()
  async createTeleconsultation(@Body() data: { appointmentId: number }, @Request() req) {
    return this.teleconsultationsService.createTeleconsultation(
      data.appointmentId,
      req.user,
    );
  }

  @Get('patient')
  async getPatientTeleconsultations(@Request() req) {
    const user = req.user;
    console.log(
      `[Teleconsultations] GET /patient - user.sub=${user.sub}, role=${user.role}`,
    );
    return this.teleconsultationsService.getTeleconsultationsByPatient(parseInt(user.sub));
  }

  @Get('doctor')
  async getDoctorTeleconsultations(@Request() req) {
    const user = req.user;
    return this.teleconsultationsService.getTeleconsultationsByDoctor(parseInt(user.sub));
  }

  @Get(':id')
  async getTeleconsultationById(@Param('id') id: string, @Request() req) {
    const user = req.user;
    return this.teleconsultationsService.getTeleconsultationById(parseInt(id), user.sub, user.role);
  }
}
