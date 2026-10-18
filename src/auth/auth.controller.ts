import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto/register.dto';
import { LoginDto } from './dto/login.dto/login.dto';
import { VerifyEmailDto, VerifyLoginCodeDto } from './dto/verify-email.dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto/resend-verification.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) { return this.authService.register(dto); }

  @Post('verify-email')
  @HttpCode(HttpStatus.OK)
  verifyEmail(@Body() dto: VerifyEmailDto) { return this.authService.verifyEmail(dto); }

  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  resendVerification(@Body() dto: ResendVerificationDto) { return this.authService.resendVerification(dto); }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('verify-login-code')
  @HttpCode(HttpStatus.OK)
  verifyLoginCode(@Body() dto: VerifyLoginCodeDto) { return this.authService.verifyLoginCode(dto); }
}
