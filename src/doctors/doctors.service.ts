import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import * as argon2 from 'argon2';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const DOCTOR_STATUSES = ['active', 'inactive', 'pending', 'blocked'];

@Injectable()
export class DoctorsService {
  constructor(private readonly prisma: PrismaService) {}

  async getDoctors() {
    const doctors = await this.prisma.doctor.findMany({
      include: {
        specialty: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return doctors.map((doctor) => ({
      id: doctor.id.toString(),
      uuid: doctor.uuid,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      email: doctor.email,
      phone: doctor.phone,
      specialty: doctor.specialty?.name || null,
      specialtyId: doctor.specialtyId.toString(),
      licenseNumber: doctor.licenseNumber,
      bio: doctor.bio,
      consultationFee: doctor.consultationFee?.toString() ?? '0',
      currency: doctor.currency,
      avatar: doctor.avatar,
      status: doctor.status,
      createdAt: doctor.createdAt,
    }));
  }

  async getSpecialties() {
    const specialties = await this.prisma.specialty.findMany({
      where: { status: true },
      orderBy: { name: 'asc' },
    });
    return specialties.map((s) => ({
      id: s.id.toString(),
      name: s.name,
      description: s.description,
    }));
  }

  async createDoctor(dto: any) {
    const firstName = dto.firstName?.trim();
    const lastName = dto.lastName?.trim();
    const email = dto.email?.trim().toLowerCase();
    const phone = dto.phone?.trim();
    const password = dto.password;
    const specialtyId = dto.specialtyId ? BigInt(dto.specialtyId) : null;
    const licenseNumber = dto.licenseNumber?.trim();

    if (!firstName || !lastName || !email || !phone || !password) {
      throw new BadRequestException(
        'firstName, lastName, email, phone et password sont obligatoires.',
      );
    }
    if (!specialtyId || !licenseNumber) {
      throw new BadRequestException(
        'specialtyId et licenseNumber sont obligatoires.',
      );
    }
    if (String(password).length < 6) {
      throw new BadRequestException(
        'Le mot de passe doit contenir au moins 6 caractères.',
      );
    }

    const specialty = await this.prisma.specialty.findUnique({
      where: { id: specialtyId },
    });
    if (!specialty || !specialty.status) {
      throw new BadRequestException('Spécialité invalide ou inactive.');
    }

    // Unicité e-mail/téléphone sur patients ET médecins (la connexion
    // identifie le compte par email dans les deux tables).
    const [dupDoctor, dupPatient, dupLicense] = await Promise.all([
      this.prisma.doctor.findFirst({
        where: { OR: [{ email }, { phone }] },
      }),
      this.prisma.patient.findFirst({
        where: { OR: [{ email }, { phone }] },
      }),
      this.prisma.doctor.findUnique({ where: { licenseNumber } }),
    ]);
    if (dupDoctor || dupPatient) {
      throw new ConflictException(
        'Cet e-mail ou ce numéro de téléphone est déjà utilisé.',
      );
    }
    if (dupLicense) {
      throw new ConflictException('Ce numéro de licence est déjà utilisé.');
    }

    const status = DOCTOR_STATUSES.includes(dto.status)
      ? dto.status
      : 'active';

    const doctor = await this.prisma.doctor.create({
      data: {
        uuid: randomUUID(),
        firstName,
        lastName,
        email,
        phone,
        password: await argon2.hash(password),
        specialtyId,
        licenseNumber,
        bio: dto.bio?.trim() || null,
        consultationFee: dto.consultationFee
          ? Number(dto.consultationFee)
          : undefined,
        currency: dto.currency || 'USD',
        status: status as any,
        // Compte créé par l'admin : email considéré vérifié, le médecin
        // peut se connecter immédiatement.
        emailVerifiedAt: new Date(),
      },
      include: { specialty: { select: { id: true, name: true } } },
    });

    return this.toDto(doctor);
  }

  async updateDoctor(id: string, dto: any) {
    const doctorId = BigInt(id);
    const existing = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!existing) throw new NotFoundException('Médecin non trouvé.');

    const data: Prisma.DoctorUpdateInput = {};

    if (dto.firstName !== undefined) data.firstName = dto.firstName.trim();
    if (dto.lastName !== undefined) data.lastName = dto.lastName.trim();
    if (dto.email !== undefined) data.email = dto.email.trim().toLowerCase();
    if (dto.phone !== undefined) data.phone = dto.phone.trim();
    if (dto.bio !== undefined) data.bio = dto.bio?.trim() || null;
    if (dto.licenseNumber !== undefined) {
      data.licenseNumber = dto.licenseNumber.trim();
    }
    if (dto.consultationFee !== undefined) {
      data.consultationFee = Number(dto.consultationFee);
    }
    if (dto.currency !== undefined) data.currency = dto.currency;
    if (dto.avatar !== undefined) data.avatar = dto.avatar;
    if (dto.status !== undefined) {
      if (!DOCTOR_STATUSES.includes(dto.status)) {
        throw new BadRequestException('Statut invalide.');
      }
      data.status = dto.status;
    }
    if (dto.specialtyId !== undefined && dto.specialtyId !== null) {
      const specialtyId = BigInt(dto.specialtyId);
      const specialty = await this.prisma.specialty.findUnique({
        where: { id: specialtyId },
      });
      if (!specialty) {
        throw new BadRequestException('Spécialité invalide.');
      }
      data.specialty = { connect: { id: specialtyId } };
    }
    if (dto.password) {
      if (String(dto.password).length < 6) {
        throw new BadRequestException(
          'Le mot de passe doit contenir au moins 6 caractères.',
        );
      }
      data.password = await argon2.hash(dto.password);
    }

    // Vérifier les unicités si email/phone/license changent
    if (data.email || data.phone || data.licenseNumber) {
      const newEmail = (data.email as string) ?? existing.email;
      const newPhone = (data.phone as string) ?? existing.phone;
      const newLicense =
        (data.licenseNumber as string) ?? existing.licenseNumber;
      const dup = await this.prisma.doctor.findFirst({
        where: {
          id: { not: doctorId },
          OR: [{ email: newEmail }, { phone: newPhone }],
        },
      });
      if (dup) {
        throw new ConflictException(
          'Cet e-mail ou ce numéro de téléphone est déjà utilisé.',
        );
      }
      if (newLicense !== existing.licenseNumber) {
        const dupLicense = await this.prisma.doctor.findUnique({
          where: { licenseNumber: newLicense },
        });
        if (dupLicense) {
          throw new ConflictException(
            'Ce numéro de licence est déjà utilisé.',
          );
        }
      }
    }

    const doctor = await this.prisma.doctor.update({
      where: { id: doctorId },
      data,
      include: { specialty: { select: { id: true, name: true } } },
    });

    return this.toDto(doctor);
  }

  async deleteDoctor(id: string) {
    const doctorId = BigInt(id);
    const existing = await this.prisma.doctor.findUnique({
      where: { id: doctorId },
    });
    if (!existing) throw new NotFoundException('Médecin non trouvé.');

    try {
      await this.prisma.doctor.delete({ where: { id: doctorId } });
    } catch (error) {
      // Les rendez-vous/téléconsultations référencent le médecin en
      // Restrict : impossible de supprimer un médecin qui en a.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === 'P2003' || error.code === 'P2014')
      ) {
        throw new ConflictException(
          'Impossible de supprimer ce médecin : il a des rendez-vous ou des téléconsultations associés. Vous pouvez le bloquer à la place.',
        );
      }
      throw error;
    }

    return { message: 'Médecin supprimé avec succès.' };
  }

  private toDto(doctor: any) {
    return {
      id: doctor.id.toString(),
      uuid: doctor.uuid,
      firstName: doctor.firstName,
      lastName: doctor.lastName,
      email: doctor.email,
      phone: doctor.phone,
      specialty: doctor.specialty?.name || null,
      specialtyId: doctor.specialtyId?.toString() ?? null,
      licenseNumber: doctor.licenseNumber,
      bio: doctor.bio,
      consultationFee: doctor.consultationFee?.toString() ?? '0',
      currency: doctor.currency,
      avatar: doctor.avatar,
      status: doctor.status,
      createdAt: doctor.createdAt,
    };
  }
}
