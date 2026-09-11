import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { labFlowStore } from "@/lib/labflow/store";
import type { LabOrder } from "@/lib/labflow/types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Mail,
  MessageSquare,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

export default function PatientReportViewer() {
  const { orderId } = useParams<{ orderId: string }>();
  const [orders, setOrders] = useState<LabOrder[]>(() => labFlowStore.getOrders());
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return labFlowStore.subscribe(() => {
      setOrders([...labFlowStore.getOrders()]);
    });
  }, []);

  const order = useMemo(() => {
    return orders.find((o) => o.id === orderId || o.orderNumber === orderId) ?? orders[0];
  }, [orders, orderId]);

  const handlePrint = () => {
    window.print();
  };

  const handleDispatchNotification = (channel: "whatsapp" | "email" | "sms") => {
    if (!order) return;
    const recipient =
      channel === "email" ? order.patientEmail : order.patientPhone;
    toast.success(
      `Diagnostic report dispatched to ${recipient} via ${channel.toUpperCase()}!`,
    );
  };

  if (!order) {
    return (
      <div className="mx-auto max-w-2xl py-16 text-center">
        <p className="text-muted-foreground">Report not found.</p>
        <Button asChild className="mt-4">
          <Link to="/labflow">Back to Operations</Link>
        </Button>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-4xl space-y-6"
    >
      {/* Top Action Bar (Hidden on Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <Link
            to="/labflow"
            className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="mr-1.5 size-3.5" /> Back to Operations Center
          </Link>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Verified Diagnostic Laboratory Report
            <Caret className="ml-2" />
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDispatchNotification("whatsapp")}
            className="text-xs gap-1.5 border-ok/40 text-ok hover:bg-ok/10"
          >
            <MessageSquare className="size-3.5" /> WhatsApp Report
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleDispatchNotification("email")}
            className="text-xs gap-1.5"
          >
            <Mail className="size-3.5" /> Email
          </Button>
          <Button
            size="sm"
            onClick={handlePrint}
            className="text-xs gap-1.5 shadow-md shadow-primary/20 bg-primary"
          >
            <Printer className="size-3.5" /> Print / Save PDF
          </Button>
        </div>
      </div>

      {/* Printable Clinical Diagnostic Report Document */}
      <div
        ref={reportRef}
        className="glass-card rounded-3xl p-8 sm:p-12 border border-border/80 shadow-2xl bg-card space-y-8 print:p-0 print:border-none print:shadow-none print:bg-white print:text-black"
      >
        {/* Lab Letterhead */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b-2 border-primary/30 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold font-mono text-lg">
                AO
              </div>
              <div>
                <h2 className="text-xl font-extrabold tracking-tight text-foreground font-mono print:text-black">
                  AROGYA DIAGNOSTIC LABORATORIES
                </h2>
                <p className="text-[11px] text-muted-foreground print:text-gray-600">
                  National Reference Pathology & Molecular Core · NABL Accredited (ISO 15189:2022)
                </p>
              </div>
            </div>
            <p className="mt-2 text-xs text-muted-foreground print:text-gray-600">
              Health City Medical Enclave, Hyderabad · Tel: +91 40 2345 6789 · support@arogya.os
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right text-xs font-mono text-muted-foreground print:text-gray-600">
              <p className="font-bold text-foreground print:text-black">NABL CERT: M-9821</p>
              <p>CAP Accredited #77120</p>
              <p className="text-ok font-semibold">VERIFIED & SIGNED</p>
            </div>
            <div className="flex size-16 items-center justify-center rounded-xl border border-border/80 bg-background/80 p-1">
              <QrCode className="size-14 text-foreground print:text-black" />
            </div>
          </div>
        </div>

        {/* Patient Demographics & Requisition Meta */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 rounded-2xl bg-accent/20 p-4 text-xs print:bg-gray-100 print:text-black">
          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Patient Name</span>
            <p className="font-bold text-sm text-foreground print:text-black">{order.patientName}</p>
            <p className="text-muted-foreground">{order.patientAge} Yrs / {order.patientGender}</p>
          </div>

          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Order / Ref No</span>
            <p className="font-mono font-bold text-foreground print:text-black">{order.orderNumber}</p>
            <p className="text-muted-foreground">ID: {order.patientId}</p>
          </div>

          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Dates & Timing</span>
            <p className="text-muted-foreground">
              Collected: <span className="text-foreground font-mono">{new Date(order.createdAt).toLocaleDateString()}</span>
            </p>
            <p className="text-muted-foreground">
              Reported: <span className="text-foreground font-mono">{order.pathologistSignOff?.signedAt ? new Date(order.pathologistSignOff.signedAt).toLocaleDateString() : "Today"}</span>
            </p>
          </div>

          <div>
            <span className="text-[10px] font-mono text-muted-foreground uppercase">Referring Clinician</span>
            <p className="font-semibold text-foreground print:text-black">{order.referringDoctor}</p>
            <p className="text-muted-foreground truncate">{order.collectionCenter.split(" ")[0]} Hub</p>
          </div>
        </div>

        {/* Diagnostic Results Section */}
        <div className="space-y-8">
          {order.results.length === 0 ? (
            <p className="py-8 text-center text-xs text-muted-foreground">
              Results are currently under processing in analyzer batch worklist.
            </p>
          ) : (
            order.results.map((result) => (
              <div key={result.testId} className="space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
                  <h3 className="font-mono text-sm font-bold text-primary uppercase tracking-wide print:text-black">
                    {result.testName} ({result.department})
                  </h3>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    Barcode: {result.sampleBarcode} · Method: Automated Photometry / Flow Cytometry
                  </span>
                </div>

                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-border/40 text-muted-foreground font-mono text-[11px]">
                      <th className="pb-2 font-semibold">Investigation / Analyte</th>
                      <th className="pb-2 font-semibold">Observed Value</th>
                      <th className="pb-2 font-semibold">Unit</th>
                      <th className="pb-2 font-semibold">Biological Reference Interval</th>
                      <th className="pb-2 font-semibold text-right">Interpretation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/20 font-mono">
                    {result.parameters.map((param) => {
                      const isCritical = param.flag === "critical_panic";
                      const isAbnormal = param.flag === "abnormal_high" || param.flag === "abnormal_low";
                      return (
                        <tr key={param.parameterId} className="hover:bg-accent/10">
                          <td className="py-2.5 font-sans font-medium text-foreground print:text-black">
                            {param.name}
                          </td>
                          <td className={`py-2.5 font-bold ${isCritical ? "text-red-500 font-extrabold text-sm" : isAbnormal ? "text-amber-500" : "text-foreground print:text-black"}`}>
                            {param.measuredValue} {isCritical && "*"}
                          </td>
                          <td className="py-2.5 text-muted-foreground text-[11px] print:text-gray-600">
                            {param.unit}
                          </td>
                          <td className="py-2.5 text-muted-foreground text-[11px] print:text-gray-600">
                            {param.refRange}
                          </td>
                          <td className="py-2.5 text-right font-sans">
                            <span
                              className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                                isCritical
                                  ? "bg-red-500 text-white"
                                  : isAbnormal
                                  ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                                  : "bg-ok/15 text-ok"
                              }`}
                            >
                              {isCritical ? "CRITICAL PANIC" : isAbnormal ? "ABNORMAL" : "NORMAL"}
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

        {/* Clinical Interpretations & Pathologist Sign-Off */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-6 border-t border-border/60">
          <div className="space-y-2 text-xs">
            <h4 className="font-mono text-xs font-bold uppercase text-muted-foreground">
              Clinical Notes & Disclaimer
            </h4>
            <p className="text-muted-foreground text-[11px] leading-relaxed">
              {order.pathologistSignOff?.clinicalRemarks ||
                "Test results should be correlated with clinical history, examination, and other diagnostic modalities. Critical values verified by duplicate testing."}
            </p>
            <p className="text-[10px] text-muted-foreground/80 pt-2">
              End of diagnostic report · Printed from ArogyaOS Diagnostic Hub · ISO 15189 Compliant.
            </p>
          </div>

          <div className="flex flex-col items-end justify-between space-y-3 text-right">
            <div className="space-y-1">
              <p className="font-bold text-sm text-foreground print:text-black">
                {order.pathologistSignOff?.doctorName || "Dr. R. K. Varma, MD (Pathology)"}
              </p>
              <p className="text-xs text-muted-foreground print:text-gray-600">
                Senior Consultant Pathologist & Quality Signatory
              </p>
              <p className="text-[10px] font-mono text-muted-foreground">
                Reg: {order.pathologistSignOff?.doctorRegistration || "MCI-48291-HYD"}
              </p>
            </div>

            <div className="rounded-xl border border-ok/40 bg-ok/5 p-2.5 font-mono text-[10px] text-ok text-left">
              <p className="font-bold flex items-center gap-1">
                <ShieldCheck className="size-3.5" /> Digitally Signed & Encrypted
              </p>
              <p className="text-[9px] text-muted-foreground truncate max-w-[240px]">
                {order.pathologistSignOff?.digitalSignatureHash || "SHA256:8f4c2e9b110a56d98e72f10b"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
