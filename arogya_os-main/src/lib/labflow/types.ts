export type OrderPriority = "routine" | "urgent" | "stat";

export type SampleStatus =
  | "ordered"
  | "collected"
  | "in_transit"
  | "received_at_lab"
  | "processing"
  | "completed"
  | "rejected"
  | "repeat_requested";

export type TestResultStatus =
  | "pending"
  | "preliminary"
  | "reviewed"
  | "approved"
  | "rejected";

export type ResultFlag = "normal" | "abnormal_low" | "abnormal_high" | "critical_panic";

export type Department =
  | "Hematology"
  | "Biochemistry"
  | "Immunology"
  | "Microbiology"
  | "Histopathology"
  | "Molecular Diagnostics";

export type TubeType =
  | "Lavender (EDTA)"
  | "Gold / Red (SST / Serum)"
  | "Grey (Sodium Fluoride)"
  | "Light Blue (Sodium Citrate)"
  | "Green (Sodium Heparin)"
  | "Sterile Container (Urine/Fluid)"
  | "Viral Transport Medium (Swab)";

export interface TestCatalogItem {
  id: string;
  code: string;
  name: string;
  department: Department;
  tubeType: TubeType;
  specimen: string;
  fastingRequired: boolean;
  fastingHours?: number;
  tatMinutes: number;
  price: number;
  parameters: TestCatalogParameter[];
  clinicalSignificance: string;
}

export interface TestCatalogParameter {
  id: string;
  name: string;
  unit: string;
  refLow?: number;
  refHigh?: number;
  textReference?: string;
  criticalLow?: number;
  criticalHigh?: number;
  decimalPlaces: number;
}

export interface ChainOfCustodyEvent {
  id: string;
  timestamp: string;
  stage: SampleStatus;
  location: string;
  handlerName: string;
  handlerRole: string;
  notes?: string;
  temperatureCelsius?: number;
  hashSignature: string;
}

export interface Sample {
  id: string;
  barcode: string;
  orderId: string;
  specimenType: string;
  tubeType: TubeType;
  status: SampleStatus;
  collectedAt?: string;
  collectedBy?: string;
  collectionCenter: string;
  temperature?: number;
  rejectionReason?: string;
  rejectionNotes?: string;
  repeatOfSampleId?: string;
  custodyTrail: ChainOfCustodyEvent[];
}

export interface ParameterResult {
  parameterId: string;
  name: string;
  measuredValue: number | string;
  unit: string;
  refRange: string;
  flag: ResultFlag;
  previousValue?: number | string;
  previousDate?: string;
  deltaPercent?: number;
  deltaFlag?: "stable" | "significant_change" | "acute_shift";
  analyzerId?: string;
}

export interface OrderTestResult {
  testId: string;
  testCode: string;
  testName: string;
  department: Department;
  sampleBarcode: string;
  status: TestResultStatus;
  parameters: ParameterResult[];
  technicianNotes?: string;
  technicianName?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  analyzerUsed?: string;
}

export interface LabOrder {
  id: string;
  orderNumber: string;
  createdAt: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientGender: "Male" | "Female" | "Other";
  patientPhone: string;
  patientEmail: string;
  referringDoctor: string;
  collectionCenter: string;
  priority: OrderPriority;
  clinicalHistory?: string;
  tests: {
    testId: string;
    testName: string;
    department: Department;
    price: number;
  }[];
  samples: Sample[];
  results: OrderTestResult[];
  status: "order_placed" | "samples_collected" | "in_analysis" | "under_review" | "approved_ready" | "delivered";
  totalAmount: number;
  paymentStatus: "paid" | "pending" | "insurance";
  tatTargetMinutes: number;
  criticalAlert: boolean;
  criticalAlertNotes?: string;
  pathologistSignOff?: {
    doctorName: string;
    doctorRegistration: string;
    signedAt: string;
    digitalSignatureHash: string;
    clinicalRemarks?: string;
  };
}

export interface CollectionCenter {
  id: string;
  code: string;
  name: string;
  address: string;
  city: string;
  contactNumber: string;
  inCharge: string;
  activeSamplesCount: number;
}

export interface QualityControlEntry {
  id: string;
  analyzerId: string;
  analyzerName: string;
  department: Department;
  parameterName: string;
  controlLot: string;
  targetMean: number;
  targetSD: number;
  measuredValue: number;
  zScore: number;
  status: "in_control" | "warning_1_2s" | "out_of_control_1_3s" | "out_of_control_2_2s";
  timestamp: string;
  technician: string;
}
