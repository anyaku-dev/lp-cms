import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const results: Record<string, any> = {
    timestamp: new Date().toISOString(),
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL ? `✓ (${process.env.SUPABASE_URL})` : '✗ 未設定',
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY
        ? `✓ (先頭10文字: ${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...)`
        : '✗ 未設定',
      R2_ENDPOINT: process.env.R2_ENDPOINT ? '✓' : '✗ 未設定',
      R2_ACCESS_KEY_ID: process.env.R2_ACCESS_KEY_ID ? '✓' : '✗ 未設定',
      R2_SECRET_ACCESS_KEY: process.env.R2_SECRET_ACCESS_KEY ? '✓' : '✗ 未設定',
      R2_BUCKET_NAME: process.env.R2_BUCKET_NAME ? `✓ (${process.env.R2_BUCKET_NAME})` : '✗ 未設定',
      R2_PUBLIC_URL: process.env.R2_PUBLIC_URL ? `✓ (${process.env.R2_PUBLIC_URL})` : '✗ 未設定',
    },
  };

  // Supabase接続テスト
  try {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !key) {
      results.supabase = { status: 'ERROR', message: '環境変数が未設定' };
    } else {
      const supabase = createClient(url, key);

      // 1. テーブル存在確認 (SELECT)
      const { data: selectData, error: selectError } = await supabase
        .from('kv_store')
        .select('key')
        .limit(5);

      if (selectError) {
        results.supabase_select = {
          status: 'ERROR',
          code: selectError.code,
          message: selectError.message,
          hint: selectError.hint,
          details: selectError.details,
        };
      } else {
        results.supabase_select = {
          status: 'OK',
          rows: selectData?.length || 0,
          keys: selectData?.map(r => r.key) || [],
        };
      }

      // 2. UPSERT テスト
      const testKey = '_health_check';
      const { error: upsertError } = await supabase
        .from('kv_store')
        .upsert(
          { key: testKey, value: { test: true, at: new Date().toISOString() }, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );

      if (upsertError) {
        results.supabase_upsert = {
          status: 'ERROR',
          code: upsertError.code,
          message: upsertError.message,
          hint: upsertError.hint,
          details: upsertError.details,
        };
      } else {
        results.supabase_upsert = { status: 'OK' };
      }

      // 3. UPSERTしたデータの読み取り確認
      const { data: readData, error: readError } = await supabase
        .from('kv_store')
        .select('*')
        .eq('key', testKey)
        .single();

      if (readError) {
        results.supabase_read_back = {
          status: 'ERROR',
          code: readError.code,
          message: readError.message,
        };
      } else {
        results.supabase_read_back = {
          status: 'OK',
          data: readData,
        };
      }

      // クリーンアップ
      await supabase.from('kv_store').delete().eq('key', testKey);
    }
  } catch (e: any) {
    results.supabase = {
      status: 'EXCEPTION',
      message: e.message,
      stack: e.stack?.split('\n').slice(0, 5),
    };
  }

  return NextResponse.json(results, { status: 200 });
}
