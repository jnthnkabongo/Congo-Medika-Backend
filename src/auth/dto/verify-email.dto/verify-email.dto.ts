import { IsString, Length, IsUUID } from 'class-validator';
export class VerifyEmailDto {
  @IsUUID() challengeId: string;
  @IsString() @Length(6, 6) code: string;
}
export class VerifyLoginCodeDto extends VerifyEmailDto {}
