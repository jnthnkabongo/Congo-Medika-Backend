import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { EmailService } from './services/email/email.service';
import { TokenService } from './services/token/token.service';
import { SessionService } from './services/session/session.service';
import { EmailModule } from './services/email/email.service.spec';

@Module({
  imports: [JwtModule.register({}), EmailModule],
  controllers: [AuthController],
  providers: [AuthService, EmailService, TokenService, SessionService],
  exports: [AuthService],
})
export class AuthModule {}
