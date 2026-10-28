#!/usr/bin/env node
/**
 * Staging/local only: create the 9 Auth users required by SEED_MULTIEMPRESA_STAGING.sql.
 * Does NOT invent profile rows beyond what Auth triggers create; the seed upserts roles/companies.
 *
 * Usage (never commit secrets):
 *   SUPABASE_URL=https://xxx.supabase.co \
 *   SUPABASE_SERVICE_ROLE_KEY=... \
 *   SEED_AUTH_PASSWORD='your-staging-only-password' \
 *   node scripts/create_multiempresa_auth_users.mjs
 *
 * NEVER point this at production / Sala Chocolatte.
 */

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const password = process.env.SEED_AUTH_PASSWORD || '';

const USERS = [
  'admin.aurora@tableflow.test',
  'user.aurora@tableflow.test',
  'receptor.aurora@tableflow.test',
  'admin.eclipse@tableflow.test',
  'user.eclipse@tableflow.test',
  'receptor.eclipse@tableflow.test',
  'admin.nebula@tableflow.test',
  'user.nebula@tableflow.test',
  'receptor.nebula@tableflow.test',
];

if (!url || !serviceKey || !password) {
  console.error(
    'Missing env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SEED_AUTH_PASSWORD',
  );
  process.exit(1);
}

if (/chocolatte|creadorsala/i.test(url)) {
  console.error('Refusing: URL looks like Sala Chocolatte / CreadorSala.');
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let created = 0;
let existed = 0;

for (const email of USERS) {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    // No company-signup metadata — avoid handle_new_user creating extra companies.
    user_metadata: {},
  });

  if (error) {
    const msg = error.message || String(error);
    if (/already|registered|exists/i.test(msg)) {
      console.log(`exists: ${email}`);
      existed += 1;
      continue;
    }
    console.error(`FAIL ${email}: ${msg}`);
    process.exit(1);
  }

  console.log(`created: ${email} → ${data.user?.id}`);
  created += 1;
}

console.log(`Done. created=${created} already_existed=${existed}`);
console.log('Next: re-run supabase/seeds/SEED_MULTIEMPRESA_STAGING.sql');
