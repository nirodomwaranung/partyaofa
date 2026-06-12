import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Uploads images to Supabase Storage (Spec migration). Accepts a dataURL,
 * stores the bytes in the bucket, and returns a public URL.
 *
 * Falls back gracefully: if Supabase is not configured (local dev), the
 * original dataURL is returned unchanged so nothing breaks.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger('StorageService');
  private readonly bucket = process.env.SUPABASE_STORAGE_BUCKET || 'avatars';

  constructor(private readonly supabase: SupabaseService) {
    if (supabase.enabled) this.log.log(`Supabase Storage enabled (bucket: ${this.bucket})`);
    else this.log.warn('Supabase Storage not configured — keeping images as dataURL');
  }

  /** Convert an incoming dataURL to a stored public URL. Pass-through otherwise. */
  async maybeUpload(value: string | null | undefined, prefix: string): Promise<string | null | undefined> {
    if (!value || !value.startsWith('data:')) return value; // already a URL or empty
    const client = this.supabase.admin;
    if (!client) return value; // local fallback

    const match = /^data:([^;]+);base64,(.*)$/s.exec(value);
    if (!match) return value;
    const [, mime, b64] = match;
    const ext = mime.split('/')[1]?.split('+')[0] || 'png';
    const buf = Buffer.from(b64, 'base64');
    const path = `${prefix}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

    const { error } = await client.storage.from(this.bucket).upload(path, buf, { contentType: mime, upsert: true });
    if (error) {
      this.log.error(`Upload failed: ${error.message}`);
      return value; // fall back to dataURL on error
    }
    return client.storage.from(this.bucket).getPublicUrl(path).data.publicUrl;
  }
}
