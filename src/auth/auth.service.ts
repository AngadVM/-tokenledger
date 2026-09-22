import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { createHash, timingSafeEqual } from 'node:crypto';
import { LoginDto } from '../dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    const adminEmail = this.config.getOrThrow<string>('ADMIN_EMAIL');
    const adminPassword = this.config.getOrThrow<string>('ADMIN_PASSWORD');

    if (!this.matches(dto.email, adminEmail) || !this.matches(dto.password, adminPassword)) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const payload = { sub: dto.email, role: 'admin' };
    const accessToken = await this.jwt.signAsync(payload, { expiresIn: '12h' });

    return { accessToken };
  }

  private matches(value: string, secret: string): boolean {
    const valueDigest = createHash('sha256').update(value).digest();
    const secretDigest = createHash('sha256').update(secret).digest();
    return timingSafeEqual(valueDigest, secretDigest);
  }
}