/**
 * SMTP & Email Passkey Configuration File
 * 
 * Configure your Gmail / Custom SMTP credentials below to enable
 * direct OTP emails and password resets.
 * 
 * For Gmail:
 * 1. Go to your Google Account -> Security -> 2-Step Verification
 * 2. At the bottom, select "App passwords"
 * 3. Generate a 16-character App Password (e.g. "abcd efgh ijkl mnop")
 * 4. Paste it into SMTP_PASSKEY below.
 */

export interface SmtpConfig {
  host: string;
  port: number;
  secure: boolean;
  email: string;
  passkey: string;
  fromName: string;
}

// 👉 PASTE YOUR SMTP PASSKEY & GMAIL CREDENTIALS HERE:
export const SMTP_CONFIG: SmtpConfig = {
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  email: "rohanakula06@gmail.com",
  passkey: "bzjk usne qemd chkn",
  fromName: "ArogyaOS Clinical Security",
};

/** Helper to retrieve the active SMTP configuration from file or env variables */
export function getActiveSmtpConfig(): SmtpConfig {
  const envHost = (import.meta as { env?: Record<string, string> }).env?.VITE_SMTP_HOST;
  const envPort = (import.meta as { env?: Record<string, string> }).env?.VITE_SMTP_PORT;
  const envEmail = (import.meta as { env?: Record<string, string> }).env?.VITE_SMTP_EMAIL;
  const envPass = (import.meta as { env?: Record<string, string> }).env?.VITE_SMTP_PASSKEY;

  return {
    host: String(envHost || SMTP_CONFIG.host || "smtp.gmail.com").trim(),
    port: Number(envPort || SMTP_CONFIG.port || 465),
    secure: SMTP_CONFIG.secure,
    email: String(envEmail || SMTP_CONFIG.email || "").trim(),
    passkey: String(envPass || SMTP_CONFIG.passkey || "").trim(),
    fromName: SMTP_CONFIG.fromName || "ArogyaOS Clinical Security",
  };
}

/** Check if custom SMTP passkey is provided */
export function isSmtpConfigured(): boolean {
  const cfg = getActiveSmtpConfig();
  return Boolean(cfg.email && cfg.passkey);
}
