import {
  BadRequestException, ConflictException, Injectable, UnauthorizedException, HttpException, HttpStatus,
} from '@nestjs/common';
import { randomInt, randomUUID, createHmac, timingSafeEqual } from 'node:crypto';
import * as argon2 from 'argon2';
import axios from 'axios';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from './services/email/email.service';
import { TokenService } from './services/token/token.service';
import { RegisterDto, RegisterRole } from './dto/register.dto/register.dto';
import { LoginDto } from './dto/login.dto/login.dto';
import { VerifyEmailDto, VerifyLoginCodeDto } from './dto/verify-email.dto/verify-email.dto';
import { ResendVerificationDto } from './dto/resend-verification.dto/resend-verification.dto';
import { ConfigService } from '@nestjs/config';

type Role = 'patient' | 'doctor';
type Purpose = 'EMAIL_VERIFICATION' | 'LOGIN_2FA';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly tokenService: TokenService,
    private readonly configService: ConfigService,
  ) {}

  private codeHash(challengeId: string, code: string) {
    const secret = process.env.AUTH_CODE_SECRET;
    if (!secret || secret.length < 32) throw new Error('AUTH_CODE_SECRET doit contenir au moins 32 caractères.');
    return createHmac('sha256', secret).update(`${challengeId}:${code}`).digest('hex');
  }

  private async createUserOnMeetSaaS(firstName: string, lastName: string, email: string, userId: bigint): Promise<{ externalRef: string; organizationId: string } | null> {
    try {
      const apiKey = this.configService.get<string>('MEET_SAAS_API_KEY');
      const apiSecret = this.configService.get<string>('MEET_SAAS_API_SECRET');

      if (!apiKey || !apiSecret) {
        console.warn('Meet SaaS API credentials not configured. Skipping user creation on Meet SaaS.');
        return null;
      }

      const externalRef = `doctoapp_user_${userId}`;

      const response = await axios.post(
        // 'https://api.meet-saas.com/api/v1/public/users',
        'https://stax.verstands.dev/api/v1/public/users',
        {
          externalRef: externalRef,
          name: `${firstName} ${lastName}`,
          email: email,
        },
        {
          headers: {
            'x-api-key': apiKey,
            'x-api-secret': apiSecret,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('User created on Meet SaaS:', response.data);

      // Récupérer l'externalRef et l'organizationId depuis la réponse
      const userData = response.data.user;
      return {
        externalRef: userData.externalRef || externalRef,
        organizationId: userData.organizationId || null,
      };
    } catch (error) {
      console.error('Error creating user on Meet SaaS:', error);
      // Ne pas bloquer l'inscription si l'appel Meet SaaS échoue
      return null;
    }
  }

  async generateMeetSaaSToken(userId: bigint, role: Role) {
    try {
      const apiKey = this.configService.get<string>('MEET_SAAS_API_KEY');
      const apiSecret = this.configService.get<string>('MEET_SAAS_API_SECRET');

      if (!apiKey || !apiSecret) {
        throw new HttpException('Meet SaaS API credentials not configured', HttpStatus.INTERNAL_SERVER_ERROR);
      }

      // Récupérer l'utilisateur avec son externalRef et organizationId
      let user: { externalRef: string | null; organizationId: string | null; firstName: string; lastName: string } | null;
      if (role === 'patient') {
        const patient = await this.prisma.patient.findUnique({
          where: { id: userId },
          select: { externalRef: true, organizationId: true, firstName: true, lastName: true },
        });
        user = patient;
      } else {
        const doctor = await this.prisma.doctor.findUnique({
          where: { id: userId },
          select: { externalRef: true, organizationId: true, firstName: true, lastName: true },
        });
        user = doctor;
      }

      if (!user || !user.externalRef || !user.organizationId) {
        throw new HttpException('User not found or not linked to Meet SaaS', HttpStatus.NOT_FOUND);
      }

      const response = await axios.post(
        // 'https://api.meet-saas.com/api/v1/public/auth/token',
        'https://stax.verstands.dev/api/v1/public/auth/token',
        {
          externalRef: user.externalRef,
          meetingId: user.organizationId,
        },
        {
          headers: {
            'x-api-key': apiKey,
            'x-api-secret': apiSecret,
            'Content-Type': 'application/json',
          },
        },
      );

      console.log('Meet SaaS token generated:', response.data);

      return {
        token: response.data.token,
        userId: response.data.userId,
        name: response.data.name,
        expiresIn: response.data.expiresIn,
      };
    } catch (error) {
      console.error('Error generating Meet SaaS token:', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Failed to generate Meet SaaS token', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async createChallenge(user: { id: bigint; email: string }, role: Role, purpose: Purpose) {
    const now = new Date();
    const recent = await this.prisma.authCode.findFirst({
      where: { email: user.email, userType: role, purpose, createdAt: { gt: new Date(now.getTime() - 60_000) } },
      orderBy: { createdAt: 'desc' },
    });
    if (recent) throw new HttpException('Attendez au moins 60 secondes avant de demander un nouveau code.', HttpStatus.TOO_MANY_REQUESTS);

    await this.prisma.authCode.updateMany({
      where: { email: user.email, userType: role, purpose, consumedAt: null },
      data: { consumedAt: now },
    });
    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
    const challenge = await this.prisma.authCode.create({ data: {
      challengeId, email: user.email, userType: role, userId: user.id, purpose,
      codeHash: this.codeHash(challengeId, code), expiresAt: new Date(now.getTime() + 5 * 60_000),
      lastSentAt: now,
    } });
    try {
      await this.emailService.sendEmail({
        to: user.email,
        subject: purpose === 'EMAIL_VERIFICATION' ? 'Vérification de votre adresse e-mail' : 'Code de connexion sécurisé',
        htmlContent: `<p>Votre code de sécurité est :</p><p style="font-size:28px;font-weight:bold;letter-spacing:6px">${code}</p><p>Il expire dans 5 minutes et ne peut être utilisé qu'une seule fois.</p>`,
      });
    } catch (error) {
      await this.prisma.authCode.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      throw error;
    }
    return { challengeId, expiresInSeconds: 300 };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const phone = dto.phone.trim();
    const duplicatePatient = await this.prisma.patient.findFirst({ where: { OR: [{ email }, { phone }] } });
    const duplicateDoctor = await this.prisma.doctor.findFirst({ where: { OR: [{ email }, { phone }] } });
    if (duplicatePatient || duplicateDoctor) throw new ConflictException('Cet e-mail ou ce numéro de téléphone est déjà utilisé.');

    if (dto.role === RegisterRole.DOCTOR) {
      if (!dto.specialtyId || !dto.licenseNumber) throw new BadRequestException('specialtyId et licenseNumber sont obligatoires pour un médecin.');
      const specialty = await this.prisma.specialty.findUnique({ where: { id: BigInt(dto.specialtyId) } });
      if (!specialty || !specialty.status) throw new BadRequestException('La spécialité sélectionnée est invalide ou inactive.');
      const existingLicense = await this.prisma.doctor.findUnique({ where: { licenseNumber: dto.licenseNumber } });
      if (existingLicense) throw new ConflictException('Ce numéro de licence est déjà utilisé.');
    }

    const password = await argon2.hash(dto.password);
    let user: { id: bigint; email: string };
    if (dto.role === RegisterRole.PATIENT) {
      const patient = await this.prisma.patient.create({ data: {
        uuid: randomUUID(), firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), email, phone, password,
        dateOfBirth: dto.dateOfBirth ? new Date(dto.dateOfBirth) : undefined,
        address: dto.address, gender: dto.gender as any,
      } });
      user = patient;
    } else {
      const doctor = await this.prisma.doctor.create({ data: {
        uuid: randomUUID(), firstName: dto.firstName.trim(), lastName: dto.lastName.trim(), email, phone, password,
        specialtyId: BigInt(dto.specialtyId!), licenseNumber: dto.licenseNumber!, bio: dto.bio,
        // Le statut métier reste pending jusqu'à validation administrative.
      } });
      user = doctor;
    }

    // Créer l'utilisateur sur Meet SaaS et récupérer l'externalRef et organizationId
    const meetSaaSData = await this.createUserOnMeetSaaS(dto.firstName.trim(), dto.lastName.trim(), email, user.id);

    // Mettre à jour l'utilisateur avec l'externalRef et organizationId
    if (meetSaaSData) {
      if (dto.role === RegisterRole.PATIENT) {
        await this.prisma.patient.update({
          where: { id: user.id },
          data: {
            externalRef: meetSaaSData.externalRef,
            organizationId: meetSaaSData.organizationId,
          },
        });
      } else {
        await this.prisma.doctor.update({
          where: { id: user.id },
          data: {
            externalRef: meetSaaSData.externalRef,
            organizationId: meetSaaSData.organizationId,
          },
        });
      }
    }

    const challenge = await this.createChallenge(user, dto.role, 'EMAIL_VERIFICATION');
    return { message: 'Inscription enregistrée. Vérifiez votre e-mail pour activer le compte.', role: dto.role, ...challenge };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const challenge = await this.checkCode(dto.challengeId, dto.code, 'EMAIL_VERIFICATION');
    const now = new Date();
    if (challenge.userType === 'patient') {
      await this.prisma.patient.update({ where: { id: challenge.userId }, data: { emailVerifiedAt: now, status: 'active' } });
    } else {
      await this.prisma.doctor.update({ where: { id: challenge.userId }, data: { emailVerifiedAt: now } });
    }
    await this.prisma.authCode.update({ where: { id: challenge.id }, data: { consumedAt: now } });
    return { message: 'Adresse e-mail vérifiée. Vous pouvez maintenant vous connecter nnnnnnnnnnn.' };
  }

  async resendVerification(dto: ResendVerificationDto) {
    const email = dto.email.trim().toLowerCase();
    if (dto.role === RegisterRole.PATIENT) {
      const user = await this.prisma.patient.findUnique({ where: { email } });
      if (!user) return { message: 'Si le compte existe et nécessite une vérification, un code sera envoyé.' };
      if (user.emailVerifiedAt) return { message: 'Cette adresse e-mail est déjà vérifiée.' };
      return this.createChallenge(user, 'patient', 'EMAIL_VERIFICATION');
    }
    const user = await this.prisma.doctor.findUnique({ where: { email } });
    if (!user) return { message: 'Si le compte existe et nécessite une vérification, un code sera envoyé.' };
    if (user.emailVerifiedAt) return { message: 'Cette adresse e-mail est déjà vérifiée.' };
    return this.createChallenge(user, 'doctor', 'EMAIL_VERIFICATION');
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();
    const user = dto.role === RegisterRole.PATIENT
      ? await this.prisma.patient.findUnique({ where: { email } })
      : await this.prisma.doctor.findUnique({ where: { email } });
    if (!user || !(await argon2.verify(user.password, dto.password))) {
      throw new UnauthorizedException('E-mail ou mot de passe incorrect.');
    }
    if (!user.emailVerifiedAt) throw new UnauthorizedException('Veuillez vérifier votre adresse e-mail avant de vous connecter.');
    if (dto.role === RegisterRole.PATIENT && user.status !== 'active') {
      throw new UnauthorizedException('Ce compte patient n’est pas actif.');
    }
    if (dto.role === RegisterRole.DOCTOR && user.status !== 'active') {
      throw new UnauthorizedException('Ce compte médecin n’est pas encore activé par l’administration.');
    }
    // await this.emailService.sendEmail({
    //   to: user.email,
    //   subject: 'Verification de l\'email',
    //   htmlContent: `
    //     <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    //       <div style="background: linear-gradient(135deg, #1B8BD0, #1577a8); padding: 30px; border-radius: 12px; text-align: center;">
    //         <h1 style="color: white; margin: 0;">Réinitialisation</h1>
    //       </div>
    //       <div style="padding: 20px;">
    //         <p>Bonjour <strong>Kabongo Ngoy</strong>,</p>
    //         <p>Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le lien ci-dessous pour créer un nouveau mot de passe :</p>
    //         <div style="text-align: center; margin: 30px 0;">
    //         </div>
    //         <p><strong>Ce lien expire dans 15 minutes.</strong></p>
    //         <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    //         <p>Cordialement,<br>L'équipe EteyeloAgent</p>
    //       </div>
    //     </div>
    //   `,
    // });
    return this.createChallenge(user, dto.role, 'LOGIN_2FA');
  }

  async verifyLoginCode(dto: VerifyLoginCodeDto) {
    const challenge = await this.checkCode(dto.challengeId, dto.code, 'LOGIN_2FA');
    const user = challenge.userType === 'patient'
      ? await this.prisma.patient.findUnique({ where: { id: challenge.userId } })
      : await this.prisma.doctor.findUnique({ where: { id: challenge.userId } });
    if (!user || !user.emailVerifiedAt || user.status !== 'active') {
      await this.prisma.authCode.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      throw new UnauthorizedException('Ce compte ne peut pas se connecter.');
    }
    await this.prisma.authCode.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
    const tokens = await this.tokenService.issue({ ...user, externalRef: user.externalRef ?? undefined }, challenge.userType);

    // Générer le token Meet SaaS si l'utilisateur est lié à Meet SaaS
    let meetSaaSToken: { token: string; userId: string; name: string; expiresIn: number } | null = null;
    console.log(`Checking Meet SaaS linkage for user ${user.id} (${challenge.userType})`);
    console.log(`externalRef: ${user.externalRef}, organizationId: ${user.organizationId}`);

    if (user.externalRef && user.organizationId) {
      console.log('User is linked to Meet SaaS. Generating token...');
      try {
        meetSaaSToken = await this.generateMeetSaaSToken(user.id, challenge.userType);
        console.log('Meet SaaS token generated successfully:', meetSaaSToken);
      } catch (error) {
        console.error('Error generating Meet SaaS token during login:', error);
        // Ne pas bloquer la connexion si la génération du token Meet SaaS échoue
      }
    } else {
      console.log('User is not linked to Meet SaaS. Skipping token generation.');
    }

    return {
      message: 'Connexion réussie.',
      user: {
        id: user.id.toString(),
        uuid: user.uuid,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: challenge.userType,
      },
      ...tokens,
      meetSaaSToken: meetSaaSToken ? {
        ...meetSaaSToken,
        organizationId: user.organizationId,
      } : null,
    };
  }

  private async checkCode(challengeId: string, code: string, purpose: Purpose) {
    const challenge = await this.prisma.authCode.findUnique({ where: { challengeId } });
    if (!challenge || challenge.purpose !== purpose || challenge.consumedAt || challenge.expiresAt <= new Date()) {
      throw new UnauthorizedException('Code invalide ou expiré. Demandez un nouveau code.');
    }
    if (challenge.attempts >= 5) {
      await this.prisma.authCode.update({ where: { id: challenge.id }, data: { consumedAt: new Date() } });
      throw new UnauthorizedException('Nombre maximal de tentatives atteint. Demandez un nouveau code.');
    }
    const supplied = this.codeHash(challengeId, code);
    const expectedBuffer = Buffer.from(challenge.codeHash, 'hex');
    const suppliedBuffer = Buffer.from(supplied, 'hex');
    if (expectedBuffer.length !== suppliedBuffer.length || !timingSafeEqual(expectedBuffer, suppliedBuffer)) {
      const attempts = challenge.attempts + 1;
      await this.prisma.authCode.update({ where: { id: challenge.id }, data: {
        attempts, ...(attempts >= 5 ? { consumedAt: new Date() } : {}),
      } });
      throw new UnauthorizedException(attempts >= 5 ? 'Nombre maximal de tentatives atteint. Demandez un nouveau code.' : `Code incorrect. Tentative ${attempts}/5.`);
    }
    return challenge;
  }
}
