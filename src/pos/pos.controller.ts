import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PosService } from './pos.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';

@ApiTags('Point of Sale (POS Kasir Toko)')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('pos')
export class PosController {
  constructor(private readonly posService: PosService) {}

  @Post('checkout')
  @Roles(Role.ADMIN_KOPERASI, Role.KASIR_TOKO, Role.BENDAHARA)
  @ApiOperation({ summary: 'Proses transaksi kasir POS' })
  checkout(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.posService.checkout(user, dto);
  }

  @Get('transaksi')
  @ApiOperation({ summary: 'Riwayat transaksi kasir POS' })
  getTransaksi(
    @CurrentUser() user: JwtUser,
    @Query('search') search?: string,
    @Query('metodeBayar') metodeBayar?: string,
    @Query('tanggalMulai') tanggalMulai?: string,
    @Query('tanggalSelesai') tanggalSelesai?: string,
  ) {
    return this.posService.getTransaksi(user, {
      search,
      metodeBayar,
      tanggalMulai,
      tanggalSelesai,
    });
  }

  @Get('transaksi/:id')
  @ApiOperation({ summary: 'Detail & struk transaksi POS' })
  getTransaksiById(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.posService.getTransaksiById(user, id);
  }

  @Post('transaksi/:id/void')
  @Roles(Role.ADMIN_KOPERASI, Role.BENDAHARA)
  @ApiOperation({ summary: 'Batalkan (Void) transaksi kasir & kembalikan stok' })
  voidTransaksi(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('alasan') alasan: string,
  ) {
    return this.posService.voidTransaksi(user, id, alasan || 'Void Kasir');
  }
}
