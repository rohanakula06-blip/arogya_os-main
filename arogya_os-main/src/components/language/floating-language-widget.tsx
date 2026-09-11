import { useTranslation } from "@/hooks/use-translation";
import { Languages, Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function FloatingLanguageWidget() {
  const { language, setLanguage } = useTranslation();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
      className="fixed bottom-5 right-5 z-40"
    >
      <div className="flex items-center gap-1.5 rounded-full border border-border/80 bg-background/90 p-1 backdrop-blur-md shadow-lg shadow-black/10 hover:border-primary/60 transition-all">
        <div className="flex size-7 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Languages className="size-3.5" />
        </div>

        <button
          type="button"
          onClick={() => setLanguage("en")}
          className={`rounded-full px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
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
          className={`rounded-full px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
            language === "te"
              ? "bg-primary text-primary-foreground font-semibold shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          తెలుగు
        </button>
      </div>
    </motion.div>
  );
}
