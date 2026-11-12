import { IsEmail, IsEnum, IsOptional } from 'class-validator';
import { RegisterRole } from '../register.dto/register.dto';
export class ResendVerificationDto {
  @IsEmail() email: string;
  @IsOptional() @IsEnum(RegisterRole) role?: RegisterRole;
}
