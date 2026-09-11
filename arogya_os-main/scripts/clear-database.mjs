import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Read .env.local manually
function loadEnv() {
  const envPath = path.resolve(".env.local");
  if (!fs.existsSync(envPath)) return {};
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx > -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const rawUrl = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!rawUrl || !anonKey) {
  console.error("Supabase URL or Key not found in .env.local");
  process.exit(1);
}

const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");
console.log(`Connecting to Supabase at: ${url}`);

const supabase = createClient(url, anonKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const TABLES = [
  "ai_insights",
  "action_plan_items",
  "health_metrics",
  "personal_baselines",
  "voice_conversations",
  "medical_reports",
  "lab_results",
  "lab_audit_events",
  "lab_samples",
  "lab_orders",
  "profiles",
];

async function clearAllData() {
  console.log("Beginning database purge across all tables...\n");

  for (const table of TABLES) {
    try {
      const { error, count } = await supabase
        .from(table)
        .delete({ count: "exact" })
        .neq("id", "00000000-0000-0000-0000-000000000000");

      if (error) {
        console.warn(`[!] Note on table '${table}': ${error.message}`);
      } else {
        console.log(`[✓] Purged table '${table}' — rows deleted: ${count ?? 0}`);
      }
    } catch (err) {
      console.error(`Error purging '${table}':`, err);
    }
  }

  console.log("\nDatabase purge routine completed.");
}

clearAllData();
