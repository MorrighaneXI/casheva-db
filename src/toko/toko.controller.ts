import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { TokoService } from './toko.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';

@ApiTags('Toko & Inventori Koperasi')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('toko')
export class TokoController {
  constructor(
    private readonly tokoService: TokoService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload-foto')
  @Roles(Role.ADMIN_KOPERASI, Role.KASIR_TOKO, Role.BENDAHARA)
  @ApiOperation({ summary: 'Upload foto produk toko ke Cloudinary' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    }),
  )
  async uploadFoto(@UploadedFile() file: any) {
    const res = await this.cloudinaryService.uploadFile(file, 'casheva/toko-produk');
    return {
      url: (res as any).secure_url || (res as any).url,
      publicId: (res as any).public_id,
    };
  }

  @Get('kategori')
  @ApiOperation({ summary: 'Daftar kategori produk toko' })
  getKategori(@CurrentUser() user: JwtUser) {
    return this.tokoService.getKategori(user);
  }

  @Post('kategori')
  @Roles(Role.ADMIN_KOPERASI, Role.KASIR_TOKO, Role.BENDAHARA)
  @ApiOperation({ summary: 'Tambah kategori produk' })
  createKategori(
    @CurrentUser() user: JwtUser,
    @Body() dto: { nama: string; deskripsi?: string },
  ) {
    return this.tokoService.createKategori(user, dto);
  }

  @Get('produk')
  @ApiOperation({ summary: 'Daftar katalog produk toko' })
  getProduk(
    @CurrentUser() user: JwtUser,
    @Query('search') search?: string,
    @Query('kategoriId') kategoriId?: string,
    @Query('stokKritis') stokKritis?: string,
    @Query('fastConsumeOnly') fastConsumeOnly?: string,
    @Query('promoOnly') promoOnly?: string,
  ) {
    return this.tokoService.getProduk(user, {
      search,
      kategoriId,
      stokKritis: stokKritis === 'true',
      fastConsumeOnly: fastConsumeOnly === 'true',
      promoOnly: promoOnly === 'true',
    });
  }

  @Get('produk/barcode/:barcode')
  @ApiOperation({ summary: 'Cari produk by barcode' })
  getProdukByBarcode(
    @CurrentUser() user: JwtUser,
    @Param('barcode') barcode: string,
  ) {
    return this.tokoService.getProdukByBarcode(user, barcode);
  }

  @Post('produk')
  @Roles(Role.ADMIN_KOPERASI, Role.KASIR_TOKO, Role.BENDAHARA)
  @ApiOperation({ summary: 'Tambah produk baru' })
  createProduk(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.tokoService.createProduk(user, dto);
  }

  @Patch('produk/:id')
  @Roles(Role.ADMIN_KOPERASI, Role.KASIR_TOKO, Role.BENDAHARA)
  @ApiOperation({ summary: 'Update produk' })
  updateProduk(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.tokoService.updateProduk(user, id, dto);
  }

  @Post('opname')
  @Roles(Role.ADMIN_KOPERASI, Role.KASIR_TOKO, Role.BENDAHARA)
  @ApiOperation({ summary: 'Penyesuaian stok (Stock Opname)' })
  opnameStok(
    @CurrentUser() user: JwtUser,
    @Body()
    dto: {
      produkId: string;
      stokFisikBaru: number;
      alasan: string;
    },
  ) {
    return this.tokoService.opnameStok(user, dto);
  }

  @Get('mutasi-stok')
  @ApiOperation({ summary: 'Riwayat mutasi stok produk' })
  getMutasiStok(
    @CurrentUser() user: JwtUser,
    @Query('produkId') produkId?: string,
  ) {
    return this.tokoService.getMutasiStok(user, produkId);
  }
}
