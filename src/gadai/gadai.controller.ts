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
import { GadaiService } from './gadai.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { StatusGadai, KategoriBarangGadai } from '@prisma/client';

@ApiTags('Unit Usaha Gadai & Lelang Emas/Elektronik')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('gadai')
export class GadaiController {
  constructor(
    private readonly gadaiService: GadaiService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload-foto')
  @ApiOperation({ summary: 'Upload foto agunan barang gadai ke Cloudinary' })
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
    const res = await this.cloudinaryService.uploadFile(file, 'casheva/gadai-agunan');
    return {
      url: (res as any).secure_url || (res as any).url,
      publicId: (res as any).public_id,
    };
  }

  @Post('simulasi')
  @ApiOperation({ summary: 'Kalkulator taksiran nilai agunan emas & elektronik' })
  simulasiTaksiran(@Body() dto: any) {
    return this.gadaiService.simulasiTaksiran(dto);
  }

  @Post('ajukan')
  @ApiOperation({ summary: 'Pengajuan gadai dan penerbitan Surat Bukti Gadai (SBG)' })
  ajukanGadai(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.gadaiService.ajukanGadai(user, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Daftar transaksi gadai' })
  getGadaiList(
    @CurrentUser() user: JwtUser,
    @Query('anggotaId') anggotaId?: string,
    @Query('status') status?: StatusGadai,
    @Query('lelangOnly') lelangOnly?: string,
  ) {
    return this.gadaiService.getGadaiList(user, {
      anggotaId,
      status,
      lelangOnly: lelangOnly === 'true',
    });
  }

  @Post(':id/tebus')
  @ApiOperation({ summary: 'Penebusan barang gadai' })
  tebusGadai(@CurrentUser() user: JwtUser, @Param('id') id: string) {
    return this.gadaiService.tebusGadai(user, id);
  }

  @Patch(':id/lelang')
  @ApiOperation({ summary: 'Masukkan barang jatuh tempo ke etalase lelang' })
  jadwalkanLelang(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body('hargaBukaLelang') hargaBukaLelang?: number,
  ) {
    return this.gadaiService.jadwalkanLelang(user, id, hargaBukaLelang);
  }

  @Post(':id/beli-lelang')
  @ApiOperation({ summary: 'Pembelian barang dari etalase lelang koperasi' })
  beliBarangLelang(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.gadaiService.beliBarangLelang(user, id, dto);
  }
}
