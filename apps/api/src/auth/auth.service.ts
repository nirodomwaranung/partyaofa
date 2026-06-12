import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';

/**
 * Demo-grade auth: a single shared admin password (Spec §4).
 * In a real deployment this would be a user table with bcrypt hashes.
 */
@Injectable()
export class AuthService {
  constructor(private readonly jwt: JwtService) {}

  private get adminPassword(): string {
    return process.env.ADMIN_PASSWORD ?? 'aofa2026';
  }

  login(password: string): { token: string; role: 'admin' } {
    if (!password || password !== this.adminPassword) {
      throw new UnauthorizedException('รหัสผ่านไม่ถูกต้อง');
    }
    const token = this.jwt.sign({ sub: 'game-master', role: 'admin' });
    return { token, role: 'admin' };
  }
}
