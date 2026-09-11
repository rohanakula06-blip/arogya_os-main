import { ClinicalStatus, ClinicalStatusPill } from "@/components/ui/clinical-status-pill";
import { motion } from "framer-motion";
import React from "react";

interface ClinicalMetricTileProps {
  label: string;
  value: string | number;
  unit: string;
  status: ClinicalStatus | string;
  statusLabel?: string;
  referenceRange?: string;
  trendText?: string;
  trajectory?: "up" | "down" | "stable";
  sparklineData?: number[];
  onClick?: () => void;
  className?: string;
}

export const ClinicalMetricTile: React.FC<ClinicalMetricTileProps> = ({
  label,
  value,
  unit,
  status,
  statusLabel,
  referenceRange,
  trendText,
  trajectory = "stable",
  sparklineData,
  onClick,
  className = "",
}) => {
  // Determine trajectory color
  const trajectoryColor =
    status === "critical" || status === "high" || status === "out_of_range"
      ? "#DC2626"
      : status === "watch" || status === "borderline"
        ? "#E08600"
        : "#16A34A";

  // Render SVG Sparkline
  const renderSparkline = () => {
    const points = sparklineData && sparklineData.length >= 2
      ? sparklineData
      : trajectory === "up"
        ? [10, 14, 18, 25, 32]
        : trajectory === "down"
          ? [32, 28, 22, 16, 12]
          : [20, 22, 19, 21, 20];

    const min = Math.min(...points);
    const max = Math.max(...points);
    const range = max - min || 1;
    const width = 100;
    const height = 24;

    const coords = points.map((p, i) => {
      const x = (i / (points.length - 1)) * width;
      const y = height - ((p - min) / range) * (height - 8) - 4;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    const pathString = `M ${coords.join(" L ")}`;
    const lastPoint = coords[coords.length - 1].split(",");

    return (
      <svg className="w-full h-6 overflow-visible" viewBox={`0 0 ${width} ${height}`}>
        <path
          d={pathString}
          fill="none"
          stroke={trajectoryColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle
          cx={lastPoint[0]}
          cy={lastPoint[1]}
          r="3"
          fill={trajectoryColor}
          className="animate-pulse"
        />
      </svg>
    );
  };

  return (
    <motion.div
      whileHover={onClick ? { y: -2 } : undefined}
      onClick={onClick}
      className={`glass-card rounded-2xl p-5 border border-border/80 bg-card/95 hover:border-primary/40 transition-all flex flex-col justify-between space-y-3 ${
        onClick ? "cursor-pointer" : ""
      } ${className}`}
    >
      {/* Top Header: Metric Name & Status Pill */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-muted-foreground font-sans tracking-wide uppercase">
          {label}
        </span>
        <ClinicalStatusPill status={status} label={statusLabel} />
      </div>

      {/* Numerical Value with Monospace Emphasis */}
      <div className="flex items-baseline gap-1.5">
        <span className="font-mono text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
          {value}
        </span>
        <span className="font-mono text-xs text-muted-foreground font-medium">
          {unit}
        </span>
      </div>

      {/* Sparkline Visualizer */}
      <div className="py-0.5">{renderSparkline()}</div>

      {/* Footer Reference Info */}
      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-mono text-muted-foreground">
        {referenceRange && (
          <span>Reference {referenceRange}</span>
        )}
        {trendText && (
          <span className="text-foreground/80 font-medium ml-auto">
            {trendText}
          </span>
        )}
      </div>
    </motion.div>
  );
};
