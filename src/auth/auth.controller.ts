import { BadRequestException, Body, Controller, Get, HttpCode, HttpStatus, Post, Put, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto/register.dto';
import { LoginDto } from './dto/login.dto/login.dto';
import { VerifyEmailDto, VerifyLoginCodeDto } from './dto/verify-email.dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto/resend-verification.dto';
import { JwtAuthGuard } from './guards/jwt-auth/jwt-auth.guard';

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

  @Post('resend-login-code')
  @HttpCode(HttpStatus.OK)
  resendLoginCode(@Body() dto: ResendVerificationDto) { return this.authService.resendLoginCode(dto); }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) { return this.authService.login(dto); }

  @Post('verify-login-code')
  @HttpCode(HttpStatus.OK)
  verifyLoginCode(@Body() dto: VerifyLoginCodeDto) { return this.authService.verifyLoginCode(dto); }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  refresh(@Body() body: { refreshToken?: string }) {
    if (!body?.refreshToken) {
      throw new BadRequestException('refreshToken est requis.');
    }
    return this.authService.refresh(body.refreshToken);
  }

  @Post('meet-saas-token')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async generateMeetSaaSToken(@Request() req) {
    const user = req.user;
    return this.authService.generateMeetSaaSToken(BigInt(user.sub), user.role);
  }

  @Get('patients')
  @UseGuards(JwtAuthGuard)
  async getPatients(@Request() req) {
    return this.authService.getPatients();
  }

  @Get('doctors')
  @UseGuards(JwtAuthGuard)
  async getDoctors(@Request() req) {
    return this.authService.getDoctors();
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard)
  async updateProfile(@Request() req, @Body() dto: any) {
    return this.authService.updateProfile(req.user, dto);
  }
}
