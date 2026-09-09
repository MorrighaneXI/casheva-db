import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Prisma, User, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const username = dto.username.trim();
    const existing = await this.prisma.user.findUnique({
      where: { username },
    });
    if (existing) {
      throw new ConflictException('Username / NRP sudah digunakan');
    }

    let satminkalId: string | undefined = dto.satminkalId;
    if (!satminkalId) {
      const firstSatminkal = await this.prisma.satminkal.findFirst();
      satminkalId = firstSatminkal?.id;
    }
    if (!satminkalId) {
      throw new NotFoundException('Satminkal tidak ditemukan');
    }

    let kotamaId: string | undefined = dto.kotamaId;
    if (!kotamaId) {
      const satminkal = await this.prisma.satminkal.findUnique({
        where: { id: satminkalId },
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
        username,
        password: hashedPassword,
        namaLengkap: dto.namaLengkap.trim(),
        role: dto.role,
        kotama: { connect: { id: kotamaId } },
        satminkal: { connect: { id: satminkalId } },
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

    // Always ensure synchronized Anggota entity exists
    const nrpNip = dto.nrpNip || username;
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
            nama: dto.namaLengkap.trim(),
            nrpNip,
            pangkatId,
            korpsId,
            satminkalId,
            isAktif: true,
          },
        });
      }
    } else {
      // Sync Anggota if already exists
      await this.prisma.anggota.update({
        where: { id: existingAnggota.id },
        data: {
          nama: dto.namaLengkap.trim(),
          isAktif: true,
          satminkalId,
          ...(dto.pangkatId ? { pangkatId: dto.pangkatId } : {}),
          ...(dto.korpsId && dto.korpsId !== 'NONE' ? { korpsId: dto.korpsId } : {}),
        },
      });
    }

    return user;
  }

  async findAll() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        kotama: { select: { id: true, kode: true, nama: true } },
        satminkal: { select: { id: true, kode: true, nama: true } },
        isActive: true,
        lastActiveAt: true,
        currentSessionToken: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Fetch corresponding anggota to enrich metadata
    const nrps = users.map((u) => u.username);
    const anggotaList = await this.prisma.anggota.findMany({
      where: { nrpNip: { in: nrps } },
      include: {
        pangkat: true,
        korps: true,
      },
    });

    const anggotaMap = new Map(anggotaList.map((a) => [a.nrpNip, a]));

    const now = Date.now();
    return users.map((u) => {
      const matchedAnggota = anggotaMap.get(u.username);
      const diffMs = u.lastActiveAt ? now - new Date(u.lastActiveAt).getTime() : Infinity;
      const isOnline = u.isActive && diffMs < 1000 * 60 * 5; // 5 mins
      const isIdle = u.isActive && diffMs >= 1000 * 60 * 5 && diffMs < 1000 * 60 * 30; // 5-30 mins

      let formattedNama = u.namaLengkap;
      if (matchedAnggota) {
        const pNama = matchedAnggota.pangkat?.nama ? `${matchedAnggota.pangkat.nama} ` : '';
        const kNama = (matchedAnggota.korps?.nama && matchedAnggota.korps.nama !== '-') ? `${matchedAnggota.korps.nama} ` : '';
        formattedNama = `${pNama}${kNama}${matchedAnggota.nama}`.trim();
      }

      return {
        ...u,
        namaLengkap: formattedNama || u.namaLengkap,
        isAktif: u.isActive,
        isOnline,
        isIdle,
        isOffline: !isOnline && !isIdle,
        anggota: matchedAnggota
          ? {
              id: matchedAnggota.id,
              pangkat: matchedAnggota.pangkat,
              korps: matchedAnggota.korps,
              tmtAnggota: matchedAnggota.tmtAnggota,
              creditLimit: matchedAnggota.creditLimit,
            }
          : null,
      };
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
        lastActiveAt: true,
        currentSessionToken: true,
        createdAt: true,
      },
    });
    if (!user) throw new NotFoundException('User tidak ditemukan');
    return user;
  }

  async updateRole(id: string, role: Role) {
    const user = await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        isActive: true,
        updatedAt: true,
      },
    });
    return updated;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.findOne(id);

    const updateData: Prisma.UserUpdateInput = {};

    if (dto.username !== undefined) updateData.username = dto.username.trim();
    if (dto.namaLengkap !== undefined) updateData.namaLengkap = dto.namaLengkap.trim();
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

    const updatedUser = await this.prisma.user.update({
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

    // Synchronize Anggota record
    const nrpToFind = user.username;
    const existingAnggota = await this.prisma.anggota.findFirst({
      where: { nrpNip: nrpToFind },
    });

    if (existingAnggota) {
      await this.prisma.anggota.update({
        where: { id: existingAnggota.id },
        data: {
          ...(dto.namaLengkap ? { nama: dto.namaLengkap.trim() } : {}),
          ...(dto.username ? { nrpNip: dto.username.trim() } : {}),
          ...(dto.isActive !== undefined ? { isAktif: dto.isActive } : {}),
          ...(dto.satminkalId ? { satminkalId: dto.satminkalId } : {}),
          ...(dto.pangkatId ? { pangkatId: dto.pangkatId } : {}),
          ...(dto.korpsId && dto.korpsId !== 'NONE' ? { korpsId: dto.korpsId } : {}),
        },
      });
    }

    return updatedUser;
  }

  async remove(id: string): Promise<Pick<User, 'id' | 'isActive'>> {
    const user = await this.findOne(id);
    const updated = await this.prisma.user.update({
      where: { id },
      data: { isActive: false, currentSessionToken: null },
      select: {
        id: true,
        isActive: true,
      },
    });

    // Also deactivate anggota
    await this.prisma.anggota
      .updateMany({
        where: { nrpNip: user.username },
        data: { isAktif: false },
      })
      .catch(() => {});

    return updated;
  }

  async getRealtimeStatus() {
    const users = await this.prisma.user.findMany({
      select: {
        id: true,
        username: true,
        namaLengkap: true,
        role: true,
        isActive: true,
        lastActiveAt: true,
        currentSessionToken: true,
        satminkal: { select: { nama: true } },
      },
      orderBy: { lastActiveAt: 'desc' },
    });

    const now = Date.now();
    return users.map((u) => {
      const diffMs = u.lastActiveAt ? now - new Date(u.lastActiveAt).getTime() : Infinity;
      const isOnline = u.isActive && diffMs < 1000 * 60 * 5; // < 5 mins
      const isIdle = u.isActive && diffMs >= 1000 * 60 * 5 && diffMs < 1000 * 60 * 30; // 5-30 mins

      return {
        id: u.id,
        username: u.username,
        namaLengkap: u.namaLengkap,
        role: u.role,
        satminkal: u.satminkal?.nama ?? '-',
        lastActiveAt: u.lastActiveAt,
        isActive: u.isActive,
        isOnline,
        isIdle,
        isOffline: !isOnline && !isIdle,
        statusLabel: isOnline ? 'Online (Aktif)' : isIdle ? 'Idle (Tidak Aktif Sementara)' : 'Offline',
      };
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
    const now = Date.now();
    return users.map((u) => {
      const diffMs = u.lastActiveAt ? now - new Date(u.lastActiveAt).getTime() : Infinity;
      return {
        id: u.id,
        username: u.username,
        namaLengkap: u.namaLengkap,
        role: u.role,
        satminkal: u.satminkal.nama,
        lastActiveAt: u.lastActiveAt,
        isOnline: diffMs < 1000 * 60 * 5,
        isIdle: diffMs >= 1000 * 60 * 5 && diffMs < 1000 * 60 * 30,
      };
    });
  }

  async terminateSession(id: string) {
    await this.prisma.user.update({
      where: { id },
      data: { currentSessionToken: null },
    });
    return { message: 'Sesi berhasil diakhiri' };
  }
}
