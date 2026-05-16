import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { ConfigService } from '@nestjs/config';
@Injectable()
export class BycyptHashedService {
  private readonly saltRounds: number;

  constructor(private configService: ConfigService) {
    this.saltRounds = Number(
      this.configService.get<string>('BCRYPT_SALT_ROUNDS') || 10,
    );
  }

  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, this.saltRounds);
  }

  async compare(password: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(password, hashed);
  }
}
