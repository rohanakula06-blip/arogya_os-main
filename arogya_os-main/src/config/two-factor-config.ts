/**
 * 2-Factor Authentication (2Factor SMS API) Configuration File
 * 
 * Configure your 2Factor.in / SMS Gateway API Key below to enable
 * real-time SMS OTP verification on mobile phones.
 * 
 * For 2Factor.in:
 * 1. Register / Log in at https://2factor.in
 * 2. Go to your Dashboard -> API Keys
 * 3. Copy your API Key (e.g. "a1b2c3d4-e5f6-7890-abcd-ef1234567890")
 * 4. Paste it into API_KEY below or in .env.local as VITE_2FACTOR_API_KEY.
 */

export interface TwoFactorConfig {
  apiKey: string;
  baseUrl: string;
  senderId: string;
  serviceName: string;
}

// 👉 PASTE YOUR 2-FACTOR SMS API KEY HERE:
export const TWO_FACTOR_CONFIG: TwoFactorConfig = {
  apiKey: "ab2a1f18-962a-11f1-9cb1-0200cd936042", // 👉 PASTE YOUR 2FACTOR API KEY HERE
  baseUrl: "https://2factor.in/API/V1",
  senderId: "AROGYA",
  serviceName: "ArogyaOS Security",
};

/** Helper to retrieve the active 2Factor SMS configuration from file or env variables */
export function getActiveTwoFactorConfig(): TwoFactorConfig {
  const envApiKey = (import.meta as { env?: Record<string, string> }).env?.VITE_2FACTOR_API_KEY;
  const envBaseUrl = (import.meta as { env?: Record<string, string> }).env?.VITE_2FACTOR_BASE_URL;

  return {
    apiKey: String(envApiKey || TWO_FACTOR_CONFIG.apiKey || "").trim(),
    baseUrl: String(envBaseUrl || TWO_FACTOR_CONFIG.baseUrl || "https://2factor.in/API/V1").trim(),
    senderId: TWO_FACTOR_CONFIG.senderId || "AROGYA",
    serviceName: TWO_FACTOR_CONFIG.serviceName || "ArogyaOS Security",
  };
}

/** Check if custom 2Factor SMS API key is provided */
export function isTwoFactorConfigured(): boolean {
  const cfg = getActiveTwoFactorConfig();
  return Boolean(cfg.apiKey && cfg.apiKey.length > 5);
}
