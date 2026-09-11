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

async function testAuth() {
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = "Password123!";
  console.log(`Testing SignUp with ${testEmail}...`);

  const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { full_name: "Test User" },
    },
  });

  if (signUpErr) {
    console.error("SignUp Error:", signUpErr);
  } else {
    console.log("SignUp Success:", {
      user: signUpData.user ? { id: signUpData.user.id, email: signUpData.user.email, confirmed_at: signUpData.user.confirmed_at } : null,
      session: signUpData.session ? "Session exists" : "No session (Email confirmation required)",
    });
  }

  console.log("\nTesting SignInWithPassword immediately after...");
  const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({
    email: testEmail,
    password: testPassword,
  });

  if (signInErr) {
    console.error("SignIn Error:", signInErr);
  } else {
    console.log("SignIn Success:", {
      user: signInData.user?.id,
      session: signInData.session ? "Session active" : "No session",
    });
  }
}

testAuth();
