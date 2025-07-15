
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';

export class CryptUtil {

  static generateId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}
