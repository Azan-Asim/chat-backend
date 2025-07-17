import { diskStorage } from 'multer';
import { mkdirSync } from 'fs';
import { join, extname } from 'path';
import { BadRequestException } from '@nestjs/common';
import {
  SUPPORTED_IMAGE_TYPES,
  SUPPORTED_VIDEO_TYPES,
  SUPPORTED_AUDIO_TYPES,
} from '../lib/fileType.constant';

export const multerOptions = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      let folder = 'other';
      if (file.mimetype.startsWith('image/')) folder = 'image';
      else if (file.mimetype.startsWith('audio/')) folder = 'audio';
      else if (file.mimetype.startsWith('video/')) folder = 'video';

      const dest = join(process.cwd(), 'uploads', 'message', folder);
      mkdirSync(dest, { recursive: true });
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const ext = extname(file.originalname);
      cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
    },
  }),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50 MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      if (!SUPPORTED_IMAGE_TYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Unsupported image type'), false);
      }
    } else if (file.mimetype.startsWith('video/')) {
      if (!SUPPORTED_VIDEO_TYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Unsupported video type'), false);
      }
    } else if (file.mimetype.startsWith('audio/')) {
      if (!SUPPORTED_AUDIO_TYPES.includes(file.mimetype)) {
        return cb(new BadRequestException('Unsupported audio type'), false);
      }
    } else {
      return cb(new BadRequestException('Invalid file type'), false);
    }

    cb(null, true);
  },
};
