import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

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

const supabaseUrl = env.VITE_SUPABASE_URL;
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY;

console.log('Testing Supabase DB tables at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTables() {
  const tables = ['profiles', 'medical_reports', 'health_metrics', 'personal_baselines', 'ai_insights', 'voice_conversations'];
  for (const table of tables) {
    const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.log(`Table [${table}]: ERROR -`, error.message);
    } else {
      console.log(`Table [${table}]: OK (count: ${count ?? 0})`);
    }
  }
}

checkTables();
