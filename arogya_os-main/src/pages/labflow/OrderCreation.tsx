import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { labFlowStore } from "@/lib/labflow/store";
import type { LabOrder, OrderPriority, Sample } from "@/lib/labflow/types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  QrCode,
  TestTube2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function OrderCreation() {
  const catalog = useMemo(() => labFlowStore.getCatalog(), []);
  const collectionCenters = useMemo(() => labFlowStore.getCollectionCenters(), []);

  // Form State
  const [patientName, setPatientName] = useState("");
  const [patientAge, setPatientAge] = useState<number>(35);
  const [patientGender, setPatientGender] = useState<"Male" | "Female" | "Other">("Male");
  const [patientPhone, setPatientPhone] = useState("+91 ");
  const [patientEmail, setPatientEmail] = useState("");
  const [referringDoctor, setReferringDoctor] = useState("Dr. K. S. Rao, MD");
  const [collectionCenter, setCollectionCenter] = useState(collectionCenters[0].name);
  const [priority, setPriority] = useState<OrderPriority>("routine");
  const [clinicalHistory, setClinicalHistory] = useState("");
  const [selectedTestIds, setSelectedTestIds] = useState<string[]>(["test-cbc"]);
  const [createdOrder, setCreatedOrder] = useState<LabOrder | null>(null);

  // Group selected tests by tube type for realistic preview
  const selectedTests = useMemo(
    () => catalog.filter((t) => selectedTestIds.includes(t.id)),
    [catalog, selectedTestIds],
  );

  const tubeSummary = useMemo(() => {
    const map = new Map<string, string[]>();
    selectedTests.forEach((t) => {
      const list = map.get(t.tubeType) ?? [];
      list.push(t.name);
      map.set(t.tubeType, list);
    });
    return Array.from(map.entries());
  }, [selectedTests]);

  const totalAmount = useMemo(
    () => selectedTests.reduce((sum, t) => sum + t.price, 0),
    [selectedTests],
  );

  const maxTat = useMemo(
    () => Math.max(...selectedTests.map((t) => t.tatMinutes), 60),
    [selectedTests],
  );

  const toggleTest = (testId: string) => {
    if (selectedTestIds.includes(testId)) {
      if (selectedTestIds.length === 1) {
        toast.error("Please select at least one test.");
        return;
      }
      setSelectedTestIds(selectedTestIds.filter((id) => id !== testId));
    } else {
      setSelectedTestIds([...selectedTestIds, testId]);
    }
  };

  const handleCreateOrder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientName.trim()) {
      toast.error("Please enter the patient's full name.");
      return;
    }
    if (selectedTestIds.length === 0) {
      toast.error("Please select at least one diagnostic test.");
      return;
    }

    const order = labFlowStore.createOrder({
      patientName: patientName.trim(),
      patientAge: Number(patientAge) || 30,
      patientGender,
      patientPhone: patientPhone.trim(),
      patientEmail: patientEmail.trim() || `${patientName.toLowerCase().replace(/\s+/g, ".")}@example.com`,
      referringDoctor: referringDoctor.trim(),
      collectionCenter,
      priority,
      clinicalHistory,
      selectedTestIds,
      paymentStatus: "paid",
    });

    setCreatedOrder(order);
    toast.success(`Diagnostic Requisition ${order.orderNumber} booked successfully!`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-5xl space-y-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            to="/labflow"
            className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="mr-1.5 size-3.5" /> Back to Operations Center
          </Link>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            New Diagnostic Requisition & Order Intake
            <Caret className="ml-2" />
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Register patient test requests, generate sample barcoding labels & initialize chain-of-custody.
          </p>
        </div>
      </div>

      {createdOrder ? (
        /* Order Success Confirmation & Barcode Print Slip */
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card rounded-3xl p-8 border border-ok/40 bg-ok/5 shadow-xl space-y-6"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-ok/20 text-ok">
              <CheckCircle2 className="size-7" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-foreground">Requisition Booked Successfully</h2>
              <p className="font-mono text-xs text-muted-foreground">
                Order ID: <span className="font-bold text-ok">{createdOrder.orderNumber}</span> · Generated: {new Date(createdOrder.createdAt).toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
            <div>
              <h3 className="text-xs font-mono text-muted-foreground uppercase">Patient Details</h3>
              <p className="mt-1 text-base font-semibold text-foreground">{createdOrder.patientName}</p>
              <p className="text-xs text-muted-foreground">
                {createdOrder.patientAge} Years · {createdOrder.patientGender} · {createdOrder.patientPhone}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Collection Center:</span> {createdOrder.collectionCenter}
              </p>
              <p className="text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Referring Physician:</span> {createdOrder.referringDoctor}
              </p>
            </div>

            <div>
              <h3 className="text-xs font-mono text-muted-foreground uppercase">Generated Specimen Barcodes ({createdOrder.samples.length} Tubes)</h3>
              <div className="mt-2 space-y-2">
                {createdOrder.samples.map((samp: Sample) => (
                  <div
                    key={samp.id}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-background/80 p-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <TestTube2 className="size-4 text-primary" />
                      <div>
                        <p className="font-mono text-xs font-bold text-foreground">{samp.barcode}</p>
                        <p className="text-[11px] text-muted-foreground">{samp.tubeType}</p>
                      </div>
                    </div>
                    <span className="rounded bg-primary/10 px-2 py-0.5 font-mono text-[10px] text-primary">
                      Ready for Phlebotomy
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-border/60">
            <Button
              variant="outline"
              onClick={() => {
                setCreatedOrder(null);
                setPatientName("");
                setSelectedTestIds(["test-cbc"]);
              }}
              className="text-xs cursor-pointer"
            >
              Book Another Order
            </Button>
            <Button
              asChild
              className="text-xs cursor-pointer bg-primary gap-1.5"
            >
              <Link to={`/labflow/tracking?orderId=${createdOrder.id}`}>
                Track Sample Life Cycle <ArrowLeft className="rotate-180 size-3.5" />
              </Link>
            </Button>
          </div>
        </motion.div>
      ) : (
        /* Order Creation Form */
        <form onSubmit={handleCreateOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left 2 Cols: Patient & Test Selection */}
          <div className="lg:col-span-2 space-y-6">
            {/* Patient Info Card */}
            <div className="glass-card rounded-3xl p-6 border border-border/70 space-y-4">
              <div className="flex items-center gap-2">
                <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold">1</span>
                <h2 className="font-semibold text-sm text-foreground">Patient & Clinical Information</h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Full Patient Name *</label>
                  <Input
                    required
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="e.g. Ramesh Chandra"
                    className="mt-1 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Age *</label>
                    <Input
                      type="number"
                      required
                      min={1}
                      max={120}
                      value={patientAge}
                      onChange={(e) => setPatientAge(Number(e.target.value))}
                      className="mt-1 text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground">Gender *</label>
                    <select
                      value={patientGender}
                      onChange={(e) => setPatientGender(e.target.value as "Male" | "Female" | "Other")}
                      className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus:outline-none"
                    >
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Phone Number *</label>
                  <Input
                    required
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+91 98490 12345"
                    className="mt-1 text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Email Address</label>
                  <Input
                    type="email"
                    value={patientEmail}
                    onChange={(e) => setPatientEmail(e.target.value)}
                    placeholder="patient@example.com"
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Referring Doctor / Clinic</label>
                  <Input
                    value={referringDoctor}
                    onChange={(e) => setReferringDoctor(e.target.value)}
                    placeholder="Dr. Name or Self"
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Collection Center Location</label>
                  <select
                    value={collectionCenter}
                    onChange={(e) => setCollectionCenter(e.target.value)}
                    className="mt-1 w-full rounded-md border border-input bg-transparent px-3 py-2 text-xs shadow-xs focus:outline-none"
                  >
                    {collectionCenters.map((cc) => (
                      <option key={cc.id} value={cc.name}>
                        {cc.name} ({cc.city})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted-foreground">Clinical Indications / History (Optional)</label>
                <Textarea
                  value={clinicalHistory}
                  onChange={(e) => setClinicalHistory(e.target.value)}
                  placeholder="e.g. Type 2 diabetes on Metformin; fasting blood sugar check; routine annual physical."
                  className="mt-1 text-xs resize-none h-16"
                />
              </div>
            </div>

            {/* Test Selection Card */}
            <div className="glass-card rounded-3xl p-6 border border-border/70 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary font-mono text-xs font-bold">2</span>
                  <h2 className="font-semibold text-sm text-foreground">Select Diagnostic Tests</h2>
                </div>
                <span className="text-xs font-mono text-primary font-medium">
                  {selectedTestIds.length} test(s) selected
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[360px] overflow-y-auto pr-1">
                {catalog.map((test) => {
                  const isSelected = selectedTestIds.includes(test.id);
                  return (
                    <div
                      key={test.id}
                      onClick={() => toggleTest(test.id)}
                      className={`cursor-pointer rounded-2xl border p-3.5 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border/60 bg-background/50 hover:border-border hover:bg-accent/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase">
                            {test.code} · {test.department}
                          </span>
                          <h3 className="text-xs font-semibold text-foreground mt-0.5">{test.name}</h3>
                        </div>
                        <span className="font-mono text-xs font-bold text-foreground">₹{test.price}</span>
                      </div>

                      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                        <span className="rounded bg-background/80 px-1.5 py-0.5 border border-border/60">
                          {test.tubeType.split(" ")[0]} Tube
                        </span>
                        <span className="rounded bg-background/80 px-1.5 py-0.5 border border-border/60">
                          SLA: {test.tatMinutes}m
                        </span>
                        {test.fastingRequired && (
                          <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-amber-500 font-medium">
                            Fasting {test.fastingHours}h
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Col: Order Summary & Requisition Preview */}
          <div className="space-y-6">
            <div className="glass-card rounded-3xl p-6 border border-border/70 space-y-5 sticky top-24">
              <h2 className="font-mono text-sm font-semibold text-foreground flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" /> Requisition Summary
              </h2>

              {/* Priority Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground">Triage Priority</label>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {(["routine", "urgent", "stat"] as OrderPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPriority(p)}
                      className={`cursor-pointer rounded-xl border py-2 text-xs font-semibold uppercase transition-all ${
                        priority === p
                          ? p === "stat"
                            ? "border-red-500 bg-red-500 text-white shadow-md shadow-red-500/30"
                            : p === "urgent"
                            ? "border-amber-500 bg-amber-500 text-white shadow-md shadow-amber-500/30"
                            : "border-primary bg-primary text-primary-foreground shadow-md shadow-primary/30"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:bg-accent/40"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specimen Grouping Breakdown */}
              <div className="rounded-2xl border border-border/60 bg-accent/20 p-4 space-y-2.5">
                <h3 className="text-xs font-mono font-medium text-muted-foreground uppercase flex items-center justify-between">
                  <span>Required Tubes ({tubeSummary.length})</span>
                  <TestTube2 className="size-3.5 text-primary" />
                </h3>
                {tubeSummary.map(([tube, tests]) => (
                  <div key={tube} className="border-t border-border/40 pt-2 text-xs">
                    <p className="font-semibold text-foreground">{tube}</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{tests.join(", ")}</p>
                  </div>
                ))}
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Tests Selected ({selectedTests.length})</span>
                  <span>₹{totalAmount}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Max SLA Target</span>
                  <span className="font-mono">{priority === "stat" ? "30 min" : `${maxTat} min`}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2 text-sm font-bold text-foreground">
                  <span>Total Amount</span>
                  <span className="font-mono text-primary text-base">₹{totalAmount}</span>
                </div>
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full cursor-pointer bg-primary text-primary-foreground font-semibold shadow-lg shadow-primary/25"
              >
                <QrCode className="mr-1.5 size-4" /> Generate Order & Barcodes
              </Button>
            </div>
          </div>
        </form>
      )}
    </motion.div>
  );
}
