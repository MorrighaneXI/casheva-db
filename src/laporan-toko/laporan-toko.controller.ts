import {
  Controller,
  Get,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LaporanTokoService } from './laporan-toko.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('Laporan & Analisis Toko Koperasi')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(
  Role.ADMIN_KOPERASI,
  Role.BENDAHARA,
  Role.KEPRIM,
  Role.PIMPINAN,
  Role.PENGAWAS,
  Role.KASIR_TOKO,
)
@Controller('laporan-toko')
export class LaporanTokoController {
  constructor(private readonly laporanTokoService: LaporanTokoService) {}

  @Get('ringkasan')
  @ApiOperation({ summary: 'Ringkasan performa toko, omset, HPP & laba kotor' })
  getRingkasan(@CurrentUser() user: JwtUser) {
    return this.laporanTokoService.getRingkasanToko(user);
  }

  @Get('terlaris')
  @ApiOperation({ summary: 'Daftar produk terlaris' })
  getProdukTerlaris(
    @CurrentUser() user: JwtUser,
    @Query('limit') limit?: string,
  ) {
    return this.laporanTokoService.getProdukTerlaris(
      user,
      limit ? parseInt(limit, 10) : 5,
    );
  }
}
