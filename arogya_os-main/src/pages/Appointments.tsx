import { InteractiveHospitalMap } from "@/components/appointments/InteractiveHospitalMap";
import { Caret } from "@/components/landing/terminal-window";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  calculateDistanceKm,
  cancelAppointment,
  DEFAULT_USER_LOCATION,
  DEPARTMENTS_LIST,
  DOCTORS_DIRECTORY,
  getDoctorsForHospital,
  getHospitalsWithinRadius,
  getStoredAppointments,
  HOSPITALS_DIRECTORY,
  rescheduleAppointment,
  saveAppointment,
  TIME_SLOTS,
  type Appointment,
  type ConsultationType,
  type Doctor,
  type Hospital,
} from "@/lib/appointments-store";
import { fetchLiveNearbyHospitals, reverseGeocodeLocation } from "@/lib/geo-services";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Calendar,
  CalendarCheck,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  CreditCard,
  Crosshair,
  ExternalLink,
  FileText,
  GraduationCap,
  HeartPulse,
  Languages,
  Loader2,
  MapPin,
  Navigation,
  Navigation2,
  Phone,
  QrCode,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Trash2,
  UserCheck,
  Video,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

export default function Appointments() {
  const { user, profile } = useAuth();

  // Active Main Tab: "book" | "my-appointments"
  const [activeTab, setActiveTab] = useState<"book" | "my-appointments">("book");

  // Geolocation State
  const [userLocation, setUserLocation] = useState<{
    lat: number;
    lng: number;
    label: string;
    isLive: boolean;
  }>({
    lat: DEFAULT_USER_LOCATION.lat,
    lng: DEFAULT_USER_LOCATION.lng,
    label: DEFAULT_USER_LOCATION.city,
    isLive: false,
  });
  const [isDetectingLocation, setIsDetectingLocation] = useState(false);
  const [maxRadiusKm, setMaxRadiusKm] = useState<number>(20);

  // Live Discovered Hospitals State
  const [liveHospitalsList, setLiveHospitalsList] = useState<Hospital[]>(HOSPITALS_DIRECTORY);
  const [isLoadingHospitals, setIsLoadingHospitals] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("All Departments");
  const [selectedHospital, setSelectedHospital] = useState<Hospital | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<Doctor | null>(null);

  // Booking Modal State
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStep, setBookingStep] = useState<"slot" | "patient" | "payment" | "confirmed">("slot");
  const [consultType, setConsultType] = useState<ConsultationType>("in_person");
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const tomorrow = new Date(Date.now() + 24 * 3600 * 1000);
    return tomorrow.toISOString().slice(0, 10);
  });
  const [selectedSlotPeriod, setSelectedSlotPeriod] = useState<"Morning" | "Afternoon" | "Evening">("Morning");
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string>("10:30 AM");
  const [patientName, setPatientName] = useState<string>(profile?.full_name || "Patient");
  const [patientPhone, setPatientPhone] = useState<string>(profile?.emergency_contact_phone || "+91 9876543210");
  const [patientNotes, setPatientNotes] = useState<string>("");
  const [paymentOption, setPaymentOption] = useState<"pay_now" | "pay_at_hospital">("pay_now");
  const [isSubmittingBooking, setIsSubmittingBooking] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<Appointment | null>(null);

  // Appointments List State
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [statusFilter, setStatusFilter] = useState<"all" | "upcoming" | "completed" | "cancelled">("all");

  // Reschedule Modal State
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>("");
  const [newRescheduleSlot, setNewRescheduleSlot] = useState<string>("11:00 AM");
  const [newReschedulePeriod, setNewReschedulePeriod] = useState<"Morning" | "Afternoon" | "Evening">("Morning");

  // Cancel Modal State
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState<string>("Change of schedule / plans");

  // Initial Load of Appointments & Auto-detect Live Geolocation
  useEffect(() => {
    setAppointments(getStoredAppointments());
    // Auto-detect live GPS location on mount if supported
    detectLiveLocation();
  }, []);

  // Sync profile name when loaded
  useEffect(() => {
    if (profile?.full_name) setPatientName(profile.full_name);
  }, [profile]);

  // Sync Live Nearby Hospitals whenever user location or radius changes
  useEffect(() => {
    let isCancelled = false;
    async function loadNearby() {
      setIsLoadingHospitals(true);
      try {
        const found = await fetchLiveNearbyHospitals(
          userLocation.lat,
          userLocation.lng,
          maxRadiusKm,
        );
        if (!isCancelled) {
          setLiveHospitalsList(found);
        }
      } catch (err) {
        console.error("Failed to load nearby hospitals:", err);
      } finally {
        if (!isCancelled) setIsLoadingHospitals(false);
      }
    }

    loadNearby();
    return () => {
      isCancelled = true;
    };
  }, [userLocation.lat, userLocation.lng, maxRadiusKm]);

  // Live Geolocation Detection with High-Accuracy GPS and Reverse Geocoding
  const detectLiveLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }
    setIsDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        // Fetch human-readable street/locality name
        const readableLabel = await reverseGeocodeLocation(latitude, longitude);

        setUserLocation({
          lat: latitude,
          lng: longitude,
          label: readableLabel,
          isLive: true,
        });
        setIsDetectingLocation(false);
        toast.success("Live Location Updated", {
          description: `Discovered hospitals within ${maxRadiusKm} km radius of ${readableLabel}.`,
        });
      },
      (err) => {
        console.warn("[Geolocation Warning]", err);
        setIsDetectingLocation(false);
        toast.info("Using Default Medical Hub Location", {
          description: "Location permission denied or unavailable. Centering on Hyderabad Healthcare Corridor.",
        });
      },
      { timeout: 12000, enableHighAccuracy: true, maximumAge: 0 },
    );
  };

  // Select a hospital, reset department filter, and scroll directly to doctors section
  const handleSelectHospitalAndScroll = (hosp: Hospital) => {
    setSelectedHospital(hosp);
    setSelectedDepartment("All Departments");
    toast.info(`Selected ${hosp.name}`, {
      description: `Loaded 3 to 4 specialist doctors ready for booking.`,
    });
    setTimeout(() => {
      const el = document.getElementById("doctors-section");
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 120);
  };

  // Nearby Hospitals Filtered by Geolocation Radius and Search Query
  const nearbyHospitals = useMemo(() => {
    return liveHospitalsList
      .map((hosp) => ({
        ...hosp,
        distanceKm: Number(
          calculateDistanceKm(userLocation.lat, userLocation.lng, hosp.lat, hosp.lng).toFixed(1),
        ),
      }))
      .filter((hosp) => hosp.distanceKm <= maxRadiusKm)
      .filter((hosp) => {
        const matchesSearch =
          searchQuery.trim() === "" ||
          hosp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          hosp.area.toLowerCase().includes(searchQuery.toLowerCase()) ||
          hosp.departments.some((d) => d.toLowerCase().includes(searchQuery.toLowerCase()));

        const matchesDept =
          selectedDepartment === "All Departments" || hosp.departments.includes(selectedDepartment);

        return matchesSearch && matchesDept;
      })
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [liveHospitalsList, userLocation, maxRadiusKm, searchQuery, selectedDepartment]);

  // Filtered Doctors List: returns 3-4 specialist doctors ONLY for the selected hospital
  const availableDoctors = useMemo(() => {
    if (!selectedHospital) return [];
    const pool = getDoctorsForHospital(selectedHospital);

    return pool.filter((doc) => {
      const matchesDept =
        selectedDepartment === "All Departments" || doc.department === selectedDepartment;
      const matchesSearch =
        searchQuery.trim() === "" ||
        doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.speciality.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.degrees.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.hospitalName.toLowerCase().includes(searchQuery.toLowerCase());

      return matchesDept && matchesSearch;
    });
  }, [selectedHospital, selectedDepartment, searchQuery]);

  // Filtered User Appointments
  const filteredAppointments = useMemo(() => {
    return appointments.filter((apt) => {
      if (statusFilter === "all") return true;
      return apt.status === statusFilter;
    });
  }, [appointments, statusFilter]);

  // Handle Initiating Booking
  const handleOpenBooking = (doctor: Doctor, hospital?: Hospital) => {
    const targetHosp =
      hospital ||
      selectedHospital ||
      HOSPITALS_DIRECTORY.find((h) => h.id === doctor.hospitalId) || {
        id: doctor.hospitalId,
        name: doctor.hospitalName,
        tagline: "Premier Multi-Speciality Medical Center",
        category: "Multi-Speciality" as const,
        address: "Hospital Outpatient Wing",
        area: "Healthcare Corridor",
        city: "City Center",
        lat: userLocation.lat,
        lng: userLocation.lng,
        rating: 4.8,
        reviewCount: 320,
        emergencyAvailable: true,
        icuBedsAvailable: 15,
        openHours: "24/7",
        contactNumber: "+91 040 2360 7777",
        departments: [doctor.department],
        imageUrl: "https://images.unsplash.com/photo-1586773860418-d37222d8fce3?w=600&auto=format&fit=crop&q=80",
      };

    setSelectedDoctor(doctor);
    setSelectedHospital(targetHosp);
    setBookingStep("slot");
    setIsBookingOpen(true);
  };

  // Submit and Complete Booking
  const handleConfirmBooking = async () => {
    if (!selectedDoctor || !selectedHospital) return;
    setIsSubmittingBooking(true);

    const bookingId = `ARG-APT-2026-${Math.floor(1000 + Math.random() * 9000)}`;
    const fee = consultType === "in_person" ? selectedDoctor.consultationFee : selectedDoctor.teleconsultationFee;
    const serviceFee = 100;
    const gst = Math.round(fee * 0.05);
    const total = fee + serviceFee + gst;

    const newAppointment: Appointment = {
      id: `apt_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      bookingId,
      userId: user?.id || "guest_user",
      patientName: patientName.trim() || "Patient",
      patientPhone: patientPhone.trim() || "+91 9876543210",
      hospitalId: selectedHospital.id,
      hospitalName: selectedHospital.name,
      hospitalAddress: selectedHospital.address,
      hospitalLat: selectedHospital.lat,
      hospitalLng: selectedHospital.lng,
      doctorId: selectedDoctor.id,
      doctorName: selectedDoctor.name,
      doctorDegrees: selectedDoctor.degrees,
      doctorSpecialty: selectedDoctor.speciality,
      department: selectedDoctor.department,
      appointmentDate: selectedDate,
      appointmentTime: selectedTimeSlot,
      slotPeriod: selectedSlotPeriod,
      consultationType: consultType,
      consultationFee: fee,
      hospitalServiceFee: serviceFee,
      gstAmount: gst,
      totalAmount: total,
      paymentStatus: paymentOption === "pay_now" ? "paid" : "pay_at_hospital",
      status: "upcoming",
      createdAt: new Date().toISOString(),
      qrCodeData: `AROGYA-PASS-${bookingId}-${selectedDoctor.name.replace(/\s+/g, "-")}`,
    };

    saveAppointment(newAppointment);
    setAppointments(getStoredAppointments());
    setConfirmedBooking(newAppointment);
    setBookingStep("confirmed");
    setIsSubmittingBooking(false);

    toast.success("Appointment Confirmed!", {
      description: `Your appointment with ${selectedDoctor.name} at ${selectedHospital.name} has been booked.`,
    });
  };

  // Submit Reschedule
  const handleExecuteReschedule = () => {
    if (!rescheduleTarget || !newRescheduleDate) return;
    const updated = rescheduleAppointment(
      rescheduleTarget.id,
      newRescheduleDate,
      newRescheduleSlot,
      newReschedulePeriod,
    );
    if (updated) {
      setAppointments(getStoredAppointments());
      toast.success("Appointment Rescheduled Successfully", {
        description: `New Date: ${newRescheduleDate} at ${newRescheduleSlot}`,
      });
      setRescheduleTarget(null);
    }
  };

  // Submit Cancellation
  const handleExecuteCancellation = () => {
    if (!cancelTarget) return;
    const updated = cancelAppointment(cancelTarget.id, cancellationReason);
    if (updated) {
      setAppointments(getStoredAppointments());
      toast.error("Appointment Cancelled", {
        description: `Your booking ${cancelTarget.bookingId} has been cancelled.`,
      });
      setCancelTarget(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="mx-auto max-w-6xl space-y-8"
    >
      {/* Header & Subtitle */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
            <span className="text-primary">$</span> arogya module · hospital-appointments
          </div>
          <h1 className="mt-1 flex items-center gap-2 font-mono text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Hospital & Doctor Appointments
            <Caret className="ml-1" />
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Accurate live GPS location detection, interactive OpenStreetMap radar within 20 km, specialist doctors with degrees, and slot scheduling.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex rounded-2xl bg-accent/40 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("book")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono font-medium transition-all cursor-pointer ${
              activeTab === "book"
                ? "bg-card text-foreground shadow-xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Compass className="size-3.5" /> Book Appointment
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("my-appointments")}
            className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-mono font-medium transition-all cursor-pointer ${
              activeTab === "my-appointments"
                ? "bg-card text-foreground shadow-xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CalendarClock className="size-3.5" /> My Appointments
            {appointments.filter((a) => a.status === "upcoming").length > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.2 text-[10px] font-bold text-primary-foreground">
                {appointments.filter((a) => a.status === "upcoming").length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: BOOK APPOINTMENT & DISCOVERY                                       */}
      {/* ========================================================================= */}
      {activeTab === "book" && (
        <div className="space-y-6">
          {/* Location & Radius Control Bar */}
          <div className="glass-card rounded-3xl p-5 sm:p-6 border border-border/60 space-y-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Location Badge + Auto-Detect */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-2xl border border-primary/25 bg-primary/8 px-3.5 py-2">
                  <MapPin className="size-4 text-primary shrink-0" />
                  <div className="text-xs">
                    <span className="text-muted-foreground">Location: </span>
                    <strong className="text-foreground">{userLocation.label}</strong>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={detectLiveLocation}
                  disabled={isDetectingLocation}
                  className="rounded-xl border-border/70 text-xs font-mono cursor-pointer"
                >
                  {isDetectingLocation ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin mr-1.5" /> Detecting GPS…
                    </>
                  ) : (
                    <>
                      <Crosshair className="size-3.5 text-primary mr-1.5" /> Update via Current Location
                    </>
                  )}
                </Button>
              </div>

              {/* Radius Filter Pills */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-muted-foreground">Radius:</span>
                {[5, 10, 15, 20, 30].map((radius) => (
                  <button
                    key={radius}
                    type="button"
                    onClick={() => setMaxRadiusKm(radius)}
                    className={`rounded-xl px-3 py-1 text-xs font-mono transition-all cursor-pointer ${
                      maxRadiusKm === radius
                        ? "bg-primary text-primary-foreground font-bold shadow-xs"
                        : "border border-border/60 bg-background/50 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {radius} km
                  </button>
                ))}
              </div>
            </div>

            {/* Interactive Leaflet Map Component with Real Tiles, Pins & Radar Boundary */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                <span className="flex items-center gap-1.5 text-foreground font-semibold">
                  <Navigation className="size-3.5 text-primary" /> Live Map Navigator ({nearbyHospitals.length} Hospitals in {maxRadiusKm} km Radius)
                </span>
                <span className="text-[11px] hidden sm:inline">
                  Click any marker for details & directions
                </span>
              </div>

              <InteractiveHospitalMap
                userLat={userLocation.lat}
                userLng={userLocation.lng}
                userLabel={userLocation.label}
                radiusKm={maxRadiusKm}
                hospitals={nearbyHospitals}
                selectedHospital={selectedHospital}
                onSelectHospital={(hosp) => {
                  handleSelectHospitalAndScroll(hosp);
                }}
                onRecenter={() => {
                  detectLiveLocation();
                }}
              />
            </div>

            {/* Department Filter & Search Bar */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 pt-2">
              <div className="relative sm:col-span-6 lg:col-span-7">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Search hospital, doctor, degrees, or area..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 rounded-2xl bg-background/70 font-mono text-xs"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="size-4" />
                  </button>
                )}
              </div>

              <div className="sm:col-span-6 lg:col-span-5">
                <select
                  value={selectedDepartment}
                  onChange={(e) => setSelectedDepartment(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-input bg-background/70 px-3 font-mono text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
                >
                  {DEPARTMENTS_LIST.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section: Hospitals Within 20 KM */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 font-mono text-lg font-semibold text-foreground">
                <Building2 className="size-4 text-primary" /> Hospitals within {maxRadiusKm} km ({nearbyHospitals.length})
              </h2>
              {selectedHospital && (
                <button
                  type="button"
                  onClick={() => setSelectedHospital(null)}
                  className="text-xs font-mono text-primary hover:underline cursor-pointer"
                >
                  Show all hospitals
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {nearbyHospitals.map((hosp) => {
                const isSelected = selectedHospital?.id === hosp.id;
                return (
                  <motion.div
                    key={hosp.id}
                    whileHover={{ y: -2 }}
                    className={`glass-card rounded-3xl p-5 transition-all border ${
                      isSelected
                        ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                        : "border-border/60 hover:border-primary/40"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <span className="rounded-full bg-accent/60 px-2 py-0.5 text-[10px] font-mono font-medium text-muted-foreground border border-border/50">
                          {hosp.category}
                        </span>
                        <h3 className="mt-1.5 font-mono text-sm font-bold text-foreground leading-snug">
                          {hosp.name}
                        </h3>
                      </div>
                      <span className="flex items-center gap-1 rounded-xl bg-ok/10 px-2 py-1 text-xs font-mono font-bold text-ok shrink-0">
                        <Star className="size-3 fill-ok text-ok" /> {hosp.rating}
                      </span>
                    </div>

                    <p className="mt-1 text-xs text-muted-foreground line-clamp-1">{hosp.tagline}</p>

                    <div className="mt-3 flex items-center justify-between text-xs font-mono">
                      <span className="flex items-center gap-1 text-primary font-bold">
                        <Navigation className="size-3.5" /> {hosp.distanceKm} km away
                      </span>
                      <span className="flex items-center gap-1 text-muted-foreground">
                        <MapPin className="size-3.5" /> {hosp.area}
                      </span>
                    </div>

                    <div className="mt-3.5 pt-3 border-t border-border/60 flex items-center justify-between text-[11px]">
                      {hosp.emergencyAvailable && (
                        <span className="flex items-center gap-1 text-ok font-medium">
                          <CheckCircle2 className="size-3 text-ok" /> 24/7 Emergency
                        </span>
                      )}
                      <span className="text-muted-foreground font-mono">
                        {hosp.icuBedsAvailable} ICU Beds
                      </span>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-1">
                      {hosp.departments.slice(0, 3).map((dept) => (
                        <span key={dept} className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          {dept}
                        </span>
                      ))}
                      {hosp.departments.length > 3 && (
                        <span className="rounded-md bg-muted/60 px-1.5 py-0.5 text-[10px] text-muted-foreground">
                          +{hosp.departments.length - 3}
                        </span>
                      )}
                    </div>

                    {/* Hospital Card Actions: Directions (Google Maps) & Select */}
                    <div className="mt-4 pt-3 border-t border-border/60 flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${hosp.lat},${hosp.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-background/80 py-2 text-xs font-mono font-medium text-muted-foreground hover:text-foreground hover:bg-accent/40 transition-all"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="size-3" />
                        <span>Google Maps</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          if (isSelected) {
                            setSelectedHospital(null);
                          } else {
                            handleSelectHospitalAndScroll(hosp);
                          }
                        }}
                        className={`flex-1 rounded-xl py-2 text-xs font-mono font-semibold transition-all cursor-pointer ${
                          isSelected
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground"
                        }`}
                      >
                        {isSelected ? "Selected ✓" : "View Doctors"}
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>


          {/* Section: Doctors Directory with Credentials & Degrees */}
          <div id="doctors-section" className="space-y-4 pt-2">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="flex items-center gap-2 font-mono text-lg font-semibold text-foreground">
                  <Stethoscope className="size-4 text-primary" /> Specialist Doctors {selectedHospital ? `(${availableDoctors.length})` : ""}
                </h2>
                <p className="text-xs text-muted-foreground">
                  {selectedHospital
                    ? `Verified specialist physicians practicing at ${selectedHospital.name}.`
                    : "Select a hospital above and click 'Select & View Doctors' to view available physicians."}
                </p>
              </div>

              {selectedHospital && (
                <button
                  type="button"
                  onClick={() => setSelectedHospital(null)}
                  className="rounded-xl border border-border/70 bg-card px-3 py-1.5 text-xs font-mono text-muted-foreground hover:text-foreground transition-all cursor-pointer"
                >
                  Clear Hospital Filter ✕
                </button>
              )}
            </div>

            {/* Active Selected Hospital Banner */}
            {selectedHospital && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-primary/30 bg-primary/8 px-4 py-3"
              >
                <div className="flex items-center gap-2 text-xs font-mono text-foreground">
                  <Building2 className="size-4 text-primary shrink-0" />
                  <span>
                    Showing <strong>{availableDoctors.length} Demo Specialists</strong> practicing at <strong>{selectedHospital.name}</strong>
                  </span>
                </div>
                <Badge variant="outline" className="border-primary/40 bg-primary/10 text-primary text-[10px] font-mono">
                  3-4 Specialists Available
                </Badge>
              </motion.div>
            )}

            {/* If NO hospital is selected yet, prompt user to select a hospital */}
            {!selectedHospital ? (
              <div className="glass-card rounded-3xl p-8 sm:p-12 text-center border border-dashed border-border/80 space-y-4">
                <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Building2 className="size-7" />
                </div>
                <div className="max-w-md mx-auto space-y-1.5">
                  <h3 className="font-mono text-base font-bold text-foreground">
                    Select a Hospital to View Doctors
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Click on any hospital pin on the interactive map or click <span className="font-semibold text-primary font-mono">"View Doctors"</span> on any hospital card above to see the 3 to 4 specialist doctors available for booking.
                  </p>
                </div>
                {nearbyHospitals.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectHospitalAndScroll(nearbyHospitals[0])}
                    className="rounded-xl border-primary/40 text-primary text-xs font-mono hover:bg-primary/10 cursor-pointer"
                  >
                    <Building2 className="size-3.5 mr-1.5" />
                    Select Nearest: {nearbyHospitals[0].name.split(" ")[0]} ({nearbyHospitals[0].distanceKm} km away)
                  </Button>
                )}
              </div>
            ) : availableDoctors.length === 0 ? (
              <div className="glass-card rounded-3xl p-10 text-center border border-border/60 space-y-3">
                <Stethoscope className="mx-auto size-10 text-muted-foreground/40" />
                <h3 className="font-mono text-sm font-semibold">No doctors found for this filter</h3>
                <p className="text-xs text-muted-foreground">
                  Try clearing your search or switching departments to see all specialists at this hospital.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectedDepartment("All Departments");
                    setSearchQuery("");
                  }}
                  className="rounded-xl text-xs font-mono cursor-pointer"
                >
                  Reset Department Filter
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {availableDoctors.map((doc) => (
                  <motion.div
                    key={doc.id}
                    whileHover={{ y: -2 }}
                    className="glass-card rounded-3xl p-5 border border-border/60 flex flex-col justify-between space-y-4"
                  >
                    <div className="flex items-start gap-4">
                      {/* Doctor Avatar */}
                      <img
                        src={doc.avatarUrl}
                        alt={doc.name}
                        className="size-16 rounded-2xl object-cover border border-border/80 shrink-0 shadow-xs"
                      />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="font-mono text-base font-bold text-foreground leading-snug">
                              {doc.name}
                            </h3>
                            <p className="text-xs font-medium text-primary">{doc.speciality}</p>
                          </div>
                          <span className="flex items-center gap-1 rounded-xl bg-ok/10 px-2 py-0.5 text-xs font-mono font-bold text-ok shrink-0">
                            <Star className="size-3 fill-ok text-ok" /> {doc.rating}
                          </span>
                        </div>

                        {/* Education Details with Icon */}
                        <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground bg-accent/30 p-2 rounded-xl border border-border/40">
                          <GraduationCap className="size-4 text-primary shrink-0 mt-0.5" />
                          <span className="font-mono leading-tight">
                            <strong>Education:</strong> {doc.degrees}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Sub-speciality & Experience */}
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono pt-1">
                      <div className="rounded-xl bg-background/50 p-2 border border-border/40">
                        <span className="text-muted-foreground block text-[10px]">Experience</span>
                        <strong className="text-foreground">{doc.experienceYears}+ Years Clinical</strong>
                      </div>
                      <div className="rounded-xl bg-background/50 p-2 border border-border/40">
                        <span className="text-muted-foreground block text-[10px]">Hospital</span>
                        <strong className="text-foreground truncate block">{doc.hospitalName}</strong>
                      </div>
                    </div>

                    {/* Languages & Consultation Fee */}
                    <div className="flex items-center justify-between border-t border-border/60 pt-3">
                      <div>
                        <span className="text-[11px] text-muted-foreground block">Consultation Fee</span>
                        <span className="font-mono text-base font-bold text-foreground">
                          ₹{doc.consultationFee}{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">(In-Person)</span>
                        </span>
                      </div>

                      <Button
                        type="button"
                        onClick={() => handleOpenBooking(doc)}
                        className="rounded-xl font-mono text-xs font-semibold cursor-pointer shadow-xs"
                      >
                        <CalendarCheck className="size-3.5 mr-1.5" /> Book Slot
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: MY APPOINTMENTS & RESCHEDULE / CANCEL                              */}
      {/* ========================================================================= */}
      {activeTab === "my-appointments" && (
        <div className="space-y-6">
          {/* Status Filter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              {(["all", "upcoming", "completed", "cancelled"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`rounded-xl px-3.5 py-1.5 text-xs font-mono font-medium transition-all cursor-pointer capitalize ${
                    statusFilter === st
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "border border-border/60 bg-background/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveTab("book")}
              className="rounded-xl text-xs font-mono cursor-pointer"
            >
              <Compass className="size-3.5 mr-1.5" /> Book New Appointment
            </Button>
          </div>

          {filteredAppointments.length === 0 ? (
            <div className="glass-card rounded-3xl p-12 text-center border border-border/60 space-y-3">
              <CalendarClock className="mx-auto size-12 text-muted-foreground/30" />
              <h3 className="font-mono text-base font-semibold">No appointments found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                You do not have any {statusFilter !== "all" ? statusFilter : ""} appointments scheduled at this moment.
              </p>
              <Button
                type="button"
                onClick={() => setActiveTab("book")}
                className="rounded-xl text-xs font-mono font-semibold cursor-pointer mt-2"
              >
                Find & Book a Doctor
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredAppointments.map((apt) => {
                const isUpcoming = apt.status === "upcoming";
                const isCancelled = apt.status === "cancelled";

                return (
                  <motion.div
                    key={apt.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-card rounded-3xl p-5 sm:p-6 border border-border/60 space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3.5">
                      <div className="flex items-center gap-3">
                        <span className="rounded-xl bg-primary/10 p-2.5 text-primary border border-primary/20">
                          {apt.consultationType === "teleconsult" ? (
                            <Video className="size-5" />
                          ) : (
                            <Building2 className="size-5" />
                          )}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-foreground">{apt.bookingId}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-[10px] font-mono font-bold capitalize ${
                                isUpcoming
                                  ? "bg-ok/15 text-ok border border-ok/30"
                                  : isCancelled
                                  ? "bg-crit/15 text-crit border border-crit/30"
                                  : "bg-muted/80 text-muted-foreground"
                              }`}
                            >
                              {apt.status}
                            </span>
                          </div>
                          <span className="text-[11px] text-muted-foreground font-mono">
                            Booked on {new Date(apt.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="font-mono text-sm font-bold text-foreground">₹{apt.totalAmount}</span>
                        <span className="block text-[10px] font-mono text-ok uppercase font-semibold">
                          {apt.paymentStatus === "paid" ? "Paid Online" : "Pay at Hospital"}
                        </span>
                      </div>
                    </div>

                    {/* Appointment Details Grid */}
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
                      {/* Doctor Info */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-mono text-[10px] uppercase">Doctor</span>
                        <strong className="block text-foreground font-mono text-sm">{apt.doctorName}</strong>
                        <p className="text-primary text-[11px]">{apt.doctorSpecialty}</p>
                        <p className="text-muted-foreground text-[10px] font-mono line-clamp-1">{apt.doctorDegrees}</p>
                      </div>

                      {/* Hospital Info */}
                      <div className="space-y-1">
                        <span className="text-muted-foreground font-mono text-[10px] uppercase">Hospital & Center</span>
                        <strong className="block text-foreground font-mono text-sm">{apt.hospitalName}</strong>
                        <p className="text-muted-foreground text-[11px] flex items-center gap-1">
                          <MapPin className="size-3 text-muted-foreground shrink-0" /> {apt.hospitalAddress}
                        </p>
                      </div>

                      {/* Timing & Type */}
                      <div className="space-y-1 bg-accent/30 p-3 rounded-2xl border border-border/40">
                        <span className="text-muted-foreground font-mono text-[10px] uppercase">Scheduled Time</span>
                        <div className="flex items-center gap-1.5 font-mono text-sm font-bold text-foreground">
                          <Calendar className="size-3.5 text-primary" /> {apt.appointmentDate}
                        </div>
                        <div className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground">
                          <Clock className="size-3 text-primary" /> {apt.appointmentTime} ({apt.slotPeriod})
                        </div>
                        {apt.rescheduledFromDate && (
                          <p className="text-[10px] text-amber-500 font-mono">
                            Rescheduled from {apt.rescheduledFromDate}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Cancellation Note if cancelled */}
                    {isCancelled && apt.cancellationReason && (
                      <div className="rounded-2xl border border-crit/30 bg-crit/5 p-3 text-xs text-crit flex items-center gap-2 font-mono">
                        <AlertCircle className="size-4 shrink-0" />
                        <span>Reason for Cancellation: <strong>{apt.cancellationReason}</strong></span>
                      </div>
                    )}

                    {/* Actions: Reschedule & Cancel */}
                    {isUpcoming && (
                      <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-border/60">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleTarget(apt);
                            setNewRescheduleDate(apt.appointmentDate);
                            setNewRescheduleSlot(apt.appointmentTime);
                            setNewReschedulePeriod(apt.slotPeriod);
                          }}
                          className="rounded-xl text-xs font-mono cursor-pointer"
                        >
                          <RefreshCw className="size-3.5 mr-1.5" /> Reschedule
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setCancelTarget(apt)}
                          className="rounded-xl text-xs font-mono text-crit hover:bg-crit/10 border-crit/30 cursor-pointer"
                        >
                          <XCircle className="size-3.5 mr-1.5" /> Cancel Booking
                        </Button>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: BOOKING & CONFIRMATION FLOW                                      */}
      {/* ========================================================================= */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="sm:max-w-xl rounded-3xl p-6 border-border/80 bg-card">
          {bookingStep === "slot" && selectedDoctor && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="font-mono text-lg font-bold">Choose Timing & Consultation</DialogTitle>
                <DialogDescription className="text-xs">
                  Booking with <strong>{selectedDoctor.name}</strong> ({selectedDoctor.speciality})
                </DialogDescription>
              </DialogHeader>

              {/* Consultation Type Toggle */}
              <div className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-accent/40 border border-border/60">
                <button
                  type="button"
                  onClick={() => setConsultType("in_person")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono font-medium cursor-pointer transition-all ${
                    consultType === "in_person"
                      ? "bg-card text-foreground shadow-xs border border-border/80 font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  <Building2 className="size-3.5" /> In-Person Clinic Visit (₹{selectedDoctor.consultationFee})
                </button>
                <button
                  type="button"
                  onClick={() => setConsultType("teleconsult")}
                  className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono font-medium cursor-pointer transition-all ${
                    consultType === "teleconsult"
                      ? "bg-card text-foreground shadow-xs border border-border/80 font-bold"
                      : "text-muted-foreground"
                  }`}
                >
                  <Video className="size-3.5" /> Video Tele-Consult (₹{selectedDoctor.teleconsultationFee})
                </button>
              </div>

              {/* Date Selection */}
              <div>
                <label className="text-xs font-mono text-muted-foreground block mb-1.5">Select Appointment Date</label>
                <Input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                />
              </div>

              {/* Time Slots Selection */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-mono text-muted-foreground">Select Time Slot</label>
                  <div className="flex gap-1.5">
                    {(["Morning", "Afternoon", "Evening"] as const).map((period) => (
                      <button
                        key={period}
                        type="button"
                        onClick={() => setSelectedSlotPeriod(period)}
                        className={`rounded-lg px-2.5 py-1 text-[11px] font-mono cursor-pointer transition-all ${
                          selectedSlotPeriod === period
                            ? "bg-primary/15 text-primary font-bold border border-primary/30"
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {period}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {TIME_SLOTS[selectedSlotPeriod].map((slot) => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setSelectedTimeSlot(slot)}
                      className={`rounded-xl py-2 text-xs font-mono transition-all cursor-pointer border ${
                        selectedTimeSlot === slot
                          ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                          : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground hover:border-primary/40"
                      }`}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  onClick={() => setBookingStep("patient")}
                  className="w-full h-11 rounded-xl font-mono text-xs font-bold cursor-pointer"
                >
                  Continue to Patient Details <ChevronRight className="size-4 ml-1" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {bookingStep === "patient" && selectedDoctor && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="font-mono text-lg font-bold">Patient Details</DialogTitle>
                <DialogDescription className="text-xs">
                  Confirm patient details for slot on <strong>{selectedDate} at {selectedTimeSlot}</strong>
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-mono text-muted-foreground block mb-1">Full Name</label>
                  <Input
                    type="text"
                    value={patientName}
                    onChange={(e) => setPatientName(e.target.value)}
                    placeholder="Patient full name"
                    className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-muted-foreground block mb-1">Mobile Number (For SMS Updates)</label>
                  <Input
                    type="text"
                    value={patientPhone}
                    onChange={(e) => setPatientPhone(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-mono text-muted-foreground block mb-1">Reason for Consultation / Symptoms (Optional)</label>
                  <Input
                    type="text"
                    value={patientNotes}
                    onChange={(e) => setPatientNotes(e.target.value)}
                    placeholder="e.g. Chest discomfort, routine checkup, report review"
                    className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                  />
                </div>
              </div>

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingStep("slot")}
                  className="h-11 rounded-xl font-mono text-xs cursor-pointer"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={() => setBookingStep("payment")}
                  className="flex-1 h-11 rounded-xl font-mono text-xs font-bold cursor-pointer"
                >
                  Proceed to Payment Summary <ChevronRight className="size-4 ml-1" />
                </Button>
              </DialogFooter>
            </div>
          )}

          {bookingStep === "payment" && selectedDoctor && selectedHospital && (
            <div className="space-y-4">
              <DialogHeader>
                <DialogTitle className="font-mono text-lg font-bold">Review & Confirm Booking</DialogTitle>
                <DialogDescription className="text-xs">
                  Summary of your booking charges and payment method.
                </DialogDescription>
              </DialogHeader>

              {/* Summary Card */}
              <div className="rounded-2xl border border-border/60 bg-accent/30 p-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Doctor:</span>
                  <strong>{selectedDoctor.name}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Speciality:</span>
                  <span>{selectedDoctor.speciality}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hospital:</span>
                  <span className="truncate max-w-[200px]">{selectedHospital.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Slot:</span>
                  <strong className="text-primary">{selectedDate} · {selectedTimeSlot}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consultation Type:</span>
                  <span className="capitalize">{consultType.replace("_", " ")}</span>
                </div>
              </div>

              {/* Fee Breakdown */}
              <div className="rounded-2xl border border-border/60 bg-background/60 p-4 space-y-2 text-xs font-mono">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Consultation Fee</span>
                  <span>₹{consultType === "in_person" ? selectedDoctor.consultationFee : selectedDoctor.teleconsultationFee}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Hospital Facility & Registration</span>
                  <span>₹100</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Applicable Taxes (GST 5%)</span>
                  <span>₹{Math.round((consultType === "in_person" ? selectedDoctor.consultationFee : selectedDoctor.teleconsultationFee) * 0.05)}</span>
                </div>
                <div className="flex justify-between border-t border-border/60 pt-2 text-sm font-bold text-foreground">
                  <span>Total Amount Payable</span>
                  <span className="text-primary">
                    ₹
                    {(consultType === "in_person" ? selectedDoctor.consultationFee : selectedDoctor.teleconsultationFee) +
                      100 +
                      Math.round((consultType === "in_person" ? selectedDoctor.consultationFee : selectedDoctor.teleconsultationFee) * 0.05)}
                  </span>
                </div>
              </div>

              {/* Payment Mode Selection */}
              <div className="space-y-2">
                <label className="text-xs font-mono text-muted-foreground block">Select Payment Option</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentOption("pay_now")}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono font-medium cursor-pointer border ${
                      paymentOption === "pay_now"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    <CreditCard className="size-3.5" /> Pay Online (UPI / Card)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentOption("pay_at_hospital")}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-mono font-medium cursor-pointer border ${
                      paymentOption === "pay_at_hospital"
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border/60 text-muted-foreground"
                    }`}
                  >
                    <Building2 className="size-3.5" /> Pay at Hospital Desk
                  </button>
                </div>
              </div>

              <DialogFooter className="pt-2 flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBookingStep("patient")}
                  className="h-11 rounded-xl font-mono text-xs cursor-pointer"
                >
                  Back
                </Button>
                <Button
                  type="button"
                  disabled={isSubmittingBooking}
                  onClick={handleConfirmBooking}
                  className="flex-1 h-11 rounded-xl font-mono text-xs font-bold cursor-pointer"
                >
                  {isSubmittingBooking ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" /> Confirming…
                    </>
                  ) : (
                    "Confirm & Generate Pass"
                  )}
                </Button>
              </DialogFooter>
            </div>
          )}

          {bookingStep === "confirmed" && confirmedBooking && (
            <div className="space-y-4 text-center py-2">
              <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-ok/15 text-ok border border-ok/30">
                <CheckCircle2 className="size-8 text-ok" />
              </div>

              <div>
                <h3 className="font-mono text-xl font-bold text-foreground">Appointment Confirmed!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Your digital medical appointment pass is ready. Please arrive 15 minutes before your scheduled slot.
                </p>
              </div>

              {/* Digital Pass with QR */}
              <div className="rounded-3xl border border-primary/30 bg-primary/5 p-5 text-left font-mono text-xs space-y-3 shadow-sm">
                <div className="flex items-center justify-between border-b border-primary/20 pb-2.5">
                  <div>
                    <span className="text-[10px] text-muted-foreground block">PASS ID</span>
                    <strong className="text-sm text-foreground">{confirmedBooking.bookingId}</strong>
                  </div>
                  <QrCode className="size-10 text-primary p-1 bg-background rounded-xl border border-border/60" />
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">DOCTOR & SPECIALITY</span>
                  <strong className="text-foreground block">{confirmedBooking.doctorName}</strong>
                  <span className="text-primary text-[11px]">{confirmedBooking.doctorSpecialty}</span>
                </div>

                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground block">HOSPITAL LOCATION</span>
                  <strong className="text-foreground block">{confirmedBooking.hospitalName}</strong>
                  <span className="text-muted-foreground text-[10px]">{confirmedBooking.hospitalAddress}</span>
                </div>

                <div className="flex justify-between pt-2 border-t border-primary/20 text-[11px]">
                  <span>Date: <strong>{confirmedBooking.appointmentDate}</strong></span>
                  <span>Time: <strong>{confirmedBooking.appointmentTime}</strong></span>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsBookingOpen(false);
                    setActiveTab("my-appointments");
                  }}
                  className="w-full h-11 rounded-xl font-mono text-xs font-semibold cursor-pointer"
                >
                  View in My Appointments
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 2: RESCHEDULE APPOINTMENT                                           */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(rescheduleTarget)} onOpenChange={(open) => !open && setRescheduleTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-border/80 bg-card">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg font-bold">Reschedule Appointment</DialogTitle>
            <DialogDescription className="text-xs">
              Select a new date and time slot for booking <strong>{rescheduleTarget?.bookingId}</strong> with{" "}
              {rescheduleTarget?.doctorName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">Select New Date</label>
              <Input
                type="date"
                value={newRescheduleDate}
                min={new Date().toISOString().slice(0, 10)}
                onChange={(e) => setNewRescheduleDate(e.target.value)}
                className="h-11 rounded-xl bg-background/70 font-mono text-xs"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-mono text-muted-foreground">Select New Slot</label>
                <div className="flex gap-1">
                  {(["Morning", "Afternoon", "Evening"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setNewReschedulePeriod(p)}
                      className={`rounded-lg px-2 py-0.5 text-[10px] font-mono cursor-pointer ${
                        newReschedulePeriod === p ? "bg-primary text-primary-foreground font-bold" : "text-muted-foreground"
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                {TIME_SLOTS[newReschedulePeriod].map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setNewRescheduleSlot(slot)}
                    className={`rounded-xl py-2 text-xs font-mono transition-all cursor-pointer border ${
                      newRescheduleSlot === slot
                        ? "border-primary bg-primary text-primary-foreground font-bold shadow-xs"
                        : "border-border/60 bg-background/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setRescheduleTarget(null)}
              className="h-11 rounded-xl font-mono text-xs cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleExecuteReschedule}
              className="flex-1 h-11 rounded-xl font-mono text-xs font-bold cursor-pointer"
            >
              Confirm Reschedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ========================================================================= */}
      {/* MODAL 3: CANCEL APPOINTMENT                                               */}
      {/* ========================================================================= */}
      <Dialog open={Boolean(cancelTarget)} onOpenChange={(open) => !open && setCancelTarget(null)}>
        <DialogContent className="sm:max-w-md rounded-3xl p-6 border-border/80 bg-card">
          <DialogHeader>
            <DialogTitle className="font-mono text-lg font-bold text-crit flex items-center gap-2">
              <AlertCircle className="size-5" /> Cancel Appointment
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to cancel booking <strong>{cancelTarget?.bookingId}</strong>?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-2xl border border-crit/30 bg-crit/5 p-3.5 text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-crit">Refund & Cancellation Policy:</p>
              <p>• 100% refund initiated for online payments within 24-48 business hours.</p>
              <p>• Free cancellation up to 2 hours prior to scheduled consultation.</p>
            </div>

            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-1">Reason for Cancellation</label>
              <select
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                className="h-11 w-full rounded-xl border border-input bg-background/70 px-3 font-mono text-xs text-foreground focus:outline-none cursor-pointer"
              >
                <option value="Change of schedule / plans">Change of schedule / plans</option>
                <option value="Consulted another doctor">Consulted another doctor</option>
                <option value="Feeling better / symptoms resolved">Feeling better / symptoms resolved</option>
                <option value="Doctor requested reschedule">Doctor requested reschedule</option>
                <option value="Personal emergency">Personal emergency</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <DialogFooter className="pt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(null)}
              className="h-11 rounded-xl font-mono text-xs cursor-pointer"
            >
              Keep Appointment
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleExecuteCancellation}
              className="flex-1 h-11 rounded-xl font-mono text-xs font-bold cursor-pointer"
            >
              Confirm Cancellation
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
