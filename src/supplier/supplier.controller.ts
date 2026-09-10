import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { SupplierService } from './supplier.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';

@ApiTags('Supplier & Pengadaan Barang')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.ADMIN_KOPERASI, Role.BENDAHARA, Role.KEPRIM, Role.KASIR_TOKO)
@Controller('supplier')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  @ApiOperation({ summary: 'Daftar supplier dan status hutang' })
  getSuppliers(@CurrentUser() user: JwtUser) {
    return this.supplierService.getSuppliers(user);
  }

  @Post()
  @ApiOperation({ summary: 'Tambah supplier baru' })
  createSupplier(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.supplierService.createSupplier(user, dto);
  }

  @Get('pembelian')
  @ApiOperation({ summary: 'Daftar faktur pembelian dari supplier' })
  getPembelian(
    @CurrentUser() user: JwtUser,
    @Query('supplierId') supplierId?: string,
  ) {
    return this.supplierService.getPembelian(user, supplierId);
  }

  @Post('pembelian')
  @ApiOperation({ summary: 'Catat faktur pembelian barang dari supplier' })
  createPembelian(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.supplierService.createPembelian(user, dto);
  }

  @Post('retur')
  @ApiOperation({ summary: 'Input retur barang cacat ke supplier' })
  createRetur(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.supplierService.createRetur(user, dto);
  }

  @Post('bayar-hutang')
  @ApiOperation({ summary: 'Pelunasan hutang pembelian ke supplier' })
  bayarHutangSupplier(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.supplierService.bayarHutangSupplier(user, dto);
  }
}
