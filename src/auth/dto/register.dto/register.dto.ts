import { IsDateString, IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength, MaxLength, IsNumberString, IsIn } from 'class-validator';

export enum RegisterRole { PATIENT = 'patient', DOCTOR = 'doctor' }

export class RegisterDto {
  @IsEnum(RegisterRole) role: RegisterRole;
  @IsString() @IsNotEmpty() @MaxLength(100) firstName: string;
  @IsString() @IsNotEmpty() @MaxLength(100) lastName: string;
  @IsEmail() @MaxLength(150) email: string;
  @IsString() @IsNotEmpty() @MaxLength(30) phone: string;
  @IsString() @MinLength(6) @MaxLength(72) password: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
  @IsOptional() @IsString() address?: string;
  @IsOptional() @IsIn(['male', 'female', 'other']) gender?: string;
  @IsOptional() @IsNumberString() specialtyId?: string;
  @IsOptional() @IsString() licenseNumber?: string;
  @IsOptional() @IsString() bio?: string;
}
