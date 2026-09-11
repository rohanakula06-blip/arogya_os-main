import { ClinicalStatus, ClinicalStatusPill } from "@/components/ui/clinical-status-pill";
import { motion } from "framer-motion";
import React from "react";

interface ClinicalAccessionRowProps {
  initials?: string;
  name: string;
  subtitle: string;
  accessionId: string;
  status: ClinicalStatus | string;
  statusLabel?: string;
  onClick?: () => void;
  className?: string;
}

export const ClinicalAccessionRow: React.FC<ClinicalAccessionRowProps> = ({
  initials,
  name,
  subtitle,
  accessionId,
  status,
  statusLabel,
  onClick,
  className = "",
}) => {
  const computedInitials =
    initials ||
    name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <motion.div
      whileHover={onClick ? { y: -1 } : undefined}
      onClick={onClick}
      className={`group rounded-2xl border border-border/80 bg-card p-4 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        onClick ? "cursor-pointer hover:border-primary/50 hover:shadow-xs" : ""
      } ${className}`}
    >
      {/* Identity: Initials Avatar + Patient Name + Test Subtitle */}
      <div className="flex items-center gap-3.5">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-[#D6F2EE] dark:bg-[#0E8C7F]/30 text-xs font-bold text-[#0B7266] dark:text-[#2DD4BF] font-mono border border-[#B2E6DF] dark:border-[#0E8C7F]/50">
          {computedInitials}
        </div>

        <div className="min-w-0">
          <h4 className="text-sm font-semibold text-foreground font-sans truncate group-hover:text-primary transition-colors">
            {name}
          </h4>
          <p className="text-xs text-muted-foreground font-sans truncate">
            {subtitle}
          </p>
        </div>
      </div>

      {/* Accession ID & Status Pill */}
      <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-2 sm:pt-0 border-border/60">
        <div className="text-xs font-mono font-medium text-muted-foreground tracking-wider">
          {accessionId}
        </div>

        <ClinicalStatusPill status={status} label={statusLabel} />
      </div>
    </motion.div>
  );
};
