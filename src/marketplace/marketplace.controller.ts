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
import { MarketplaceService } from './marketplace.service';
import { CloudinaryService } from '../common/cloudinary/cloudinary.service';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { JwtUser } from '../common/interfaces/jwt-user.interface';
import { StatusPengajuanMarketplace } from '@prisma/client';

@ApiTags('Marketplace UMKM Anggota')
@ApiBearerAuth('JWT-auth')
@UseGuards(AuthGuard('jwt'))
@Controller('marketplace')
export class MarketplaceController {
  constructor(
    private readonly marketplaceService: MarketplaceService,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  @Post('upload-foto')
  @ApiOperation({ summary: 'Upload foto produk UMKM ke Cloudinary' })
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
    const res = await this.cloudinaryService.uploadFile(file, 'casheva/marketplace-umkm');
    return {
      url: (res as any).secure_url || (res as any).url,
      publicId: (res as any).public_id,
    };
  }

  @Post('ajukan')
  @ApiOperation({ summary: 'Anggota mengajukan produk titip jual' })
  ajukanProduk(@CurrentUser() user: JwtUser, @Body() dto: any) {
    return this.marketplaceService.ajukanProduk(user, dto);
  }

  @Get('pengajuan')
  @ApiOperation({ summary: 'Daftar pengajuan produk marketplace' })
  getPengajuan(
    @CurrentUser() user: JwtUser,
    @Query('anggotaId') anggotaId?: string,
    @Query('status') status?: StatusPengajuanMarketplace,
  ) {
    return this.marketplaceService.getPengajuan(user, { anggotaId, status });
  }

  @Patch('pengajuan/:id/review')
  @ApiOperation({ summary: 'Review dan validasi pengajuan produk (Approve/Reject)' })
  reviewPengajuan(
    @CurrentUser() user: JwtUser,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.marketplaceService.reviewPengajuan(user, id, dto);
  }
}
