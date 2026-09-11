import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { labFlowStore } from "@/lib/labflow/store";
import type { LabOrder } from "@/lib/labflow/types";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  FileCheck,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Stethoscope,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { toast } from "sonner";

export default function PathologistReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LabOrder[]>(() => labFlowStore.getOrders());
  const [selectedOrderId, setSelectedOrderId] = useState<string>(searchParams.get("orderId") || "");

  // Sign-off credentials
  const [doctorName, setDoctorName] = useState("Dr. R. K. Varma, MD (Pathology)");
  const [doctorRegistration, setDoctorRegistration] = useState("MCI-48291-HYD / NABL Signatory");
  const [clinicalRemarks, setClinicalRemarks] = useState(
    "Correlate clinically. Critical and abnormal values verified on secondary aliquot.",
  );

  useEffect(() => {
    return labFlowStore.subscribe(() => {
      setOrders([...labFlowStore.getOrders()]);
    });
  }, []);

  const reviewOrders = useMemo(() => {
    return orders.filter((o) => o.status === "under_review" || o.status === "in_analysis");
  }, [orders]);

  useEffect(() => {
    if (!selectedOrderId && reviewOrders.length > 0) {
      setSelectedOrderId(reviewOrders[0].id);
    }
  }, [reviewOrders, selectedOrderId]);

  const activeOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  const handleApprove = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;

    const success = labFlowStore.approveOrder(
      activeOrder.id,
      doctorName,
      doctorRegistration,
      clinicalRemarks,
    );

    if (success) {
      toast.success(`Diagnostic Report for ${activeOrder.orderNumber} authorized and signed!`);
      navigate(`/labflow/report/${activeOrder.id}`);
    } else {
      toast.error("Failed to approve order.");
    }
  };

  const handleTriggerPanic = () => {
    if (!activeOrder) return;
    toast.error(
      `URGENT PANIC ALERT dispatched to referring clinician (${activeOrder.referringDoctor}) & patient emergency contact via SMS/WhatsApp!`,
      { duration: 6000 },
    );
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
          Pathologist Review & Medical Authorization
          <Caret className="ml-2" />
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Authorize diagnostic findings, verify Delta Checks against historical baselines & affix digital cryptographic signatures.
        </p>
      </div>

      {/* Main Grid: Review Queue & Verification Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Review Queue */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card rounded-3xl p-5 border border-border/70 space-y-3">
            <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Medical Review Queue ({reviewOrders.length})</span>
              <FileCheck className="size-4 text-purple-500" />
            </h2>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {reviewOrders.length === 0 ? (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  <CheckCircle2 className="mx-auto size-6 text-ok mb-2" />
                  All test requisitions verified and signed off.
                </div>
              ) : (
                reviewOrders.map((order) => {
                  const isSelected = order.id === selectedOrderId;
                  return (
                    <div
                      key={order.id}
                      onClick={() => setSelectedOrderId(order.id)}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-purple-500 bg-purple-500/10 shadow-sm"
                          : order.criticalAlert
                          ? "border-red-500/40 bg-red-500/5 hover:border-red-500/60"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {order.orderNumber}
                        </span>
                        {order.criticalAlert && (
                          <span className="rounded bg-red-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-500 animate-pulse uppercase">
                            CRITICAL
                          </span>
                        )}
                        {!order.criticalAlert && order.priority === "stat" && (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.5 font-mono text-[9px] font-bold text-amber-500 uppercase">
                            STAT
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs font-semibold text-foreground">{order.patientName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {order.patientAge}y, {order.patientGender} · Ref: {order.referringDoctor}
                      </p>

                      <div className="mt-2 text-[10px] text-muted-foreground font-mono">
                        {order.results.length} of {order.tests.length} test panels ready
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Detailed Clinical Verification Canvas */}
        <div className="lg:col-span-8 space-y-6">
          {activeOrder ? (
            <form onSubmit={handleApprove} className="glass-card rounded-3xl p-6 border border-border/70 space-y-6">
              {/* Patient & Requisition Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-foreground">{activeOrder.orderNumber}</span>
                    <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                      {activeOrder.priority.toUpperCase()} PRIORITY
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Patient: <span className="font-bold text-foreground">{activeOrder.patientName}</span> ({activeOrder.patientAge}y, {activeOrder.patientGender}) · Ph: {activeOrder.patientPhone}
                  </p>
                  {activeOrder.clinicalHistory && (
                    <p className="text-xs text-muted-foreground mt-0.5 font-mono bg-accent/20 p-1.5 rounded-lg border border-border/40">
                      History: {activeOrder.clinicalHistory}
                    </p>
                  )}
                </div>

                {activeOrder.criticalAlert && (
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleTriggerPanic}
                    className="cursor-pointer gap-1.5 text-xs shadow-md shadow-red-500/20"
                  >
                    <ShieldAlert className="size-3.5" /> Dispatch Critical Panic Alert
                  </Button>
                )}
              </div>

              {/* Critical Alert Warning (if present) */}
              {activeOrder.criticalAlert && (
                <div className="rounded-2xl border border-red-500/40 bg-red-500/10 p-4 text-xs text-red-500 space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="size-4" /> Panic Cut-off Breached
                  </p>
                  <p className="text-muted-foreground">{activeOrder.criticalAlertNotes}</p>
                </div>
              )}

              {/* Results by Test Panel */}
              <div className="space-y-6">
                {activeOrder.results.length === 0 ? (
                  <div className="rounded-2xl border border-border/60 bg-accent/10 p-6 text-center text-xs text-muted-foreground">
                    Technician has not submitted analyzer readings for this order yet.
                    <div className="mt-2">
                      <Button asChild size="sm" variant="outline" className="text-xs">
                        <Link to={`/labflow/worklist?orderId=${activeOrder.id}`}>
                          Go to Technician Worklist
                        </Link>
                      </Button>
                    </div>
                  </div>
                ) : (
                  activeOrder.results.map((testResult) => (
                    <div
                      key={testResult.testId}
                      className="rounded-2xl border border-border/60 bg-background/50 p-5 space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-border/40 pb-2">
                        <div>
                          <h3 className="text-xs font-bold text-foreground">{testResult.testName}</h3>
                          <p className="text-[11px] text-muted-foreground font-mono">
                            Analyzed via: {testResult.analyzerUsed || "Automated Platform"} · Tech: {testResult.technicianName}
                          </p>
                        </div>
                        <span className="font-mono text-[10px] text-primary">
                          Barcode: {testResult.sampleBarcode}
                        </span>
                      </div>

                      {/* Parameters Table */}
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="text-muted-foreground font-mono text-[11px] border-b border-border/30">
                            <th className="pb-2">Analyte</th>
                            <th className="pb-2">Value</th>
                            <th className="pb-2">Unit</th>
                            <th className="pb-2">Reference</th>
                            <th className="pb-2">Delta Check (vs Prior)</th>
                            <th className="pb-2 text-right">Flag</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/20 font-mono">
                          {testResult.parameters.map((param) => {
                            const isCritical = param.flag === "critical_panic";
                            const isAbnormal = param.flag === "abnormal_high" || param.flag === "abnormal_low";
                            return (
                              <tr key={param.parameterId} className="hover:bg-accent/20">
                                <td className="py-2.5 font-sans font-medium text-foreground">{param.name}</td>
                                <td className={`py-2.5 font-bold ${isCritical ? "text-red-500" : isAbnormal ? "text-amber-500" : "text-foreground"}`}>
                                  {param.measuredValue}
                                </td>
                                <td className="py-2.5 text-muted-foreground text-[11px]">{param.unit}</td>
                                <td className="py-2.5 text-muted-foreground text-[11px]">{param.refRange}</td>
                                <td className="py-2.5 text-[11px]">
                                  {param.previousValue !== undefined ? (
                                    <span className="flex items-center gap-1 text-muted-foreground">
                                      {param.deltaFlag === "acute_shift" ? (
                                        <TrendingUp className="size-3 text-red-500" />
                                      ) : param.deltaFlag === "significant_change" ? (
                                        <TrendingDown className="size-3 text-amber-500" />
                                      ) : (
                                        <CheckCircle2 className="size-3 text-ok" />
                                      )}
                                      {param.deltaPercent}% ({param.previousValue})
                                    </span>
                                  ) : (
                                    <span className="text-muted-foreground">— First Record</span>
                                  )}
                                </td>
                                <td className="py-2.5 text-right font-sans">
                                  <span
                                    className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                                      isCritical
                                        ? "bg-red-500 text-white animate-pulse"
                                        : isAbnormal
                                        ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                                        : "bg-ok/15 text-ok"
                                    }`}
                                  >
                                    {isCritical ? "CRITICAL" : isAbnormal ? "ABNORMAL" : "NORMAL"}
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ))
                )}
              </div>

              {/* Pathologist Verification & Digital Signature Block */}
              <div className="rounded-2xl border border-purple-500/30 bg-purple-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2 text-purple-500 font-bold text-xs">
                  <ShieldCheck className="size-4" />
                  <span>Digital Authorization & NABL Verification Credentials</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Authorizing Pathologist / Biochemist</label>
                    <Input
                      value={doctorName}
                      onChange={(e) => setDoctorName(e.target.value)}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Medical Council / Signatory Registration</label>
                    <Input
                      value={doctorRegistration}
                      onChange={(e) => setDoctorRegistration(e.target.value)}
                      className="mt-1 text-xs font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Clinical Interpretive Remarks</label>
                  <Textarea
                    value={clinicalRemarks}
                    onChange={(e) => setClinicalRemarks(e.target.value)}
                    className="mt-1 text-xs resize-none h-16"
                  />
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border/60">
                <Button
                  type="submit"
                  size="lg"
                  disabled={activeOrder.results.length === 0}
                  className="cursor-pointer gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold text-xs shadow-lg shadow-purple-500/20"
                >
                  <Lock className="size-3.5" /> Sign & Release Accredited Diagnostic Report
                </Button>
              </div>
            </form>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground">
              <Stethoscope className="mx-auto size-8 opacity-50 mb-3" />
              <p className="text-sm">Select an order from the review queue.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
