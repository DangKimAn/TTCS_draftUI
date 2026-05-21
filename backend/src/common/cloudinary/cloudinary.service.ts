import { Injectable } from '@nestjs/common';
import {
  UploadApiErrorResponse,
  UploadApiResponse,
  v2 as cloudinary,
} from 'cloudinary';
import * as streamifier from 'streamifier';

@Injectable()
export class CloudinaryService {
  uploadFile(
    file: Express.Multer.File,
  ): Promise<UploadApiResponse | UploadApiErrorResponse> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'timesheet_pro_avatars',
        },
        (error, result) => {
          if (error) return reject(new Error(error?.message || 'Upload error'));
          if (result) return resolve(result);
          reject(new Error('Upload failed: Result is undefined'));
        },
      );

      streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
  }
}
