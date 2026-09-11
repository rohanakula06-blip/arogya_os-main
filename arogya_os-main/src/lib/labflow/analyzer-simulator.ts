import { DIAGNOSTIC_TEST_CATALOG } from "./catalog";
import type { ParameterResult, ResultFlag, TestCatalogItem, TestCatalogParameter } from "./types";

function evaluateFlag(
  val: number,
  refLow?: number,
  refHigh?: number,
  criticalLow?: number,
  criticalHigh?: number,
): ResultFlag {
  if (criticalHigh !== undefined && val >= criticalHigh) return "critical_panic";
  if (criticalLow !== undefined && val <= criticalLow) return "critical_panic";
  if (refHigh !== undefined && val > refHigh) return "abnormal_high";
  if (refLow !== undefined && val < refLow) return "abnormal_low";
  return "normal";
}

export interface AnalyzerDevice {
  id: string;
  name: string;
  model: string;
  department: string;
  supportedTests: string[];
  status: "ready" | "running" | "calibration_needed" | "offline";
  serialNumber: string;
  throughputPerHour: number;
}

export const ANALYZER_FLEET: AnalyzerDevice[] = [
  {
    id: "SYS-XN-1000",
    name: "Sysmex XN-1000",
    model: "Fluorescence Flow Cytometry Hematology Analyzer",
    department: "Hematology",
    supportedTests: ["test-cbc"],
    status: "ready",
    serialNumber: "SN-SYS-99420-IN",
    throughputPerHour: 100,
  },
  {
    id: "ROCHE-COBAS-6000",
    name: "Roche Cobas 6000 (c501 Module)",
    model: "Automated Clinical Chemistry Analyzer",
    department: "Biochemistry",
    supportedTests: ["test-lft", "test-kft", "test-lipid"],
    status: "ready",
    serialNumber: "SN-ROCHE-7721-DE",
    throughputPerHour: 600,
  },
  {
    id: "BECKMAN-ACCESS-2",
    name: "Beckman Coulter Access 2",
    model: "Chemiluminescent Immunoassay System",
    department: "Immunology",
    supportedTests: ["test-thyroid", "test-cardiac-trop"],
    status: "ready",
    serialNumber: "SN-BECK-4401-US",
    throughputPerHour: 100,
  },
  {
    id: "BIORAD-D10",
    name: "Bio-Rad D-10 Hemoglobin Analyzer",
    model: "Automated High-Performance Liquid Chromatography (HPLC)",
    department: "Biochemistry",
    supportedTests: ["test-hba1c"],
    status: "ready",
    serialNumber: "SN-BIORAD-1102-FR",
    throughputPerHour: 50,
  },
];

export function simulateAnalyzerMeasurement(
  testId: string,
  simulateAbnormal: boolean = false,
  simulateCritical: boolean = false,
): { parameters: ParameterResult[]; analyzer: AnalyzerDevice } {
  const catalogTest = DIAGNOSTIC_TEST_CATALOG.find((t: TestCatalogItem) => t.id === testId);
  if (!catalogTest) {
    throw new Error(`Test ID ${testId} not found in catalog.`);
  }

  const analyzer =
    ANALYZER_FLEET.find((a) => a.supportedTests.includes(testId)) ??
    ANALYZER_FLEET[0];

  const parameters: ParameterResult[] = catalogTest.parameters.map((param: TestCatalogParameter) => {
    let val: number;
    const refLow = param.refLow ?? 10;
    const refHigh = param.refHigh ?? 100;
    const mid = (refLow + refHigh) / 2;
    const spread = (refHigh - refLow) * 0.4;

    if (simulateCritical && param.criticalHigh) {
      val = param.criticalHigh * 1.25;
    } else if (simulateCritical && param.criticalLow) {
      val = param.criticalLow * 0.75;
    } else if (simulateAbnormal) {
      val = refHigh + spread * 0.8;
    } else {
      val = mid + (Math.random() - 0.5) * spread;
    }

    const roundedVal =
      param.decimalPlaces > 0
        ? Math.round(val * Math.pow(10, param.decimalPlaces)) /
          Math.pow(10, param.decimalPlaces)
        : Math.round(val);

    const flag = evaluateFlag(
      roundedVal,
      param.refLow,
      param.refHigh,
      param.criticalLow,
      param.criticalHigh,
    );

    const refRangeStr =
      param.textReference ||
      (param.refLow !== undefined && param.refHigh !== undefined
        ? `${param.refLow} - ${param.refHigh}`
        : param.refHigh !== undefined
        ? `< ${param.refHigh}`
        : param.refLow !== undefined
        ? `> ${param.refLow}`
        : "—");

    // Optional simulated baseline comparison for delta checks
    const prevVal =
      param.refLow !== undefined
        ? Math.round((mid + (Math.random() - 0.5) * spread * 0.5) * 10) / 10
        : undefined;

    let deltaPercent: number | undefined;
    let deltaFlag: ParameterResult["deltaFlag"];

    if (prevVal !== undefined && prevVal > 0) {
      deltaPercent = Math.round(((roundedVal - prevVal) / prevVal) * 1000) / 10;
      const absDelta = Math.abs(deltaPercent);
      if (absDelta > 50) deltaFlag = "acute_shift";
      else if (absDelta > 20) deltaFlag = "significant_change";
      else deltaFlag = "stable";
    }

    return {
      parameterId: param.id,
      name: param.name,
      measuredValue: roundedVal,
      unit: param.unit,
      refRange: refRangeStr,
      flag,
      previousValue: prevVal,
      previousDate: prevVal ? "2026-05-18" : undefined,
      deltaPercent,
      deltaFlag,
      analyzerId: analyzer.id,
    };
  });

  return { parameters, analyzer };
}
