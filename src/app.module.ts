import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MessagesModule } from './messages/messages.module';
import { MeetSaaSModule } from './meet-saas/meet-saas.module';
import { TeleconsultationsModule } from './teleconsultations/teleconsultations.module';
import { AppointmentsModule } from './appointments/appointments.module';
import { WebRTCModule } from './webrtc/webrtc.module';
import { CallsModule } from './calls/calls.module';
import { DoctorsModule } from './doctors/doctors.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, MessagesModule, MeetSaaSModule, TeleconsultationsModule, AppointmentsModule, WebRTCModule, CallsModule, DoctorsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
