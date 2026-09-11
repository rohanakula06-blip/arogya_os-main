import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { ClinicalAlert } from "@/components/ui/clinical-alert";
import { ClinicalDashboardHeader } from "@/components/ui/clinical-dashboard-header";
import { ClinicalStatusPill } from "@/components/ui/clinical-status-pill";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { evaluatePatient, toClinicalProfile } from "@/lib/clinical";
import { computeProfileCompletion } from "@/lib/patient-profile";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Brain,
  FileUp,
  HeartPulse,
  Route,
  ShieldAlert,
  TestTube2,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router";

const MODULES = [
  {
    to: "/upload",
    icon: FileUp,
    title: "Upload Report",
    desc: "Instant OCR extraction, biomarker analysis & personalized AI action plan.",
    gradient: "from-teal-500 to-emerald-600",
    badge: "AI Extraction",
    badgeClass: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
    borderHover: "hover:border-teal-500/60 hover:shadow-teal-500/15",
  },
  {
    to: "/journey",
    icon: Route,
    title: "Health Journey",
    desc: "Interactive longitudinal metric charts, baseline deviations & health history timeline.",
    gradient: "from-sky-500 to-blue-600",
    badge: "Longitudinal Trends",
    badgeClass: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    borderHover: "hover:border-sky-500/60 hover:shadow-sky-500/15",
  },
  {
    to: "/copilot",
    icon: Brain,
    title: "Doctor Copilot",
    desc: "Clinical Decision Support summary, consultation questions & pre-visit AI brief.",
    gradient: "from-violet-500 to-indigo-600",
    badge: "Clinical CDSS",
    badgeClass: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30",
    borderHover: "hover:border-violet-500/60 hover:shadow-violet-500/15",
  },
  {
    to: "/appointments",
    icon: HeartPulse,
    title: "Appointments & Live Radar",
    desc: "Interactive 20 km radar map, verified doctors with degrees, fees & slot booking.",
    gradient: "from-rose-500 to-pink-600",
    badge: "20km Live Radar",
    badgeClass: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30",
    borderHover: "hover:border-rose-500/60 hover:shadow-rose-500/15",
  },
  {
    to: "/labflow",
    icon: TestTube2,
    title: "LabFlow Diagnostic Suite",
    desc: "Sample chain-of-custody, analyzer simulator feeds, barcode tracking & pathologist review.",
    gradient: "from-amber-500 to-orange-600",
    badge: "Diagnostics Operations",
    badgeClass: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    borderHover: "hover:border-amber-500/60 hover:shadow-amber-500/15",
  },
  {
    to: "/patient-profile",
    icon: HeartPulse,
    title: "Patient Profile & Baselines",
    desc: "Demographics, chronic conditions, family history & personalized biomarker calibrations.",
    gradient: "from-emerald-500 to-cyan-600",
    badge: "Clinical Profile",
    badgeClass: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    borderHover: "hover:border-emerald-500/60 hover:shadow-emerald-500/15",
  },
];

const RISK_LEVEL_STYLES: Record<string, { badge: string; bar: string; label: string }> = {
  low: { badge: "border-emerald-500/40 bg-emerald-500/15 text-emerald-600 dark:text-emerald-400", bar: "bg-emerald-500", label: "Low" },
  moderate: {
    badge: "border-amber-500/40 bg-amber-500/15 text-amber-600 dark:text-amber-400",
    bar: "bg-amber-500",
    label: "Moderate",
  },
  high: { badge: "border-rose-500/40 bg-rose-500/15 text-rose-600 dark:text-rose-400", bar: "bg-rose-500", label: "High" },
  critical: {
    badge: "border-rose-600/60 bg-rose-600/20 text-rose-600 dark:text-rose-400",
    bar: "bg-rose-600",
    label: "Critical",
  },
};

export default function Dashboard() {
  const { profile } = useAuth();
  const firstName = profile?.full_name?.split(/\s+/)[0] ?? "there";
  const completion = useMemo(() => computeProfileCompletion(profile), [profile]);
  const profileIncomplete = completion.percent < 100;

  /** CDSS patient-level risk summary (deterministic, from the profile). */
  const risk = useMemo(() => evaluatePatient(toClinicalProfile(profile)), [profile]);
  const topRisks = useMemo(
    () =>
      [...risk.riskProfile]
        .sort((a, b) => b.score - a.score)
        .filter((r) => r.score > 0)
        .slice(0, 3),
    [risk.riskProfile],
  );
  const riskStyles = RISK_LEVEL_STYLES[risk.overallLevel] ?? RISK_LEVEL_STYLES.low;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-5xl space-y-8"
    >
      {/* Top Clinical Header & 4 KPI Overview Cards */}
      <ClinicalDashboardHeader
        userName={firstName}
        greeting="Good morning"
      />

      {/* Profile completion alert */}
      {profileIncomplete && (
        <ClinicalAlert
          title={`Profile ${completion.percent}% Complete`}
          description="Complete your health profile to receive personalized AI analysis, baseline metrics, and tailored clinical copilot briefings."
          severity="warning"
          actionText="Complete Health Profile"
          onAction={() => {
            window.location.href = "/patient-profile";
          }}
        />
      )}

      {/* CDSS — patient risk snapshot */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.14, duration: 0.4 }}
        className="glass-card mt-8 rounded-3xl p-5 sm:p-6 border border-border/80 shadow-md"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 text-white shadow-md shadow-amber-500/20">
              <ShieldAlert className="size-5.5" />
            </span>
            <div>
              <h2 className="font-mono text-base font-semibold tracking-tight text-foreground">
                Clinical Risk Snapshot
              </h2>
              <p className="text-xs text-muted-foreground">
                Clinical Decision Support summary computed from your active health baselines.
              </p>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wide ${riskStyles.badge}`}
          >
            <span className="size-1.5 rounded-full bg-current" />
            {riskStyles.label} risk
          </span>
        </div>

        {risk.riskFlags.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {risk.riskFlags.slice(0, 6).map((flag) => (
              <span
                key={flag}
                className="rounded-full border border-border/70 bg-background/60 px-3 py-1 text-[11px] font-medium text-foreground shadow-2xs"
              >
                {flag}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[13px] leading-6 text-muted-foreground">
            No major profile-level risk factors recorded yet — completing your
            profile refines this snapshot.
          </p>
        )}

        {topRisks.length > 0 && (
          <div className="mt-5 grid gap-4 sm:grid-cols-3">
            {topRisks.map((category, i) => {
              const styles = RISK_LEVEL_STYLES[category.level] ?? RISK_LEVEL_STYLES.low;
              return (
                <motion.div
                  key={category.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.06 }}
                  className="rounded-2xl border border-border/60 bg-background/60 p-4 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[12px] font-bold text-foreground">
                      {category.label}
                    </p>
                    <span className="tnum shrink-0 font-mono text-xs font-bold text-foreground">
                      {category.score} / 100
                    </span>
                  </div>
                  <Progress value={category.score} className={`mt-2.5 h-2 ${styles.bar}`} />
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {styles.label} Priority
                  </p>
                </motion.div>
              );
            })}
          </div>
        )}

        {risk.lifestyleAdvice.length > 0 && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-teal-500/8 border border-teal-500/20 p-3 text-[13px] text-foreground">
            <span className="font-mono text-teal-600 dark:text-teal-400 font-bold shrink-0">AI Recommendation:</span>
            <span>{risk.lifestyleAdvice[0]}</span>
          </div>
        )}

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-3">
          <p className="text-[11px] leading-5 text-muted-foreground/80">
            Advisory only — deterministic CDSS engine output. Confirm with a qualified medical professional.
          </p>
          {profileIncomplete && (
            <Button asChild variant="outline" size="sm" className="cursor-pointer rounded-xl border-teal-500/30 text-teal-600 dark:text-teal-400 hover:bg-teal-500/10">
              <Link to="/patient-profile">
                Refine with profile data
                <ArrowRight className="size-3.5" />
              </Link>
            </Button>
          )}
        </div>
      </motion.div>

      {/* Radiant Feature Modules Grid */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-mono text-lg font-bold text-foreground">
              Clinical Workspace
            </h2>
            <p className="text-xs text-muted-foreground">
              Direct access to diagnostic suites, medical timelines, and doctor scheduling.
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m, i) => (
            <motion.div
              key={m.to}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.05, duration: 0.35 }}
            >
              <Link
                to={m.to}
                className={`group relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-border/80 bg-card/90 p-5.5 backdrop-blur-xl shadow-xs transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                  m.borderHover || "hover:border-primary/50"
                }`}
              >
                {/* Ambient top color bar */}
                <div className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${m.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

                <div>
                  <div className="flex items-center justify-between">
                    <span
                      className={`flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br ${m.gradient} text-white shadow-md shadow-black/10 transition-transform group-hover:scale-110`}
                    >
                      <m.icon className="size-5.5" />
                    </span>

                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${m.badgeClass}`}>
                      {m.badge}
                    </span>
                  </div>

                  <h3 className="mt-4 font-sans text-base font-bold text-foreground group-hover:text-primary transition-colors">
                    {m.title}
                  </h3>
                  <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                    {m.desc}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-primary group-hover:underline">
                  <span>Open module</span>
                  <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
