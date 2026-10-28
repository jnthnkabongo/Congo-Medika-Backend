import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { MessagesModule } from './messages/messages.module';
import { MeetSaaSModule } from './meet-saas/meet-saas.module';
import { TeleconsultationsModule } from './teleconsultations/teleconsultations.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), PrismaModule, AuthModule, MessagesModule, MeetSaaSModule, TeleconsultationsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
