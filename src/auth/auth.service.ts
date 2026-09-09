import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) { }

  async login(dto: LoginDto) {
    const inputIdentifier = dto.username.trim();

    let user = await this.prisma.user.findUnique({
      where: { username: inputIdentifier },
      include: { kotama: true, satminkal: true },
    });

    // If user not found by username, check if it's an Anggota NRP/NIP
    if (!user) {
      const anggota = await this.prisma.anggota.findFirst({
        where: { nrpNip: inputIdentifier, isAktif: true },
        include: { satminkal: { include: { kotama: true } }, pangkat: true },
      });

      if (anggota) {
        const defaultPasswordHash = await bcrypt.hash('Admin123!', 10);
        user = await this.prisma.user.upsert({
          where: { username: anggota.nrpNip },
          create: {
            username: anggota.nrpNip,
            password: defaultPasswordHash,
            namaLengkap: `${anggota.pangkat?.nama || ''} ${anggota.nama}`.trim(),
            role: Role.ANGGOTA,
            kotamaId: anggota.satminkal.kotamaId,
            satminkalId: anggota.satminkalId,
          },
          update: {},
          include: { kotama: true, satminkal: true },
        });
      }
    }

    if (!user || !user.isActive) {
      throw new UnauthorizedException(
        'Kredensial tidak valid atau akun tidak aktif.',
      );
    }

    const isPasswordValid = await bcrypt.compare(dto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('NRP / Username atau password salah.');
    }

    // Enrich and synchronize official military display name from Anggota
    const anggota = await this.prisma.anggota.findFirst({
      where: { nrpNip: user.username },
      include: { pangkat: true, korps: true },
    });

    let displayNama = user.namaLengkap;
    if (anggota) {
      const pNama = anggota.pangkat?.nama ? `${anggota.pangkat.nama} ` : '';
      const kNama = (anggota.korps?.nama && anggota.korps.nama !== '-') ? `${anggota.korps.nama} ` : '';
      displayNama = `${pNama}${kNama}${anggota.nama}`.trim();

      if (displayNama && user.namaLengkap !== displayNama) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: { namaLengkap: displayNama },
          include: { kotama: true, satminkal: true },
        });
      }
    }

    const sessionToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        currentSessionToken: sessionToken,
        lastActiveAt: new Date(),
      },
    });

    const payload = {
      sub: user.id,
      username: user.username,
      namaLengkap: displayNama,
      role: user.role,
      kotamaId: user.kotamaId,
      satminkalId: user.satminkalId,
      sessionToken,
    };

    return {
      message: 'Login berhasil',
      accessToken: this.jwtService.sign(payload),
      user: {
        id: user.id,
        namaLengkap: displayNama,
        role: user.role,
        kotama: user.kotama?.nama ?? null,
        satminkal: user.satminkal?.nama ?? null,
      },
    };
  }

  async getProfile(user: JwtUser) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: user.userId },
      include: { kotama: true, satminkal: true },
    });
    if (!dbUser) return user;

    const anggota = await this.prisma.anggota.findFirst({
      where: { nrpNip: dbUser.username },
      include: { pangkat: true, korps: true },
    });

    let displayNama = dbUser.namaLengkap;
    if (anggota) {
      const pNama = anggota.pangkat?.nama ? `${anggota.pangkat.nama} ` : '';
      const kNama = (anggota.korps?.nama && anggota.korps.nama !== '-') ? `${anggota.korps.nama} ` : '';
      displayNama = `${pNama}${kNama}${anggota.nama}`.trim();
    }

    return {
      id: dbUser.id,
      username: dbUser.username,
      namaLengkap: displayNama,
      role: dbUser.role,
      kotama: dbUser.kotama?.nama ?? null,
      satminkal: dbUser.satminkal?.nama ?? null,
      kotamaId: dbUser.kotamaId,
      satminkalId: dbUser.satminkalId,
    };
  }
}
