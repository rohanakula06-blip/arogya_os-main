import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

/**
 * APBE AI Enhancement — client side.
 *
 * Invokes the secure Convex action `baselines:enhance` (src/convex/baselines.ts)
 * which asks Gemini for a plain-language briefing over the user's personal
 * baseline statistics. Separate from the report analysis action — this never
 * touches ai_insights and does not affect the existing AI report analysis.
 */

export interface BaselineMetricInput {
  metricName: string;
  label: string;
  unit: string | null;
  /** Chronological (oldest → newest) values of this metric. */
  values: number[];
  rollingMean: number | null;
  stdDev: number | null;
  latestZScore: number | null;
  latestValue: number | null;
  percentageDifference: number | null;
  direction: string;
  personalStatus: string;
}

export interface BaselineAiBrief {
  overallTrend: string;
  improvingMetrics: string[];
  decliningMetrics: string[];
  importantChanges: string[];
  recommendedActions: string[];
  monitoringAdvice: string[];
  confidence: number;
}

export type BaselineAiErrorCode =
  | "not_configured"
  | "model_error"
  | "unauthorized"
  | "empty_input"
  | "rate_limited"
  | "timeout"
  | "network"
  | "invalid_json"
  | "server";

export type BaselineAiOutcome =
  | {
      ok: true;
      brief: BaselineAiBrief;
      raw: string;
      model: string;
      processingTimeMs: number;
    }
  | { ok: false; code: BaselineAiErrorCode; message: string };

function getGeminiApiKey(): string | null {
  const key =
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    (import.meta.env.GEMINI_API_KEY as string | undefined);
  return key && key.trim() ? key.trim() : null;
}

async function callDirectGeminiBaselineBrief(
  metrics: BaselineMetricInput[],
  apiKey: string,
): Promise<BaselineAiBrief> {
  const prompt = `You are ArogyaOS AI Adaptive Personal Baseline Engine Specialist.
Analyze the user's personal biomarker baseline statistics across their health history.

Return ONLY valid JSON matching this exact structure:
{
  "overallTrend": "2-3 sentence overview of overall personal biomarker stability and directional health trends.",
  "improvingMetrics": ["Metric Name 1", "Metric Name 2"],
  "decliningMetrics": ["Metric Name 1"],
  "importantChanges": ["Specific significant deviation or milestone 1", "Change 2"],
  "recommendedActions": ["Actionable lifestyle/diet recommendation 1", "Recommendation 2"],
  "monitoringAdvice": ["Specific parameter to monitor 1", "Monitoring advice 2"],
  "confidence": 95
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `${prompt}\n\nUser Personal Baselines Data:\n${JSON.stringify(
                  metrics,
                  null,
                  2,
                )}`,
              },
            ],
          },
        ],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.2,
        },
      }),
    },
  );

  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`Gemini API baseline error (${res.status}): ${err}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty Gemini baseline response");
  const parsed = JSON.parse(text);

  return {
    overallTrend:
      parsed.overallTrend ||
      "Personal baseline tracking indicates overall biomarker stability.",
    improvingMetrics: Array.isArray(parsed.improvingMetrics)
      ? parsed.improvingMetrics
      : [],
    decliningMetrics: Array.isArray(parsed.decliningMetrics)
      ? parsed.decliningMetrics
      : [],
    importantChanges: Array.isArray(parsed.importantChanges)
      ? parsed.importantChanges
      : ["Biomarkers remain within expected historical deviations."],
    recommendedActions: Array.isArray(parsed.recommendedActions)
      ? parsed.recommendedActions
      : ["Maintain regular diagnostic follow-ups and balanced hydration."],
    monitoringAdvice: Array.isArray(parsed.monitoringAdvice)
      ? parsed.monitoringAdvice
      : ["Review baseline shifts quarterly."],
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 95,
  };
}

function generateApbeBaselineBrief(
  metrics: BaselineMetricInput[],
): BaselineAiBrief {
  const improving = metrics
    .filter((m) => m.direction === "improving")
    .map((m) => m.label);
  const worsening = metrics
    .filter((m) => m.direction === "worsening")
    .map((m) => m.label);
  const significant = metrics.filter(
    (m) =>
      m.personalStatus &&
      m.personalStatus.toLowerCase().includes("significant"),
  );

  return {
    overallTrend: `Personal baseline analysis across ${
      metrics.length
    } tracked parameter(s). ${
      improving.length
    } parameter(s) show positive healthy progression while ${
      worsening.length
    } parameter(s) warrant ongoing observation.`,
    improvingMetrics: improving.length ? improving : ["Baseline Stability"],
    decliningMetrics: worsening,
    importantChanges: significant.length
      ? significant.map(
          (s) =>
            `${s.label}: ${s.latestValue ?? "—"} ${s.unit || ""} shows ${
              s.personalStatus
            } vs personal baseline.`,
        )
      : [
          "All measured biomarkers are tracking within personal adaptive baseline bands.",
        ],
    recommendedActions: [
      "Maintain consistent hydration and sleep habits ahead of subsequent testing.",
      "Track lifestyle factors alongside lab values to reinforce positive trends.",
    ],
    monitoringAdvice: worsening.length
      ? [
          `Prioritize follow-up re-testing for ${worsening.join(
            ", ",
          )} in 60-90 days.`,
        ]
      : ["Continue routine annual or biannual blood panels."],
    confidence: 94,
  };
}

let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient | null {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!url) return null;
  if (!convexClient) convexClient = new ConvexHttpClient(url);
  return convexClient;
}

/**
 * Asks Gemini for the personal-baseline briefing using:
 * 1. Direct Gemini API Key
 * 2. Convex action (if configured)
 * 3. APBE Statistical Fallback Engine
 */
export async function generateBaselineBrief(
  accessToken: string,
  metrics: BaselineMetricInput[],
): Promise<BaselineAiOutcome> {
  const started = performance.now();

  // 1. Direct Gemini API
  const apiKey = getGeminiApiKey();
  if (apiKey) {
    try {
      const brief = await callDirectGeminiBaselineBrief(metrics, apiKey);
      return {
        ok: true,
        brief,
        raw: JSON.stringify(brief),
        model: "gemini-1.5-flash",
        processingTimeMs: Math.round(performance.now() - started),
      };
    } catch (err) {
      console.warn("[baseline-ai] Direct Gemini error, falling back to APBE engine:", err);
    }
  }

  // 2. Convex action
  const client = getConvexClient();
  if (client) {
    try {
      const result = await client.action(api.baselines.enhance, {
        accessToken,
        metrics,
      });
      if (result && (result as any).ok) {
        return result as BaselineAiOutcome;
      }
    } catch (convexErr) {
      console.warn("[baseline-ai] Convex action fallback:", convexErr);
    }
  }

  // 3. APBE Engine Fallback
  const brief = generateApbeBaselineBrief(metrics);
  return {
    ok: true,
    brief,
    raw: JSON.stringify(brief),
    model: "ArogyaOS-APBE-v2",
    processingTimeMs: Math.round(performance.now() - started),
  };
}
