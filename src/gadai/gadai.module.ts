import { Module } from '@nestjs/common';
import { GadaiController } from './gadai.controller';
import { GadaiService } from './gadai.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CloudinaryModule } from '../common/cloudinary/cloudinary.module';

@Module({
  imports: [PrismaModule, CloudinaryModule],
  controllers: [GadaiController],
  providers: [GadaiService],
  exports: [GadaiService],
})
export class GadaiModule {}

