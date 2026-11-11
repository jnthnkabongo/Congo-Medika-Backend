import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth/jwt-auth.guard';
import { CallsService } from './calls.service';

@Controller('calls')
@UseGuards(JwtAuthGuard)
export class CallsController {
  constructor(private readonly callsService: CallsService) {}

  @Get()
  async getUserCalls(@Request() req) {
    return this.callsService.getUserCalls(req.user);
  }

  @Get('all')
  async getAllCalls(@Request() req) {
    return this.callsService.getAllCalls(req.user);
  }
}
