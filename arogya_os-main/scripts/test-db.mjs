import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

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
const rawUrl = env.VITE_SUPABASE_URL;
const anonKey = env.VITE_SUPABASE_ANON_KEY;
const url = rawUrl.replace(/\/rest\/v1\/?$/, "").replace(/\/$/, "");

const supabase = createClient(url, anonKey);

async function testProfiles() {
  console.log("Testing reading/writing profiles table...");
  const testId = "11111111-2222-3333-4444-555555555555";
  const { data: upsertData, error: upsertErr } = await supabase
    .from("profiles")
    .upsert({
      id: testId,
      full_name: "Verification User",
      updated_at: new Date().toISOString(),
    })
    .select();

  console.log("Profiles Upsert Result:", { data: upsertData, error: upsertErr });

  const { data: selectData, error: selectErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", testId);

  console.log("Profiles Select Result:", { data: selectData, error: selectErr });

  // cleanup
  await supabase.from("profiles").delete().eq("id", testId);
}

testProfiles();
