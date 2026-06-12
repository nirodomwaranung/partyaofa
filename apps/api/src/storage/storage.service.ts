import { Injectable, Logger } from '@nestjs/common';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Uploads images to Supabase Storage (Spec migration). Accepts a dataURL,
 * stores the bytes in the bucket, and returns a public URL.
 *
 * Falls back gracefully: if Supabase env vars are absent (local dev), the
 * original dataURL is returned unchanged so nothing breaks.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger('StorageService');
  private client: SupabaseClient | null = null;
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';

  constructor() {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (url && key) {
      this.client = createClient(url, key, { auth: { persistSession: false } });
      this.log.log(`Supabase Storage enabled (bucket: ${this.bucket})`);
    } else {
      this.log.warn('Supabase Storage not configured — keeping images as dataURL');
    }
  }

  get enabled() {
    return !!this.client;
  }

  /** Convert an incoming dataURL to a stored public URL. Pass-through otherwise. */
  async maybeUpload(value: string | null | undefined, prefix: string): Promise<string | null | undefined> {
    if (!value || !value.startsWith('data:')) return value; // already a URL or empty
    if (!this.client) return value; // local fallback

    const match = /^data:([^;]+);base64,(.*)$/s.exec(value);
    if (!match) return value;
    const [, mime, b64] = match;
    const ext = mime.split('/')[1]?.split('+')[0] || 'png';
    const buf = Buffer.from(b64, 'base64');
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await this.client.storage
      .from(this.bucket)
      .upload(path, buf, { contentType: mime, upsert: true });
    if (error) {
      this.log.error(`Upload failed: ${error.message}`);
      return value; // fall back to dataURL on error
    }
    const { data } = this.client.storage.from(this.bucket).getPublicUrl(path);
    return data.publicUrl;
  }
}
