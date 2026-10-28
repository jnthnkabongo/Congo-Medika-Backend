import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { MeetSaaSService } from './meet-saas.service';
import { MeetSaaSController } from './meet-saas.controller';
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
  controllers: [MeetSaaSController],
  providers: [MeetSaaSService],
  exports: [MeetSaaSService],
})
export class MeetSaaSModule {}
