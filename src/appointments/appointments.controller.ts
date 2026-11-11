import { Controller, Post, Body, UseGuards, Request, Get, Put, Delete, Param } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';

@Controller('appointments')
@UseGuards(JwtAuthGuard)
export class AppointmentsController {
  constructor(private readonly appointmentsService: AppointmentsService) {}

  @Get()
  async getUserAppointments(@Request() req) {
    return this.appointmentsService.getUserAppointments(req.user);
  }

  @Get('all')
  async getAllAppointments(@Request() req) {
    return this.appointmentsService.getAllAppointments(req.user);
  }

  @Get(':id')
  async getAppointmentById(@Param('id') id: string, @Request() req) {
    return this.appointmentsService.getAppointmentById(id, req.user);
  }

  @Post()
  async createAppointment(@Body() data: {
    doctorId: number;
    appointmentDate: string;
    startTime: string;
    endTime: string;
    reason?: string;
  }, @Request() req) {
    const user = req.user;
    return this.appointmentsService.createAppointment(
      BigInt(user.sub),
      BigInt(data.doctorId),
      data.appointmentDate,
      data.startTime,
      data.endTime,
      data.reason,
    );
  }

  @Put(':id')
  async updateAppointment(@Param('id') id: string, @Body() data: {
    appointmentDate?: string;
    startTime?: string;
    endTime?: string;
    reason?: string;
    status?: string;
  }, @Request() req) {
    return this.appointmentsService.updateAppointment(id, data, req.user);
  }

  @Delete(':id')
  async deleteAppointment(@Param('id') id: string, @Request() req) {
    return this.appointmentsService.deleteAppointment(id, req.user);
  }
}
