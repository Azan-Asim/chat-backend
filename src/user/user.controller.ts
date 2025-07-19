import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { UserService } from './user.service';
import { SignupDto } from './dto/signup.dto';
import { LoginDto } from './dto/login.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { CryptUtil } from 'src/utils/crypt.util';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) { }

  @Post('signup')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/users',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${CryptUtil.generateId()}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          cb(new BadRequestException('Only image files (jpg, png, jpeg) are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  signup(
    @Body() body: SignupDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const imageUrl = file ? `/uploads/users/${file.filename}` : null;
    return this.userService.signup(body, imageUrl);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.userService.login(body);
  }

  @Get()
  getAllUsers() {
    return this.userService.getAllUsers();
  }


  @UseGuards(JwtAuthGuard)
  @Get('profile')
  getProfile(@Request() req: any) {
    return this.userService.getUserById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('profile')
  updateProfile(
    @Request() req: any,
    @Body() body: Partial<{ name: string; email: string; password: string }>
  ) {
    return this.userService.updateUserProfile(req.user.id, body);
  }


  @UseGuards(JwtAuthGuard)
  @Patch('profile/image')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads/users',
        filename: (req, file, cb) => {
          const ext = path.extname(file.originalname);
          cb(null, `${CryptUtil.generateId()}${ext}`);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
      fileFilter: (req, file, cb) => {
        if (!file.mimetype.match(/\/(jpg|jpeg|png)$/)) {
          cb(new BadRequestException('Only image files (jpg, jpeg, png) are allowed!'), false);
        } else {
          cb(null, true);
        }
      },
    }),
  )
  updateProfileImage(
    @Request() req: any,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('No image file uploaded');
    const imageUrl = `/uploads/users/${file.filename}`;
    return this.userService.updateProfileImage(req.user.id, imageUrl);
  }


  @UseGuards(JwtAuthGuard)
  @Delete('profile')
  deleteProfile(@Request() req: any) {
    return this.userService.deleteUser(req.user.id);
  }
}
