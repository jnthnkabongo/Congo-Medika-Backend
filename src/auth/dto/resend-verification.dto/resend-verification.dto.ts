import { IsEmail, IsEnum } from 'class-validator';
import { RegisterRole } from '../register.dto/register.dto';
export class ResendVerificationDto {
  @IsEmail() email: string;
  @IsEnum(RegisterRole) role: RegisterRole;
}
