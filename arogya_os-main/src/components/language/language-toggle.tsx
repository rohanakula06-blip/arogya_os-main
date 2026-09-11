import { useTranslation } from "@/hooks/use-translation";
import { Languages } from "lucide-react";

interface LanguageToggleProps {
  variant?: "pill" | "button" | "compact";
  className?: string;
}

export function LanguageToggle({ variant = "pill", className = "" }: LanguageToggleProps) {
  const { language, setLanguage } = useTranslation();

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={() => setLanguage(language === "en" ? "te" : "en")}
        title={language === "en" ? "Switch to Telugu (తెలుగు)" : "Switch to English"}
        className={`flex items-center gap-1.5 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 text-xs font-mono font-medium text-foreground backdrop-blur transition-all hover:bg-accent hover:border-primary/50 cursor-pointer shadow-xs ${className}`}
      >
        <Languages className="size-3.5 text-primary" />
        <span className="font-semibold">{language === "en" ? "తెలుగు" : "EN"}</span>
      </button>
    );
  }

  return (
    <div
      className={`inline-flex items-center rounded-xl border border-border/70 bg-background/80 p-0.5 backdrop-blur shadow-xs ${className}`}
      role="group"
      aria-label="Language selector"
    >
      <button
        type="button"
        onClick={() => setLanguage("en")}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
          language === "en"
            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        English
      </button>

      <button
        type="button"
        onClick={() => setLanguage("te")}
        className={`flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
          language === "te"
            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        తెలుగు
      </button>
    </div>
  );
}
