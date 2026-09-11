import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { labFlowStore } from "@/lib/labflow/store";
import type { LabOrder } from "@/lib/labflow/types";
import { motion } from "framer-motion";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Microscope,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShieldAlert,
  Stethoscope,
  TestTube2,
  Truck,
  Zap,
} from "lucide-react";
import { ClinicalStatusPill } from "@/components/ui/clinical-status-pill";
import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router";

export default function LabFlowDashboard() {
  const [orders, setOrders] = useState<LabOrder[]>(() => labFlowStore.getOrders());
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const navigate = useNavigate();

  useEffect(() => {
    return labFlowStore.subscribe(() => {
      setOrders([...labFlowStore.getOrders()]);
    });
  }, []);

  const totalSamples = useMemo(
    () => orders.reduce((sum, o) => sum + o.samples.length, 0),
    [orders],
  );

  const pendingCollection = useMemo(
    () =>
      orders.reduce(
        (sum, o) => sum + o.samples.filter((s) => s.status === "ordered").length,
        0,
      ),
    [orders],
  );

  const inProcessing = useMemo(
    () =>
      orders.reduce(
        (sum, o) =>
          sum +
          o.samples.filter((s) =>
            ["in_transit", "received_at_lab", "processing"].includes(s.status),
          ).length,
        0,
      ),
    [orders],
  );

  const pendingReview = useMemo(
    () => orders.filter((o) => o.status === "under_review").length,
    [orders],
  );

  const criticalCount = useMemo(
    () => orders.filter((o) => o.criticalAlert && o.status !== "approved_ready").length,
    [orders],
  );

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchSearch =
        search === "" ||
        o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
        o.patientName.toLowerCase().includes(search.toLowerCase()) ||
        o.samples.some((s) => s.barcode.toLowerCase().includes(search.toLowerCase())) ||
        o.collectionCenter.toLowerCase().includes(search.toLowerCase());

      const matchStatus =
        selectedStatus === "all" ||
        (selectedStatus === "critical" && o.criticalAlert) ||
        (selectedStatus === "stat" && o.priority === "stat") ||
        o.status === selectedStatus;

      return matchSearch && matchStatus;
    });
  }, [orders, search, selectedStatus]);

  const statQueue = useMemo(
    () => orders.filter((o) => o.priority === "stat" && o.status !== "approved_ready"),
    [orders],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-6xl space-y-8"
    >
      {/* Top Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[12px] text-muted-foreground">
            <span className="text-primary">$</span> labflow diagnostic operations · v2.6.4
          </p>
          <h1 className="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Lab Operations Center
            <Caret className="ml-2" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Real-time diagnostic sample tracking, automated analyzer integration & result verification.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => labFlowStore.resetToDefaults()}
            className="cursor-pointer gap-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" /> Reset Demo Data
          </Button>
          <Button
            asChild
            size="sm"
            className="cursor-pointer gap-1.5 shadow-md shadow-primary/20"
          >
            <Link to="/labflow/orders/new">
              <Plus className="size-4" /> New Test Order
            </Link>
          </Button>
        </div>
      </div>

      {/* Critical Panic Alert Banner (if any) */}
      {criticalCount > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex items-center justify-between rounded-2xl border border-crit/40 bg-crit/10 p-4 text-crit shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-xl bg-crit/20 text-crit animate-pulse">
              <ShieldAlert className="size-5" />
            </span>
            <div>
              <h4 className="font-medium text-sm">
                {criticalCount} Critical Panic Value Alert(s) Detected
              </h4>
              <p className="text-xs text-muted-foreground">
                Immediate clinical review and notification required for patient safety.
              </p>
            </div>
          </div>
          <Button
            variant="destructive"
            size="sm"
            onClick={() => setSelectedStatus("critical")}
            className="cursor-pointer text-xs"
          >
            Review Panic Queue
          </Button>
        </motion.div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Total Samples</span>
            <TestTube2 className="size-4 text-primary" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-foreground">{totalSamples}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{orders.length} active requisitions</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Phlebotomy Pending</span>
            <Clock className="size-4 text-amber-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-amber-500">{pendingCollection}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Awaiting collection</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">In Transit / Processing</span>
            <Activity className="size-4 text-sky-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-sky-500">{inProcessing}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Analyzers & logistics active</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Pathologist Review</span>
            <Stethoscope className="size-4 text-purple-500" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-purple-500">{pendingReview}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">Pending verification</p>
        </div>

        <div className="glass-card rounded-2xl p-4 border border-border/70">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-medium">Avg Turnaround Time</span>
            <Zap className="size-4 text-ok" />
          </div>
          <p className="mt-2 font-mono text-2xl font-bold text-ok">48 <span className="text-xs font-normal">min</span></p>
          <p className="mt-1 text-[11px] text-muted-foreground">96.4% on-time SLA</p>
        </div>
      </div>

      {/* Quick Access Workstations Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          to="/labflow/orders/new"
          className="group glass-card flex flex-col justify-between rounded-2xl p-5 transition-all hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5"
        >
          <div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary transition-transform group-hover:scale-110">
              <Plus className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold text-foreground">Order Requisition</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Book patient tests, auto-group sample tubes & generate barcode labels.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-medium text-primary group-hover:underline">
            Book Test <ArrowRight className="ml-1 size-3.5" />
          </span>
        </Link>

        <Link
          to="/labflow/tracking"
          className="group glass-card flex flex-col justify-between rounded-2xl p-5 transition-all hover:border-sky-500/50 hover:shadow-lg hover:shadow-sky-500/5"
        >
          <div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500 transition-transform group-hover:scale-110">
              <Truck className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold text-foreground">Sample Tracking & CoC</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Chain-of-custody tracking, cold-chain temperature logs & rejection control.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-medium text-sky-500 group-hover:underline">
            Track Specimen <ArrowRight className="ml-1 size-3.5" />
          </span>
        </Link>

        <Link
          to="/labflow/worklist"
          className="group glass-card flex flex-col justify-between rounded-2xl p-5 transition-all hover:border-amber-500/50 hover:shadow-lg hover:shadow-amber-500/5"
        >
          <div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 transition-transform group-hover:scale-110">
              <Microscope className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold text-foreground">Technician Worklist</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Batch processing, automated analyzer feeds & real-time Delta checks.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-medium text-amber-500 group-hover:underline">
            Open Worklist <ArrowRight className="ml-1 size-3.5" />
          </span>
        </Link>

        <Link
          to="/labflow/review"
          className="group glass-card flex flex-col justify-between rounded-2xl p-5 transition-all hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5"
        >
          <div>
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 transition-transform group-hover:scale-110">
              <FileCheck className="size-5" />
            </span>
            <h3 className="mt-4 font-semibold text-foreground">Pathologist Review</h3>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              Medical verification, digital sign-off & critical value notifications.
            </p>
          </div>
          <span className="mt-4 inline-flex items-center text-xs font-medium text-purple-500 group-hover:underline">
            Review Queue <ArrowRight className="ml-1 size-3.5" />
          </span>
        </Link>
      </div>

      {/* Emergency STAT Queue (if any) */}
      {statQueue.length > 0 && (
        <div className="glass-card rounded-2xl p-5 border border-red-500/30 bg-red-500/5">
          <div className="flex items-center gap-2 text-red-500 font-semibold text-sm">
            <Zap className="size-4 animate-bounce" />
            <span>Emergency STAT Priority Orders ({statQueue.length})</span>
          </div>
          <div className="mt-3 space-y-2">
            {statQueue.map((ord) => (
              <div
                key={ord.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-red-500/20 bg-background/80 p-3"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-red-500">{ord.orderNumber}</span>
                    <span className="text-xs font-medium text-foreground">{ord.patientName} ({ord.patientAge}y, {ord.patientGender})</span>
                    <span className="rounded bg-red-500/10 px-1.5 py-0.5 font-mono text-[10px] font-bold text-red-500 uppercase">
                      STAT SLA: {ord.tatTargetMinutes}m
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Tests: {ord.tests.map((t) => t.testName).join(", ")} · Ref: {ord.referringDoctor}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate(`/labflow/worklist?orderId=${ord.id}`)}
                    className="text-xs"
                  >
                    Enter Results
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/labflow/review?orderId=${ord.id}`)}
                    className="text-xs bg-red-600 hover:bg-red-700 text-white"
                  >
                    Review Now
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Order Registry & Sample Directory */}
      <div className="glass-card rounded-3xl p-6 shadow-sm border border-border/70">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-mono text-lg font-semibold text-foreground">Diagnostic Orders Registry</h2>
            <p className="text-xs text-muted-foreground">Active test orders across all collection centers and departments.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search patient, order #, barcode..."
                className="w-full rounded-xl border border-border/60 bg-background/60 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs text-foreground focus:border-primary focus:outline-none"
            >
              <option value="all">All Statuses</option>
              <option value="order_placed">Order Placed</option>
              <option value="samples_collected">Samples Collected</option>
              <option value="in_analysis">In Analysis</option>
              <option value="under_review">Under Review</option>
              <option value="approved_ready">Approved & Ready</option>
              <option value="critical">Critical Panic Alerts</option>
              <option value="stat">STAT Orders</option>
            </select>
          </div>
        </div>

        {/* Orders Table */}
        <div className="mt-5 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-border/60 text-muted-foreground">
                <th className="pb-3 font-medium">Order ID</th>
                <th className="pb-3 font-medium">Patient Details</th>
                <th className="pb-3 font-medium">Tests Requested</th>
                <th className="pb-3 font-medium">Specimens & Barcodes</th>
                <th className="pb-3 font-medium">Center</th>
                <th className="pb-3 font-medium">Status</th>
                <th className="pb-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40 font-mono">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-muted-foreground font-sans">
                    No diagnostic orders match the current filter.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const isReady = order.status === "approved_ready";
                  return (
                    <tr key={order.id} className="hover:bg-accent/30 transition-colors">
                      <td className="py-3.5 pr-3">
                        <span className="font-bold text-primary">{order.orderNumber}</span>
                        {order.priority === "stat" && (
                          <span className="ml-1.5 rounded bg-red-500/15 px-1 py-0.5 text-[9px] font-bold text-red-500">
                            STAT
                          </span>
                        )}
                        {order.criticalAlert && (
                          <span className="ml-1 rounded bg-amber-500/15 px-1 py-0.5 text-[9px] font-bold text-amber-500">
                            CRIT
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 pr-3 font-sans">
                        <p className="font-medium text-foreground">{order.patientName}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {order.patientAge}y · {order.patientGender} · {order.patientPhone}
                        </p>
                      </td>
                      <td className="py-3.5 pr-3 font-sans max-w-[200px] truncate">
                        <span className="text-foreground">
                          {order.tests.map((t) => t.testName).join(", ")}
                        </span>
                      </td>
                      <td className="py-3.5 pr-3">
                        <div className="flex flex-wrap gap-1">
                          {order.samples.map((s) => (
                            <span
                              key={s.id}
                              className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${
                                s.status === "rejected"
                                  ? "bg-red-500/15 text-red-500"
                                  : s.status === "completed"
                                  ? "bg-ok/15 text-ok"
                                  : "bg-primary/10 text-primary"
                              }`}
                            >
                              {s.barcode}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 pr-3 font-sans text-muted-foreground text-[11px] max-w-[140px] truncate">
                        {order.collectionCenter.split(" ")[0]} Hub
                      </td>
                      <td className="py-3.5 pr-3 font-sans">
                        <ClinicalStatusPill status={order.status} />
                      </td>
                      <td className="py-3.5 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            asChild
                            className="h-7 px-2 text-xs"
                          >
                            <Link to={`/labflow/tracking?orderId=${order.id}`}>
                              Track
                            </Link>
                          </Button>
                          {isReady ? (
                            <Button
                              size="sm"
                              asChild
                              className="h-7 px-2.5 text-xs bg-ok hover:bg-ok/90 text-white"
                            >
                              <Link to={`/labflow/report/${order.id}`}>
                                <FileText className="mr-1 size-3" /> View Report
                              </Link>
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              asChild
                              className="h-7 px-2.5 text-xs"
                            >
                              <Link to={`/labflow/worklist?orderId=${order.id}`}>
                                Process
                              </Link>
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Secondary Navigation & Diagnostics Tools */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          to="/labflow/catalog"
          className="glass-card flex items-center justify-between rounded-2xl p-4 border border-border/70 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <FileSpreadsheet className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Diagnostic Test Catalog</p>
              <p className="text-xs text-muted-foreground">Specimen types, SLAs & reference values</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>

        <Link
          to="/labflow/analytics"
          className="glass-card flex items-center justify-between rounded-2xl p-4 border border-border/70 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-sky-500/10 text-sky-500">
              <BarChart3 className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Turnaround & Quality Control</p>
              <p className="text-xs text-muted-foreground">SLA analytics & Levey-Jennings QC charts</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>

        <Link
          to="/labflow/tracking"
          className="glass-card flex items-center justify-between rounded-2xl p-4 border border-border/70 hover:border-primary/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500">
              <Package className="size-4" />
            </div>
            <div>
              <p className="font-semibold text-sm text-foreground">Sample Inwarding & Barcode</p>
              <p className="text-xs text-muted-foreground">Scan barcodes and verify cold-chain</p>
            </div>
          </div>
          <ArrowRight className="size-4 text-muted-foreground" />
        </Link>
      </div>
    </motion.div>
  );
}
