import { Caret } from "@/components/landing/terminal-window";
import { Button } from "@/components/ui/button";
import { DIAGNOSTIC_TEST_CATALOG, DEFAULT_COLLECTION_CENTERS } from "@/lib/labflow/catalog";
import type { Department } from "@/lib/labflow/types";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Building2,
  FileSpreadsheet,
  MapPin,
  Phone,
  Plus,
  Search,
  User,
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "react-router";

const DEPARTMENTS: (Department | "All")[] = [
  "All",
  "Biochemistry",
  "Hematology",
  "Immunology",
  "Microbiology",
];

export default function DiagnosticCatalog() {
  const [selectedDept, setSelectedDept] = useState<Department | "All">("All");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"catalog" | "centers">("catalog");

  const filteredTests = useMemo(() => {
    return DIAGNOSTIC_TEST_CATALOG.filter((t) => {
      const matchDept = selectedDept === "All" || t.department === selectedDept;
      const matchSearch =
        search === "" ||
        t.name.toLowerCase().includes(search.toLowerCase()) ||
        t.code.toLowerCase().includes(search.toLowerCase()) ||
        t.clinicalSignificance.toLowerCase().includes(search.toLowerCase());
      return matchDept && matchSearch;
    });
  }, [selectedDept, search]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="mx-auto max-w-6xl space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            to="/labflow"
            className="inline-flex items-center text-xs font-mono text-muted-foreground hover:text-foreground transition-colors mb-2"
          >
            <ArrowLeft className="mr-1.5 size-3.5" /> Back to Operations Center
          </Link>
          <h1 className="font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Diagnostic Test Catalog & Centers Directory
            <Caret className="ml-2" />
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Standardized laboratory test master catalog, specimen collection guidelines & outreach phlebotomy network.
          </p>
        </div>

        <Button asChild className="gap-1.5 text-xs shadow-md shadow-primary/20">
          <Link to="/labflow/orders/new">
            <Plus className="size-4" /> Book Test Requisition
          </Link>
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("catalog")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "catalog"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-accent/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <FileSpreadsheet className="mr-1.5 inline size-4" /> Test Catalog ({DIAGNOSTIC_TEST_CATALOG.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("centers")}
          className={`cursor-pointer rounded-xl px-4 py-2 text-xs font-semibold transition-all ${
            activeTab === "centers"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "bg-accent/30 text-muted-foreground hover:text-foreground"
          }`}
        >
          <Building2 className="mr-1.5 inline size-4" /> Collection Centers ({DEFAULT_COLLECTION_CENTERS.length})
        </button>
      </div>

      {activeTab === "catalog" ? (
        <div className="space-y-5">
          {/* Filter & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap gap-1.5">
              {DEPARTMENTS.map((dept) => (
                <button
                  key={dept}
                  type="button"
                  onClick={() => setSelectedDept(dept)}
                  className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-medium transition-all ${
                    selectedDept === dept
                      ? "bg-primary/20 text-primary border border-primary/40 font-bold"
                      : "bg-background/60 text-muted-foreground hover:bg-accent/40 border border-border/60"
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search test name, code, clinical role..."
                className="w-full rounded-xl border border-border/60 bg-background/60 py-2 pl-9 pr-4 text-xs text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
              />
            </div>
          </div>

          {/* Test Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTests.map((test) => (
              <div
                key={test.id}
                className="glass-card rounded-3xl p-6 border border-border/70 hover:border-primary/40 transition-all space-y-4"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-primary uppercase">
                      {test.code} · {test.department}
                    </span>
                    <h3 className="font-bold text-sm text-foreground mt-0.5">{test.name}</h3>
                  </div>
                  <span className="font-mono font-bold text-base text-foreground">₹{test.price}</span>
                </div>

                <p className="text-xs text-muted-foreground leading-relaxed">
                  {test.clinicalSignificance}
                </p>

                <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t border-border/40 pt-3">
                  <div className="text-muted-foreground">
                    <span>Specimen / Tube:</span>
                    <p className="font-semibold text-foreground font-sans text-xs">{test.tubeType}</p>
                  </div>
                  <div className="text-muted-foreground">
                    <span>Target TAT SLA:</span>
                    <p className="font-semibold text-foreground font-sans text-xs">{test.tatMinutes} Minutes</p>
                  </div>
                </div>

                {/* Parameters preview */}
                <div className="rounded-xl bg-accent/20 p-3 space-y-1 text-xs">
                  <p className="font-mono text-[10px] font-semibold text-muted-foreground uppercase">
                    Analyte Parameters Included ({test.parameters.length}):
                  </p>
                  <p className="text-[11px] text-foreground">
                    {test.parameters.map((p) => p.name).join(", ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        /* Collection Centers Grid */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {DEFAULT_COLLECTION_CENTERS.map((center) => (
            <div
              key={center.id}
              className="glass-card rounded-3xl p-6 border border-border/70 space-y-4"
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="font-mono text-[10px] font-bold text-primary uppercase">
                    {center.code}
                  </span>
                  <h3 className="font-bold text-base text-foreground mt-0.5">{center.name}</h3>
                </div>
                <span className="rounded-full bg-ok/15 px-2.5 py-0.5 text-xs font-mono text-ok font-semibold">
                  Active Hub
                </span>
              </div>

              <div className="space-y-2 text-xs text-muted-foreground">
                <p className="flex items-center gap-2 text-foreground">
                  <MapPin className="size-4 text-sky-500 shrink-0" />
                  <span>{center.address}, {center.city}</span>
                </p>
                <p className="flex items-center gap-2">
                  <Phone className="size-4 text-primary shrink-0" />
                  <span className="font-mono">{center.contactNumber}</span>
                </p>
                <p className="flex items-center gap-2">
                  <User className="size-4 text-purple-500 shrink-0" />
                  <span>In-Charge: {center.inCharge}</span>
                </p>
              </div>

              <div className="border-t border-border/40 pt-3 flex items-center justify-between text-xs font-mono">
                <span className="text-muted-foreground">Active Samples Logged:</span>
                <span className="font-bold text-foreground text-sm">{center.activeSamplesCount}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}
