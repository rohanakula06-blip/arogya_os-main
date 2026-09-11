import { AlertTriangle, CheckCircle2, Info, XCircle } from "lucide-react";
import React from "react";

export type AlertSeverity = "warning" | "critical" | "info" | "success";

interface ClinicalAlertProps {
  title: string;
  description: string;
  severity?: AlertSeverity;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

const SEVERITY_CONFIG: Record<
  AlertSeverity,
  { bg: string; border: string; text: string; titleText: string; icon: React.ReactNode }
> = {
  warning: {
    bg: "bg-[#FFFBEB] dark:bg-[#78350F]/25",
    border: "border-[#FDE68A] dark:border-[#92400E]",
    text: "text-[#92400E] dark:text-[#FDE68A]",
    titleText: "text-[#78350F] dark:text-[#FBBF24]",
    icon: <AlertTriangle className="size-5 text-[#E08600] shrink-0" />,
  },
  critical: {
    bg: "bg-[#FEF2F2] dark:bg-[#7F1D1D]/25",
    border: "border-[#FECACA] dark:border-[#991B1B]",
    text: "text-[#991B1B] dark:text-[#FECACA]",
    titleText: "text-[#7F1D1D] dark:text-[#F87171]",
    icon: <XCircle className="size-5 text-[#DC2626] shrink-0" />,
  },
  info: {
    bg: "bg-[#F0F9FF] dark:bg-[#075985]/25",
    border: "border-[#BAE6FD] dark:border-[#0369A1]",
    text: "text-[#075985] dark:text-[#BAE6FD]",
    titleText: "text-[#0C4A6E] dark:text-[#38BDF8]",
    icon: <Info className="size-5 text-[#0284C7] shrink-0" />,
  },
  success: {
    bg: "bg-[#F0FDF4] dark:bg-[#14532D]/25",
    border: "border-[#BBF7D0] dark:border-[#166534]",
    text: "text-[#166534] dark:text-[#BBF7D0]",
    titleText: "text-[#14532D] dark:text-[#4ADE80]",
    icon: <CheckCircle2 className="size-5 text-[#16A34A] shrink-0" />,
  },
};

export const ClinicalAlert: React.FC<ClinicalAlertProps> = ({
  title,
  description,
  severity = "warning",
  actionText,
  onAction,
  className = "",
}) => {
  const config = SEVERITY_CONFIG[severity];

  return (
    <div
      className={`rounded-2xl p-4 sm:p-5 border flex items-start gap-3.5 transition-all ${config.bg} ${config.border} ${className}`}
    >
      <div className="mt-0.5">{config.icon}</div>

      <div className="flex-1 space-y-1">
        <h4 className={`text-sm font-semibold font-sans ${config.titleText}`}>
          {title}
        </h4>
        <p className={`text-xs leading-relaxed font-sans ${config.text}`}>
          {description}
        </p>

        {actionText && onAction && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onAction}
              className="text-xs font-semibold underline underline-offset-2 hover:opacity-80 transition-opacity cursor-pointer font-sans"
            >
              {actionText} →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
