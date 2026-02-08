import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

const SEED_USERS = [
  { email: '1111anyaku@gmail.com', password: 'admin', username: 'admin' },
  { email: 'demo@example.com', password: 'demo1234', username: 'demo' },
];

export async function POST() {
  // 本番では無効化
  if (process.env.NODE_ENV === 'production' && process.env.ALLOW_SEED !== 'true') {
    return NextResponse.json({ error: 'Seed is disabled in production' }, { status: 403 });
  }

  const admin = createAdminClient();
  const results: any[] = [];

  for (const user of SEED_USERS) {
    try {
      // ユーザー作成（既存ならスキップ）
      const { data: authData, error: authErr } = await admin.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
      });

      let userId: string;
      if (authErr) {
        if (authErr.message?.includes('already been registered') || authErr.message?.includes('already exists')) {
          // 既存ユーザーを取得
          const { data: { users } } = await admin.auth.admin.listUsers();
          const existing = users?.find(u => u.email === user.email);
          if (!existing) { results.push({ email: user.email, status: 'error', error: authErr.message }); continue; }
          userId = existing.id;
        } else {
          results.push({ email: user.email, status: 'error', error: authErr.message });
          continue;
        }
      } else {
        userId = authData.user.id;
      }

      // プロフィール upsert（service_role で RLS バイパス）
      const { error: profileErr } = await admin.from('profiles').upsert({
        id: userId,
        username: user.username,
        email: user.email,
        plan: 'free',
      }, { onConflict: 'id' });

      if (profileErr) {
        results.push({ email: user.email, status: 'profile_error', error: profileErr.message });
        continue;
      }

      // user_settings upsert
      const { error: settingsErr } = await admin.from('user_settings').upsert({
        user_id: userId,
      }, { onConflict: 'user_id' });

      if (settingsErr) {
        results.push({ email: user.email, status: 'settings_error', error: settingsErr.message });
        continue;
      }

      results.push({ email: user.email, username: user.username, status: 'ok', userId });
    } catch (e: any) {
      results.push({ email: user.email, status: 'exception', error: e.message });
    }
  }

  return NextResponse.json({ results });
}
