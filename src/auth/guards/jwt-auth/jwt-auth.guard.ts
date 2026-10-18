import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: unknown }>();
    const [scheme, token] = (request.headers.authorization || '').split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Jeton d’accès manquant.');
    try {
      request.user = await this.jwt.verifyAsync(token, { secret: process.env.JWT_ACCESS_SECRET! });
      return true;
    } catch {
      throw new UnauthorizedException('Jeton d’accès invalide ou expiré.');
    }
  }
}
