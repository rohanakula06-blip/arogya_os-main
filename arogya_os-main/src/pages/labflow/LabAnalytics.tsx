import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { labFlowStore } from "@/lib/labflow/store";
import type { QualityControlEntry } from "@/lib/labflow/types";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  Clock,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function LabAnalytics() {
  const [qcLogs, setQcLogs] = useState<QualityControlEntry[]>(() => labFlowStore.getQCLogs());

  // New QC Run Modal state
  const [newMeasured, setNewMeasured] = useState<number>(1.08);
  const selectedParam = "Serum Creatinine (Level 1 Normal)";
  const [selectedAnalyzer] = useState<string>("ROCHE-COBAS-6000");

  useEffect(() => {
    return labFlowStore.subscribe(() => {
      setQcLogs([...labFlowStore.getQCLogs()]);
    });
  }, []);

  const tatByDepartment = useMemo(() => {
    return [
      { dept: "Hematology", avgMin: 38, slaTarget: 60, compliance: 98.2, samples: 142 },
      { dept: "Biochemistry", avgMin: 54, slaTarget: 90, compliance: 96.5, samples: 280 },
      { dept: "Immunology", avgMin: 72, slaTarget: 120, compliance: 94.0, samples: 88 },
      { dept: "Microbiology", avgMin: 42, slaTarget: 45, compliance: 91.5, samples: 65 },
    ];
  }, []);

  const rejectionMetrics = useMemo(() => {
    return [
      { reason: "Gross Hemolysis", count: 4, percent: 50.0 },
      { reason: "Insufficient Volume (QNS)", count: 2, percent: 25.0 },
      { reason: "Clotted EDTA Blood", count: 1, percent: 12.5 },
      { reason: "Cold-Chain Breach (> 8°C)", count: 1, percent: 12.5 },
    ];
  }, []);

  const handleAddQC = (e: React.FormEvent) => {
    e.preventDefault();
    const entry = labFlowStore.logQC({
      analyzerId: selectedAnalyzer,
      analyzerName: selectedAnalyzer === "SYS-XN-1000" ? "Sysmex XN-1000" : "Roche Cobas 6000",
      department: selectedAnalyzer === "SYS-XN-1000" ? "Hematology" : "Biochemistry",
      parameterName: selectedParam,
      controlLot: "LOT-2026-AUG",
      targetMean: 1.05,
      targetSD: 0.04,
      measuredValue: Number(newMeasured),
      technician: "K. Teja, B.Sc MLT",
    });

    toast.success(`QC Point logged. Z-score: ${entry.zScore} (${entry.status})`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-6xl space-y-6"
    >
      {/* Header */}
      <div>
        <Link
          to="/labflow"
          className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="mr-1.5 size-3.5" /> Back to Operations Center
        </Link>
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Turnaround Time (TAT) & Quality Control (QC) Intelligence
          <Caret className="ml-2" />
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Real-time SLA analytics, Levey-Jennings charts, Westgard multi-rules evaluation & rejection root causes.
        </p>
      </div>

      {/* Top High-level KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <span className="text-xs font-medium text-muted-foreground">Overall SLA Compliance</span>
          <p className="mt-1 font-mono text-2xl font-bold text-ok">96.4%</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Target: &gt; 95.0%</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <span className="text-xs font-medium text-muted-foreground">Average Lab TAT</span>
          <p className="mt-1 font-mono text-2xl font-bold text-foreground">48.2 <span className="text-xs font-normal">min</span></p>
          <p className="text-[11px] text-muted-foreground mt-0.5">STAT Median: 24 min</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <span className="text-xs font-medium text-muted-foreground">Specimen Rejection Rate</span>
          <p className="mt-1 font-mono text-2xl font-bold text-amber-500">1.4%</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">8 rejected out of 575</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <span className="text-xs font-medium text-muted-foreground">Quality Control Status</span>
          <p className="mt-1 font-mono text-2xl font-bold text-ok flex items-center gap-1.5">
            <ShieldCheck className="size-6 text-ok" /> In Control
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Westgard Rules Pass</p>
        </div>
      </div>

      {/* Department TAT & SLA Performance */}
      <div className="glass-card rounded-3xl p-6 border border-border/70 space-y-4">
        <h2 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
          <Clock className="size-4 text-primary" /> Department-wise Turnaround Time (TAT) & SLA Health
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {tatByDepartment.map((item) => (
            <div
              key={item.dept}
              className="rounded-2xl border border-border/60 bg-accent/20 p-4 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-xs text-foreground">{item.dept}</span>
                <span className="font-mono text-xs text-ok font-bold">{item.compliance}% SLA</span>
              </div>

              <div>
                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                  <span>Avg TAT vs Target</span>
                  <span className="font-mono font-bold text-foreground">{item.avgMin}m / {item.slaTarget}m</span>
                </div>
                {/* Progress bar */}
                <div className="h-2 w-full rounded-full bg-border/60 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{ width: `${(item.avgMin / item.slaTarget) * 100}%` }}
                  />
                </div>
              </div>

              <p className="text-[11px] text-muted-foreground font-mono">
                {item.samples} samples processed today
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Levey-Jennings Quality Control (QC) Chart Station */}
      <div className="glass-card rounded-3xl p-6 border border-border/70 space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
          <div>
            <h2 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
              <Activity className="size-4 text-sky-500" />
              Levey-Jennings Quality Control (QC) Tracking
            </h2>
            <p className="text-xs text-muted-foreground">
              Analyzers run daily calibration standards to monitor analytical precision & drift.
            </p>
          </div>

          <form onSubmit={handleAddQC} className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              step="0.01"
              value={newMeasured}
              onChange={(e) => setNewMeasured(Number(e.target.value))}
              placeholder="Measured Val"
              className="w-28 h-8 text-xs font-mono"
            />
            <Button type="submit" size="sm" className="h-8 text-xs cursor-pointer gap-1">
              <Plus className="size-3.5" /> Log QC Point
            </Button>
          </form>
        </div>

        {/* Levey-Jennings Visualized Plot */}
        <div className="space-y-3">
          <div className="rounded-2xl border border-border/60 bg-background/50 p-5 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
              <span>PARAMETER: Serum Creatinine (Target Mean: 1.05, 1SD: ±0.04)</span>
              <span className="text-ok font-bold">ALL WESTGARD RULES SATISFIED</span>
            </div>

            {/* Simulated Chart Plot Area */}
            <div className="relative h-48 w-full border-t border-b border-dashed border-border/80 flex flex-col justify-between py-2 text-[10px] font-mono text-muted-foreground">
              {/* Reference Lines */}
              <div className="flex justify-between border-b border-red-500/30 text-red-500 pb-0.5">
                <span>+3SD (1.17) · Rejection Limit (1_3s)</span>
              </div>
              <div className="flex justify-between border-b border-amber-500/30 text-amber-500 pb-0.5">
                <span>+2SD (1.13) · Warning Limit (1_2s)</span>
              </div>
              <div className="flex justify-between border-b border-primary/50 text-primary font-bold pb-0.5">
                <span>TARGET MEAN (1.05 mg/dL)</span>
              </div>
              <div className="flex justify-between border-b border-amber-500/30 text-amber-500 pb-0.5">
                <span>-2SD (0.97) · Warning Limit (1_2s)</span>
              </div>
              <div className="flex justify-between text-red-500">
                <span>-3SD (0.93) · Rejection Limit (1_3s)</span>
              </div>

              {/* Plotted Data Points */}
              <div className="absolute inset-x-4 inset-y-6 flex items-center justify-around">
                {qcLogs.slice(0, 10).reverse().map((log) => {
                  // Map zScore to vertical percentage: 0 = 50%, +3 = 10%, -3 = 90%
                  const topPercent = Math.max(5, Math.min(95, 50 - log.zScore * 13.3));
                  const isWarning = log.status === "warning_1_2s";
                  const isError = log.status.startsWith("out_of_control");

                  return (
                    <div
                      key={log.id}
                      className="group relative flex flex-col items-center"
                      style={{ top: `${topPercent - 50}%` }}
                    >
                      <div
                        className={`size-3 rounded-full border-2 transition-transform group-hover:scale-150 ${
                          isError
                            ? "bg-red-500 border-white"
                            : isWarning
                            ? "bg-amber-500 border-white"
                            : "bg-primary border-background"
                        }`}
                      />
                      <div className="absolute bottom-5 hidden rounded-lg bg-background border border-border p-1.5 text-[9px] shadow-lg group-hover:block whitespace-nowrap z-20">
                        <p className="font-bold text-foreground">{log.measuredValue} mg/dL</p>
                        <p className="text-muted-foreground">Z-Score: {log.zScore}</p>
                        <p className="text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString()}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* QC Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead>
                <tr className="border-b border-border/40 text-muted-foreground text-[11px]">
                  <th className="pb-2">Timestamp</th>
                  <th className="pb-2">Analyzer Device</th>
                  <th className="pb-2">Control Lot</th>
                  <th className="pb-2">Measured</th>
                  <th className="pb-2">Z-Score</th>
                  <th className="pb-2 text-right">Westgard Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {qcLogs.map((qc) => (
                  <tr key={qc.id} className="hover:bg-accent/10">
                    <td className="py-2 text-muted-foreground">{new Date(qc.timestamp).toLocaleTimeString()}</td>
                    <td className="py-2 text-foreground font-semibold">{qc.analyzerName}</td>
                    <td className="py-2 text-muted-foreground">{qc.controlLot}</td>
                    <td className="py-2 font-bold text-foreground">{qc.measuredValue}</td>
                    <td className="py-2">{qc.zScore}</td>
                    <td className="py-2 text-right">
                      <span
                        className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                          qc.status === "in_control"
                            ? "bg-ok/15 text-ok"
                            : qc.status === "warning_1_2s"
                            ? "bg-amber-500/20 text-amber-500"
                            : "bg-red-500 text-white"
                        }`}
                      >
                        {qc.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Specimen Rejection Root-Cause Breakdown */}
      <div className="glass-card rounded-3xl p-6 border border-border/70 space-y-4">
        <h2 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
          <AlertTriangle className="size-4 text-amber-500" /> Specimen Rejection Root Cause Analysis
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {rejectionMetrics.map((r) => (
            <div key={r.reason} className="rounded-2xl border border-border/60 bg-accent/20 p-4 space-y-2">
              <span className="text-xs font-semibold text-foreground">{r.reason}</span>
              <p className="font-mono text-xl font-bold text-foreground">{r.count} <span className="text-xs text-muted-foreground font-normal">cases</span></p>
              <p className="text-[11px] text-muted-foreground font-mono">{r.percent}% of total rejections</p>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}
