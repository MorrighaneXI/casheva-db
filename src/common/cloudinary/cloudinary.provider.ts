import { v2 as cloudinary } from 'cloudinary';
import { ConfigService } from '@nestjs/config';

export const CloudinaryProvider = {
  provide: 'CLOUDINARY',
  inject: [ConfigService],
  useFactory: (configService: ConfigService) => {
    const rawUrl =
      configService.get<string>('CLOUDINARY_URL') || process.env.CLOUDINARY_URL;
    if (rawUrl) {
      try {
        const uri = new URL(rawUrl);
        cloudinary.config({
          cloud_name: uri.hostname,
          api_key: uri.username,
          api_secret: uri.password,
          secure: true,
        });
      } catch (e) {
        console.warn('Gagal mem-parse CLOUDINARY_URL:', e);
      }
    }
    return cloudinary;
  },
};
