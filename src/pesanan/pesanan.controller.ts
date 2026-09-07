import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PesananService } from './pesanan.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { StatusPesananOnline, TipePengambilan } from '@prisma/client';

@ApiTags('Pesanan Online, Titip Piket & Delivery SLA')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('pesanan')
export class PesananController {
  constructor(private readonly pesananService: PesananService) {}

  @Post()
  @ApiOperation({ summary: 'Buat pesanan baru (Ambil Sendiri / Titip Piket / Delivery Cepat)' })
  createPesanan(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.pesananService.createPesanan(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar pesanan aktif dan riwayat delivery' })
  getPesanan(
    @CurrentUser() user: JwtUser,
    @Query('anggotaId') anggotaId?: string,
    @Query('status') status?: StatusPesananOnline,
    @Query('tipePengambilan') tipePengambilan?: TipePengambilan,
  ) {
    return this.pesananService.getPesanan(user, {
      anggotaId,
      status,
      tipePengambilan,
    });
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update status pesanan (Konfirmasi, Antar, Titip Piket, Selesai)' })
  updateStatus(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('status') status: StatusPesananOnline,
    @Body('petugasPiket') petugasPiket?: string,
  ) {
    return this.pesananService.updateStatusPesanan(user, id, status, petugasPiket);
  }
}
