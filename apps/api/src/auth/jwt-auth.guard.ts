import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/** Guards admin-only routes (Spec §4: /players & /admin protected). */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
