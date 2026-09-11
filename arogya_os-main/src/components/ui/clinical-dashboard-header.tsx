import { ClinicalStatusPill } from "@/components/ui/clinical-status-pill";
import { Activity, Calendar, FileText, FlaskConical, Sparkles, Zap } from "lucide-react";
import React from "react";

interface DashboardMetric {
  label: string;
  value: string | number;
  subtext?: string;
  status?: string;
  statusLabel?: string;
  icon?: React.ReactNode;
  accentGradient?: string;
  borderHover?: string;
}

interface ClinicalDashboardHeaderProps {
  userName?: string;
  greeting?: string;
  metrics?: DashboardMetric[];
  className?: string;
}

export const ClinicalDashboardHeader: React.FC<ClinicalDashboardHeaderProps> = ({
  userName = "Ananya",
  greeting = "Good morning",
  metrics,
  className = "",
}) => {
  const defaultMetrics: DashboardMetric[] = [
    {
      label: "Active Baselines",
      value: "6",
      status: "watch",
      statusLabel: "2 to watch",
      icon: <Activity className="size-4 text-white" />,
      accentGradient: "from-emerald-500 to-teal-600",
      borderHover: "hover:border-emerald-500/50 hover:shadow-emerald-500/10",
    },
    {
      label: "Analyzed Reports",
      value: "4",
      status: "reported",
      statusLabel: "AI verified",
      icon: <FileText className="size-4 text-white" />,
      accentGradient: "from-sky-500 to-blue-600",
      borderHover: "hover:border-sky-500/50 hover:shadow-sky-500/10",
    },
    {
      label: "Next Consultation",
      value: "09-14",
      subtext: "Dr. A. Sreenivasa Rao",
      icon: <Calendar className="size-4 text-white" />,
      accentGradient: "from-violet-500 to-indigo-600",
      borderHover: "hover:border-violet-500/50 hover:shadow-violet-500/10",
    },
    {
      label: "Diagnostic Lab Flow",
      value: "5",
      status: "in_transit",
      statusLabel: "In Progress",
      icon: <FlaskConical className="size-4 text-white" />,
      accentGradient: "from-amber-500 to-rose-500",
      borderHover: "hover:border-amber-500/50 hover:shadow-amber-500/10",
    },
  ];

  const items = metrics || defaultMetrics;

  return (
    <div className={`space-y-5 ${className}`}>
      {/* Radiant Greeting Banner */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-3xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/15 p-5 sm:p-6 backdrop-blur-2xl shadow-xl shadow-emerald-500/5">
        <div className="flex items-center gap-4">
          <div className="relative flex size-13 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 via-teal-500 to-green-400 text-white shadow-lg shadow-emerald-500/35">
            <Activity className="size-6.5" />
            <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full bg-background">
              <span className="size-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span className="absolute size-2.5 rounded-full bg-emerald-400" />
            </span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Health Telemetry
              </span>
            </div>
            <h1 className="mt-1 font-sans text-2xl font-extrabold tracking-tight sm:text-3xl text-foreground">
              {greeting},{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-green-300 bg-clip-text text-transparent">
                {userName}
              </span>
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground font-sans">
              Real-time biomarker tracking, clinical AI Copilot & diagnostics command center.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <span className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/35 bg-card/80 px-3.5 py-2 text-xs font-semibold text-emerald-400 shadow-xs">
            <Sparkles className="size-3.5 text-emerald-400" />
            <span>AI Health Engine Active</span>
          </span>
        </div>
      </div>

      {/* 4 Radiant KPI Metric Cards Grid */}
      <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
        {items.map((m, idx) => (
          <div
            key={idx}
            className={`group relative overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-4.5 backdrop-blur-xl shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
              m.borderHover || "hover:border-primary/50"
            }`}
          >
            {/* Ambient top glowing line */}
            <div
              className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${
                m.accentGradient || "from-teal-500 to-emerald-500"
              } opacity-80 group-hover:opacity-100 transition-opacity`}
            />

            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted-foreground truncate">
                {m.label}
              </span>
              <span
                className={`flex size-8 items-center justify-center rounded-xl bg-gradient-to-br ${
                  m.accentGradient || "from-teal-500 to-emerald-500"
                } shadow-sm shadow-black/10 transition-transform group-hover:scale-110`}
              >
                {m.icon || <Zap className="size-4 text-white" />}
              </span>
            </div>

            <div className="mt-3 font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
              {m.value}
            </div>

            <div className="mt-2.5 pt-2 border-t border-border/50">
              {m.status ? (
                <ClinicalStatusPill status={m.status} label={m.statusLabel} />
              ) : m.subtext ? (
                <span className="text-[11px] font-medium text-muted-foreground truncate block">
                  {m.subtext}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
