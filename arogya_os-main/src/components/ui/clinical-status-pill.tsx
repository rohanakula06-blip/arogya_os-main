import React from "react";

export type ClinicalStatus =
  | "normal"
  | "healthy"
  | "optimal"
  | "watch"
  | "under_review"
  | "borderline"
  | "critical"
  | "high"
  | "out_of_range"
  | "low"
  | "info"
  | "in_transit"
  | "reported"
  | "analyzed"
  | "success"
  | "warning";

interface ClinicalStatusPillProps {
  status: ClinicalStatus | string;
  label?: string;
  showDot?: boolean;
  className?: string;
}

const STATUS_CONFIG: Record<
  string,
  { bg: string; text: string; border: string; dot: string; defaultLabel: string }
> = {
  normal: {
    bg: "bg-[#DCFCE7] dark:bg-[#14532D]/40",
    text: "text-[#16A34A] dark:text-[#4ADE80]",
    border: "border-[#BBF7D0] dark:border-[#166534]",
    dot: "bg-[#16A34A]",
    defaultLabel: "Normal",
  },
  healthy: {
    bg: "bg-[#DCFCE7] dark:bg-[#14532D]/40",
    text: "text-[#16A34A] dark:text-[#4ADE80]",
    border: "border-[#BBF7D0] dark:border-[#166534]",
    dot: "bg-[#16A34A]",
    defaultLabel: "Healthy",
  },
  optimal: {
    bg: "bg-[#DCFCE7] dark:bg-[#14532D]/40",
    text: "text-[#16A34A] dark:text-[#4ADE80]",
    border: "border-[#BBF7D0] dark:border-[#166534]",
    dot: "bg-[#16A34A]",
    defaultLabel: "Optimal",
  },
  watch: {
    bg: "bg-[#FEF3C7] dark:bg-[#78350F]/40",
    text: "text-[#D97706] dark:text-[#FBBF24]",
    border: "border-[#FDE68A] dark:border-[#92400E]",
    dot: "bg-[#E08600]",
    defaultLabel: "Watch",
  },
  under_review: {
    bg: "bg-[#FEF3C7] dark:bg-[#78350F]/40",
    text: "text-[#D97706] dark:text-[#FBBF24]",
    border: "border-[#FDE68A] dark:border-[#92400E]",
    dot: "bg-[#E08600]",
    defaultLabel: "Under review",
  },
  borderline: {
    bg: "bg-[#FEF3C7] dark:bg-[#78350F]/40",
    text: "text-[#D97706] dark:text-[#FBBF24]",
    border: "border-[#FDE68A] dark:border-[#92400E]",
    dot: "bg-[#E08600]",
    defaultLabel: "Borderline",
  },
  critical: {
    bg: "bg-[#FEE2E2] dark:bg-[#7F1D1D]/40",
    text: "text-[#DC2626] dark:text-[#F87171]",
    border: "border-[#FECACA] dark:border-[#991B1B]",
    dot: "bg-[#DC2626]",
    defaultLabel: "Critical",
  },
  high: {
    bg: "bg-[#FEE2E2] dark:bg-[#7F1D1D]/40",
    text: "text-[#DC2626] dark:text-[#F87171]",
    border: "border-[#FECACA] dark:border-[#991B1B]",
    dot: "bg-[#DC2626]",
    defaultLabel: "High",
  },
  out_of_range: {
    bg: "bg-[#FEE2E2] dark:bg-[#7F1D1D]/40",
    text: "text-[#DC2626] dark:text-[#F87171]",
    border: "border-[#FECACA] dark:border-[#991B1B]",
    dot: "bg-[#DC2626]",
    defaultLabel: "Out of range",
  },
  low: {
    bg: "bg-[#E0F2FE] dark:bg-[#075985]/40",
    text: "text-[#0284C7] dark:text-[#38BDF8]",
    border: "border-[#BAE6FD] dark:border-[#0369A1]",
    dot: "bg-[#0284C7]",
    defaultLabel: "Low",
  },
  info: {
    bg: "bg-[#E0F2FE] dark:bg-[#075985]/40",
    text: "text-[#0284C7] dark:text-[#38BDF8]",
    border: "border-[#BAE6FD] dark:border-[#0369A1]",
    dot: "bg-[#0284C7]",
    defaultLabel: "Info",
  },
  in_transit: {
    bg: "bg-[#E0F2FE] dark:bg-[#075985]/40",
    text: "text-[#0284C7] dark:text-[#38BDF8]",
    border: "border-[#BAE6FD] dark:border-[#0369A1]",
    dot: "bg-[#0284C7]",
    defaultLabel: "In transit",
  },
  reported: {
    bg: "bg-[#D6F2EE] dark:bg-[#0E8C7F]/30",
    text: "text-[#0B7266] dark:text-[#2DD4BF]",
    border: "border-[#B2E6DF] dark:border-[#0E8C7F]/50",
    dot: "bg-[#0E8C7F]",
    defaultLabel: "Reported",
  },
  analyzed: {
    bg: "bg-[#D6F2EE] dark:bg-[#0E8C7F]/30",
    text: "text-[#0B7266] dark:text-[#2DD4BF]",
    border: "border-[#B2E6DF] dark:border-[#0E8C7F]/50",
    dot: "bg-[#0E8C7F]",
    defaultLabel: "Analyzed",
  },
  approved_ready: {
    bg: "bg-[#DCFCE7] dark:bg-[#14532D]/40",
    text: "text-[#16A34A] dark:text-[#4ADE80]",
    border: "border-[#BBF7D0] dark:border-[#166534]",
    dot: "bg-[#16A34A]",
    defaultLabel: "Report Ready",
  },
  completed: {
    bg: "bg-[#DCFCE7] dark:bg-[#14532D]/40",
    text: "text-[#16A34A] dark:text-[#4ADE80]",
    border: "border-[#BBF7D0] dark:border-[#166534]",
    dot: "bg-[#16A34A]",
    defaultLabel: "Completed",
  },
  in_analysis: {
    bg: "bg-[#E0F2FE] dark:bg-[#075985]/40",
    text: "text-[#0284C7] dark:text-[#38BDF8]",
    border: "border-[#BAE6FD] dark:border-[#0369A1]",
    dot: "bg-[#0284C7]",
    defaultLabel: "In Analysis",
  },
  samples_collected: {
    bg: "bg-[#FEF3C7] dark:bg-[#78350F]/40",
    text: "text-[#D97706] dark:text-[#FBBF24]",
    border: "border-[#FDE68A] dark:border-[#92400E]",
    dot: "bg-[#E08600]",
    defaultLabel: "Collected",
  },
  order_placed: {
    bg: "bg-[#F4F8F8] dark:bg-[#1C2C30]",
    text: "text-[#47585C] dark:text-[#94A3B8]",
    border: "border-[#E2EAEA] dark:border-[#2D3E42]",
    dot: "bg-[#47585C]",
    defaultLabel: "Order Placed",
  },
  low_risk: {
    bg: "bg-[#DCFCE7] dark:bg-[#14532D]/40",
    text: "text-[#16A34A] dark:text-[#4ADE80]",
    border: "border-[#BBF7D0] dark:border-[#166534]",
    dot: "bg-[#16A34A]",
    defaultLabel: "Low Risk",
  },
  moderate_risk: {
    bg: "bg-[#FEF3C7] dark:bg-[#78350F]/40",
    text: "text-[#D97706] dark:text-[#FBBF24]",
    border: "border-[#FDE68A] dark:border-[#92400E]",
    dot: "bg-[#E08600]",
    defaultLabel: "Moderate Risk",
  },
  high_risk: {
    bg: "bg-[#FEE2E2] dark:bg-[#7F1D1D]/40",
    text: "text-[#DC2626] dark:text-[#F87171]",
    border: "border-[#FECACA] dark:border-[#991B1B]",
    dot: "bg-[#DC2626]",
    defaultLabel: "High Risk",
  },
};

export const ClinicalStatusPill: React.FC<ClinicalStatusPillProps> = ({
  status,
  label,
  showDot = true,
  className = "",
}) => {
  const normalizedKey = status.toLowerCase().replace(/\s+/g, "_");
  const config = STATUS_CONFIG[normalizedKey] || STATUS_CONFIG.info;
  const displayLabel = label || config.defaultLabel;

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border font-sans ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showDot && (
        <span className={`size-1.5 rounded-full shrink-0 ${config.dot}`} />
      )}
      <span>{displayLabel}</span>
    </span>
  );
};
