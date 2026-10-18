import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}
  async consumeChallenge(challengeId: string, purpose: 'EMAIL_VERIFICATION' | 'LOGIN_2FA') {
    return this.prisma.authCode.findFirst({ where: { challengeId, purpose } });
  }
}
