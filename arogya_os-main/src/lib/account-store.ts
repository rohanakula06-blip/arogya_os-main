/**
 * ArogyaOS Account & Authentication Store
 * Ensures reliable registration and sign-in across both Supabase and local verified sessions.
 * Guarantees zero account lockout even if Supabase hits built-in email rate limits.
 */

export interface RegisteredAccount {
  id: string;
  fullName: string;
  email: string;
  phone?: string;
  password: string; // stored for verified local fallback
  channel: "email" | "phone";
  createdAt: string;
}

const STORAGE_KEY = "arogya_registered_accounts_v1";
const ACTIVE_SESSION_KEY = "arogya_active_session_v1";

/** Get all registered accounts */
export function getRegisteredAccounts(): RegisteredAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Save/upsert a registered account */
export function saveRegisteredAccount(account: RegisteredAccount): void {
  try {
    const existing = getRegisteredAccounts();
    const cleanEmail = account.email.toLowerCase().trim();
    const cleanPhone = account.phone ? account.phone.replace(/\D/g, "") : "";

    const filtered = existing.filter(
      (a) =>
        a.email.toLowerCase().trim() !== cleanEmail &&
        (!cleanPhone || (a.phone && a.phone.replace(/\D/g, "") !== cleanPhone)),
    );

    filtered.push(account);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to save registered account to local store", err);
  }
}

/** Find a registered account by email or phone */
export function findRegisteredAccount(identifier: string): RegisteredAccount | null {
  const accounts = getRegisteredAccounts();
  const cleanId = identifier.trim().toLowerCase();
  const cleanDigits = identifier.replace(/\D/g, "");

  // 1. Direct email match
  const byEmail = accounts.find((a) => a.email.toLowerCase().trim() === cleanId);
  if (byEmail) return byEmail;

  // 2. Phone match
  if (cleanDigits.length >= 10) {
    const last10 = cleanDigits.slice(-10);
    const byPhone = accounts.find((a) => a.phone && a.phone.replace(/\D/g, "").slice(-10) === last10);
    if (byPhone) return byPhone;
  }

  // 3. Synthetic email match
  if (cleanId.includes("@phone.arogyaos.local")) {
    const phonePrefix = cleanId.split("@")[0].replace(/\D/g, "");
    const bySynthetic = accounts.find((a) => a.phone && a.phone.replace(/\D/g, "") === phonePrefix);
    if (bySynthetic) return bySynthetic;
  }

  return null;
}

/** Get currently active custom session if any */
export function getActiveLocalSession(): { user: any; profile: any } | null {
  try {
    const raw = localStorage.getItem(ACTIVE_SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Set active custom session */
export function setActiveLocalSession(session: { user: any; profile: any } | null): void {
  try {
    if (session) {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    }
  } catch {
    // ignore
  }
}
