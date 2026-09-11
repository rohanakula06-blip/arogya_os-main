import {
  computeBaseline,
  personalStatusForDb,
} from "@/lib/baselines";
import { getSupabase } from "@/lib/supabase";
import {
  fetchMetricsForUser,
  type TimelineMetric,
} from "@/lib/timeline";

/**
 * Adaptive Personal Baseline Engine — data layer.
 *
 * Persists each metric's personal baseline into the existing `personal_baselines`
 * table (migration 0001) via UPSERT on (user_id, metric_name). Only the columns
 * that exist in that table are written — the full statistics set (median, min,
 * max, variance, percentage difference, sample count, …) is computed
 * deterministically from `health_metrics` by the pure engine in baselines.ts.
 *
 * RLS note: every read/write runs through the signed-in user's Supabase
 * session; personal_baselines has own-row policies (migration 0001), so
 * nothing here bypasses or weakens RLS.
 */

/** A personal_baselines row as the app models it (camelCase). */
export interface PersonalBaselineRow {
  id: string;
  userId: string;
  metricName: string;
  rollingMean: number | null;
  rollingStd: number | null;
  exponentialAverage: number | null;
  latestZScore: number | null;
  personalStatus: "normal" | "low" | "elevated" | "critical";
  updatedAt: string;
}

/**
 * Throws the well-known marker when the underlying tables are missing (the
 * migrations have not been applied), matching the convention used elsewhere.
 */
function throwIfSchemaMissing(error: { message?: string }): void {
  if (error?.message && /relation .* does not exist|PGRST205/i.test(error.message)) {
    throw new Error("SCHEMA_NOT_APPLIED");
  }
}

const LOCAL_BASELINES_KEY = "arogya_local_personal_baselines_v1";

/** Lists the signed-in user's personal baselines with automatic dynamic computation */
export async function fetchPersonalBaselines(
  userId: string,
): Promise<PersonalBaselineRow[]> {
  const metrics = await fetchMetricsForUser(userId);
  const grouped = groupMetricsByMetricName(metrics);

  const computedMap = new Map<string, PersonalBaselineRow>();

  // 1. Compute baselines directly from all metrics
  for (const [metricName, history] of grouped) {
    if (history.length === 0) continue;
    const stats = computeBaseline(
      history.map((m) => ({
        reportId: m.reportId,
        reportDate: m.reportDate,
        metricName: m.metricName,
        metricValue: m.metricValue,
        metricUnit: m.metricUnit,
        populationMin: m.populationMin,
        populationMax: m.populationMax,
        measurementDate: m.measurementDate,
      })),
      history[0].metricName,
      history[0].metricUnit,
    );

    computedMap.set(metricName, {
      id: `baseline_${metricName}`,
      userId,
      metricName: stats.metricName,
      rollingMean: stats.rollingMean,
      rollingStd: stats.stdDev,
      exponentialAverage: stats.ema,
      latestZScore: stats.latestZScore,
      personalStatus: personalStatusForDb(stats.personalClass),
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. Try Supabase personal_baselines
  try {
    const { data, error } = await getSupabase()
      .from("personal_baselines")
      .select(
        "id, user_id, metric_name, rolling_mean, rolling_std, exponential_average, latest_z_score, personal_status, updated_at",
      )
      .eq("user_id", userId);

    if (!error && data) {
      for (const row of data) {
        computedMap.set(row.metric_name, {
          id: row.id,
          userId: row.user_id,
          metricName: row.metric_name,
          rollingMean: row.rolling_mean,
          rollingStd: row.rolling_std,
          exponentialAverage: row.exponential_average,
          latestZScore: row.latest_z_score,
          personalStatus: row.personal_status,
          updatedAt: row.updated_at,
        });
      }
    }
  } catch {
    // fallback to computed
  }

  return Array.from(computedMap.values());
}

/** Compares report dates ascending with nulls last (mirrors timeline.ts). */
function compareReportDate(a: string | null, b: string | null): number {
  if (a === null && b === null) return 0;
  if (a === null) return 1;
  if (b === null) return -1;
  return a.localeCompare(b);
}

/**
 * Groups every metric reading by metric name, chronologically ordered.
 */
export function groupMetricsByMetricName(
  metrics: TimelineMetric[],
): Map<string, TimelineMetric[]> {
  const grouped = new Map<string, TimelineMetric[]>();
  const sorted = [...metrics].sort(
    (a, b) =>
      compareReportDate(a.reportDate, b.reportDate) ||
      a.createdAt.localeCompare(b.createdAt),
  );
  for (const metric of sorted) {
    const list = grouped.get(metric.metricName) ?? [];
    list.push(metric);
    grouped.set(metric.metricName, list);
  }
  return grouped;
}

/**
 * Upserts one baseline row with local and remote persistence.
 */
export async function upsertPersonalBaseline(
  userId: string,
  history: TimelineMetric[],
): Promise<void> {
  if (history.length === 0) return;
  const stats = computeBaseline(
    history.map((m) => ({
      reportId: m.reportId,
      reportDate: m.reportDate,
      metricName: m.metricName,
      metricValue: m.metricValue,
      metricUnit: m.metricUnit,
      populationMin: m.populationMin,
      populationMax: m.populationMax,
      measurementDate: m.measurementDate,
    })),
    history[0].metricName,
    history[0].metricUnit,
  );

  const payload = {
    user_id: userId,
    metric_name: stats.metricName,
    rolling_mean: stats.rollingMean,
    rolling_std: stats.stdDev,
    exponential_average: stats.ema,
    latest_z_score: stats.latestZScore,
    personal_status: personalStatusForDb(stats.personalClass),
  };

  // Local persistence
  try {
    const raw = localStorage.getItem(LOCAL_BASELINES_KEY);
    const existing: any[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((b) => b.metric_name !== stats.metricName);
    filtered.push({ ...payload, id: `base_${stats.metricName}`, updated_at: new Date().toISOString() });
    localStorage.setItem(LOCAL_BASELINES_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  // Supabase upsert
  try {
    await getSupabase()
      .from("personal_baselines")
      .upsert(payload, {
        onConflict: "user_id,metric_name",
      });
  } catch (err) {
    console.warn("[baselines] Remote sync note:", err);
  }
}

export interface RecomputeResult {
  /** Number of baselines upserted. */
  updated: number;
  /** Metric names that had no readings (skipped). */
  empty: string[];
}

/**
 * Recomputes every personal baseline for the user from the existing
 * `health_metrics` data and UPSERTs each row.
 */
export async function recomputePersonalBaselines(
  userId: string,
): Promise<RecomputeResult> {
  const metrics = await fetchMetricsForUser(userId);
  const grouped = groupMetricsByMetricName(metrics);

  let updated = 0;
  const empty: string[] = [];
  for (const [metricName, history] of grouped) {
    if (history.length === 0) {
      empty.push(metricName);
      continue;
    }
    await upsertPersonalBaseline(userId, history);
    updated += 1;
  }
  return { updated, empty };
}
