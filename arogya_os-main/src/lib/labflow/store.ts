import { DIAGNOSTIC_TEST_CATALOG, DEFAULT_COLLECTION_CENTERS } from "./catalog";
import type {
  LabOrder,
  Sample,
  SampleStatus,
  OrderTestResult,
  ParameterResult,
  ResultFlag,
  OrderPriority,
  TubeType,
  QualityControlEntry,
} from "./types";

const STORAGE_KEY = "arogya_labflow_orders_v1";
const QC_STORAGE_KEY = "arogya_labflow_qc_v1";

function generateHash(data: string): string {
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return `0x${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

export function evaluateFlag(
  value: number,
  refLow?: number,
  refHigh?: number,
  criticalLow?: number,
  criticalHigh?: number,
): ResultFlag {
  if (criticalLow !== undefined && value <= criticalLow) return "critical_panic";
  if (criticalHigh !== undefined && value >= criticalHigh) return "critical_panic";
  if (refLow !== undefined && value < refLow) return "abnormal_low";
  if (refHigh !== undefined && value > refHigh) return "abnormal_high";
  return "normal";
}

const INITIAL_DEMO_ORDERS: LabOrder[] = [
  {
    id: "ord-1001",
    orderNumber: "LF-2026-0841",
    createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
    patientId: "pat-9901",
    patientName: "Dr. Rajesh Sharma",
    patientAge: 52,
    patientGender: "Male",
    patientPhone: "+91 98490 11223",
    patientEmail: "r.sharma@example.com",
    referringDoctor: "Dr. V. K. Rao, MD (Cardiology)",
    collectionCenter: "Arogya Main Hospital Lab & Diagnostic Core",
    priority: "stat",
    clinicalHistory: "Acute retrosternal chest discomfort, known hypertensive on Telmisartan.",
    tatTargetMinutes: 45,
    criticalAlert: true,
    criticalAlertNotes: "CRITICAL PANIC: Cardiac Troponin-I elevated (74.2 ng/L) — Urgent cardiology consult alerted.",
    totalAmount: 1550,
    paymentStatus: "paid",
    status: "under_review",
    tests: [
      { testId: "test-cardiac-trop", testName: "Cardiac Troponin-I High Sensitivity (STAT)", department: "Immunology", price: 1200 },
      { testId: "test-cbc", testName: "Complete Blood Count (CBC)", department: "Hematology", price: 350 },
    ],
    samples: [
      {
        id: "samp-1001-1",
        barcode: "SMP-2026-8812A",
        orderId: "ord-1001",
        specimenType: "Heparinized Plasma",
        tubeType: "Green (Sodium Heparin)",
        status: "processing",
        collectedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
        collectedBy: "Phleb. Anusha M.",
        collectionCenter: "Arogya Main Hospital Lab & Diagnostic Core",
        temperature: 4.1,
        custodyTrail: [
          {
            id: "coc-1",
            timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
            stage: "collected",
            location: "Arogya Main Hospital - Room 102",
            handlerName: "Anusha M.",
            handlerRole: "Senior Phlebotomist",
            notes: "Direct venipuncture left antecubital vein, tube inverted 8 times.",
            temperatureCelsius: 22.0,
            hashSignature: "0x89ab102f",
          },
          {
            id: "coc-2",
            timestamp: new Date(Date.now() - 3600000 * 2.8).toISOString(),
            stage: "received_at_lab",
            location: "Immunology Diagnostic Core",
            handlerName: "S. V. Ramana",
            handlerRole: "Accessioning Officer",
            notes: "Sample verified, cold chain intact (4.1°C), barcoded.",
            temperatureCelsius: 4.1,
            hashSignature: "0x44c9b811",
          },
          {
            id: "coc-3",
            timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
            stage: "processing",
            location: "Analyzer: Beckman Access 2 #IMM-02",
            handlerName: "K. Teja",
            handlerRole: "Biochemistry & Immunoassay Tech",
            notes: "Sample loaded into STAT carousel slot #04.",
            temperatureCelsius: 4.0,
            hashSignature: "0x77ef4231",
          },
        ],
      },
      {
        id: "samp-1001-2",
        barcode: "SMP-2026-8812B",
        orderId: "ord-1001",
        specimenType: "Whole Blood EDTA",
        tubeType: "Lavender (EDTA)",
        status: "completed",
        collectedAt: new Date(Date.now() - 3600000 * 3.5).toISOString(),
        collectedBy: "Phleb. Anusha M.",
        collectionCenter: "Arogya Main Hospital Lab & Diagnostic Core",
        temperature: 4.0,
        custodyTrail: [
          {
            id: "coc-4",
            timestamp: new Date(Date.now() - 3600000 * 3.5).toISOString(),
            stage: "collected",
            location: "Arogya Main Hospital - Room 102",
            handlerName: "Anusha M.",
            handlerRole: "Senior Phlebotomist",
            hashSignature: "0x33dd512a",
          },
          {
            id: "coc-5",
            timestamp: new Date(Date.now() - 3600000 * 2.0).toISOString(),
            stage: "received_at_lab",
            location: "Hematology Core",
            handlerName: "B. Lavanya",
            handlerRole: "Hematology Lead Tech",
            notes: "Processed on Sysmex XN-1000.",
            hashSignature: "0x11ff8890",
          },
        ],
      },
    ],
    results: [
      {
        testId: "test-cardiac-trop",
        testCode: "IMM-007",
        testName: "Cardiac Troponin-I High Sensitivity (STAT)",
        department: "Immunology",
        sampleBarcode: "SMP-2026-8812A",
        status: "reviewed",
        analyzerUsed: "Beckman Access 2 Immunoassay (#IMM-02)",
        technicianName: "K. Teja, B.Sc MLT",
        technicianNotes: "Rerun performed on second aliquot to verify critical result: confirmed 74.2 ng/L.",
        parameters: [
          {
            parameterId: "p-trop-i",
            name: "High Sensitivity Troponin-I",
            measuredValue: 74.2,
            unit: "ng/L",
            refRange: "0.0 - 14.0",
            flag: "critical_panic",
            previousValue: 6.4,
            previousDate: "2026-06-14",
            deltaPercent: 1059.3,
            deltaFlag: "acute_shift",
            analyzerId: "BECKMAN-IMM-02",
          },
        ],
      },
      {
        testId: "test-cbc",
        testCode: "HEM-001",
        testName: "Complete Blood Count (CBC)",
        department: "Hematology",
        sampleBarcode: "SMP-2026-8812B",
        status: "approved",
        analyzerUsed: "Sysmex XN-1000 (#HEM-01)",
        technicianName: "B. Lavanya, M.Sc MLT",
        parameters: [
          { parameterId: "p-hb", name: "Hemoglobin", measuredValue: 14.8, unit: "g/dL", refRange: "13.0 - 17.0", flag: "normal" },
          { parameterId: "p-rbc", name: "RBC Count", measuredValue: 5.12, unit: "mil/µL", refRange: "4.5 - 5.9", flag: "normal" },
          { parameterId: "p-wbc", name: "Total WBC Count", measuredValue: 12800, unit: "cells/µL", refRange: "4000 - 11000", flag: "abnormal_high" },
          { parameterId: "p-plt", name: "Platelet Count", measuredValue: 2.85, unit: "lakh/µL", refRange: "1.5 - 4.5", flag: "normal" },
          { parameterId: "p-pcv", name: "Hematocrit (PCV)", measuredValue: 44.2, unit: "%", refRange: "40.0 - 50.0", flag: "normal" },
        ],
      },
    ],
  },
  {
    id: "ord-1002",
    orderNumber: "LF-2026-0842",
    createdAt: new Date(Date.now() - 3600000 * 2.5).toISOString(),
    patientId: "pat-9902",
    patientName: "Meenakshi Sundaram",
    patientAge: 44,
    patientGender: "Female",
    patientPhone: "+91 97011 44556",
    patientEmail: "m.sundaram@example.com",
    referringDoctor: "Dr. Sunita Kapoor, MD (Endocrinologist)",
    collectionCenter: "HITEC City IT Corridor Collection Hub",
    priority: "routine",
    clinicalHistory: "Routine quarterly diabetic and metabolic checkup.",
    tatTargetMinutes: 90,
    criticalAlert: false,
    totalAmount: 1400,
    paymentStatus: "paid",
    status: "approved_ready",
    pathologistSignOff: {
      doctorName: "Dr. R. K. Varma, MD (Pathology)",
      doctorRegistration: "MCI-48291-HYD",
      signedAt: new Date(Date.now() - 3600000 * 0.5).toISOString(),
      digitalSignatureHash: "SHA256:8f4c2e9b110a56d98e72f10b",
      clinicalRemarks: "Elevated HbA1c indicative of sub-optimal 3-month glycemic control. Lipids show moderate hypertriglyceridemia.",
    },
    tests: [
      { testId: "test-hba1c", testName: "Glycated Hemoglobin (HbA1c)", department: "Biochemistry", price: 450 },
      { testId: "test-lipid", testName: "Lipid Profile Standard Screen", department: "Biochemistry", price: 600 },
      { testId: "test-cbc", testName: "Complete Blood Count (CBC)", department: "Hematology", price: 350 },
    ],
    samples: [
      {
        id: "samp-1002-1",
        barcode: "SMP-2026-9041A",
        orderId: "ord-1002",
        specimenType: "Whole Blood EDTA",
        tubeType: "Lavender (EDTA)",
        status: "completed",
        collectedAt: new Date(Date.now() - 3600000 * 2.2).toISOString(),
        collectedBy: "Phleb. K. Mohan",
        collectionCenter: "HITEC City IT Corridor Collection Hub",
        temperature: 4.2,
        custodyTrail: [
          {
            id: "coc-201",
            timestamp: new Date(Date.now() - 3600000 * 2.2).toISOString(),
            stage: "collected",
            location: "HITEC City Collection Hub",
            handlerName: "K. Mohan",
            handlerRole: "Collection Officer",
            hashSignature: "0xaa12891f",
          },
          {
            id: "coc-202",
            timestamp: new Date(Date.now() - 3600000 * 1.5).toISOString(),
            stage: "received_at_lab",
            location: "Central Processing Hub",
            handlerName: "G. Venkatesh",
            handlerRole: "Courier Logistics",
            temperatureCelsius: 4.2,
            hashSignature: "0xbb4411ee",
          },
        ],
      },
      {
        id: "samp-1002-2",
        barcode: "SMP-2026-9041B",
        orderId: "ord-1002",
        specimenType: "Serum SST",
        tubeType: "Gold / Red (SST / Serum)",
        status: "completed",
        collectedAt: new Date(Date.now() - 3600000 * 2.2).toISOString(),
        collectedBy: "Phleb. K. Mohan",
        collectionCenter: "HITEC City IT Corridor Collection Hub",
        temperature: 4.0,
        custodyTrail: [
          {
            id: "coc-203",
            timestamp: new Date(Date.now() - 3600000 * 2.2).toISOString(),
            stage: "collected",
            location: "HITEC City Collection Hub",
            handlerName: "K. Mohan",
            handlerRole: "Collection Officer",
            hashSignature: "0xcc992200",
          },
        ],
      },
    ],
    results: [
      {
        testId: "test-hba1c",
        testCode: "BIO-005",
        testName: "Glycated Hemoglobin (HbA1c)",
        department: "Biochemistry",
        sampleBarcode: "SMP-2026-9041A",
        status: "approved",
        analyzerUsed: "Bio-Rad D-10 HPLC Analyzer",
        technicianName: "N. Sandhya",
        parameters: [
          { parameterId: "p-hba1c", name: "HbA1c", measuredValue: 8.4, unit: "%", refRange: "4.0 - 5.6", flag: "abnormal_high", previousValue: 7.6, deltaPercent: 10.5, deltaFlag: "significant_change" },
          { parameterId: "p-eag", name: "Estimated Average Glucose (eAG)", measuredValue: 194, unit: "mg/dL", refRange: "70 - 115", flag: "abnormal_high" },
        ],
      },
      {
        testId: "test-lipid",
        testCode: "BIO-004",
        testName: "Lipid Profile Standard Screen",
        department: "Biochemistry",
        sampleBarcode: "SMP-2026-9041B",
        status: "approved",
        analyzerUsed: "Roche Cobas 6000 c501",
        technicianName: "N. Sandhya",
        parameters: [
          { parameterId: "p-tchol", name: "Total Cholesterol", measuredValue: 218, unit: "mg/dL", refRange: "125 - 200", flag: "abnormal_high" },
          { parameterId: "p-tg", name: "Triglycerides", measuredValue: 245, unit: "mg/dL", refRange: "50 - 150", flag: "abnormal_high" },
          { parameterId: "p-hdl", name: "HDL Good Cholesterol", measuredValue: 38, unit: "mg/dL", refRange: "40 - 60", flag: "abnormal_low" },
          { parameterId: "p-ldl", name: "LDL Bad Cholesterol", measuredValue: 131, unit: "mg/dL", refRange: "50 - 100", flag: "abnormal_high" },
        ],
      },
    ],
  },
  {
    id: "ord-1003",
    orderNumber: "LF-2026-0843",
    createdAt: new Date(Date.now() - 3600000 * 1.0).toISOString(),
    patientId: "pat-9903",
    patientName: "Vikram Malhotra",
    patientAge: 38,
    patientGender: "Male",
    patientPhone: "+91 99887 66554",
    patientEmail: "v.malhotra@example.com",
    referringDoctor: "Self / Wellness Executive",
    collectionCenter: "Banjara Hills Outreach Phlebotomy Center",
    priority: "urgent",
    clinicalHistory: "Pre-employment health screening & general fitness check.",
    tatTargetMinutes: 60,
    criticalAlert: false,
    totalAmount: 1400,
    paymentStatus: "paid",
    status: "in_analysis",
    tests: [
      { testId: "test-lft", testName: "Liver Function Test (LFT)", department: "Biochemistry", price: 750 },
      { testId: "test-kft", testName: "Renal Function Test (KFT)", department: "Biochemistry", price: 650 },
    ],
    samples: [
      {
        id: "samp-1003-1",
        barcode: "SMP-2026-9219A",
        orderId: "ord-1003",
        specimenType: "Serum SST",
        tubeType: "Gold / Red (SST / Serum)",
        status: "processing",
        collectedAt: new Date(Date.now() - 3600000 * 0.8).toISOString(),
        collectedBy: "Phleb. S. Priya",
        collectionCenter: "Banjara Hills Outreach Phlebotomy Center",
        temperature: 4.5,
        custodyTrail: [
          {
            id: "coc-301",
            timestamp: new Date(Date.now() - 3600000 * 0.8).toISOString(),
            stage: "collected",
            location: "Banjara Hills Center",
            handlerName: "S. Priya",
            handlerRole: "Phlebotomy Lead",
            hashSignature: "0x1234abcd",
          },
          {
            id: "coc-302",
            timestamp: new Date(Date.now() - 3600000 * 0.3).toISOString(),
            stage: "received_at_lab",
            location: "Central Biochemistry Department",
            handlerName: "K. Teja",
            handlerRole: "MLT",
            notes: "Loaded on Beckman AU5800 Analyzer.",
            hashSignature: "0x9876fedc",
          },
        ],
      },
    ],
    results: [],
  },
  {
    id: "ord-1004",
    orderNumber: "LF-2026-0844",
    createdAt: new Date(Date.now() - 3600000 * 5.0).toISOString(),
    patientId: "pat-9904",
    patientName: "Ananya Deshmukh",
    patientAge: 29,
    patientGender: "Female",
    patientPhone: "+91 91234 56789",
    patientEmail: "a.deshmukh@example.com",
    referringDoctor: "Dr. Anjali Mehta (Obstetrician & Gynaecologist)",
    collectionCenter: "Secunderabad Metro Diagnostics Point",
    priority: "routine",
    clinicalHistory: "First trimester antenatal profile check.",
    tatTargetMinutes: 90,
    criticalAlert: false,
    totalAmount: 1100,
    paymentStatus: "paid",
    status: "samples_collected",
    tests: [
      { testId: "test-thyroid", testName: "Thyroid Profile Total", department: "Immunology", price: 550 },
      { testId: "test-cbc", testName: "Complete Blood Count (CBC)", department: "Hematology", price: 350 },
      { testId: "test-urine-re", testName: "Urine Routine Examination", department: "Microbiology", price: 200 },
    ],
    samples: [
      {
        id: "samp-1004-1",
        barcode: "SMP-2026-9551A",
        orderId: "ord-1004",
        specimenType: "Serum SST",
        tubeType: "Gold / Red (SST / Serum)",
        status: "in_transit",
        collectedAt: new Date(Date.now() - 3600000 * 4.2).toISOString(),
        collectedBy: "Phleb. M. Anuradha",
        collectionCenter: "Secunderabad Metro Diagnostics Point",
        temperature: 4.8,
        custodyTrail: [
          {
            id: "coc-401",
            timestamp: new Date(Date.now() - 3600000 * 4.2).toISOString(),
            stage: "collected",
            location: "Secunderabad Metro Center",
            handlerName: "M. Anuradha",
            handlerRole: "Center In-Charge",
            hashSignature: "0xee44bb11",
          },
          {
            id: "coc-402",
            timestamp: new Date(Date.now() - 3600000 * 1.0).toISOString(),
            stage: "in_transit",
            location: "Logistics Van #04 - En route Central Lab",
            handlerName: "R. Naresh",
            handlerRole: "Cold-Chain Logistics Driver",
            temperatureCelsius: 4.8,
            notes: "Temperature monitored via Bluetooth Data Logger.",
            hashSignature: "0xcc22ff77",
          },
        ],
      },
      {
        id: "samp-1004-2",
        barcode: "SMP-2026-9551B",
        orderId: "ord-1004",
        specimenType: "Whole Blood EDTA",
        tubeType: "Lavender (EDTA)",
        status: "rejected",
        collectedAt: new Date(Date.now() - 3600000 * 4.2).toISOString(),
        collectedBy: "Phleb. M. Anuradha",
        collectionCenter: "Secunderabad Metro Diagnostics Point",
        rejectionReason: "Grossly Hemolyzed Sample",
        rejectionNotes: "Sample shows severe hemolysis on visual inspection post centrifugation (Index > 3+). Inaccurate for CBC.",
        custodyTrail: [
          {
            id: "coc-403",
            timestamp: new Date(Date.now() - 3600000 * 4.2).toISOString(),
            stage: "collected",
            location: "Secunderabad Metro Center",
            handlerName: "M. Anuradha",
            handlerRole: "Center In-Charge",
            hashSignature: "0x11002233",
          },
          {
            id: "coc-404",
            timestamp: new Date(Date.now() - 3600000 * 2.0).toISOString(),
            stage: "rejected",
            location: "Accessioning Bench",
            handlerName: "S. V. Ramana",
            handlerRole: "Quality Control Officer",
            notes: "REJECTED: Hemolyzed. Phlebotomy center notified for repeat sample requisition.",
            hashSignature: "0x9999ffff",
          },
        ],
      },
    ],
    results: [],
  },
];

const INITIAL_QC_LOGS: QualityControlEntry[] = [
  {
    id: "qc-1",
    analyzerId: "SYS-XN-1000",
    analyzerName: "Sysmex XN-1000 Automated Hematology",
    department: "Hematology",
    parameterName: "Hemoglobin (Level 2 Normal Control)",
    controlLot: "E-CHECK-26A",
    targetMean: 13.8,
    targetSD: 0.3,
    measuredValue: 13.9,
    zScore: 0.33,
    status: "in_control",
    timestamp: new Date(Date.now() - 3600000 * 8).toISOString(),
    technician: "B. Lavanya, M.Sc MLT",
  },
  {
    id: "qc-2",
    analyzerId: "ROCHE-COBAS-6000",
    analyzerName: "Roche Cobas 6000 c501 Clinical Chemistry",
    department: "Biochemistry",
    parameterName: "Serum Creatinine (Level 1 Normal)",
    controlLot: "PRECICONTROL-C26",
    targetMean: 1.05,
    targetSD: 0.04,
    measuredValue: 1.07,
    zScore: 0.5,
    status: "in_control",
    timestamp: new Date(Date.now() - 3600000 * 7.5).toISOString(),
    technician: "N. Sandhya, B.Sc MLT",
  },
  {
    id: "qc-3",
    analyzerId: "BECKMAN-ACCESS-2",
    analyzerName: "Beckman Coulter Access 2 Immunoassay",
    department: "Immunology",
    parameterName: "Cardiac Troponin-I (Level 2 Abnormal High)",
    controlLot: "TROP-QC-LEVEL2",
    targetMean: 1.25,
    targetSD: 0.08,
    measuredValue: 1.39,
    zScore: 1.75,
    status: "warning_1_2s",
    timestamp: new Date(Date.now() - 3600000 * 6).toISOString(),
    technician: "K. Teja, B.Sc MLT",
  },
];

class LabFlowStore {
  private orders: LabOrder[] = [];
  private qcLogs: QualityControlEntry[] = [];
  private listeners: (() => void)[] = [];

  constructor() {
    this.load();
  }

  private load() {
    if (typeof window === "undefined") {
      this.orders = INITIAL_DEMO_ORDERS;
      this.qcLogs = INITIAL_QC_LOGS;
      return;
    }
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.orders = JSON.parse(stored);
      } else {
        this.orders = INITIAL_DEMO_ORDERS;
        this.save();
      }

      const qcStored = localStorage.getItem(QC_STORAGE_KEY);
      if (qcStored) {
        this.qcLogs = JSON.parse(qcStored);
      } else {
        this.qcLogs = INITIAL_QC_LOGS;
        this.saveQC();
      }
    } catch {
      this.orders = INITIAL_DEMO_ORDERS;
      this.qcLogs = INITIAL_QC_LOGS;
    }
  }

  private save() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.orders));
      } catch (err) {
        console.warn("[LabFlowStore] Failed to save orders to localStorage:", err);
      }
    }
    this.notify();
  }

  private saveQC() {
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(QC_STORAGE_KEY, JSON.stringify(this.qcLogs));
      } catch (err) {
        console.warn("[LabFlowStore] Failed to save QC to localStorage:", err);
      }
    }
    this.notify();
  }

  private notify() {
    this.listeners.forEach((listener) => listener());
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  public getOrders(): LabOrder[] {
    return this.orders;
  }

  public getOrderById(id: string): LabOrder | undefined {
    return this.orders.find((o) => o.id === id || o.orderNumber === id);
  }

  public getQCLogs(): QualityControlEntry[] {
    return this.qcLogs;
  }

  public getCollectionCenters() {
    return DEFAULT_COLLECTION_CENTERS;
  }

  public getCatalog() {
    return DIAGNOSTIC_TEST_CATALOG;
  }

  public createOrder(params: {
    patientName: string;
    patientAge: number;
    patientGender: "Male" | "Female" | "Other";
    patientPhone: string;
    patientEmail: string;
    referringDoctor: string;
    collectionCenter: string;
    priority: OrderPriority;
    clinicalHistory?: string;
    selectedTestIds: string[];
    paymentStatus?: "paid" | "pending" | "insurance";
  }): LabOrder {
    const timestamp = new Date().toISOString();
    const orderIndex = this.orders.length + 1;
    const orderId = `ord-${Date.now()}`;
    const orderNumber = `LF-2026-${String(orderIndex + 845).padStart(4, "0")}`;

    const selectedTests = DIAGNOSTIC_TEST_CATALOG.filter((t) =>
      params.selectedTestIds.includes(t.id),
    );

    // Group tests by required tube type for realistic phlebotomy grouping
    const tubeGroups = new Map<string, typeof selectedTests>();
    selectedTests.forEach((t) => {
      const list = tubeGroups.get(t.tubeType) ?? [];
      list.push(t);
      tubeGroups.set(t.tubeType, list);
    });

    const samples: Sample[] = [];
    let sampleCounter = 1;

    tubeGroups.forEach((testsInTube, tubeType) => {
      const sampleBarcode = `SMP-2026-${orderNumber.slice(-4)}${String.fromCharCode(64 + sampleCounter)}`;
      sampleCounter += 1;

      samples.push({
        id: `samp-${orderId}-${sampleCounter}`,
        barcode: sampleBarcode,
        orderId,
        specimenType: testsInTube[0].specimen,
        tubeType: tubeType as TubeType,
        status: "ordered",
        collectionCenter: params.collectionCenter,
        custodyTrail: [
          {
            id: `coc-${Date.now()}-${sampleCounter}`,
            timestamp,
            stage: "ordered",
            location: params.collectionCenter,
            handlerName: "System Requisition Desk",
            handlerRole: "Order Intake Specialist",
            notes: `Test requisition generated for: ${testsInTube.map((t) => t.name).join(", ")}`,
            hashSignature: generateHash(`${orderNumber}-${sampleBarcode}-${timestamp}`),
          },
        ],
      });
    });

    const totalAmount = selectedTests.reduce((sum, t) => sum + t.price, 0);
    const maxTat = Math.max(...selectedTests.map((t) => t.tatMinutes), 60);

    const newOrder: LabOrder = {
      id: orderId,
      orderNumber,
      createdAt: timestamp,
      patientId: `pat-${Date.now().toString().slice(-4)}`,
      patientName: params.patientName,
      patientAge: params.patientAge,
      patientGender: params.patientGender,
      patientPhone: params.patientPhone,
      patientEmail: params.patientEmail,
      referringDoctor: params.referringDoctor || "Self / General Practice",
      collectionCenter: params.collectionCenter,
      priority: params.priority,
      clinicalHistory: params.clinicalHistory,
      tatTargetMinutes: maxTat,
      criticalAlert: false,
      totalAmount,
      paymentStatus: params.paymentStatus ?? "paid",
      status: "order_placed",
      tests: selectedTests.map((t) => ({
        testId: t.id,
        testName: t.name,
        department: t.department,
        price: t.price,
      })),
      samples,
      results: [],
    };

    this.orders = [newOrder, ...this.orders];
    this.save();
    return newOrder;
  }

  public collectSample(
    sampleBarcode: string,
    phlebotomistName: string,
    notes?: string,
  ): boolean {
    let modified = false;
    const now = new Date().toISOString();

    this.orders = this.orders.map((order) => {
      const sample = order.samples.find((s) => s.barcode === sampleBarcode);
      if (!sample) return order;

      modified = true;
      const updatedSample: Sample = {
        ...sample,
        status: "collected",
        collectedAt: now,
        collectedBy: phlebotomistName,
        temperature: 22.0,
        custodyTrail: [
          ...sample.custodyTrail,
          {
            id: `coc-${Date.now()}`,
            timestamp: now,
            stage: "collected",
            location: order.collectionCenter,
            handlerName: phlebotomistName,
            handlerRole: "Phlebotomist",
            notes: notes || "Specimen collected successfully via sterile venipuncture.",
            temperatureCelsius: 22.0,
            hashSignature: generateHash(`${sampleBarcode}-collected-${now}`),
          },
        ],
      };

      const allSamples = order.samples.map((s) =>
        s.barcode === sampleBarcode ? updatedSample : s,
      );

      const allCollected = allSamples.every((s) => s.status !== "ordered");

      return {
        ...order,
        samples: allSamples,
        status: allCollected ? "samples_collected" : order.status,
      };
    });

    if (modified) this.save();
    return modified;
  }

  public updateSampleStatus(
    sampleBarcode: string,
    newStatus: SampleStatus,
    handlerName: string,
    handlerRole: string,
    location: string,
    notes?: string,
    temperature?: number,
  ): boolean {
    let modified = false;
    const now = new Date().toISOString();

    this.orders = this.orders.map((order) => {
      const sample = order.samples.find((s) => s.barcode === sampleBarcode);
      if (!sample) return order;

      modified = true;
      const updatedSample: Sample = {
        ...sample,
        status: newStatus,
        temperature: temperature ?? sample.temperature,
        custodyTrail: [
          ...sample.custodyTrail,
          {
            id: `coc-${Date.now()}`,
            timestamp: now,
            stage: newStatus,
            location,
            handlerName,
            handlerRole,
            notes: notes || `Sample status updated to ${newStatus}`,
            temperatureCelsius: temperature,
            hashSignature: generateHash(`${sampleBarcode}-${newStatus}-${now}`),
          },
        ],
      };

      const allSamples = order.samples.map((s) =>
        s.barcode === sampleBarcode ? updatedSample : s,
      );

      let orderStatus = order.status;
      if (newStatus === "processing") orderStatus = "in_analysis";

      return {
        ...order,
        samples: allSamples,
        status: orderStatus,
      };
    });

    if (modified) this.save();
    return modified;
  }

  public rejectSample(
    sampleBarcode: string,
    rejectionReason: string,
    rejectionNotes: string,
    technicianName: string,
  ): boolean {
    let modified = false;
    const now = new Date().toISOString();

    this.orders = this.orders.map((order) => {
      const sample = order.samples.find((s) => s.barcode === sampleBarcode);
      if (!sample) return order;

      modified = true;
      const updatedSample: Sample = {
        ...sample,
        status: "rejected",
        rejectionReason,
        rejectionNotes,
        custodyTrail: [
          ...sample.custodyTrail,
          {
            id: `coc-${Date.now()}`,
            timestamp: now,
            stage: "rejected",
            location: "Central Accessioning & Quality Assurance",
            handlerName: technicianName,
            handlerRole: "QA / Pathologist Reviewer",
            notes: `REJECTED: ${rejectionReason}. Details: ${rejectionNotes}`,
            hashSignature: generateHash(`${sampleBarcode}-rejected-${now}`),
          },
        ],
      };

      return {
        ...order,
        samples: order.samples.map((s) =>
          s.barcode === sampleBarcode ? updatedSample : s,
        ),
      };
    });

    if (modified) this.save();
    return modified;
  }

  public requestRepeatSample(
    orderId: string,
    rejectedBarcode: string,
    notes: string,
  ): Sample | null {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return null;

    const oldSample = order.samples.find((s) => s.barcode === rejectedBarcode);
    if (!oldSample) return null;

    const newBarcode = `${rejectedBarcode}-R1`;
    const now = new Date().toISOString();

    const repeatSample: Sample = {
      id: `samp-${Date.now()}`,
      barcode: newBarcode,
      orderId,
      specimenType: oldSample.specimenType,
      tubeType: oldSample.tubeType,
      status: "repeat_requested",
      collectionCenter: oldSample.collectionCenter,
      repeatOfSampleId: oldSample.id,
      custodyTrail: [
        {
          id: `coc-${Date.now()}`,
          timestamp: now,
          stage: "repeat_requested",
          location: oldSample.collectionCenter,
          handlerName: "Laboratory Supervisor",
          handlerRole: "Quality Assurance",
          notes: `Repeat collection requisitioned due to: ${oldSample.rejectionReason ?? "Sample Issue"}. ${notes}`,
          hashSignature: generateHash(`${newBarcode}-repeat-${now}`),
        },
      ],
    };

    order.samples.push(repeatSample);
    this.save();
    return repeatSample;
  }

  public submitTestResults(
    orderId: string,
    testId: string,
    sampleBarcode: string,
    parameters: ParameterResult[],
    analyzerUsed: string,
    technicianName: string,
    technicianNotes?: string,
  ): boolean {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return false;

    const catalogTest = DIAGNOSTIC_TEST_CATALOG.find((t) => t.id === testId);
    if (!catalogTest) return false;

    const hasCritical = parameters.some((p) => p.flag === "critical_panic");

    const newResult: OrderTestResult = {
      testId,
      testCode: catalogTest.code,
      testName: catalogTest.name,
      department: catalogTest.department,
      sampleBarcode,
      status: "reviewed",
      analyzerUsed,
      technicianName,
      technicianNotes,
      parameters,
    };

    const updatedResults = [
      ...order.results.filter((r) => r.testId !== testId),
      newResult,
    ];

    const allCompleted = order.tests.every((t) =>
      updatedResults.some((r) => r.testId === t.testId),
    );

    order.results = updatedResults;
    order.status = allCompleted ? "under_review" : "in_analysis";
    if (hasCritical) {
      order.criticalAlert = true;
      const criticalParams = parameters
        .filter((p) => p.flag === "critical_panic")
        .map((p) => `${p.name}: ${p.measuredValue} ${p.unit}`);
      order.criticalAlertNotes = `CRITICAL PANIC VALUE DETECTED: ${criticalParams.join("; ")}`;
    }

    this.save();
    return true;
  }

  public approveOrder(
    orderId: string,
    doctorName: string,
    doctorRegistration: string,
    clinicalRemarks?: string,
  ): boolean {
    const order = this.orders.find((o) => o.id === orderId);
    if (!order) return false;

    const now = new Date().toISOString();
    order.status = "approved_ready";
    order.results = order.results.map((r) => ({
      ...r,
      status: "approved",
      reviewedBy: doctorName,
      reviewedAt: now,
    }));

    order.pathologistSignOff = {
      doctorName,
      doctorRegistration,
      signedAt: now,
      digitalSignatureHash: `SHA256:${generateHash(`${orderId}-${doctorName}-${now}`)}`,
      clinicalRemarks,
    };

    this.save();
    return true;
  }

  public logQC(entry: Omit<QualityControlEntry, "id" | "timestamp" | "zScore" | "status">): QualityControlEntry {
    const zScore = Math.round(((entry.measuredValue - entry.targetMean) / entry.targetSD) * 100) / 100;
    const absZ = Math.abs(zScore);

    let status: QualityControlEntry["status"] = "in_control";
    if (absZ > 3) status = "out_of_control_1_3s";
    else if (absZ > 2) status = "warning_1_2s";

    const newQC: QualityControlEntry = {
      ...entry,
      id: `qc-${Date.now()}`,
      timestamp: new Date().toISOString(),
      zScore,
      status,
    };

    this.qcLogs = [newQC, ...this.qcLogs];
    this.saveQC();
    return newQC;
  }

  public resetToDefaults() {
    this.orders = INITIAL_DEMO_ORDERS;
    this.qcLogs = INITIAL_QC_LOGS;
    this.save();
    this.saveQC();
  }
}

export const labFlowStore = new LabFlowStore();
