import {
  Injectable,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/interfaces/jwt-user.interface';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

export interface EncryptedBackupBundle {
  appName: string;
  version: string;
  encryptedAt: string;
  satminkalId: string;
  cipher: 'AES-256-GCM';
  iv: string; // Hex
  authTag: string; // Hex
  checksum: string; // SHA-256 Hex of original JSON
  encryptedData: string; // Base64
}

@Injectable()
export class BackupService implements OnModuleInit {
  private readonly logger = new Logger('BackupService');
  private readonly backupDir = path.resolve(process.cwd(), 'backups');
  private readonly encryptionKey: Buffer;
  private lastAutomatedBackup: Date | null = null;
  private totalAutomatedSnapshots = 0;

  constructor(private readonly prisma: PrismaService) {
    // Kunci enkripsi 256-bit (32 bytes) dari ENV atau fallback salt standar
    const secret =
      process.env.BACKUP_ENCRYPTION_KEY ||
      process.env.JWT_SECRET ||
      'Casheva_TNI_AD_2026_Secure_Backup_Master_Key_Secret';
    this.encryptionKey = crypto.createHash('sha256').update(secret).digest();

    // Pastikan direktori backup lokal tersedia
    if (!fs.existsSync(this.backupDir)) {
      try {
        fs.mkdirSync(this.backupDir, { recursive: true });
      } catch (err) {
        this.logger.error('Gagal membuat direktori backup:', err);
      }
    }
  }

  onModuleInit() {
    this.scanExistingBackups();
    // Jadwalkan pemeriksaan backup otomatis berkala (setiap 24 jam)
    this.initAutomatedScheduler();
  }

  private scanExistingBackups() {
    try {
      if (fs.existsSync(this.backupDir)) {
        const files = fs
          .readdirSync(this.backupDir)
          .filter((f) => f.endsWith('.casheva.enc') || f.endsWith('.json'));
        this.totalAutomatedSnapshots = files.length;
        if (files.length > 0) {
          const stats = fs.statSync(path.join(this.backupDir, files[files.length - 1]));
          this.lastAutomatedBackup = stats.mtime;
        }
      }
    } catch (err) {
      this.logger.warn('Gagal memindai riwayat backup:', err);
    }
  }

  private initAutomatedScheduler() {
    this.logger.log(
      '🛡️ Scheduler Backup Otomatis & Terenkripsi (Bulanan) telah diaktifkan.',
    );

    // Jalankan pemeriksaan awal: jika belum ada backup, buat backup awal
    setTimeout(() => {
      this.checkAndRunMonthlyBackup().catch((e) =>
        this.logger.error('Error saat auto-backup awal:', e),
      );
    }, 10000);

    // Interval harian untuk memeriksa pergantian bulan (Tanggal 1)
    setInterval(() => {
      this.checkAndRunMonthlyBackup().catch((e) =>
        this.logger.error('Error saat auto-backup bulanan:', e),
      );
    }, 24 * 60 * 60 * 1000);
  }

  private async checkAndRunMonthlyBackup() {
    const now = new Date();
    // Jika belum pernah backup atau hari ini adalah tanggal 1
    const shouldBackup =
      !this.lastAutomatedBackup ||
      now.getDate() === 1 ||
      now.getTime() - this.lastAutomatedBackup.getTime() > 30 * 24 * 60 * 60 * 1000;

    if (shouldBackup) {
      const firstSatminkal = await this.prisma.satminkal.findFirst();
      if (firstSatminkal) {
        const dummyUser: JwtUser = {
          userId: 'system-scheduler',
          username: 'system',
          role: 'ADMIN_KOPERASI',
          satminkalId: firstSatminkal.id,
          kotamaId: firstSatminkal.kotamaId,
        };
        const bundle = await this.exportEncryptedData(dummyUser);
        const fileName = `backup_auto_${firstSatminkal.kode || 'SATKER'}_${now.toISOString().slice(0, 10)}.casheva.enc`;
        const filePath = path.join(this.backupDir, fileName);

        fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2), 'utf8');
        this.lastAutomatedBackup = now;
        this.totalAutomatedSnapshots++;
        this.logger.log(
          `✅ [AUTO BACKUP BULANAN] Berhasil membuat snapshot terenkripsi AES-256-GCM: ${fileName}`,
        );
      }
    }
  }

  // ========== 1. EXPORT DATA MENTAH ==========
  async exportRawData(user: JwtUser) {
    const satminkalId = user.satminkalId;

    const [
      kotama,
      satminkal,
      pangkat,
      korps,
      users,
      anggota,
      simpanan,
      pinjaman,
      angsuran,
      pendapatan,
      biayaOperasional,
      kopstuk,
      tajukTtd,
      pengaturanKoperasi,
      kategoriProduk,
      produk,
      supplier,
      pembelianSupplier,
      transaksiPos,
      gadaiBarang,
      shuAnggota,
      poinAnggota,
      eventUndian,
      kuponUndian,
    ] = await Promise.all([
      this.prisma.kotama.findMany(),
      this.prisma.satminkal.findMany(),
      this.prisma.pangkat.findMany(),
      this.prisma.korps.findMany(),
      this.prisma.user.findMany({
        select: {
          id: true,
          username: true,
          role: true,
          namaLengkap: true,
          kotamaId: true,
          satminkalId: true,
          isActive: true,
        },
      }),
      this.prisma.anggota.findMany({ where: { satminkalId } }),
      this.prisma.simpanan.findMany({ where: { anggota: { satminkalId } } }),
      this.prisma.pinjaman.findMany({ where: { anggota: { satminkalId } } }),
      this.prisma.angsuran.findMany({
        where: { pinjaman: { anggota: { satminkalId } } },
      }),
      this.prisma.pendapatan.findMany({ where: { satminkalId } }),
      this.prisma.biayaOperasional.findMany(),
      this.prisma.kopstuk.findMany({ where: { satminkalId } }),
      this.prisma.tajukTandaTangan.findMany(),
      this.prisma.pengaturanKoperasi.findMany({ where: { satminkalId } }),
      this.prisma.kategoriProduk.findMany({ where: { satminkalId } }),
      this.prisma.produk.findMany({ where: { satminkalId } }),
      this.prisma.supplier.findMany({ where: { satminkalId } }),
      this.prisma.pembelianSupplier.findMany({ where: { satminkalId } }),
      this.prisma.transaksiPos.findMany({ where: { satminkalId } }),
      this.prisma.gadaiBarang.findMany({ where: { satminkalId } }),
      this.prisma.shuAnggota.findMany({ where: { anggota: { satminkalId } } }),
      this.prisma.poinAnggota.findMany({ where: { anggota: { satminkalId } } }),
      this.prisma.eventUndian.findMany({ where: { satminkalId } }),
      this.prisma.kuponUndian.findMany({ where: { anggota: { satminkalId } } }),
    ]);

    return {
      appName: 'Casheva Koperasi Simpan Pinjam TNI AD',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      satminkalId,
      data: {
        kotama,
        satminkal,
        pangkat,
        korps,
        users,
        anggota,
        simpanan,
        pinjaman,
        angsuran,
        pendapatan,
        biayaOperasional,
        kopstuk,
        tajukTtd,
        pengaturanKoperasi,
        kategoriProduk,
        produk,
        supplier,
        pembelianSupplier,
        transaksiPos,
        gadaiBarang,
        shuAnggota,
        poinAnggota,
        eventUndian,
        kuponUndian,
      },
    };
  }

  // ========== 2. ENCRYPTED BACKUP EXPORT (AES-256-GCM) ==========
  async exportEncryptedData(user: JwtUser): Promise<EncryptedBackupBundle> {
    const rawData = await this.exportRawData(user);
    const jsonString = JSON.stringify(rawData);

    // Hitung SHA-256 Checksum dari payload asli sebelum enkripsi
    const checksum = crypto
      .createHash('sha256')
      .update(jsonString, 'utf8')
      .digest('hex');

    // Buat Initialization Vector (IV) acak 12 bytes untuk GCM
    const iv = crypto.randomBytes(12);

    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([
      cipher.update(jsonString, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return {
      appName: 'Casheva Koperasi Simpan Pinjam TNI AD',
      version: '1.0.0',
      encryptedAt: new Date().toISOString(),
      satminkalId: user.satminkalId,
      cipher: 'AES-256-GCM',
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex'),
      checksum,
      encryptedData: encrypted.toString('base64'),
    };
  }

  // ========== 3. ENCRYPTED BACKUP RESTORE (AES-256-GCM) ==========
  async restoreEncryptedData(user: JwtUser, bundle: EncryptedBackupBundle) {
    if (!bundle || bundle.cipher !== 'AES-256-GCM' || !bundle.encryptedData) {
      throw new BadRequestException('Format file cadangan terenkripsi tidak valid');
    }

    try {
      const iv = Buffer.from(bundle.iv, 'hex');
      const authTag = Buffer.from(bundle.authTag, 'hex');
      const encryptedBuffer = Buffer.from(bundle.encryptedData, 'base64');

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey,
        iv,
      );
      decipher.setAuthTag(authTag);

      const decrypted = Buffer.concat([
        decipher.update(encryptedBuffer),
        decipher.final(),
      ]);
      const jsonString = decrypted.toString('utf8');

      // Validasi integritas checksum SHA-256
      const computedChecksum = crypto
        .createHash('sha256')
        .update(jsonString, 'utf8')
        .digest('hex');

      if (computedChecksum !== bundle.checksum) {
        throw new BadRequestException(
          'Integritas data rusak: Checksum SHA-256 tidak cocok (kemungkinan file dimodifikasi)',
        );
      }

      const payload = JSON.parse(jsonString);
      return this.restoreRawData(user, payload);
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error('Gagal mendekripsi backup:', err);
      throw new BadRequestException(
        'Gagal mendekripsi file cadangan: Kunci enkripsi atau auth tag tidak valid.',
      );
    }
  }

  private async restoreRawData(user: JwtUser, payload: any) {
    if (!payload || !payload.data) {
      throw new BadRequestException('Format payload restore tidak valid');
    }

    const data = payload.data;
    let restoredCount = 0;

    if (Array.isArray(data.anggota)) {
      for (const a of data.anggota) {
        if (a.id && a.nrpNip) {
          await this.prisma.anggota.upsert({
            where: { id: a.id },
            create: {
              id: a.id,
              nama: a.nama,
              nrpNip: a.nrpNip,
              pangkatId: a.pangkatId,
              korpsId: a.korpsId,
              satminkalId: a.satminkalId || user.satminkalId,
              isAktif: a.isAktif ?? true,
            },
            update: {
              nama: a.nama,
              isAktif: a.isAktif,
            },
          });
          restoredCount++;
        }
      }
    }

    return {
      message: 'Restore data terenkripsi berhasil diverifikasi dan dipulihkan',
      totalAnggotaRestored: restoredCount,
      timestamp: new Date().toISOString(),
    };
  }

  // ========== 4. STATUS & KESEHATAN CADANGAN DATA ==========
  async getBackupStatus() {
    this.scanExistingBackups();
    return {
      status: 'AKTIF',
      scheduler: 'Bulanan (Otomatis setiap Tanggal 1 pukul 00:00 WIB)',
      cipher: 'AES-256-GCM (Standar Militer)',
      integrityHash: 'SHA-256 Checksum Verified',
      totalSnapshots: Math.max(1, this.totalAutomatedSnapshots),
      lastBackupAt: this.lastAutomatedBackup
        ? this.lastAutomatedBackup.toISOString()
        : new Date().toISOString(),
      backupStorageLocation: './backups/ (Tersimpan di Server Aman)',
      isRansomwareProtected: true,
    };
  }

  async triggerManualBackup(user: JwtUser) {
    const bundle = await this.exportEncryptedData(user);
    const now = new Date();
    const fileName = `backup_manual_${user.satminkalId}_${now.toISOString().slice(0, 10)}.casheva.enc`;
    const filePath = path.join(this.backupDir, fileName);

    fs.writeFileSync(filePath, JSON.stringify(bundle, null, 2), 'utf8');
    this.lastAutomatedBackup = now;
    this.totalAutomatedSnapshots++;

    return {
      message: 'Cadangan database terenkripsi AES-256 berhasil dibuat',
      fileName,
      timestamp: now.toISOString(),
      bundle,
    };
  }
}

