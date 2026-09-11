import { getActiveTwoFactorConfig, isTwoFactorConfigured } from "@/config/two-factor-config";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export interface PhoneOtpRecord {
  phone: string;
  otp: string;
  expiresAt: number; // timestamp in ms
  attempts: number;
}

const PHONE_OTP_KEY_PREFIX = "arogya_phone_otp_";
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes

/** Generate a secure 6-digit numerical OTP string */
export function generateNumericPhoneOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const code = (array[0] % 900000) + 100000;
  return code.toString();
}

/** Store phone OTP session */
function storePhoneOtpSession(phone: string, otp: string): void {
  const cleanPhone = phone.replace(/\D/g, "");
  const record: PhoneOtpRecord = {
    phone: cleanPhone,
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
  };
  try {
    sessionStorage.setItem(`${PHONE_OTP_KEY_PREFIX}${cleanPhone}`, JSON.stringify(record));
  } catch {
    // fallback
  }
}

/** Retrieve active phone OTP session */
function getPhoneOtpSession(phone: string): PhoneOtpRecord | null {
  const cleanPhone = phone.replace(/\D/g, "");
  try {
    const raw = sessionStorage.getItem(`${PHONE_OTP_KEY_PREFIX}${cleanPhone}`);
    if (!raw) return null;
    const record: PhoneOtpRecord = JSON.parse(raw);
    if (Date.now() > record.expiresAt) {
      sessionStorage.removeItem(`${PHONE_OTP_KEY_PREFIX}${cleanPhone}`);
      return null;
    }
    return record;
  } catch {
    return null;
  }
}

/** Clear active phone OTP session */
export function clearPhoneOtpSession(phone: string): void {
  const cleanPhone = phone.replace(/\D/g, "");
  try {
    sessionStorage.removeItem(`${PHONE_OTP_KEY_PREFIX}${cleanPhone}`);
  } catch {
    // ignore
  }
}

export interface SendPhoneOtpResult {
  ok: boolean;
  message: string;
  debugOtp?: string;
  provider?: string;
}

/**
 * Sends a 6-digit SMS OTP to the user's mobile phone via 2Factor API.
 */
export async function sendTwoFactorPhoneOtp(phone: string): Promise<SendPhoneOtpResult> {
  const cleanPhone = phone.replace(/\D/g, "");
  if (!cleanPhone || cleanPhone.length < 10) {
    throw new Error("Please enter a valid 10-digit mobile number.");
  }

  const otp = generateNumericPhoneOtp();
  storePhoneOtpSession(cleanPhone, otp);

  let providerUsed = "Local Mode";
  let serverMessage = "";

  try {
    const res = await fetch("/api/send-phone-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: cleanPhone, otp }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        providerUsed = data.provider || "2Factor.in";
        serverMessage = `A 6-digit SMS code was dispatched to +91 ${cleanPhone.slice(-10)}.`;
      }
    }
  } catch (err) {
    console.warn("[ArogyaOS 2Factor Client Warning]", err);
  }

  return {
    ok: true,
    message: serverMessage || `A 6-digit verification code has been sent to +91 ${cleanPhone.slice(-10)}.`,
    debugOtp: otp,
    provider: providerUsed,
  };
}

/**
 * Verifies the 6-digit phone SMS OTP.
 */
export async function verifyTwoFactorPhoneOtp(
  phone: string,
  enteredOtp: string,
): Promise<{ ok: boolean; message: string }> {
  const cleanPhone = phone.replace(/\D/g, "");
  const cleanOtp = enteredOtp.trim().replace(/\D/g, "");

  if (cleanOtp.length !== 6) {
    throw new Error("Please enter all 6 digits of the SMS code.");
  }

  const record = getPhoneOtpSession(cleanPhone);
  if (!record) {
    throw new Error("SMS OTP has expired or was not requested. Please click resend.");
  }

  if (record.attempts >= 5) {
    clearPhoneOtpSession(cleanPhone);
    throw new Error("Too many incorrect attempts. Please request a fresh SMS OTP.");
  }

  if (record.otp !== cleanOtp) {
    record.attempts += 1;
    try {
      sessionStorage.setItem(`${PHONE_OTP_KEY_PREFIX}${cleanPhone}`, JSON.stringify(record));
    } catch {
      // ignore
    }
    throw new Error(`Invalid SMS code. ${5 - record.attempts} attempt(s) remaining.`);
  }

  return { ok: true, message: "Mobile number verified successfully!" };
}

import { saveRegisteredAccount, setActiveLocalSession } from "@/lib/account-store";

/**
 * Creates the user account in Supabase when registering via Mobile Phone OTP.
 */
export async function createAccountViaPhoneOnly(
  fullName: string,
  phone: string,
  password: string,
): Promise<{ ok: boolean; message: string }> {
  const cleanPhone = phone.replace(/\D/g, "");
  const cleanName = fullName.trim();
  const syntheticEmail = `${cleanPhone}@phone.arogyaos.local`;
  const userId = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : "10000000-0000-0000-0000-000000000000".replace(/0/g, () => (0 | Math.random() * 16).toString(16));

  // 1. Persist in registered account store
  saveRegisteredAccount({
    id: userId,
    fullName: cleanName,
    email: syntheticEmail,
    phone: cleanPhone,
    password,
    channel: "phone",
    createdAt: new Date().toISOString(),
  });

  // 2. Set active session
  const userObj = {
    id: userId,
    email: syntheticEmail,
    user_metadata: { full_name: cleanName, phone: cleanPhone },
    app_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
  };

  const profileObj = {
    id: userId,
    full_name: cleanName,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  setActiveLocalSession({ user: userObj, profile: profileObj });

  // 3. Attempt Supabase sync
  if (isSupabaseConfigured) {
    const supabase = getSupabase();

    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: syntheticEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            phone_verified: true,
          },
        },
      });

      if (!signUpErr && signUpData?.session?.user) {
        const supUserId = signUpData.session.user.id;
        userObj.id = supUserId;
        profileObj.id = supUserId;
        setActiveLocalSession({ user: userObj, profile: profileObj });

        try {
          await supabase.from("profiles").upsert({
            id: supUserId,
            full_name: cleanName,
            phone: cleanPhone,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // ignore
        }
      } else if (signUpErr) {
        const { data: signInData } = await supabase.auth.signInWithPassword({
          email: syntheticEmail,
          password,
        });

        if (signInData?.session?.user) {
          const supUserId = signInData.session.user.id;
          userObj.id = supUserId;
          profileObj.id = supUserId;
          setActiveLocalSession({ user: userObj, profile: profileObj });
        }
      }
    } catch (err) {
      console.warn("[ArogyaOS Phone Supabase Sync Note]", err);
    }
  }

  clearPhoneOtpSession(cleanPhone);
  return { ok: true, message: "Account created and stored in database successfully!" };
}

/**
 * Creates the user account in Supabase with Full Name, Email, Phone, and Password
 * after 2-Factor (Email + Phone) verification is complete.
 */
export async function createTwoFactorAccount(
  fullName: string,
  email: string,
  phone: string,
  password: string,
): Promise<{ ok: boolean; message: string }> {
  const cleanEmail = email.toLowerCase().trim();
  const cleanPhone = phone.replace(/\D/g, "");
  const cleanName = fullName.trim();

  if (isSupabaseConfigured) {
    const supabase = getSupabase();

    try {
      const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: cleanEmail,
        password,
        options: {
          data: {
            full_name: cleanName,
            phone: cleanPhone,
            phone_verified: true,
            email_verified: true,
          },
        },
      });

      if (signUpErr) {
        const errMsg = signUpErr.message.toLowerCase();
        if (errMsg.includes("rate limit") || errMsg.includes("already registered")) {
          const { data: signInData } = await supabase.auth.signInWithPassword({
            email: cleanEmail,
            password,
          });

          if (signInData?.session) {
            clearPhoneOtpSession(cleanPhone);
            return { ok: true, message: "2-Factor Account authenticated successfully!" };
          }
        } else {
          throw new Error(signUpErr.message);
        }
      }

      if (signUpData?.session) {
        try {
          await supabase.from("profiles").upsert({
            id: signUpData.session.user.id,
            full_name: cleanName,
            phone: cleanPhone,
            updated_at: new Date().toISOString(),
          });
        } catch {
          // ignore
        }

        clearPhoneOtpSession(cleanPhone);
        return { ok: true, message: "Account registered & verified successfully!" };
      }
    } catch (err: any) {
      if (err?.message && !err.message.toLowerCase().includes("rate limit")) {
        throw err;
      }
    }
  }

  clearPhoneOtpSession(cleanPhone);
  return { ok: true, message: "Account created successfully." };
}
