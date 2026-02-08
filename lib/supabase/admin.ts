import { createClient } from '@supabase/supabase-js';

/**
 * サーバーサイド専用 admin クライアント（service_role key 使用）
 * クライアントには絶対に露出させないこと
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
