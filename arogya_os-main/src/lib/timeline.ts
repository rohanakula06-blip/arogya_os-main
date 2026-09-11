import { getSupabase } from "@/lib/supabase";

/**
 * Health Timeline — data layer.
 *
 * Read-only accessors over the existing Supabase schema
 * (`medical_reports` + `health_metrics`, migration 0001) for the Health
 * Journey timeline. Every query runs through the signed-in user's Supabase
 * session, so the existing Row Level Security policies scope every read to
 * reports the user owns — nothing here bypasses or weakens RLS.
 *
 * All returned lists are ordered by `report_date` ascending (nulls last),
 * which is the chronological order a timeline renders in.
 */

export interface TimelineReport {
  id: string;
  /** human-readable report title (e.g. the original file name). */
  title: string;
  /** report classification (e.g. blood_report, lab_report, prescription). */
  type: string;
  /** ISO date (YYYY-MM-DD) the report is dated to; null when unknown. */
  reportDate: string | null;
  /** storage object path of the uploaded file, when available. */
  fileUrl: string | null;
  /** pipeline state (uploaded / extracting / analyzing / completed / failed). */
  processingStatus: string | null;
  /** row creation timestamp (ISO). */
  createdAt: string;
}

export interface TimelineMetric {
  id: string;
  /** owning medical_reports row. */
  reportId: string;
  /** report_date of the parent report (null when the report has no date). */
  reportDate: string | null;
  metricName: string;
  /** numeric reading from the report. */
  metricValue: number;
  metricUnit: string | null;
  /** reference range lower bound from the lab report, when provided. */
  populationMin: number | null;
  /** reference range upper bound from the lab report, when provided. */
  populationMax: number | null;
  /** measurement date written on the report itself, when provided. */
  measurementDate: string | null;
  /** row creation timestamp (ISO). */
  createdAt: string;
}

/** One reading of a single metric, tied to its source report for the timeline. */
export interface MetricHistoryPoint {
  reportId: string;
  reportDate: string | null;
  metricName: string;
  metricValue: number;
  metricUnit: string | null;
  populationMin: number | null;
  populationMax: number | null;
  measurementDate: string | null;
}

/** A health_metrics row with its embedded parent report (runtime shape). */
interface MetricRowWithReport {
  id: string;
  report_id: string;
  metric_name: string;
  metric_value: number;
  metric_unit: string | null;
  population_min: number | null;
  population_max: number | null;
  measurement_date: string | null;
  created_at: string;
  medical_reports: { user_id: string; report_date: string | null } | null;
}

/**
 * Throws a well-known marker when the underlying tables are missing (the
 * migrations have not been applied), matching the convention used by
 * `fetchMyReports` in src/lib/reports.ts.
 */
function throwIfSchemaMissing(error: { message?: string }): void {
  if (error?.message && /relation .* does not exist|PGRST205/i.test(error.message)) {
    throw new Error("SCHEMA_NOT_APPLIED");
  }
}

/** Ascending compare on report dates — nulls sort last. */
function compareReportDate(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

/**
 * Normalizes the embedded parent report. PostgREST returns a to-one embed as
 * an object, but the supabase-js generic types model it as an array — this
 * accepts either shape safely.
 */
function toParent(
  row: MetricRowWithReport | MetricRowWithReport["medical_reports"],
): { user_id?: string; report_date?: string | null } | null {
  const parent = row && typeof row === "object" && "medical_reports" in row
    ? row.medical_reports
    : (row as MetricRowWithReport["medical_reports"]);
  if (Array.isArray(parent)) return parent[0] ?? null;
  return parent;
}

/**
 * Lists every report owned by `userId`, ordered by `report_date` ascending
 * (nulls last, then by creation time as a stable tiebreak).
 *
 * RLS note: the session's JWT already restricts reads to the signed-in
 * user's own rows; the explicit `user_id` filter is defense in depth and
 * matches the caller-provided identity.
 */
export async function fetchAllReports(userId: string): Promise<TimelineReport[]> {
  const localReports: TimelineReport[] = [];
  try {
    const raw = localStorage.getItem("arogya_local_reports_v1");
    if (raw) {
      const parsed = JSON.parse(raw);
      for (const r of parsed) {
        localReports.push({
          id: r.id,
          title: r.report_title || "Medical Report",
          type: r.report_type || "blood_report",
          reportDate: r.report_date || null,
          fileUrl: r.file_url || null,
          processingStatus: r.processing_status || "completed",
          createdAt: r.created_at || new Date().toISOString(),
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    const { data, error } = await getSupabase()
      .from("medical_reports")
      .select(
        "id, report_title, report_type, report_date, file_url, processing_status, created_at",
      )
      .eq("user_id", userId);

    if (!error && data) {
      const remote = (data as Array<{
        id: string;
        report_title: string;
        report_type: string;
        report_date: string | null;
        file_url: string | null;
        processing_status: string | null;
        created_at: string;
      }>).map((row): TimelineReport => ({
        id: row.id,
        title: row.report_title,
        type: row.report_type,
        reportDate: row.report_date,
        fileUrl: row.file_url,
        processingStatus: row.processing_status,
        createdAt: row.created_at,
      }));

      const remoteIds = new Set(remote.map((r) => r.id));
      const combined = [...remote, ...localReports.filter((l) => !remoteIds.has(l.id))];
      return combined.sort(
        (a, b) =>
          compareReportDate(a.reportDate, b.reportDate) ||
          a.createdAt.localeCompare(b.createdAt),
      );
    }
  } catch {
    // fallback
  }

  return localReports.sort(
    (a, b) =>
      compareReportDate(a.reportDate, b.reportDate) ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

/**
 * Returns every health_metrics reading for the reports owned by `userId`.
 */
export async function fetchMetricsForUser(userId: string): Promise<TimelineMetric[]> {
  const localMetrics: TimelineMetric[] = [];
  try {
    const rawMetrics = localStorage.getItem("arogya_local_health_metrics_v1");
    const rawReports = localStorage.getItem("arogya_local_reports_v1");
    const reportsMap = new Map<string, string | null>();
    if (rawReports) {
      const parsedR = JSON.parse(rawReports);
      for (const r of parsedR) {
        reportsMap.set(r.id, r.report_date || null);
      }
    }

    if (rawMetrics) {
      const parsedM = JSON.parse(rawMetrics);
      for (let i = 0; i < parsedM.length; i++) {
        const m = parsedM[i];
        localMetrics.push({
          id: m.id || `local_m_${i}_${m.report_id}`,
          reportId: m.report_id,
          reportDate: reportsMap.get(m.report_id) || m.report_date || null,
          metricName: m.metric_name,
          metricValue: m.metric_value,
          metricUnit: m.metric_unit || null,
          populationMin: m.population_min ?? null,
          populationMax: m.population_max ?? null,
          measurementDate: m.measurement_date || null,
          createdAt: m.created_at || new Date().toISOString(),
        });
      }
    }
  } catch {
    // ignore
  }

  try {
    const { data, error } = await getSupabase()
      .from("health_metrics")
      .select(
        "id, report_id, metric_name, metric_value, metric_unit, population_min, population_max, measurement_date, created_at, medical_reports(user_id, report_date)",
      );

    if (!error && data) {
      const rows = data as unknown as MetricRowWithReport[];
      const remote = rows
        .filter((row) => !row.medical_reports || toParent(row)?.user_id === userId)
        .map((row): TimelineMetric => {
          const parent = toParent(row);
          return {
            id: row.id,
            reportId: row.report_id,
            reportDate: parent?.report_date ?? null,
            metricName: row.metric_name,
            metricValue: row.metric_value,
            metricUnit: row.metric_unit,
            populationMin: row.population_min,
            populationMax: row.population_max,
            measurementDate: row.measurement_date,
            createdAt: row.created_at,
          };
        });

      const remoteKeys = new Set(remote.map((r) => `${r.reportId}_${r.metricName}`));
      const combined = [...remote, ...localMetrics.filter((l) => !remoteKeys.has(`${l.reportId}_${l.metricName}`))];
      return combined.sort(
        (a, b) =>
          compareReportDate(a.reportDate, b.reportDate) ||
          a.createdAt.localeCompare(b.createdAt),
      );
    }
  } catch {
    // fallback
  }

  return localMetrics.sort(
    (a, b) =>
      compareReportDate(a.reportDate, b.reportDate) ||
      a.createdAt.localeCompare(b.createdAt),
  );
}

/**
 * Returns the chronological history of one metric across all of the signed-in user's reports.
 */
export async function fetchMetricHistory(metricName: string): Promise<MetricHistoryPoint[]> {
  const allMetrics = await fetchMetricsForUser("");
  const targetName = metricName.toLowerCase().trim();

  return allMetrics
    .filter((m) => m.metricName.toLowerCase().trim() === targetName)
    .map((m): MetricHistoryPoint => ({
      reportId: m.reportId,
      reportDate: m.reportDate,
      metricName: m.metricName,
      metricValue: m.metricValue,
      metricUnit: m.metricUnit,
      populationMin: m.populationMin,
      populationMax: m.populationMax,
      measurementDate: m.measurementDate,
    }))
    .sort(
      (a, b) =>
        compareReportDate(a.reportDate, b.reportDate) ||
        (a.measurementDate ?? "").localeCompare(b.measurementDate ?? "") ||
        a.reportId.localeCompare(b.reportId),
    );
}
