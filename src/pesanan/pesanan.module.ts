import { Module } from '@nestjs/common';
import { PesananController } from './pesanan.controller';
import { PesananService } from './pesanan.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PesananController],
  providers: [PesananService],
  exports: [PesananService],
})
export class PesananModule {}
