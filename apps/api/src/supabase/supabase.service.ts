import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Shared Supabase admin client (service-role). Used for Storage uploads and
 * for verifying user access tokens (Auth). Null when env is unconfigured so
 * local dev still works.
 */
@Injectable()
export class SupabaseService {
  private readonly log = new Logger('SupabaseService');
  readonly admin: SupabaseClient | null;

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
      this.log.log('Supabase client ready (service-role)');
    } else {
      this.admin = null;
      this.log.warn('Supabase not configured (SUPABASE_URL / SERVICE_ROLE_KEY missing)');
    }
  }

  get enabled() {
    return !!this.admin;
  }
}
