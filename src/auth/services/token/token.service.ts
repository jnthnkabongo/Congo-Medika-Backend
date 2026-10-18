import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class TokenService {
  constructor(private readonly jwt: JwtService) {}
  async issue(user: { id: bigint; uuid: string; email: string; firstName: string; lastName: string }, role: 'patient' | 'doctor') {
    const payload = { sub: user.id.toString(), uuid: user.uuid, email: user.email, role };
    const accessToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET!,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as any,
    });
    const refreshToken = await this.jwt.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET!,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as any,
    });
    return { accessToken, refreshToken, tokenType: 'Bearer', expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m' };
  }
}
