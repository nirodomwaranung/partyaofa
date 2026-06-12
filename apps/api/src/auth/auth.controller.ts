import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { SupabaseAuthGuard } from './supabase-auth.guard';

@Controller('auth')
export class AuthController {
  /** Frontend verifies its Supabase session against the API (admin check). */
  @UseGuards(SupabaseAuthGuard)
  @Get('me')
  me(@Req() req: any) {
    return { role: 'admin', user: req.user };
  }
}
