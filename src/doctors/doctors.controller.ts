import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { DoctorsService } from './doctors.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';

@Controller('doctors')
@UseGuards(JwtAuthGuard)
export class DoctorsController {
  constructor(private readonly doctorsService: DoctorsService) {}

  @Get()
  getDoctors() {
    return this.doctorsService.getDoctors();
  }

  @Get('specialties')
  getSpecialties() {
    return this.doctorsService.getSpecialties();
  }

  @Post()
  createDoctor(@Body() dto: any) {
    return this.doctorsService.createDoctor(dto);
  }

  @Put(':id')
  updateDoctor(@Param('id') id: string, @Body() dto: any) {
    return this.doctorsService.updateDoctor(id, dto);
  }

  @Delete(':id')
  deleteDoctor(@Param('id') id: string) {
    return this.doctorsService.deleteDoctor(id);
  }
}
