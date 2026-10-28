import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenService {
  constructor(
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async issue(user: { id: bigint; uuid: string; email: string; firstName: string; lastName: string; externalRef?: string }, role: 'patient' | 'doctor') {
    const payload = { sub: user.id.toString(), uuid: user.uuid, email: user.email, role, externalRef: user.externalRef };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      expiresIn: (this.configService.get<string>('JWT_ACCESS_TTL') || '15m') as any,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: this.configService.get<string>('JWT_REFRESH_SECRET'),
      expiresIn: `${this.configService.get<string>('REFRESH_TOKEN_TTL_DAYS') || '30'}d` as any,
    });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: this.configService.get<string>('JWT_ACCESS_TTL') || '15m' };
  }
}
