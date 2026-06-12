/**
 * Create (or update) a Supabase Auth user to act as Game Master.
 *
 *   cd apps/api
 *   npx ts-node scripts/create-admin.ts <email> <password>
 *
 * Uses the service-role key from the root .env. The user is created with
 * email already confirmed, so they can log in immediately. Add the same email
 * to ADMIN_EMAILS in .env to restrict admin access to it.
 */
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

function loadEnv() {
  const p = path.resolve(__dirname, '../../../.env');
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, 'utf8').split('\n')) {
    const m = /^([A-Z0-9_]+)="?([^"]*)"?$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

async function main() {
  loadEnv();
  const [email, password] = process.argv.slice(2);
  if (!email || !password) {
    console.error('Usage: ts-node scripts/create-admin.ts <email> <password>');
    process.exit(1);
  }
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
  }
  const sb = createClient(url, key, { auth: { persistSession: false } });

  // already exists? update the password instead of failing
  const { data: list } = await sb.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
  if (existing) {
    const { error } = await sb.auth.admin.updateUserById(existing.id, { password, email_confirm: true });
    if (error) throw error;
    console.log(`✓ Updated password for existing Game Master: ${email}`);
  } else {
    const { error } = await sb.auth.admin.createUser({ email, password, email_confirm: true });
    if (error) throw error;
    console.log(`✓ Created Game Master account: ${email}`);
  }
  console.log('→ Add this to .env to lock admin access:');
  console.log(`  ADMIN_EMAILS="${email}"`);
}

main().catch((e) => {
  console.error('Failed:', e.message || e);
  process.exit(1);
});
