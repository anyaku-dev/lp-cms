import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getR2() {
  return new S3Client({
    region: 'auto',
    endpoint: process.env.R2_ENDPOINT!,
    credentials: {
      accessKeyId: process.env.R2_ACCESS_KEY_ID!,
      secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
    },
  });
}

const BUCKET = () => process.env.R2_BUCKET_NAME || '';
const PUBLIC_URL = () => process.env.R2_PUBLIC_URL || '';

export async function POST(request: NextRequest) {
  // 認証チェック
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // usernameを取得（R2のprefix用）
  const { data: profile } = await supabase.from('profiles').select('username').eq('id', user.id).single();
  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 400 });

  const body = await request.json();
  const { fileName, contentType, fileSize } = body;

  if (!fileName || !contentType) {
    return NextResponse.json({ error: 'fileName and contentType are required' }, { status: 400 });
  }

  const r2 = getR2();
  const bucket = BUCKET();
  const username = profile.username;

  // ファイル名をサニタイズ
  const ext = fileName.split('.').pop() || 'bin';
  const baseName = fileName.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z0-9_\-\u3000-\u9FFF\uF900-\uFAFF]/g, '_');
  const prefix = `${username}/`;

  // 同名ファイルチェック
  const existing = await r2.send(new ListObjectsV2Command({
    Bucket: bucket,
    Prefix: `${prefix}${baseName}`,
    MaxKeys: 1000,
  }));
  const existingKeys = new Set((existing.Contents || []).map(obj => obj.Key || ''));

  let uniqueName = `${prefix}${baseName}.${ext}`;
  if (existingKeys.has(uniqueName)) {
    let counter = 1;
    while (existingKeys.has(`${prefix}${baseName}-${String(counter).padStart(2, '0')}.${ext}`)) {
      counter++;
    }
    uniqueName = `${prefix}${baseName}-${String(counter).padStart(2, '0')}.${ext}`;
  }

  // Presigned PUT URL 発行
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: uniqueName,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(r2, command, { expiresIn: 300 });
  const publicUrl = `${PUBLIC_URL()}/${uniqueName}`;

  // DB に asset レコード登録
  const { error: assetErr } = await supabase.from('assets').insert({
    user_id: user.id,
    object_key: uniqueName,
    url: publicUrl,
    mime_type: contentType,
    file_size: fileSize || 0,
  });

  if (assetErr) {
    console.error('[upload] Failed to save asset record:', assetErr);
  }

  return NextResponse.json({
    signedUrl,
    publicUrl,
    objectKey: uniqueName,
  });
}
