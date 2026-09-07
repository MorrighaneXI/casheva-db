import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { LoyaltyService } from './loyalty.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';

@ApiTags('Loyalty, Undian RAT & Target Belanja')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('poin-target/:anggotaId')
  @ApiOperation({ summary: 'Cek saldo poin belanja dan progress target bulanan anggota' })
  getPoinDanTarget(
    @CurrentUser() user: JwtUser,
    @Param('anggotaId') anggotaId: string,
  ) {
    return this.loyaltyService.getPoinDanTarget(user, anggotaId);
  }

  @Get('events')
  @ApiOperation({ summary: 'Daftar event undian RAT' })
  getEvents(@CurrentUser() user: JwtUser) {
    return this.loyaltyService.getEvents(user);
  }

  @Post('events')
  @ApiOperation({ summary: 'Buat event undian baru' })
  createEvent(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.loyaltyService.createEvent(user, dto);
  }

  @Post('tukar-kupon')
  @ApiOperation({ summary: 'Tukarkan poin belanja dengan kupon undian RAT' })
  tukarKuponUndian(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.loyaltyService.tukarKuponUndian(user, dto);
  }

  @Post('events/:id/kocok')
  @ApiOperation({ summary: 'Kocok pemenang undian secara acak' })
  kocokPemenang(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: { namaHadiah: string },
  ) {
    return this.loyaltyService.kocokPemenang(user, id, dto);
  }
}
