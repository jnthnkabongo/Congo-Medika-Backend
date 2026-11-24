import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { DoctorsController } from './doctors.controller';
import { DoctorsService } from './doctors.service';
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
  controllers: [DoctorsController],
  providers: [DoctorsService],
})
export class DoctorsModule {}
