import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { ClinicalStatusPill } from "@/components/ui/clinical-status-pill";
import { Textarea } from "@/components/ui/textarea";
import { labFlowStore } from "@/lib/labflow/store";
import type { LabOrder, Sample, SampleStatus } from "@/lib/labflow/types";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  Barcode,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  Search,
  ShieldCheck,
  TestTube2,
  Thermometer,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";

const STAGE_ORDER: SampleStatus[] = [
  "ordered",
  "collected",
  "in_transit",
  "received_at_lab",
  "processing",
  "completed",
];

const STAGE_LABELS: Record<SampleStatus, string> = {
  ordered: "Requisition Placed",
  collected: "Phlebotomy Collected",
  in_transit: "Cold-Chain Transit",
  received_at_lab: "Received & Accessioned",
  processing: "In-Analyzer Processing",
  completed: "Testing Completed",
  rejected: "Rejected / Defective",
  repeat_requested: "Repeat Sample Required",
};

export default function SampleTracking() {
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<LabOrder[]>(() => labFlowStore.getOrders());
  const [searchQuery, setSearchQuery] = useState(searchParams.get("orderId") || searchParams.get("barcode") || "");
  const [selectedBarcode, setSelectedBarcode] = useState<string>("");

  // Rejection Modal State
  const [rejectingSample, setRejectingSample] = useState<Sample | null>(null);
  const [rejectionReason, setRejectionReason] = useState("Grossly Hemolyzed Sample");
  const [rejectionNotes, setRejectionNotes] = useState("");

  const handlerName = "K. Ramesh (Lab MLT)";
  const handlerRole = "Accessioning & Processing";
  const handlerLocation = "Central Processing Laboratory Core";
  const sampleTemp = 4.2;

  useEffect(() => {
    return labFlowStore.subscribe(() => {
      setOrders([...labFlowStore.getOrders()]);
    });
  }, []);

  // Collect all samples across all orders with their parent order
  const allSamplesWithOrder = useMemo(() => {
    const list: { sample: Sample; order: LabOrder }[] = [];
    orders.forEach((order) => {
      order.samples.forEach((sample) => {
        list.push({ sample, order });
      });
    });
    return list;
  }, [orders]);

  // Set default selected barcode on load
  useEffect(() => {
    if (!selectedBarcode && allSamplesWithOrder.length > 0) {
      if (searchQuery) {
        const match = allSamplesWithOrder.find(
          (item) =>
            item.sample.barcode.toLowerCase() === searchQuery.toLowerCase() ||
            item.order.id === searchQuery ||
            item.order.orderNumber.toLowerCase() === searchQuery.toLowerCase(),
        );
        if (match) {
          setSelectedBarcode(match.sample.barcode);
          return;
        }
      }
      setSelectedBarcode(allSamplesWithOrder[0].sample.barcode);
    }
  }, [allSamplesWithOrder, searchQuery, selectedBarcode]);

  const activeItem = useMemo(() => {
    return allSamplesWithOrder.find((item) => item.sample.barcode === selectedBarcode);
  }, [allSamplesWithOrder, selectedBarcode]);

  const filteredSamples = useMemo(() => {
    if (!searchQuery.trim()) return allSamplesWithOrder;
    return allSamplesWithOrder.filter(
      (item) =>
        item.sample.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.order.patientName.toLowerCase().includes(searchQuery.toLowerCase()),
    );
  }, [allSamplesWithOrder, searchQuery]);

  const handleAdvanceStatus = (sample: Sample, nextStage: SampleStatus) => {
    const success = labFlowStore.updateSampleStatus(
      sample.barcode,
      nextStage,
      handlerName,
      handlerRole,
      handlerLocation,
      `Specimen advanced to ${STAGE_LABELS[nextStage]}`,
      sampleTemp,
    );
    if (success) {
      toast.success(`Sample ${sample.barcode} updated to ${STAGE_LABELS[nextStage]}`);
    }
  };

  const handleConfirmRejection = () => {
    if (!rejectingSample) return;
    const success = labFlowStore.rejectSample(
      rejectingSample.barcode,
      rejectionReason,
      rejectionNotes || "Quality assurance check failed.",
      "Dr. R. K. Varma (Pathologist)",
    );
    if (success) {
      setRejectingSample(null);
      toast.warning(`Sample ${rejectingSample.barcode} marked as REJECTED.`);
    }
  };

  const handleRequestRepeat = (sample: Sample, orderId: string) => {
    const newSample = labFlowStore.requestRepeatSample(
      orderId,
      sample.barcode,
      "Automated request sent to phlebotomy collection center.",
    );
    if (newSample) {
      setSelectedBarcode(newSample.barcode);
      toast.success(`Repeat sample requisition ${newSample.barcode} created.`);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-6xl space-y-6"
    >
      {/* Top Header */}
      <div>
        <Link
          to="/labflow"
          className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-2"
        >
          <ArrowLeft className="mr-1.5 size-3.5" /> Back to Operations Center
        </Link>
        <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          Sample Tracking & Chain-of-Custody (CoC)
          <Caret className="ml-2" />
        </h1>
        <p className="mt-1 text-xs text-muted-foreground">
          Real-time cold-chain monitoring, specimen inwarding, barcode verification & tamper-evident audit logs.
        </p>
      </div>

      {/* Main Grid: Sample List & Detailed Chain of Custody */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Col: Sample Explorer */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-card rounded-3xl p-5 border border-border/70 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search barcode, order #, patient..."
                className="w-full rounded-xl border border-border/60 bg-background/60 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {filteredSamples.length === 0 ? (
                <p className="py-8 text-center text-xs text-muted-foreground">
                  No specimen records found.
                </p>
              ) : (
                filteredSamples.map(({ sample, order }) => {
                  const isSelected = sample.barcode === selectedBarcode;
                  const isRejected = sample.status === "rejected";
                  return (
                    <div
                      key={sample.id}
                      onClick={() => setSelectedBarcode(sample.barcode)}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : isRejected
                          ? "border-red-500/40 bg-red-500/5 hover:border-red-500/60"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-bold text-foreground flex items-center gap-1.5">
                          <Barcode className="size-3.5 text-primary" />
                          {sample.barcode}
                        </span>
                        <ClinicalStatusPill
                          status={
                            isRejected
                              ? "critical"
                              : sample.status === "completed"
                              ? "normal"
                              : sample.status === "processing"
                              ? "watch"
                              : "in_transit"
                          }
                          label={STAGE_LABELS[sample.status]}
                        />
                      </div>

                      <div className="mt-2 text-xs">
                        <p className="font-medium text-foreground">{order.patientName}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {order.orderNumber} · {sample.tubeType}
                        </p>
                      </div>

                      {sample.temperature !== undefined && (
                        <div className="mt-2 flex items-center gap-1.5 text-[10px] text-muted-foreground font-mono">
                          <Thermometer className="size-3 text-sky-500" />
                          <span>Cold-Chain: {sample.temperature}°C</span>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Col: Detailed Chain-of-Custody & Specimen Control */}
        <div className="lg:col-span-7 space-y-6">
          {activeItem ? (
            <div className="glass-card rounded-3xl p-6 border border-border/70 space-y-6">
              {/* Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border/60 pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-lg font-bold text-primary">
                      {activeItem.sample.barcode}
                    </span>
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-xs text-primary font-medium">
                      {activeItem.sample.specimenType}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Order: <Link to={`/labflow/report/${activeItem.order.id}`} className="underline text-foreground">{activeItem.order.orderNumber}</Link> · Patient: <span className="font-semibold text-foreground">{activeItem.order.patientName}</span> ({activeItem.order.patientAge}y)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {activeItem.sample.status !== "rejected" && activeItem.sample.status !== "completed" && (
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRejectingSample(activeItem.sample)}
                      className="text-xs cursor-pointer"
                    >
                      <XCircle className="mr-1 size-3.5" /> Reject Specimen
                    </Button>
                  )}
                  {activeItem.sample.status === "rejected" && (
                    <Button
                      size="sm"
                      onClick={() => handleRequestRepeat(activeItem.sample, activeItem.order.id)}
                      className="text-xs cursor-pointer bg-amber-600 hover:bg-amber-700 text-white"
                    >
                      <RotateCcw className="mr-1 size-3.5" /> Requisition Repeat
                    </Button>
                  )}
                </div>
              </div>

              {/* Status Stepper Progression */}
              <div>
                <h3 className="text-xs font-mono text-muted-foreground uppercase mb-3">Lifecycle Milestones</h3>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center">
                  {STAGE_ORDER.map((stage, idx) => {
                    const currentIdx = STAGE_ORDER.indexOf(activeItem.sample.status);
                    const isPassed = currentIdx >= idx;
                    const isCurrent = activeItem.sample.status === stage;

                    return (
                      <div
                        key={stage}
                        className={`rounded-xl border p-2 text-[11px] transition-all ${
                          isCurrent
                            ? "border-primary bg-primary/15 font-bold text-primary shadow-sm"
                            : isPassed
                            ? "border-ok/40 bg-ok/10 text-ok"
                            : "border-border/40 bg-accent/10 text-muted-foreground opacity-50"
                        }`}
                      >
                        <div className="flex items-center justify-center mb-1">
                          {isPassed ? (
                            <CheckCircle2 className="size-3.5 text-ok" />
                          ) : (
                            <Clock className="size-3.5 text-muted-foreground" />
                          )}
                        </div>
                        <p className="truncate text-[10px]">{STAGE_LABELS[stage]}</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Quick Action to Advance Specimen */}
              {activeItem.sample.status !== "completed" && activeItem.sample.status !== "rejected" && (
                <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-semibold text-foreground">Advance Sample Lifecycle</h4>
                    <p className="text-[11px] text-muted-foreground">
                      Current stage: <span className="font-bold text-primary">{STAGE_LABELS[activeItem.sample.status]}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {activeItem.sample.status === "ordered" && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(activeItem.sample, "collected")}
                        className="text-xs"
                      >
                        Mark as Collected
                      </Button>
                    )}
                    {activeItem.sample.status === "collected" && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(activeItem.sample, "in_transit")}
                        className="text-xs"
                      >
                        Dispatch in Transit
                      </Button>
                    )}
                    {activeItem.sample.status === "in_transit" && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(activeItem.sample, "received_at_lab")}
                        className="text-xs"
                      >
                        Receive at Core Lab
                      </Button>
                    )}
                    {activeItem.sample.status === "received_at_lab" && (
                      <Button
                        size="sm"
                        onClick={() => handleAdvanceStatus(activeItem.sample, "processing")}
                        className="text-xs"
                      >
                        Load into Analyzer
                      </Button>
                    )}
                    {activeItem.sample.status === "processing" && (
                      <Button
                        size="sm"
                        asChild
                        className="text-xs"
                      >
                        <Link to={`/labflow/worklist?orderId=${activeItem.order.id}`}>
                          Enter Results
                        </Link>
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Chain of Custody (CoC) Timeline */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-mono text-muted-foreground uppercase flex items-center gap-1.5">
                    <ShieldCheck className="size-4 text-ok" />
                    Chain of Custody Audit Trail ({activeItem.sample.custodyTrail.length} Events)
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Tamper-Evident SHA Signatures
                  </span>
                </div>

                <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-border">
                  {activeItem.sample.custodyTrail.map((event) => (
                    <div key={event.id} className="relative">
                      <div className="absolute -left-6 top-0.5 flex size-5 items-center justify-center rounded-full bg-background border-2 border-primary text-[10px] font-bold text-primary">
                        •
                      </div>

                      <div className="rounded-2xl border border-border/70 bg-accent/20 p-4 space-y-2">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                          <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            {STAGE_LABELS[event.stage]}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {new Date(event.timestamp).toLocaleString()}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-muted-foreground">
                          <p className="flex items-center gap-1">
                            <User className="size-3 text-primary" /> {event.handlerName} ({event.handlerRole})
                          </p>
                          <p className="flex items-center gap-1 truncate">
                            <MapPin className="size-3 text-sky-500" /> {event.location}
                          </p>
                        </div>

                        {event.notes && (
                          <p className="text-xs text-foreground bg-background/60 p-2.5 rounded-xl border border-border/40 font-mono text-[11px]">
                            {event.notes}
                          </p>
                        )}

                        <div className="flex items-center justify-between text-[10px] font-mono text-muted-foreground pt-1 border-t border-border/30">
                          <span>Cold-Chain: {event.temperatureCelsius ?? activeItem.sample.temperature ?? 4.0}°C</span>
                          <span className="truncate">Hash: {event.hashSignature}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="glass-card rounded-3xl p-12 text-center text-muted-foreground">
              <TestTube2 className="mx-auto size-8 text-muted-foreground opacity-50 mb-3" />
              <p className="text-sm">Select a sample from the list to view its real-time chain-of-custody.</p>
            </div>
          )}
        </div>
      </div>

      {/* Rejection Modal */}
      <AnimatePresence>
        {rejectingSample && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-card relative w-full max-w-md rounded-3xl p-6 shadow-2xl border border-red-500/40 space-y-4"
            >
              <div className="flex items-center gap-2.5 text-red-500">
                <AlertTriangle className="size-5" />
                <h3 className="font-bold text-sm text-foreground">Reject Sample: {rejectingSample.barcode}</h3>
              </div>

              <p className="text-xs text-muted-foreground">
                Documenting sample rejection triggers a quality incident and alerts the collection center for repeat collection.
              </p>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Rejection Reason *</label>
                <select
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus:outline-none"
                >
                  <option value="Grossly Hemolyzed Sample">Grossly Hemolyzed Sample</option>
                  <option value="Lipemic / Icteric Sample">Lipemic / Icteric Sample</option>
                  <option value="Clotted EDTA Whole Blood">Clotted EDTA Whole Blood</option>
                  <option value="Insufficient Specimen Volume (QNS)">Insufficient Specimen Volume (QNS)</option>
                  <option value="Incorrect Tube / Additive Used">Incorrect Tube / Additive Used</option>
                  <option value="Cold-Chain Temperature Breach (> 8°C)">Cold-Chain Temperature Breach (&gt; 8°C)</option>
                  <option value="Mislabeled / Missing Barcode">Mislabeled / Missing Barcode</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Clinical & QA Notes</label>
                <Textarea
                  value={rejectionNotes}
                  onChange={(e) => setRejectionNotes(e.target.value)}
                  placeholder="Provide specific details regarding the specimen defect..."
                  className="mt-1 text-xs h-20 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRejectingSample(null)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleConfirmRejection}
                  className="text-xs"
                >
                  Confirm Rejection
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
