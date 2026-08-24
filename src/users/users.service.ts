import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const existing = await this.prisma.user.findUnique({
      where: { username: dto.username },
    });
    if (existing) {
      throw new ConflictException('Username / NRP sudah digunakan');
    }

    let kotamaId = dto.kotamaId;
    if (!kotamaId && dto.satminkalId) {
      const satminkal = await this.prisma.satminkal.findUnique({
        where: { id: dto.satminkalId },
      });
      if (satminkal) {
        kotamaId = satminkal.kotamaId;
      }
    }

    if (!kotamaId) {
      const firstKotama = await this.prisma.kotama.findFirst();
      kotamaId = firstKotama?.id;
    }

    if (!kotamaId) {
      throw new NotFoundException('Kotama tidak ditemukan');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        username: dto.username,
        password: hashedPassword,
        namaLengkap: dto.namaLengkap,
        role: dto.role,
        kotama: { connect: { id: kotamaId } },
        satminkal: { connect: { id: dto.satminkalId } },
      },
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        kotamaId: true,
        satminkalId: true,
        isActive: true,
        createdAt: true,
      },
    });

    // If role is ANGGOTA or pangkatId is provided, also ensure Anggota record exists
    if (dto.role === 'ANGGOTA' || dto.pangkatId || dto.nrpNip) {
      const nrpNip = dto.nrpNip || dto.username;
      const existingAnggota = await this.prisma.anggota.findFirst({
        where: { nrpNip },
      });

      if (!existingAnggota) {
        let pangkatId = dto.pangkatId;
        if (!pangkatId) {
          const firstPangkat = await this.prisma.pangkat.findFirst();
          pangkatId = firstPangkat?.id;
        }

        let korpsId = dto.korpsId;
        if (!korpsId) {
          const firstKorps = await this.prisma.korps.findFirst();
          korpsId = firstKorps?.id;
        }

        if (pangkatId && korpsId) {
          await this.prisma.anggota.create({
            data: {
              nama: dto.namaLengkap,
              nrpNip,
              pangkatId,
              korpsId,
              satminkalId: dto.satminkalId,
            },
          });
        }
      }
    }

    return user;
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        kotama: { select: { id: true, kode: true, nama: true } },
        satminkal: { select: { id: true, kode: true, nama: true } },
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        kotamaId: true,
        satminkalId: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    await this.findOne(id);

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.username !== undefined) updateData.username = dto.username;
    if (dto.namaLengkap !== undefined) updateData.namaLengkap = dto.namaLengkap;
    if (dto.role !== undefined) updateData.role = dto.role;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

    if (dto.kotamaId) {
      updateData.kotama = { connect: { id: dto.kotamaId } };
    }

    if (dto.satminkalId) {
      updateData.satminkal = { connect: { id: dto.satminkalId } };
    }

    if (dto.password) {
      updateData.password = await bcrypt.hash(dto.password, 10);
    }

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
  }

  async remove(id: string): Promise<Pick<User, 'id' | 'isActive'>> {
    await this.findOne(id);
    return this.prisma.user.update({
      where: { id },
      data: { isActive: false, currentSessionToken: null },
      select: {
        id: true,
        isActive: true,
      },
    });
  }

  async getActiveSessions() {
    const users = await this.prisma.user.findMany({
      where: {
        isActive: true,
        currentSessionToken: { not: null },
      },
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        lastActiveAt: true,
        satminkal: { select: { nama: true } },
      },
      orderBy: { lastActiveAt: 'desc' },
    });
    return users.map((u) => ({
      id: u.id,
      username: u.username,
      namaLengkap: u.namaLengkap,
      role: u.role,
      satminkal: u.satminkal.nama,
      lastActiveAt: u.lastActiveAt,
      isOnline: u.lastActiveAt
        ? Date.now() - new Date(u.lastActiveAt).getTime() < 1000 * 60 * 15
        : false,
    }));
  }

  async terminateSession(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { currentSessionToken: null },
    });
    return { message: 'Sesi berhasil diakhiri' };
  }
}
