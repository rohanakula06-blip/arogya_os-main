/**
 * ArogyaOS Appointments & Hospital Directory Store
 * Manages geolocation, 20 km radius hospital lookup, doctor credentials,
 * slot scheduling, instant booking, rescheduling, and cancellations.
 */

export interface Hospital {
  id: string;
  name: string;
  tagline: string;
  category: "Multi-Speciality" | "Super-Speciality" | "Government / Teaching" | "Children's Hospital";
  address: string;
  area: string;
  city: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  emergencyAvailable: boolean;
  icuBedsAvailable: number;
  openHours: string;
  contactNumber: string;
  departments: string[];
  imageUrl: string;
}

export interface Doctor {
  id: string;
  name: string;
  hospitalId: string;
  hospitalName: string;
  department: string;
  speciality: string;
  subSpeciality: string;
  degrees: string; // e.g. "MBBS, MD (Medicine), DM (Cardiology) - AIIMS New Delhi"
  fellowships: string[];
  experienceYears: number;
  languages: string[];
  rating: number;
  reviewCount: number;
  consultationFee: number;
  teleconsultationFee: number;
  availableDays: string[];
  avatarUrl: string;
  bio: string;
}

export type AppointmentStatus = "upcoming" | "completed" | "cancelled" | "rescheduled";
export type ConsultationType = "in_person" | "teleconsult";

export interface Appointment {
  id: string;
  bookingId: string; // e.g. "ARG-APT-2026-8941"
  userId: string;
  patientName: string;
  patientPhone: string;
  hospitalId: string;
  hospitalName: string;
  hospitalAddress: string;
  hospitalLat: number;
  hospitalLng: number;
  doctorId: string;
  doctorName: string;
  doctorDegrees: string;
  doctorSpecialty: string;
  department: string;
  appointmentDate: string; // YYYY-MM-DD
  appointmentTime: string; // e.g. "10:30 AM"
  slotPeriod: "Morning" | "Afternoon" | "Evening";
  consultationType: ConsultationType;
  consultationFee: number;
  hospitalServiceFee: number;
  gstAmount: number;
  totalAmount: number;
  paymentStatus: "paid" | "pay_at_hospital";
  status: AppointmentStatus;
  cancellationReason?: string;
  cancelledAt?: string;
  rescheduledFromDate?: string;
  rescheduledFromTime?: string;
  rescheduledAt?: string;
  createdAt: string;
  qrCodeData: string;
}

const STORAGE_KEY = "arogya_appointments_v1";

// Default coordinates centered on a prominent medical hub (e.g. Hyderabad Hitech City / Jubilee Hills)
export const DEFAULT_USER_LOCATION = {
  lat: 17.4334,
  lng: 78.3866,
  city: "Hyderabad, Telangana",
};

/** List of curated premier hospitals with exact coordinates for 20 km radius discovery */
export const HOSPITALS_DIRECTORY: Hospital[] = [
  {
    id: "hosp_apollo_jubilee",
    name: "Apollo Health City & Super Speciality Hospital",
    tagline: "JCI & NABH Accredited Multi-Organ Transplant & Cardiology Center",
    category: "Super-Speciality",
    address: "Road No. 72, Film Nagar, Jubilee Hills",
    area: "Jubilee Hills",
    city: "Hyderabad",
    lat: 17.4168,
    lng: 78.4116,
    rating: 4.8,
    reviewCount: 3420,
    emergencyAvailable: true,
    icuBedsAvailable: 18,
    openHours: "24/7 Emergency & Outpatient 8:00 AM - 9:00 PM",
    contactNumber: "+91 040 2360 7777",
    departments: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Oncology",
      "Gastroenterology",
      "Pediatrics",
      "General Medicine",
      "Nephrology",
      "Dermatology",
      "Pulmonology",
    ],
    imageUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "hosp_yashoda_somajiguda",
    name: "Yashoda Super Speciality Hospitals",
    tagline: "Comprehensive Oncology, Neurosciences & Cardiac Care",
    category: "Super-Speciality",
    address: "Raj Bhavan Road, Somajiguda",
    area: "Somajiguda",
    city: "Hyderabad",
    lat: 17.4258,
    lng: 78.4578,
    rating: 4.7,
    reviewCount: 2890,
    emergencyAvailable: true,
    icuBedsAvailable: 12,
    openHours: "24/7 Emergency & Outpatient 8:30 AM - 8:30 PM",
    contactNumber: "+91 040 4567 4567",
    departments: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Oncology",
      "Gastroenterology",
      "General Medicine",
      "Gynecology",
      "ENT",
      "Urology",
    ],
    imageUrl: "https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "hosp_care_banjara",
    name: "CARE Super Speciality Hospital",
    tagline: "Leader in Interventional Cardiology & Critical Care",
    category: "Super-Speciality",
    address: "Road No. 1, Banjara Hills",
    area: "Banjara Hills",
    city: "Hyderabad",
    lat: 17.4144,
    lng: 78.4482,
    rating: 4.6,
    reviewCount: 2150,
    emergencyAvailable: true,
    icuBedsAvailable: 15,
    openHours: "24/7 Emergency & Outpatient 9:00 AM - 8:00 PM",
    contactNumber: "+91 040 6165 6565",
    departments: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Pediatrics",
      "General Medicine",
      "Nephrology",
      "Pulmonology",
      "Dermatology",
    ],
    imageUrl: "https://images.unsplash.com/photo-1512678080530-7760d81faba6?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "hosp_kims_secunderabad",
    name: "KIMS Hospitals (Krishna Institute of Medical Sciences)",
    tagline: "Premier Quaternary Care, Robotic Surgery & Bone Marrow Transplant",
    category: "Super-Speciality",
    address: "1-8-31/1, Minister Road, Secunderabad",
    area: "Secunderabad",
    city: "Hyderabad",
    lat: 17.4385,
    lng: 78.4892,
    rating: 4.7,
    reviewCount: 3100,
    emergencyAvailable: true,
    icuBedsAvailable: 24,
    openHours: "24/7 Emergency & Outpatient 8:00 AM - 9:00 PM",
    contactNumber: "+91 040 4488 5000",
    departments: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Oncology",
      "Gastroenterology",
      "Pediatrics",
      "General Medicine",
      "Nephrology",
      "Ophthalmology",
      "ENT",
    ],
    imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "hosp_continental_gachibowli",
    name: "Continental Super Speciality Hospitals",
    tagline: "US-Standard Multi-Disciplinary Healthcare & Trauma Hub",
    category: "Multi-Speciality",
    address: "Plot No. 3, Road No. 2, IT & Financial District, Nanakramguda, Gachibowli",
    area: "Gachibowli",
    city: "Hyderabad",
    lat: 17.4208,
    lng: 78.3475,
    rating: 4.8,
    reviewCount: 1980,
    emergencyAvailable: true,
    icuBedsAvailable: 20,
    openHours: "24/7 Emergency & Outpatient 8:30 AM - 8:30 PM",
    contactNumber: "+91 040 6700 0000",
    departments: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Oncology",
      "Gastroenterology",
      "Pediatrics",
      "General Medicine",
      "Gynecology",
      "Dermatology",
    ],
    imageUrl: "https://images.unsplash.com/photo-1587351021759-3e566b6af7cc?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "hosp_rainbow_kondapur",
    name: "Rainbow Children's Hospital & BirthRight",
    tagline: "India's Leading Pediatric, Neonatal & Maternity Care Center",
    category: "Children's Hospital",
    address: "Near Botanical Garden, Kondapur",
    area: "Kondapur",
    city: "Hyderabad",
    lat: 17.4589,
    lng: 78.3612,
    rating: 4.9,
    reviewCount: 4210,
    emergencyAvailable: true,
    icuBedsAvailable: 30,
    openHours: "24/7 Pediatric Emergency & OPD 8:00 AM - 9:00 PM",
    contactNumber: "+91 040 4969 4969",
    departments: [
      "Pediatrics",
      "Gynecology",
      "General Medicine",
      "Dermatology",
      "ENT",
    ],
    imageUrl: "https://images.unsplash.com/photo-1538108149393-fbbd81895907?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "hosp_aiims_bibinagar",
    name: "AIIMS (All India Institute of Medical Sciences)",
    tagline: "Apex Institute of National Importance & Tertiary Research Hospital",
    category: "Government / Teaching",
    address: "Rangapur, Bibinagar Expressway",
    area: "Bibinagar / Uppal Corridor",
    city: "Hyderabad Region",
    lat: 17.4812,
    lng: 78.4682,
    rating: 4.6,
    reviewCount: 1650,
    emergencyAvailable: true,
    icuBedsAvailable: 40,
    openHours: "24/7 Emergency & Outpatient 8:00 AM - 4:00 PM",
    contactNumber: "+91 08685 295055",
    departments: [
      "Cardiology",
      "Neurology",
      "Orthopedics",
      "Oncology",
      "Gastroenterology",
      "Pediatrics",
      "General Medicine",
      "Nephrology",
      "Pulmonology",
      "Ophthalmology",
      "ENT",
      "Dermatology",
    ],
    imageUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=600&auto=format&fit=crop&q=80",
  },
  {
    id: "hosp_sunshine_gachibowli",
    name: "Sunshine Bone & Joint Institute",
    tagline: "World-Class Joint Replacement, Arthroscopy & Sports Medicine",
    category: "Super-Speciality",
    address: "Old Mumbai Highway, Gachibowli",
    area: "Gachibowli",
    city: "Hyderabad",
    lat: 17.4398,
    lng: 78.3615,
    rating: 4.8,
    reviewCount: 2340,
    emergencyAvailable: true,
    icuBedsAvailable: 14,
    openHours: "24/7 Trauma & Outpatient 9:00 AM - 8:00 PM",
    contactNumber: "+91 040 4455 0000",
    departments: [
      "Orthopedics",
      "Neurology",
      "General Medicine",
      "Cardiology",
    ],
    imageUrl: "https://images.unsplash.com/photo-1505751172876-fa1923c5c528?w=600&auto=format&fit=crop&q=80",
  },
];

/** Comprehensive Doctor Directory with verifiable medical degrees, fellowships & clinical specialties */
export const DOCTORS_DIRECTORY: Doctor[] = [
  // --- CARDIOLOGY ---
  {
    id: "doc_cardio_1",
    name: "Dr. A. Sreenivasa Rao",
    hospitalId: "hosp_apollo_jubilee",
    hospitalName: "Apollo Health City",
    department: "Cardiology",
    speciality: "Senior Interventional Cardiologist",
    subSpeciality: "Complex Angioplasty, TAVR & Coronary Stenting",
    degrees: "MBBS (Osmania), MD (General Medicine - AIIMS New Delhi), DM (Cardiology - PGI Chandigarh)",
    fellowships: ["Fellow of European Society of Cardiology (FESC)", "Fellow of American College of Cardiology (FACC)"],
    experienceYears: 24,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.9,
    reviewCount: 480,
    consultationFee: 1200,
    teleconsultationFee: 1000,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
    bio: "Pioneer in transcatheter aortic valve implantation (TAVR) with over 15,000 successful coronary interventions.",
  },
  {
    id: "doc_cardio_2",
    name: "Dr. Sunitha Reddy",
    hospitalId: "hosp_care_banjara",
    hospitalName: "CARE Super Speciality Hospital",
    department: "Cardiology",
    speciality: "Consultant Cardiologist & Heart Failure Specialist",
    subSpeciality: "Echocardiography, Heart Failure & Preventive Cardiology",
    degrees: "MBBS (Gandhi Medical College), MD (Medicine), DM (Cardiology - NIMS)",
    fellowships: ["Fellow in Advanced Heart Failure (Cleveland Clinic, USA)"],
    experienceYears: 16,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.8,
    reviewCount: 310,
    consultationFee: 900,
    teleconsultationFee: 750,
    availableDays: ["Monday", "Wednesday", "Friday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1594824813626-d621b2d718b5?w=300&auto=format&fit=crop&q=80",
    bio: "Specialized in lipid management, cardiac rehabilitation, and non-invasive cardiovascular assessment.",
  },
  {
    id: "doc_cardio_3",
    name: "Dr. K. Vikramaditya",
    hospitalId: "hosp_continental_gachibowli",
    hospitalName: "Continental Hospitals",
    department: "Cardiology",
    speciality: "Electrophysiologist & Cardiologist",
    subSpeciality: "Pacemaker Implantation, Arrhythmia & Radiofrequency Ablation",
    degrees: "MBBS, MD (Medicine), DNB (Cardiology), Fellowship in Electrophysiology (Stanford, USA)",
    fellowships: ["Heart Rhythm Society (HRS) Fellow"],
    experienceYears: 18,
    languages: ["English", "Telugu"],
    rating: 4.9,
    reviewCount: 265,
    consultationFee: 1100,
    teleconsultationFee: 950,
    availableDays: ["Tuesday", "Thursday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80",
    bio: "Expert in complex cardiac arrhythmias, CRT-D implantation, and 3D mapping ablations.",
  },

  // --- NEUROLOGY ---
  {
    id: "doc_neuro_1",
    name: "Dr. P. Rajeshwar Varma",
    hospitalId: "hosp_yashoda_somajiguda",
    hospitalName: "Yashoda Super Speciality Hospitals",
    department: "Neurology",
    speciality: "Chief Neurologist & Stroke Specialist",
    subSpeciality: "Acute Ischemic Stroke, Epilepsy & Parkinson's Disease",
    degrees: "MBBS, MD (General Medicine - JIPMER), DM (Neurology - NIMHANS Bengaluru)",
    fellowships: ["Stroke & Neuro-interventional Fellowship (Toronto, Canada)"],
    experienceYears: 22,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.9,
    reviewCount: 520,
    consultationFee: 1300,
    teleconsultationFee: 1100,
    availableDays: ["Monday", "Tuesday", "Thursday", "Friday"],
    avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&auto=format&fit=crop&q=80",
    bio: "Lead stroke physician with extensive experience in thrombolytic therapy and neuro-rehabilitation.",
  },
  {
    id: "doc_neuro_2",
    name: "Dr. Deepthi Madhavan",
    hospitalId: "hosp_kims_secunderabad",
    hospitalName: "KIMS Hospitals",
    department: "Neurology",
    speciality: "Consultant Neurologist",
    subSpeciality: "Headache Disorders, Multiple Sclerosis & Neuromuscular Care",
    degrees: "MBBS, DNB (Medicine), DM (Neurology - AIIMS New Delhi)",
    fellowships: ["Movement Disorders Fellowship (UK)"],
    experienceYears: 14,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.7,
    reviewCount: 290,
    consultationFee: 850,
    teleconsultationFee: 700,
    availableDays: ["Monday", "Wednesday", "Friday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80",
    bio: "Dedicated neurologist with a patient-centric approach to chronic migraines and demyelinating conditions.",
  },

  // --- ORTHOPEDICS ---
  {
    id: "doc_ortho_1",
    name: "Dr. Guruva Reddy",
    hospitalId: "hosp_sunshine_gachibowli",
    hospitalName: "Sunshine Bone & Joint Institute",
    department: "Orthopedics",
    speciality: "Chief Joint Replacement & Robotic Surgeon",
    subSpeciality: "Robotic Knee Replacement & Primary/Revision Hip Arthroplasty",
    degrees: "MBBS, MS (Orthopedics), M.Ch (Ortho - Liverpool, UK), FRCS (Glasgow, UK)",
    fellowships: ["Fellow of Royal College of Surgeons (FRCS-Edinburgh)"],
    experienceYears: 28,
    languages: ["English", "Telugu", "Hindi"],
    rating: 5.0,
    reviewCount: 980,
    consultationFee: 1500,
    teleconsultationFee: 1200,
    availableDays: ["Monday", "Wednesday", "Friday"],
    avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80",
    bio: "World-renowned orthopedist having performed over 25,000 joint replacement surgeries.",
  },
  {
    id: "doc_ortho_2",
    name: "Dr. Harish Kulkarni",
    hospitalId: "hosp_apollo_jubilee",
    hospitalName: "Apollo Health City",
    department: "Orthopedics",
    speciality: "Spine Surgeon & Arthroscopy Specialist",
    subSpeciality: "Minimally Invasive Spine Surgery, Disc Herniation & Sports Ligament Reconstruction",
    degrees: "MBBS, D.Ortho, DNB (Orthopedics), Fellowship in Spine Surgery (Germany)",
    fellowships: ["AO Spine International Fellow"],
    experienceYears: 17,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.8,
    reviewCount: 340,
    consultationFee: 1000,
    teleconsultationFee: 800,
    availableDays: ["Tuesday", "Thursday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
    bio: "Specialist in microscopic spine decompression and arthroscopic ACL/meniscal repairs.",
  },

  // --- PEDIATRICS ---
  {
    id: "doc_pedia_1",
    name: "Dr. Preeti Shrivastava",
    hospitalId: "hosp_rainbow_kondapur",
    hospitalName: "Rainbow Children's Hospital",
    department: "Pediatrics",
    speciality: "Senior Pediatrician & Adolescent Physician",
    subSpeciality: "Child Nutrition, Immunization & Pediatric Allergy",
    degrees: "MBBS, MD (Pediatrics - AIIMS), DCH (UK), MRCPCH (London)",
    fellowships: ["Fellow of Indian Academy of Pediatrics (FIAP)"],
    experienceYears: 19,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.9,
    reviewCount: 650,
    consultationFee: 900,
    teleconsultationFee: 750,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1594824813626-d621b2d718b5?w=300&auto=format&fit=crop&q=80",
    bio: "Renowned child specialist known for compassionate pediatric care, allergy immunotherapy, and developmental milestones.",
  },

  // --- GENERAL MEDICINE ---
  {
    id: "doc_gen_1",
    name: "Dr. M. Venkat Raman",
    hospitalId: "hosp_aiims_bibinagar",
    hospitalName: "AIIMS",
    department: "General Medicine",
    speciality: "Professor & Senior Consultant Physician",
    subSpeciality: "Type 2 Diabetes, Hypertension, Metabolic Syndrome & Infectious Diseases",
    degrees: "MBBS (AIIMS), MD (General Medicine - AIIMS), DNB (Internal Medicine)",
    fellowships: ["Fellow of Royal College of Physicians (FRCP - London)"],
    experienceYears: 25,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.8,
    reviewCount: 420,
    consultationFee: 600,
    teleconsultationFee: 500,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
    avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&auto=format&fit=crop&q=80",
    bio: "Expert internal medicine physician focusing on lifestyle disease reversal and comprehensive multi-system health.",
  },
  {
    id: "doc_gen_2",
    name: "Dr. Kavitha Naidu",
    hospitalId: "hosp_care_banjara",
    hospitalName: "CARE Super Speciality Hospital",
    department: "General Medicine",
    speciality: "Consultant Physician & Diabetologist",
    subSpeciality: "Continuous Glucose Monitoring (CGM), Thyroid & Fever Protocols",
    degrees: "MBBS, MD (Internal Medicine), Post Graduate Diploma in Diabetology (Boston, USA)",
    fellowships: ["Research Fellow in Endocrinology (UK)"],
    experienceYears: 15,
    languages: ["English", "Telugu"],
    rating: 4.8,
    reviewCount: 380,
    consultationFee: 800,
    teleconsultationFee: 650,
    availableDays: ["Monday", "Wednesday", "Friday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80",
    bio: "Passionate about diabetes prevention, metabolic profiling, and personalized health roadmaps.",
  },

  // --- GASTROENTEROLOGY ---
  {
    id: "doc_gastro_1",
    name: "Dr. N. Murali Mohan",
    hospitalId: "hosp_yashoda_somajiguda",
    hospitalName: "Yashoda Super Speciality Hospitals",
    department: "Gastroenterology",
    speciality: "Senior Medical Gastroenterologist & Hepatologist",
    subSpeciality: "Therapeutic Endoscopy, Fatty Liver (NASH) & IBD Management",
    degrees: "MBBS, MD (Medicine), DM (Medical Gastroenterology - SGPGI Lucknow)",
    fellowships: ["Fellow in Advanced GI Endoscopy (Japan)"],
    experienceYears: 21,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.9,
    reviewCount: 410,
    consultationFee: 1100,
    teleconsultationFee: 900,
    availableDays: ["Monday", "Tuesday", "Thursday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80",
    bio: "Pioneering therapeutic endoscopist specializing in early GI cancer detection and liver cirrhosis care.",
  },

  // --- GYNECOLOGY ---
  {
    id: "doc_gynae_1",
    name: "Dr. Sneha Latha Reddy",
    hospitalId: "hosp_rainbow_kondapur",
    hospitalName: "BirthRight by Rainbow",
    department: "Gynecology",
    speciality: "Senior Obstetrician, Gynecologist & Laparoscopic Surgeon",
    subSpeciality: "High-Risk Pregnancy, PCOS, Infertility & Robotic Hysterectomy",
    degrees: "MBBS, MS (Obstetrics & Gynecology), DNB (OBGYN), MRCOG (London, UK)",
    fellowships: ["Fellow of Royal College of Obstetricians & Gynaecologists (FRCOG)"],
    experienceYears: 20,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.9,
    reviewCount: 610,
    consultationFee: 1000,
    teleconsultationFee: 850,
    availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1594824813626-d621b2d718b5?w=300&auto=format&fit=crop&q=80",
    bio: "Leading obstetrician and gynecologist recognized for natural birthing support and gentle PCOS management.",
  },

  // --- DERMATOLOGY ---
  {
    id: "doc_derma_1",
    name: "Dr. Arvind Chaitanya",
    hospitalId: "hosp_apollo_jubilee",
    hospitalName: "Apollo Health City",
    department: "Dermatology",
    speciality: "Consultant Dermatologist & Dermatosurgeon",
    subSpeciality: "Clinical Dermatology, Psoriasis, Eczema, Laser & Anti-Aging",
    degrees: "MBBS, MD (Dermatology, Venereology & Leprosy - CMC Vellore)",
    fellowships: ["Fellow in Aesthetic Dermatology & Lasers (South Korea)"],
    experienceYears: 13,
    languages: ["English", "Telugu", "Hindi"],
    rating: 4.8,
    reviewCount: 390,
    consultationFee: 800,
    teleconsultationFee: 650,
    availableDays: ["Monday", "Wednesday", "Thursday", "Saturday"],
    avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
    bio: "Evidence-based dermatologist providing advanced solutions for stubborn skin and scalp conditions.",
  },
];

export const DEPARTMENTS_LIST = [
  "All Departments",
  "Cardiology",
  "Neurology",
  "Orthopedics",
  "Pediatrics",
  "General Medicine",
  "Gastroenterology",
  "Gynecology",
  "Dermatology",
  "Oncology",
  "Nephrology",
  "Pulmonology",
  "ENT",
  "Ophthalmology",
];

export const TIME_SLOTS = {
  Morning: ["08:30 AM", "09:00 AM", "09:30 AM", "10:00 AM", "10:30 AM", "11:00 AM", "11:30 AM"],
  Afternoon: ["12:00 PM", "12:30 PM", "02:00 PM", "02:30 PM", "03:00 PM", "03:30 PM", "04:00 PM"],
  Evening: ["05:00 PM", "05:30 PM", "06:00 PM", "06:30 PM", "07:00 PM", "07:30 PM", "08:00 PM"],
};

/**
 * Calculates Haversine distance in kilometers between two GPS coordinates
 */
export function calculateDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  return Math.round(distance * 10) / 10; // 1 decimal point
}

/**
 * Filters and returns hospitals within the specified radius (default 20 km)
 */
export function getHospitalsWithinRadius(
  userLat: number,
  userLng: number,
  maxRadiusKm = 20,
): Array<Hospital & { distanceKm: number }> {
  return HOSPITALS_DIRECTORY.map((hosp) => {
    const distanceKm = calculateDistanceKm(userLat, userLng, hosp.lat, hosp.lng);
    return { ...hosp, distanceKm };
  })
    .filter((hosp) => hosp.distanceKm <= maxRadiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

/**
 * Dynamically retrieves or generates 3 to 4 top specialist doctors for any hospital
 * ensuring that clicking "Select & View Doctors" on ANY hospital on the map ALWAYS
 * shows verified demo specialist doctors with degrees, fees, and slots.
 */
export function getDoctorsForHospital(hospital: Hospital): Doctor[] {
  const directMatches = DOCTORS_DIRECTORY.filter((doc) => doc.hospitalId === hospital.id);
  if (directMatches.length >= 3) {
    return directMatches;
  }

  // Pre-configured top specialty doctor profiles customized for this hospital
  const baseDoctors: Omit<Doctor, "id" | "hospitalId" | "hospitalName">[] = [
    {
      name: "Dr. A. Sreenivasa Rao",
      department: "Cardiology",
      speciality: "Senior Interventional Cardiologist",
      subSpeciality: "Complex Angioplasty, TAVR & Coronary Stenting",
      degrees: "MBBS (Osmania), MD (General Medicine - AIIMS New Delhi), DM (Cardiology - PGI Chandigarh)",
      fellowships: ["Fellow of European Society of Cardiology (FESC)", "Fellow of American College of Cardiology (FACC)"],
      experienceYears: 24,
      languages: ["English", "Telugu", "Hindi"],
      rating: 4.9,
      reviewCount: 480,
      consultationFee: 1200,
      teleconsultationFee: 1000,
      availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      avatarUrl: "https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=300&auto=format&fit=crop&q=80",
      bio: `Lead interventional cardiologist at ${hospital.name} with over 15,000 successful coronary interventions and TAVR procedures.`,
    },
    {
      name: "Dr. P. Rajeshwar Varma",
      department: "Neurology",
      speciality: "Chief Neurologist & Stroke Specialist",
      subSpeciality: "Acute Ischemic Stroke, Epilepsy & Parkinson's Disease",
      degrees: "MBBS, MD (General Medicine - JIPMER), DM (Neurology - NIMHANS Bengaluru)",
      fellowships: ["Stroke & Neuro-interventional Fellowship (Toronto, Canada)"],
      experienceYears: 22,
      languages: ["English", "Telugu", "Hindi"],
      rating: 4.9,
      reviewCount: 520,
      consultationFee: 1100,
      teleconsultationFee: 950,
      availableDays: ["Monday", "Tuesday", "Thursday", "Friday"],
      avatarUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=300&auto=format&fit=crop&q=80",
      bio: `Senior neurological consultant at ${hospital.name} specializing in acute stroke thrombolytic therapy and neuro-rehabilitation.`,
    },
    {
      name: "Dr. Guruva Reddy",
      department: "Orthopedics",
      speciality: "Chief Joint Replacement & Robotic Surgeon",
      subSpeciality: "Robotic Knee Replacement & Primary/Revision Hip Arthroplasty",
      degrees: "MBBS, MS (Orthopedics), M.Ch (Ortho - Liverpool, UK), FRCS (Glasgow, UK)",
      fellowships: ["Fellow of Royal College of Surgeons (FRCS-Edinburgh)"],
      experienceYears: 26,
      languages: ["English", "Telugu", "Hindi"],
      rating: 5.0,
      reviewCount: 980,
      consultationFee: 1400,
      teleconsultationFee: 1100,
      availableDays: ["Monday", "Wednesday", "Friday"],
      avatarUrl: "https://images.unsplash.com/photo-1537368910025-700350fe46c7?w=300&auto=format&fit=crop&q=80",
      bio: `Chief orthopedic surgeon at ${hospital.name} recognized internationally for robotic knee replacement and sports medicine.`,
    },
    {
      name: "Dr. Kavitha Naidu",
      department: "General Medicine",
      speciality: "Senior Consultant Physician & Diabetologist",
      subSpeciality: "Continuous Glucose Monitoring (CGM), Metabolic Health & Infectious Diseases",
      degrees: "MBBS (Gandhi), MD (General Medicine - AIIMS), Post Graduate Diabetology (Boston, USA)",
      fellowships: ["Research Fellow in Endocrinology (UK)"],
      experienceYears: 18,
      languages: ["English", "Telugu", "Hindi"],
      rating: 4.8,
      reviewCount: 410,
      consultationFee: 800,
      teleconsultationFee: 650,
      availableDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],
      avatarUrl: "https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=300&auto=format&fit=crop&q=80",
      bio: `Comprehensive internal medicine physician at ${hospital.name} with expertise in diabetes reversal and chronic disease management.`,
    },
  ];

  const generatedDoctors: Doctor[] = baseDoctors.map((doc, idx) => ({
    ...doc,
    id: `doc_${hospital.id}_${idx + 1}`,
    hospitalId: hospital.id,
    hospitalName: hospital.name,
  }));

  return [...directMatches, ...generatedDoctors].slice(0, 4);
}

/** Get all stored appointments */
export function getStoredAppointments(): Appointment[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed an initial verified sample appointment for smooth demo
      const seed: Appointment[] = [
        {
          id: "apt_seed_1",
          bookingId: "ARG-APT-2026-9042",
          userId: "current_user",
          patientName: "Dr. Ramesh Kumar",
          patientPhone: "+91 9876543210",
          hospitalId: "hosp_apollo_jubilee",
          hospitalName: "Apollo Health City & Super Speciality Hospital",
          hospitalAddress: "Road No. 72, Film Nagar, Jubilee Hills, Hyderabad",
          hospitalLat: 17.4168,
          hospitalLng: 78.4116,
          doctorId: "doc_cardio_1",
          doctorName: "Dr. A. Sreenivasa Rao",
          doctorDegrees: "MBBS (Osmania), MD (General Medicine - AIIMS), DM (Cardiology - PGI)",
          doctorSpecialty: "Senior Interventional Cardiologist",
          department: "Cardiology",
          appointmentDate: new Date(Date.now() + 24 * 3600 * 1000 * 2).toISOString().slice(0, 10),
          appointmentTime: "10:30 AM",
          slotPeriod: "Morning",
          consultationType: "in_person",
          consultationFee: 1200,
          hospitalServiceFee: 100,
          gstAmount: 65,
          totalAmount: 1365,
          paymentStatus: "paid",
          status: "upcoming",
          createdAt: new Date().toISOString(),
          qrCodeData: "ARG-PASS-APOLLO-9042-SREENIVASA-RAO",
        },
      ];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** Save a new appointment */
export function saveAppointment(appointment: Appointment): void {
  try {
    const list = getStoredAppointments();
    const filtered = list.filter((a) => a.id !== appointment.id);
    filtered.unshift(appointment);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  } catch (err) {
    console.error("Failed to save appointment", err);
  }
}

/** Reschedule an existing appointment */
export function rescheduleAppointment(
  appointmentId: string,
  newDate: string,
  newTime: string,
  newSlotPeriod: "Morning" | "Afternoon" | "Evening",
): Appointment | null {
  try {
    const list = getStoredAppointments();
    const target = list.find((a) => a.id === appointmentId);
    if (!target) return null;

    target.rescheduledFromDate = target.appointmentDate;
    target.rescheduledFromTime = target.appointmentTime;
    target.appointmentDate = newDate;
    target.appointmentTime = newTime;
    target.slotPeriod = newSlotPeriod;
    target.status = "upcoming";
    target.rescheduledAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return target;
  } catch {
    return null;
  }
}

/** Cancel an existing appointment */
export function cancelAppointment(
  appointmentId: string,
  reason: string,
): Appointment | null {
  try {
    const list = getStoredAppointments();
    const target = list.find((a) => a.id === appointmentId);
    if (!target) return null;

    target.status = "cancelled";
    target.cancellationReason = reason;
    target.cancelledAt = new Date().toISOString();

    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    return target;
  } catch {
    return null;
  }
}
