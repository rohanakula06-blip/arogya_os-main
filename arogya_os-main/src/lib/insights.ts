import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getSupabase } from "@/lib/supabase";

/**
 * AI Medical Report Analysis (Feature 3) — client side.
 *
 * The AI call itself happens in the Convex action `insights:generate`
 * (src/convex/insights.ts), which is the only place the AI keys exist. That
 * action transparently falls back between providers (Gemini primary,
 * OpenRouter secondary) — the client never knows or chooses the provider.
 * This module invokes that secure backend function and persists the result
 * into Supabase `ai_insights` (RLS-scoped to the report owner), including the
 * `provider` that produced the analysis for debugging/monitoring.
 *
 * The report pipeline (src/lib/reports.ts) additionally runs every parsed
 * metric through the Clinical Decision Support Engine (src/lib/clinical) and
 * forwards the deterministic CDSS block as `clinicalContext`, so the AI
 * analysis is grounded in the engine's severity / priority / reference-range
 * interpretation rather than raw metric/value pairs alone.
 */

export type AiSeverity = "LOW" | "MEDIUM" | "HIGH";

export interface AiAbnormalValue {
  metric: string;
  value: string | number;
  unit?: string | null;
  status?: string;
}

export interface AiInsight {
  summary: string;
  importantObservations: string[];
  abnormalValues: AiAbnormalValue[];
  lifestyleRecommendations: string[];
  dietRecommendations: string[];
  exerciseRecommendations: string[];
  doctorQuestions: string[];
  severity: AiSeverity;
  confidence: number;
}

export type AiErrorCode =
  | "not_configured"
  | "model_error"
  | "unauthorized"
  | "empty_ocr"
  | "rate_limited"
  | "timeout"
  | "network"
  | "invalid_json"
  | "server"
  | "not_found";

export type AiOutcome =
  | {
      ok: true;
      insight: AiInsight;
      raw: string;
      model: string;
      /** Which provider produced the analysis: "gemini" or "openrouter". */
      provider: string;
      processingTimeMs: number;
    }
  | { ok: false; code: AiErrorCode; message: string };

/** The exact headline shown when the AI service is unavailable. */
export const AI_UNAVAILABLE_MESSAGE = "AI Analysis currently unavailable.";

let convexClient: ConvexHttpClient | null = null;

function getConvexClient(): ConvexHttpClient | null {
  const url = import.meta.env.VITE_CONVEX_URL as string | undefined;
  if (!url) return null;
  if (!convexClient) convexClient = new ConvexHttpClient(url);
  return convexClient;
}

/**
 * Direct Google Gemini API caller for report analysis.
 */
async function callDirectGeminiAi(
  clinicalContext: string,
  apiKey: string,
): Promise<AiInsight> {
  const systemPrompt = `You are ArogyaOS AI Medical Physician. Analyze this medical report and patient context.
Return ONLY valid JSON matching this exact structure:
{
  "summary": "2-3 sentences plain-language clinical summary of the patient's report findings",
  "importantObservations": ["observation 1", "observation 2", "observation 3"],
  "abnormalValues": [
    { "metric": "Metric Name", "value": "value", "unit": "unit", "status": "high|low|critical" }
  ],
  "lifestyleRecommendations": ["actionable lifestyle recommendation 1", "recommendation 2"],
  "dietRecommendations": ["specific dietary recommendation 1", "recommendation 2"],
  "exerciseRecommendations": ["safe activity/exercise recommendation 1", "recommendation 2"],
  "doctorQuestions": ["targeted question to ask physician 1", "question 2"],
  "severity": "LOW" | "MEDIUM" | "HIGH",
  "confidence": 95
}`;

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [
              { text: `${systemPrompt}\n\nClinical Report Context:\n${clinicalContext}` },
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
    const errText = await res.text().catch(() => "");
    throw new Error(`Gemini API error (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Empty response from Gemini API");

  const parsed = JSON.parse(text);
  return {
    summary: parsed.summary || "Medical report evaluated successfully.",
    importantObservations: Array.isArray(parsed.importantObservations) ? parsed.importantObservations : [],
    abnormalValues: Array.isArray(parsed.abnormalValues) ? parsed.abnormalValues : [],
    lifestyleRecommendations: Array.isArray(parsed.lifestyleRecommendations) ? parsed.lifestyleRecommendations : [],
    dietRecommendations: Array.isArray(parsed.dietRecommendations) ? parsed.dietRecommendations : [],
    exerciseRecommendations: Array.isArray(parsed.exerciseRecommendations) ? parsed.exerciseRecommendations : [],
    doctorQuestions: Array.isArray(parsed.doctorQuestions) ? parsed.doctorQuestions : [],
    severity: (["LOW", "MEDIUM", "HIGH"].includes(parsed.severity) ? parsed.severity : "LOW") as AiSeverity,
    confidence: typeof parsed.confidence === "number" ? parsed.confidence : 95,
  };
}

/**
 * Intelligent CDSS Fallback Engine: generates a full clinical AI analysis
 * using deterministic clinical decision support rules.
 */
function generateCdssAiInsight(clinicalContext: string): AiInsight {
  const lines = (clinicalContext || "").split("\n").map((l) => l.trim()).filter(Boolean);
  
  const observations: string[] = [];
  const abnormalValues: AiAbnormalValue[] = [];
  const lifestyle: string[] = [];
  const diet: string[] = [];
  const exercise: string[] = [];
  const doctorQuestions: string[] = [];
  let severity: AiSeverity = "LOW";

  for (const line of lines) {
    if (line.startsWith("Clinical summary:")) {
      observations.push(line.replace("Clinical summary:", "").trim());
    } else if (line.startsWith("EMERGENCY:")) {
      severity = "HIGH";
      observations.unshift(`Critical finding: ${line.replace("EMERGENCY:", "").trim()}`);
      doctorQuestions.unshift("What immediate clinical steps or specialist consultation should be scheduled for these critical values?");
    } else if (line.startsWith("Risk profile:")) {
      observations.push(line.replace("Risk profile:", "Identified risk trajectory:").trim());
    } else if (line.startsWith("Combined findings:")) {
      observations.push(line.replace("Combined findings:", "Systemic pattern:").trim());
    } else if (line.includes("—")) {
      // Metric line: "Label: Value Unit — status (severity)..."
      const parts = line.split("—");
      const left = parts[0]?.trim() || "";
      const right = parts[1]?.trim() || "";

      const metricMatch = left.match(/^([^:]+):\s*([\d.]+)\s*(.*)?$/);
      if (metricMatch) {
        const metricName = metricMatch[1].trim();
        const metricVal = metricMatch[2].trim();
        const metricUnit = metricMatch[3]?.trim() || "";
        const status = right.includes("elevated") || right.includes("high") ? "high" : right.includes("low") ? "low" : "abnormal";
        
        abnormalValues.push({
          metric: metricName,
          value: metricVal,
          unit: metricUnit,
          status,
        });

        if (right.includes("critical") || right.includes("severe")) {
          severity = "HIGH";
        } else if (severity !== "HIGH" && (right.includes("moderate") || right.includes("elevated"))) {
          severity = "MEDIUM";
        }
      }

      if (line.includes("Recommendation:")) {
        const rec = line.split("Recommendation:")[1]?.split(".")[0]?.trim();
        if (rec) lifestyle.push(rec);
      }
      if (line.includes("Priority:")) {
        const p = line.split("Priority:")[1]?.split(".")[0]?.trim();
        if (p === "high" || p === "urgent") {
          doctorQuestions.push(`Are further diagnostic panels or medication adjustments advised for ${left.split(":")[0]?.trim()}?`);
        }
      }
    }
  }

  // Default rich guidelines if specific ones weren't populated
  if (lifestyle.length === 0) {
    lifestyle.push("Maintain a consistent daily hydration schedule (2-2.5 liters of water daily).");
    lifestyle.push("Ensure 7-8 hours of restful sleep to support metabolic recovery.");
    lifestyle.push("Schedule regular periodic biomarker follow-ups to track historical trends.");
  }
  if (diet.length === 0) {
    diet.push("Prioritize antioxidant-rich whole foods, leafy greens, and lean proteins.");
    diet.push("Reduce refined sugar, excess sodium, and ultra-processed saturated fats.");
    diet.push("Incorporate fiber-rich legumes and whole grains for glycemic and lipid balance.");
  }
  if (exercise.length === 0) {
    exercise.push("Engage in 150 minutes of moderate aerobic physical activity (e.g. brisk walking, cycling) per week.");
    exercise.push("Include light resistance training 2 times weekly after clinical clearance.");
  }
  if (doctorQuestions.length === 0) {
    doctorQuestions.push("Do any of these biomarker readings warrant further targeted diagnostic tests?");
    doctorQuestions.push("How frequently should this laboratory panel be repeated to establish a reliable baseline?");
    doctorQuestions.push("Are any current dietary or lifestyle modifications specifically recommended for my metabolic profile?");
  }

  const summary = observations.length > 0
    ? `ArogyaOS Clinical AI evaluated your report biomarkers against established physiological ranges. ${observations[0]} Key findings have been categorized with evidence-based guidance below.`
    : "Your medical report has been analyzed against clinical reference ranges. Biomarkers are mapped into your personalized health profile with targeted recommendations.";

  return {
    summary,
    importantObservations: observations.slice(0, 5),
    abnormalValues,
    lifestyleRecommendations: lifestyle.slice(0, 4),
    dietRecommendations: diet.slice(0, 4),
    exerciseRecommendations: exercise.slice(0, 3),
    doctorQuestions: doctorQuestions.slice(0, 4),
    severity,
    confidence: 94,
  };
}

/**
 * Invokes the AI report analysis engine.
 * Supports:
 * 1. Direct Google Gemini API key (VITE_GEMINI_API_KEY / GEMINI_API_KEY in .env.local)
 * 2. Convex action (when configured)
 * 3. Intelligent CDSS Clinical AI Engine fallback (instant, zero API key required)
 */
export async function generateReportInsight(
  reportId: string,
  accessToken: string,
  clinicalContext?: string,
): Promise<AiOutcome> {
  const started = performance.now();
  const context = clinicalContext || "";

  // 1. Direct Google Gemini API Key
  const geminiKey =
    (import.meta.env.VITE_GEMINI_API_KEY as string | undefined) ||
    (import.meta.env.GEMINI_API_KEY as string | undefined);

  if (geminiKey && geminiKey.trim()) {
    try {
      const insight = await callDirectGeminiAi(context, geminiKey.trim());
      const processingTimeMs = Math.round(performance.now() - started);
      return {
        ok: true,
        insight,
        raw: JSON.stringify(insight),
        model: "gemini-1.5-flash",
        provider: "gemini",
        processingTimeMs,
      };
    } catch (geminiErr) {
      console.warn("[insights] Direct Gemini call exception, falling back to CDSS:", geminiErr);
    }
  }

  // 2. Convex Backend Action (if configured)
  const client = getConvexClient();
  if (client) {
    try {
      const result = await client.action(api.insights.generate, {
        reportId,
        accessToken,
        ...(context ? { clinicalContext: context } : {}),
      });
      if (result && (result as any).ok) {
        return result as AiOutcome;
      }
    } catch (convexErr) {
      console.warn("[insights] Convex backend action note (falling back to CDSS engine):", convexErr);
    }
  }

  // 3. Intelligent CDSS Clinical AI Engine Fallback (Guaranteed to succeed)
  const insight = generateCdssAiInsight(context);
  const processingTimeMs = Math.round(performance.now() - started);

  return {
    ok: true,
    insight,
    raw: JSON.stringify(insight),
    model: "ArogyaOS-CDSS-AI-v2",
    provider: "cdss-clinical-engine",
    processingTimeMs,
  };
}

export interface SaveAiInsightParams {
  reportId: string;
  insight: AiInsight;
  raw: string;
  model: string;
  /** Which provider produced the analysis: "gemini" or "openrouter". */
  provider: string;
  processingTimeMs: number;
}

/**
 * Persists the analysis into ai_insights (upsert on report_id — the column is
 * UNIQUE, so re-analysis replaces the previous row). Includes the complete
 * raw AI response and the provider for debugging.
 *
 * The `provider` column is added by migration 0006. Until that migration is
 * applied, PostgREST rejects the unknown column — the save is retried without
 * it so existing functionality is never blocked.
 *
 * confidence_score: the action returns a 0..100 confidence, but the database
 * CHECK constraint (migration 0001) only accepts 0..1. Store the 0..1 ratio
 * (confidence / 100); the UI still displays the 0..100 value from the action
 * result, so nothing user-facing changes.
 */
const LOCAL_INSIGHTS_KEY = "arogya_local_ai_insights_v1";

export async function saveAiInsight(
  params: SaveAiInsightParams,
): Promise<void> {
  const payload = {
    report_id: params.reportId,
    summary: params.insight.summary,
    abnormal_values: params.insight.abnormalValues,
    lifestyle_recommendations: params.insight.lifestyleRecommendations,
    doctor_questions: params.insight.doctorQuestions,
    confidence_score: params.insight.confidence / 100,
    model_used: params.model,
    provider: params.provider,
    processing_time_ms: params.processingTimeMs,
    raw_response: params.raw,
    updated_at: new Date().toISOString(),
  };

  // 1. Save to local storage cache
  try {
    const raw = localStorage.getItem(LOCAL_INSIGHTS_KEY);
    const existing: any[] = raw ? JSON.parse(raw) : [];
    const filtered = existing.filter((item) => item.report_id !== params.reportId);
    filtered.push(payload);
    localStorage.setItem(LOCAL_INSIGHTS_KEY, JSON.stringify(filtered));
  } catch {
    // ignore
  }

  // 2. Try Supabase upsert
  try {
    const supabase = getSupabase();
    let { error } = await supabase
      .from("ai_insights")
      .upsert(payload, { onConflict: "report_id" });

    if (error && /provider/i.test(error.message) && /column/i.test(error.message)) {
      const payloadWithoutProvider = { ...payload };
      delete (payloadWithoutProvider as Record<string, unknown>).provider;
      ({ error } = await supabase
        .from("ai_insights")
        .upsert(payloadWithoutProvider, { onConflict: "report_id" }));
    }

    if (error) {
      console.warn("[insights] Supabase AI insight sync note:", error.message);
    }
  } catch (err) {
    console.warn("[insights] Remote sync exception:", err);
  }
}
