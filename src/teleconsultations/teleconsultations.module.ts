import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { TeleconsultationsService } from './teleconsultations.service';
import { TeleconsultationsController } from './teleconsultations.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_ACCESS_TTL') || '15m') as any,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [TeleconsultationsController],
  providers: [TeleconsultationsService],
  exports: [TeleconsultationsService],
})
export class TeleconsultationsModule {}
