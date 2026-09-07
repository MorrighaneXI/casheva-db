import { Module } from '@nestjs/common';
import { LaporanTokoController } from './laporan-toko.controller';
import { LaporanTokoService } from './laporan-toko.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [LaporanTokoController],
  providers: [LaporanTokoService],
  exports: [LaporanTokoService],
})
export class LaporanTokoModule {}
