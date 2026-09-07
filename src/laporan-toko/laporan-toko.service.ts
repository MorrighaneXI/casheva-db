import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JwtUser } from '../common/interfaces/jwt-user.interface';

@Injectable()
export class LaporanTokoService {
  constructor(private readonly prisma: PrismaService) {}

  private scopeSatminkal(user: JwtUser) {
    return user.satminkalId;
  }

  async getRingkasanToko(user: JwtUser) {
    const satminkalId = this.scopeSatminkal(user);

    const now = new Date();
    const awalBulan = new Date(now.getFullYear(), now.getMonth(), 1);

    const trxAgg = await this.prisma.transaksiPos.aggregate({
      where: { satminkalId, status: 'SELESAI' },
      _sum: {
        totalBelanja: true,
        totalHpp: true,
        totalDiskon: true,
      },
      _count: true,
    });

    const trxBulanIni = await this.prisma.transaksiPos.aggregate({
      where: {
        satminkalId,
        status: 'SELESAI',
        createdAt: { gte: awalBulan },
      },
      _sum: {
        totalBelanja: true,
        totalHpp: true,
      },
      _count: true,
    });

    const totalPenjualan = Number(trxAgg._sum.totalBelanja || 0);
    const totalHpp = Number(trxAgg._sum.totalHpp || 0);
    const labaKotor = totalPenjualan - totalHpp;

    const totalPenjualanBulanIni = Number(trxBulanIni._sum.totalBelanja || 0);
    const totalHppBulanIni = Number(trxBulanIni._sum.totalHpp || 0);
    const labaKotorBulanIni = totalPenjualanBulanIni - totalHppBulanIni;

    const stokKritisCount = await this.prisma.produk.count({
      where: {
        satminkalId,
        isAktif: true,
        stokFisik: { lte: 5 },
      },
    });

    const supplierHutangAgg = await this.prisma.supplier.aggregate({
      where: { satminkalId },
      _sum: { totalHutang: true },
    });

    const totalHutangSupplier = Number(supplierHutangAgg._sum.totalHutang || 0);

    return {
      totalTransaksi: trxAgg._count,
      totalPenjualan,
      totalHpp,
      labaKotor,
      transaksiBulanIni: trxBulanIni._count,
      penjualanBulanIni: totalPenjualanBulanIni,
      labaKotorBulanIni,
      stokKritisCount,
      totalHutangSupplier,
    };
  }

  async getProdukTerlaris(user: JwtUser, limit = 5) {
    const satminkalId = this.scopeSatminkal(user);

    const items = await this.prisma.itemTransaksiPos.groupBy({
      by: ['produkId'],
      where: {
        transaksi: { satminkalId, status: 'SELESAI' },
      },
      _sum: {
        jumlah: true,
        subtotal: true,
      },
      orderBy: {
        _sum: { jumlah: 'desc' },
      },
      take: limit,
    });

    const result: any[] = [];
    for (const it of items) {
      const prod = await this.prisma.produk.findUnique({
        where: { id: it.produkId },
        include: { kategori: true },
      });
      if (prod) {
        result.push({
          produkId: prod.id,
          namaProduk: prod.namaProduk,
          kategori: prod.kategori?.nama || 'Umum',
          totalTerjual: it._sum.jumlah || 0,
          totalOmset: Number(it._sum.subtotal || 0),
          stokTersisa: prod.stokFisik,
        });
      }
    }

    return result;
  }
}
