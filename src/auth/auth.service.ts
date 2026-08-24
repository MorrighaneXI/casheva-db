import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

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
        namaLengkap: user.namaLengkap,
        role: user.role,
        kotama: user.kotama?.nama ?? null,
        satminkal: user.satminkal?.nama ?? null,
      },
    };
  }
}
