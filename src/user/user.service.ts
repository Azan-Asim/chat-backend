import { Injectable, ConflictException, UnauthorizedException, NotFoundException, BadRequestException } from '@nestjs/common';
import { SignupDto } from './dto/signup.dto';
import { InjectModel } from '@nestjs/sequelize';
import { User } from './user.model';
import { LoginDto } from './dto/login.dto';
import { CryptUtil } from 'src/utils/crypt.util';
import { AuthService } from 'src/auth/auth.service';
import { success } from 'src/utils/response.helper';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User) private userModel: typeof User,
    private readonly AuthService: AuthService,
  ) { }

  async signup(body: SignupDto, imageUrl: string | null) {
    const { name, email, password } = body;

    const existingUser = await this.userModel.findOne({ where: { email } });
    if (existingUser) throw new ConflictException('Email already registered');

    const hashedPassword = await CryptUtil.hashPassword(password);


    const createPayload: any = {
      id: CryptUtil.generateId(),
      name,
      email,
      password: hashedPassword,
    };

    if (imageUrl) {
      createPayload.imageUrl = imageUrl;
    }

    const user = await this.userModel.create(createPayload);
    
   const plainUser = user.toJSON()
    const token = this.generateToken({ id: plainUser.id, email: plainUser.email });

    return success("Signup Successfully", createPayload, { token })
  }

  async login(body: LoginDto) {
    const { email, password } = body;

    const user = await this.userModel.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const isPasswordValid = await CryptUtil.verifyPassword(password, user.password);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid credentials');

    const plainUser = user.toJSON()
    const token = this.generateToken({ id: plainUser.id, email: plainUser.email });

    return success("Login Successful.", user, { token })
  }

  async getAllUsers() {
    const users = await this.userModel.findAll({
      attributes: ['id', 'name', 'email', 'imageUrl', 'createdAt'],
    });
    return success("All Users Data Fetched Successfully", users);
  }

  async getUserById(userId: string) {
    const user = await this.userModel.findByPk(userId, {
      attributes: ['id', 'name', 'email', 'imageUrl', 'createdAt'],
    });
    if (!user) throw new NotFoundException('User not found');
    return success("user Profile Data Fetched Successfully", user);
  }

  async updateUserProfile(
    userId: string,
    body: Partial<{ name: string; email: string; password: string }>
  ) {
    const user = await this.userModel.findByPk(userId);
    if (!user) throw new NotFoundException('User not found');

    if (body.email) {
      throw new BadRequestException('Email cannot be updated');
    }

    if (body.name) {
      user.name = body.name;
    }

    if (body.password) {
      user.password = await CryptUtil.hashPassword(body.password);
    }

    await user.save();

    const updatedUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      imageUrl: user.imageUrl,
      createdAt: user.createdAt,
    };

    return success(
      'Profile updated successfully',
      updatedUser,
      { updatedAt: user.updatedAt }
    );
  }


  async updateProfileImage(userId: string, imageUrl: string) {
    const user = await this.userModel.findByPk(userId);
    if (!user) throw new NotFoundException('User not found');

    user.imageUrl = imageUrl;
    await user.save();

    return success(
      'Profile image updated successfully',
      { id: user.id, imageUrl: user.imageUrl },
      { updatedAt: user.updatedAt }
    );
  }


  async deleteUser(userId: string) {
    const user = await this.userModel.findByPk(userId);
    if (!user) throw new NotFoundException('User not found');

    await user.destroy();

    return { message: 'User deleted successfully' };
  }

  private generateToken(payload) {
    return this.AuthService.generateToken(payload);
  }
}
