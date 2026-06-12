import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Guards admin-only routes with Supabase Auth (Spec §4 → Supabase migration).
 * Verifies the Bearer access token against Supabase, then (optionally) checks
 * the user's email against the ADMIN_EMAILS allowlist. Only the Game Master
 * has a Supabase account; viewers are anonymous.
 */
@Injectable()
export class SupabaseAuthGuard implements CanActivate {
  constructor(private readonly supabase: SupabaseService) {}

  private allowlist(): string[] {
    return (process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const header: string = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!token) throw new UnauthorizedException('ต้องเข้าสู่ระบบก่อน');

    const client = this.supabase.admin;
    // local dev without Supabase: accept the demo password used as a bearer
    if (!client) {
      if (token === (process.env.ADMIN_PASSWORD || 'aofa2026')) return true;
      throw new UnauthorizedException('Supabase ไม่ได้ตั้งค่า');
    }

    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user) throw new UnauthorizedException('เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');

    const allow = this.allowlist();
    const email = (data.user.email || '').toLowerCase();
    if (allow.length && !allow.includes(email)) {
      throw new ForbiddenException('บัญชีนี้ไม่มีสิทธิ์ Game Master');
    }

    req.user = { id: data.user.id, email: data.user.email };
    return true;
  }
}
