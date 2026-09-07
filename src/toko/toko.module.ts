import { Module } from '@nestjs/common';
import { TokoController } from './toko.controller';
import { TokoService } from './toko.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [TokoController],
  providers: [TokoService],
  exports: [TokoService],
})
export class TokoModule {}

