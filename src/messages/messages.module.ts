import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages/messages.gateway';
import { MessagesController } from './messages/messages.controller';
import { WsAuthGuard } from './guards/ws-auth.guard';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
      }),
      inject: [ConfigService],
    }),
    PrismaModule,
  ],
  controllers: [MessagesController],
  providers: [MessagesService, MessagesGateway, WsAuthGuard],
  exports: [MessagesGateway],
})
export class MessagesModule {}
