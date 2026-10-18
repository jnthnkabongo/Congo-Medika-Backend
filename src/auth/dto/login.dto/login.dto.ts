import { IsEmail, IsEnum, IsString, MinLength } from 'class-validator';
import { RegisterRole } from '../register.dto/register.dto';
export class LoginDto {
  @IsEnum(RegisterRole) role: RegisterRole;
  @IsEmail() email: string;
  @IsString() @MinLength(8) password: string;
}
