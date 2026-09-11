import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { simulateAnalyzerMeasurement, ANALYZER_FLEET } from "@/lib/labflow/analyzer-simulator";
import { DIAGNOSTIC_TEST_CATALOG } from "@/lib/labflow/catalog";
import { evaluateFlag, labFlowStore } from "@/lib/labflow/store";
import type { LabOrder, ParameterResult } from "@/lib/labflow/types";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  Cpu,
  Microscope,
  RotateCcw,
  Send,
  ShieldAlert,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams, useNavigate } from "react-router";
import { toast } from "sonner";

export default function TechnicianWorklist() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<LabOrder[]>(() => labFlowStore.getOrders());
  const [selectedOrderId, setSelectedOrderId] = useState<string>(searchParams.get("orderId") || "");
  const [selectedTestId, setSelectedTestId] = useState<string>("");

  // Result entry state
  const [parameterValues, setParameterValues] = useState<Record<string, number>>({});
  const [technicianName, setTechnicianName] = useState("K. Teja, B.Sc MLT");
  const [technicianNotes, setTechnicianNotes] = useState("");
  const [selectedAnalyzer, setSelectedAnalyzer] = useState("ROCHE-COBAS-6000");

  useEffect(() => {
    return labFlowStore.subscribe(() => {
      setOrders([...labFlowStore.getOrders()]);
    });
  }, []);

  // Filter orders that need analysis or review
  const pendingOrders = useMemo(() => {
    return orders.filter(
      (o) => o.status === "in_analysis" || o.status === "samples_collected" || o.status === "under_review",
    );
  }, [orders]);

  // Set default selected order and test
  useEffect(() => {
    if (!selectedOrderId && pendingOrders.length > 0) {
      setSelectedOrderId(pendingOrders[0].id);
    }
  }, [pendingOrders, selectedOrderId]);

  const activeOrder = useMemo(() => {
    return orders.find((o) => o.id === selectedOrderId);
  }, [orders, selectedOrderId]);

  // Set default active test when order changes
  useEffect(() => {
    if (activeOrder && activeOrder.tests.length > 0) {
      if (!selectedTestId || !activeOrder.tests.some((t) => t.testId === selectedTestId)) {
        setSelectedTestId(activeOrder.tests[0].testId);
      }
    }
  }, [activeOrder, selectedTestId]);

  const activeCatalogTest = useMemo(() => {
    return DIAGNOSTIC_TEST_CATALOG.find((t) => t.id === selectedTestId);
  }, [selectedTestId]);

  // Prepopulate existing parameter values if test was already entered
  useEffect(() => {
    if (activeOrder && selectedTestId) {
      const existingResult = activeOrder.results.find((r) => r.testId === selectedTestId);
      if (existingResult) {
        const valMap: Record<string, number> = {};
        existingResult.parameters.forEach((p) => {
          if (typeof p.measuredValue === "number") {
            valMap[p.parameterId] = p.measuredValue;
          }
        });
        setParameterValues(valMap);
        setTechnicianNotes(existingResult.technicianNotes || "");
      } else {
        setParameterValues({});
        setTechnicianNotes("");
      }
    }
  }, [activeOrder, selectedTestId]);

  const matchingSample = useMemo(() => {
    if (!activeOrder || !activeCatalogTest) return null;
    return activeOrder.samples.find((s) => s.tubeType === activeCatalogTest.tubeType);
  }, [activeOrder, activeCatalogTest]);

  const handleSimulateFeed = (mode: "normal" | "abnormal" | "critical") => {
    if (!selectedTestId) return;
    try {
      const { parameters, analyzer } = simulateAnalyzerMeasurement(
        selectedTestId,
        mode === "abnormal",
        mode === "critical",
      );

      const valMap: Record<string, number> = {};
      parameters.forEach((p) => {
        if (typeof p.measuredValue === "number") {
          valMap[p.parameterId] = p.measuredValue;
        }
      });
      setParameterValues(valMap);
      setSelectedAnalyzer(analyzer.id);
      toast.success(
        `Automated result telemetry received from ${analyzer.name} (${mode.toUpperCase()} profile)`,
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Simulation failed");
    }
  };

  const handleSaveAndSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder || !activeCatalogTest) return;

    const sampleBarcode = matchingSample?.barcode || activeOrder.samples[0]?.barcode || "SMP-UNKNOWN";

    const evaluatedParams: ParameterResult[] = activeCatalogTest.parameters.map((param) => {
      const measured = parameterValues[param.id] ?? (param.refLow ?? 10);
      const flag = evaluateFlag(
        measured,
        param.refLow,
        param.refHigh,
        param.criticalLow,
        param.criticalHigh,
      );

      const refRangeStr =
        param.textReference ||
        (param.refLow !== undefined && param.refHigh !== undefined
          ? `${param.refLow} - ${param.refHigh}`
          : "—");

      return {
        parameterId: param.id,
        name: param.name,
        measuredValue: measured,
        unit: param.unit,
        refRange: refRangeStr,
        flag,
        analyzerId: selectedAnalyzer,
      };
    });

    const success = labFlowStore.submitTestResults(
      activeOrder.id,
      activeCatalogTest.id,
      sampleBarcode,
      evaluatedParams,
      ANALYZER_FLEET.find((a) => a.id === selectedAnalyzer)?.name || selectedAnalyzer,
      technicianName,
      technicianNotes,
    );

    if (success) {
      toast.success(`Results for ${activeCatalogTest.name} submitted for Pathologist review!`);
      navigate(`/labflow/review?orderId=${activeOrder.id}`);
    } else {
      toast.error("Failed to submit test results.");
    }
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
          Technician Batch Worklist & Analyzer Station
          <Caret className="ml-2" />
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Enter biochemical & hematological findings, run automated analyzer telemetry & perform Delta baseline checks.
        </p>
      </div>

      {/* Main Grid: Orders Queue & Parameter Measurement Station */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Pending Orders Queue */}
        <div className="lg:col-span-4 space-y-4">
          <div className="glass-card rounded-3xl p-5 border border-border/70 space-y-3">
            <h2 className="text-xs font-mono font-semibold text-muted-foreground uppercase flex items-center justify-between">
              <span>Analysis Worklist ({pendingOrders.length})</span>
              <Microscope className="size-4 text-primary" />
            </h2>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {pendingOrders.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No orders currently pending analysis.
                </p>
              ) : (
                pendingOrders.map((order) => {
                  const isSelected = order.id === selectedOrderId;
                  return (
                    <div
                      key={order.id}
                      onClick={() => {
                        setSelectedOrderId(order.id);
                        if (order.tests.length > 0) setSelectedTestId(order.tests[0].testId);
                      }}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground">
                          {order.orderNumber}
                        </span>
                        {order.priority === "stat" && (
                          <span className="rounded bg-red-500/15 px-1.5 py-0.5 font-mono text-[9px] font-bold text-red-500 uppercase">
                            STAT
                          </span>
                        )}
                      </div>

                      <p className="mt-1.5 text-xs font-semibold text-foreground">{order.patientName}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {order.tests.length} tests · {order.collectionCenter.split(" ")[0]}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-1">
                        {order.tests.map((t) => {
                          const isDone = order.results.some((r) => r.testId === t.testId);
                          return (
                            <span
                              key={t.testId}
                              className={`rounded px-1.5 py-0.5 text-[9px] font-mono ${
                                isDone ? "bg-ok/15 text-ok" : "bg-accent/60 text-muted-foreground"
                              }`}
                            >
                              {t.testName.split(" ")[0]} {isDone ? "✓" : "…"}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Active Measurement & Telemetry Workstation */}
        <div className="lg:col-span-8 space-y-6">
          {activeOrder && activeCatalogTest ? (
            <form onSubmit={handleSaveAndSubmit} className="glass-card rounded-3xl p-6 border border-border/70 space-y-6">
              {/* Order & Test Tabs Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-base font-bold text-foreground">{activeOrder.orderNumber}</span>
                    <span className="text-xs text-muted-foreground">· {activeOrder.patientName} ({activeOrder.patientAge}y, {activeOrder.patientGender})</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Specimen Barcode: <span className="font-mono text-primary font-bold">{matchingSample?.barcode || "SMP-MAIN"}</span> ({activeCatalogTest.tubeType})
                  </p>
                </div>

                {/* Sub-test tabs for this order */}
                <div className="flex flex-wrap gap-1.5">
                  {activeOrder.tests.map((t) => {
                    const isCurrent = t.testId === selectedTestId;
                    const isDone = activeOrder.results.some((r) => r.testId === t.testId);
                    return (
                      <button
                        key={t.testId}
                        type="button"
                        onClick={() => setSelectedTestId(t.testId)}
                        className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                          isCurrent
                            ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                            : "bg-accent/40 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {t.testName.split(" ")[0]} {isDone && "✓"}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Analyzer Telemetry Simulator Controls */}
              <div className="rounded-2xl border border-sky-500/30 bg-sky-500/5 p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sky-500 text-xs font-semibold">
                    <Cpu className="size-4" />
                    <span>Automated Analyzer Interface & HL7 Telemetry</span>
                  </div>
                  <select
                    value={selectedAnalyzer}
                    onChange={(e) => setSelectedAnalyzer(e.target.value)}
                    className="rounded-lg border border-border/60 bg-background/80 px-2 py-1 text-xs text-foreground focus:outline-none"
                  >
                    {ANALYZER_FLEET.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.department})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <span className="text-xs text-muted-foreground mr-1">Feed Simulator:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSimulateFeed("normal")}
                    className="h-7 text-xs cursor-pointer border-ok/40 hover:bg-ok/10 text-ok"
                  >
                    <CheckCircle2 className="mr-1 size-3" /> Normal Run
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSimulateFeed("abnormal")}
                    className="h-7 text-xs cursor-pointer border-amber-500/40 hover:bg-amber-500/10 text-amber-500"
                  >
                    <AlertTriangle className="mr-1 size-3" /> Abnormal Value
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handleSimulateFeed("critical")}
                    className="h-7 text-xs cursor-pointer border-red-500/40 hover:bg-red-500/10 text-red-500"
                  >
                    <ShieldAlert className="mr-1 size-3" /> Critical Panic Telemetry
                  </Button>
                </div>
              </div>

              {/* Parameter Entry Table */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono text-muted-foreground uppercase flex items-center justify-between">
                  <span>{activeCatalogTest.name} Parameters</span>
                  <span>{activeCatalogTest.parameters.length} Analyte(s)</span>
                </h3>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-border/60 text-muted-foreground font-mono">
                        <th className="pb-2.5 font-medium">Parameter / Analyte</th>
                        <th className="pb-2.5 font-medium w-36">Measured Value</th>
                        <th className="pb-2.5 font-medium">Unit</th>
                        <th className="pb-2.5 font-medium">Biological Reference Range</th>
                        <th className="pb-2.5 font-medium text-right">Flag Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                      {activeCatalogTest.parameters.map((param) => {
                        const val = parameterValues[param.id];
                        const flag =
                          val !== undefined && !Number.isNaN(val)
                            ? evaluateFlag(val, param.refLow, param.refHigh, param.criticalLow, param.criticalHigh)
                            : "normal";

                        return (
                          <tr key={param.id} className="hover:bg-accent/20 transition-colors">
                            <td className="py-3 pr-3">
                              <span className="font-semibold text-foreground">{param.name}</span>
                            </td>
                            <td className="py-3 pr-3">
                              <Input
                                type="number"
                                step="any"
                                required
                                value={val ?? ""}
                                onChange={(e) =>
                                  setParameterValues({
                                    ...parameterValues,
                                    [param.id]: e.target.value === "" ? 0 : Number(e.target.value),
                                  })
                                }
                                placeholder="0.0"
                                className="h-8 text-xs font-mono font-bold"
                              />
                            </td>
                            <td className="py-3 pr-3 font-mono text-muted-foreground text-[11px]">
                              {param.unit}
                            </td>
                            <td className="py-3 pr-3 font-mono text-muted-foreground text-[11px]">
                              {param.textReference ||
                                (param.refLow !== undefined && param.refHigh !== undefined
                                  ? `${param.refLow} - ${param.refHigh}`
                                  : "—")}
                            </td>
                            <td className="py-3 text-right">
                              <span
                                className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-mono font-bold ${
                                  flag === "critical_panic"
                                    ? "bg-red-500 text-white animate-pulse"
                                    : flag === "abnormal_high" || flag === "abnormal_low"
                                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/40"
                                    : "bg-ok/15 text-ok"
                                }`}
                              >
                                {flag === "critical_panic"
                                  ? "CRITICAL PANIC"
                                  : flag === "abnormal_high"
                                  ? "HIGH"
                                  : flag === "abnormal_low"
                                  ? "LOW"
                                  : "NORMAL"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Technician Verification Notes */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Technician Name & Credentials</label>
                  <Input
                    value={technicianName}
                    onChange={(e) => setTechnicianName(e.target.value)}
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Technical Remarks / Aliquot Notes</label>
                  <Input
                    value={technicianNotes}
                    onChange={(e) => setTechnicianNotes(e.target.value)}
                    placeholder="e.g. Verified on second dilution / repeat sample."
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-border/60">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setParameterValues({})}
                  className="text-xs"
                >
                  <RotateCcw className="mr-1 size-3.5" /> Clear Values
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  className="text-xs font-semibold gap-1.5 cursor-pointer shadow-md shadow-primary/20"
                >
                  <Send className="size-3.5" /> Submit to Pathologist Review
                </Button>
              </div>
            </form>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground">
              <Microscope className="mx-auto size-8 opacity-50 mb-3" />
              <p className="text-sm">Select an order from the queue to start measurement.</p>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
