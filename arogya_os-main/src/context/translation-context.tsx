import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { applyLiveLanguage, translateTextToTelugu } from "@/lib/dom-live-translator";
import { TELUGU_TRANSLATIONS } from "@/lib/translations/telugu";

export type Language = "en" | "te";

interface TranslationContextValue {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, defaultText?: string) => string;
  isTelugu: boolean;
}

const TranslationContext = createContext<TranslationContextValue | undefined>(undefined);

const STORAGE_KEY = "arogya_preferred_language";

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "te" || stored === "en") return stored;
    } catch {
      // ignore
    }
    return "en";
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch {
      // ignore
    }
    applyLiveLanguage(lang);
  };

  useEffect(() => {
    applyLiveLanguage(language);
  }, [language]);

  const t = (key: string, defaultText?: string): string => {
    if (language === "en") {
      return defaultText !== undefined ? defaultText : key;
    }
    if (TELUGU_TRANSLATIONS[key]) {
      return TELUGU_TRANSLATIONS[key];
    }
    return translateTextToTelugu(defaultText !== undefined ? defaultText : key);
  };

  return (
    <TranslationContext.Provider
      value={{
        language,
        setLanguage,
        t,
        isTelugu: language === "te",
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within a TranslationProvider");
  }
  return context;
}
