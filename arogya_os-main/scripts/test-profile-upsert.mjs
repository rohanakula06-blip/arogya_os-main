import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import crypto from 'crypto';

const envContent = fs.readFileSync('.env.local', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val;
  }
});

const cleanUrl = env.VITE_SUPABASE_URL.replace(/\/rest\/v1\/?$/, '').replace(/\/+$/, '');
const supabase = createClient(cleanUrl, env.VITE_SUPABASE_ANON_KEY);

async function testProfileUpsert() {
  const testId = crypto.randomUUID();
  console.log('Testing profile upsert for valid UUID:', testId);
  
  const { data, error } = await supabase.from('profiles').upsert({
    id: testId,
    full_name: 'Test Profile Patient',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }).select();

  if (error) {
    console.error('Profile upsert ERROR:', error);
  } else {
    console.log('Profile upsert SUCCESS:', data);
  }

  // Clean up test row
  await supabase.from('profiles').delete().eq('id', testId);
  console.log('Test row cleaned up.');
}

testProfileUpsert();
