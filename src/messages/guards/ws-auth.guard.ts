import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class WsAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const client = context.switchToWs().getClient();
    const token = client.handshake.auth.token || client.handshake.headers.authorization?.replace('Bearer ', '');

    console.log('WebSocket Auth - Token reçu:', token ? `${token.substring(0, 20)}...` : 'null');

    if (!token) {
      console.log('WebSocket Auth - Token manquant');
      throw new UnauthorizedException('Token manquant pour la connexion WebSocket');
    }

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.configService.get<string>('JWT_ACCESS_SECRET'),
      });
      console.log('WebSocket Auth - Token validé pour:', payload.email);
      client.user = payload;
      return true;
    } catch (error) {
      console.log('WebSocket Auth - Erreur de validation:', error instanceof Error ? error.message : String(error));
      throw new UnauthorizedException('Token invalide ou expiré');
    }
  }
}
