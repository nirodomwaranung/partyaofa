import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Local-disk image storage. Accepts a dataURL, writes the bytes under an
 * uploads volume, and returns a public URL served by the API at /uploads.
 * Pass-through if the value is already a URL.
 */
@Injectable()
export class StorageService {
  private readonly log = new Logger('StorageService');
  private readonly dir = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
  // absolute base so images load from the API origin (e.g. https://api.aofa.cloud)
  private readonly publicBase = process.env.PUBLIC_API_BASE || `http://localhost:${process.env.API_PORT || 3001}`;

  constructor() {
    fs.mkdirSync(this.dir, { recursive: true });
    this.log.log(`Local storage at ${this.dir} → served at ${this.publicBase}/uploads`);
  }

  /** Convert an incoming dataURL to a stored public URL. Pass-through otherwise. */
  async maybeUpload(value: string | null | undefined, prefix: string): Promise<string | null | undefined> {
    if (!value || !value.startsWith('data:')) return value; // already a URL or empty
    const m = /^data:([^;]+);base64,(.*)$/s.exec(value);
    if (!m) return value;
    const [, mime, b64] = m;
    const ext = mime.split('/')[1]?.split('+')[0] || 'png';
    const sub = path.join(this.dir, prefix);
    try {
      fs.mkdirSync(sub, { recursive: true });
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      fs.writeFileSync(path.join(sub, name), Buffer.from(b64, 'base64'));
      return `${this.publicBase}/uploads/${prefix}/${name}`;
    } catch (e: any) {
      this.log.error(`Upload failed: ${e.message}`);
      return value; // fall back to dataURL on error
    }
  }
}
