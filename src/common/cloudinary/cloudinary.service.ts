import { Injectable, BadRequestException } from '@nestjs/common';
import { UploadApiResponse, UploadApiErrorResponse, v2 as cloudinary } from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  async uploadFile(
    file: { buffer: Buffer; originalname?: string; mimetype?: string },
    folder: string = 'dokumen',
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    if (!file || !file.buffer) {
      throw new BadRequestException('File buffer tidak ditemukan');
    }

    // Safeguard jika config belum terpasang
    if (!cloudinary.config().api_key && process.env.CLOUDINARY_URL) {
      try {
        const uri = new URL(process.env.CLOUDINARY_URL);
        cloudinary.config({
          cloud_name: uri.hostname,
          api_key: uri.username,
          api_secret: uri.password,
          secure: true,
        });
      } catch {}
    }

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'auto',
          filename_override: file.originalname,
          use_filename: true,
        },
        (error, result) => {
          if (error) return reject(error);
          if (!result) return reject(new Error('Cloudinary upload return empty result'));
          resolve(result);
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }

  async deleteFile(publicId: string): Promise<any> {
    return new Promise((resolve) => {
      cloudinary.uploader.destroy(publicId, { resource_type: 'raw' }, (error, result) => {
        if (error || result?.result !== 'ok') {
          cloudinary.uploader.destroy(publicId, (err2, res2) => {
            resolve(res2 || result);
          });
        } else {
          resolve(result);
        }
      });
    });
  }
}
