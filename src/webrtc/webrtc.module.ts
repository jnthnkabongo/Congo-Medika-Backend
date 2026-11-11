import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WebRTCGateway } from './webrtc.gateway';
import { JwtModule } from '@nestjs/jwt';

@Module({
  imports: [
    ConfigModule,
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
  providers: [WebRTCGateway],
  exports: [WebRTCGateway],
})
export class WebRTCModule {}
