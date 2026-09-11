import { AuthShell } from "@/components/auth/auth-shell";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/use-auth";
import {
  sendOtpToEmail,
  verifyEmailOtp,
  createAccountAfterOtp,
} from "@/lib/smtp-otp-service";
import {
  sendTwoFactorPhoneOtp,
  verifyTwoFactorPhoneOtp,
  createAccountViaPhoneOnly,
} from "@/lib/two-factor-service";
import { zodResolver } from "@hookform/resolvers/zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Mail,
  Phone,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

// Schema for Email OTP - Step 1
const emailSignupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Please enter your full name")
    .max(80, "Name is too long"),
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address"),
});
type EmailSignupValues = z.infer<typeof emailSignupSchema>;

// Schema for Mobile OTP - Step 1
const phoneSignupSchema = z.object({
  fullName: z
    .string()
    .min(2, "Please enter your full name")
    .max(80, "Name is too long"),
  phone: z
    .string()
    .min(10, "Enter a valid 10-digit mobile number")
    .max(15, "Phone number is too long")
    .regex(/^[0-9+\s-]+$/, "Enter a valid phone number"),
});
type PhoneSignupValues = z.infer<typeof phoneSignupSchema>;

// Schema for Password - Step 3
const passwordStepSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[a-zA-Z]/, "Password must contain at least one letter")
      .regex(/[0-9]/, "Password must contain at least one number"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords don't match",
  });
type PasswordStepValues = z.infer<typeof passwordStepSchema>;

export default function Signup() {
  const { isLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Selected Channel: "email" (Through Email OTP) or "phone" (Through Mobile OTP)
  const [channel, setChannel] = useState<"email" | "phone">("email");

  // Sub-step: "enter-details" -> "enter-otp" -> "set-password"
  const [step, setStep] = useState<"enter-details" | "enter-otp" | "set-password">("enter-details");

  // User details
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // OTP State
  const [otpDigits, setOtpDigits] = useState(["", "", "", "", "", ""]);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Forms
  const emailForm = useForm<EmailSignupValues>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: { fullName: "", email: "" },
  });

  const phoneForm = useForm<PhoneSignupValues>({
    resolver: zodResolver(phoneSignupSchema),
    defaultValues: { fullName: "", phone: "" },
  });

  const passwordForm = useForm<PasswordStepValues>({
    resolver: zodResolver(passwordStepSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  // Redirect if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Resend Countdown Timer
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  /* ------------------------------------------------------------- */
  /* STEP 1: Send OTP to Email OR Mobile                           */
  /* ------------------------------------------------------------- */
  const onSendEmailOtp = async (values: EmailSignupValues) => {
    setIsSendingOtp(true);
    try {
      const res = await sendOtpToEmail(values.email, values.fullName);
      setFullName(values.fullName);
      setEmail(values.email);
      setStep("enter-otp");
      setOtpDigits(["", "", "", "", "", ""]);
      setResendTimer(60);

      toast.success("Security OTP Dispatched", {
        description: res.message,
      });

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dispatch email OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const onSendPhoneOtp = async (values: PhoneSignupValues) => {
    setIsSendingOtp(true);
    try {
      const res = await sendTwoFactorPhoneOtp(values.phone);
      setFullName(values.fullName);
      setPhone(values.phone);
      setStep("enter-otp");
      setOtpDigits(["", "", "", "", "", ""]);
      setResendTimer(60);

      toast.success("SMS OTP Dispatched", {
        description: res.message,
      });

      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 300);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to dispatch mobile OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  /* ------------------------------------------------------------- */
  /* STEP 2: Resend OTP                                            */
  /* ------------------------------------------------------------- */
  const handleResendOtp = async () => {
    if (resendTimer > 0) return;
    setIsSendingOtp(true);
    try {
      if (channel === "email") {
        const res = await sendOtpToEmail(email, fullName);
        setResendTimer(60);
        toast.success(`Fresh OTP sent to ${email}`, { description: res.message });
      } else {
        const res = await sendTwoFactorPhoneOtp(phone);
        setResendTimer(60);
        toast.success(`Fresh SMS OTP sent to +91 ${phone.replace(/\D/g, "").slice(-10)}`, {
          description: res.message,
        });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not resend OTP.");
    } finally {
      setIsSendingOtp(false);
    }
  };

  /* ------------------------------------------------------------- */
  /* STEP 2: Verify OTP                                            */
  /* ------------------------------------------------------------- */
  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const enteredCode = otpDigits.join("");
    if (enteredCode.length !== 6) {
      toast.error("Please enter all 6 digits of the OTP code.");
      return;
    }

    setIsVerifyingOtp(true);
    try {
      if (channel === "email") {
        await verifyEmailOtp(email, enteredCode);
        toast.success("Email Verified Successfully! ✅", {
          description: "Now set your account password.",
        });
      } else {
        await verifyTwoFactorPhoneOtp(phone, enteredCode);
        toast.success("Mobile Phone Verified Successfully! ✅", {
          description: "Now set your account password.",
        });
      }
      setStep("set-password");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid or expired OTP code.");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  /* ------------------------------------------------------------- */
  /* STEP 3: Set Password & Create Account                         */
  /* ------------------------------------------------------------- */
  const onFinalizeAccount = async (values: PasswordStepValues) => {
    setIsCreatingAccount(true);
    try {
      if (channel === "email") {
        const result = await createAccountAfterOtp(fullName, email, values.password);
        toast.success("Account Created & Stored in Database!", {
          description: result.message,
        });
      } else {
        const result = await createAccountViaPhoneOnly(fullName, phone, values.password);
        toast.success("Account Created & Stored in Database!", {
          description: result.message,
        });
      }
      navigate("/onboarding", { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to create account.");
    } finally {
      setIsCreatingAccount(false);
    }
  };

  const handleDigitChange = (index: number, val: string) => {
    const sanitized = val.replace(/\D/g, "");
    if (!sanitized) {
      const copy = [...otpDigits];
      copy[index] = "";
      setOtpDigits(copy);
      return;
    }

    if (sanitized.length === 1) {
      const copy = [...otpDigits];
      copy[index] = sanitized;
      setOtpDigits(copy);
      if (index < 5) otpInputRefs.current[index + 1]?.focus();
    } else if (sanitized.length === 6) {
      const copy = sanitized.split("").slice(0, 6);
      setOtpDigits(copy);
      otpInputRefs.current[5]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpDigits[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  return (
    <AuthShell
      title="Create your account"
      subtitle="Verify your identity with a secure OTP sent to your Email or Mobile."
    >
      {/* Top Channel Toggle: Email OTP vs Mobile Phone OTP */}
      {step === "enter-details" && (
        <div className="mb-6 grid grid-cols-2 rounded-2xl bg-accent/40 p-1 border border-border/60">
          <button
            type="button"
            onClick={() => setChannel("email")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-mono font-medium transition-all cursor-pointer ${
              channel === "email"
                ? "bg-card text-foreground shadow-xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Mail className="size-3.5" /> Through Email OTP
          </button>
          <button
            type="button"
            onClick={() => setChannel("phone")}
            className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-mono font-medium transition-all cursor-pointer ${
              channel === "phone"
                ? "bg-card text-foreground shadow-xs border border-border/80 font-semibold"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Phone className="size-3.5" /> Through Mobile OTP
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ========================================================= */}
        {/* STEP 1: Enter Details (Email OR Mobile)                   */}
        {/* ========================================================= */}
        {step === "enter-details" && channel === "email" && (
          <motion.div
            key="step-email-details"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            <Form {...emailForm}>
              <form onSubmit={emailForm.handleSubmit(onSendEmailOtp)} className="space-y-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
                  <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    We will send a secure <strong>6-digit OTP</strong> to your email address.
                  </span>
                </div>

                <FormField
                  control={emailForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Priya Sharma"
                          autoComplete="name"
                          disabled={isSendingOtp}
                          className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={emailForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono">Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="you@gmail.com"
                          autoComplete="email"
                          inputMode="email"
                          disabled={isSendingOtp}
                          className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSendingOtp}
                  className="h-11 w-full rounded-xl text-xs font-mono font-semibold cursor-pointer"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sending OTP to Email…
                    </>
                  ) : (
                    "Send OTP to Email"
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        )}

        {step === "enter-details" && channel === "phone" && (
          <motion.div
            key="step-phone-details"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            <Form {...phoneForm}>
              <form onSubmit={phoneForm.handleSubmit(onSendPhoneOtp)} className="space-y-4">
                <div className="rounded-2xl border border-primary/20 bg-primary/5 p-3.5 text-xs text-muted-foreground flex items-start gap-2.5">
                  <ShieldCheck className="size-4 text-primary shrink-0 mt-0.5" />
                  <span>
                    We will send a secure <strong>6-digit SMS OTP</strong> to your mobile phone via 2Factor API.
                  </span>
                </div>

                <FormField
                  control={phoneForm.control}
                  name="fullName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono">Full Name</FormLabel>
                      <FormControl>
                        <Input
                          type="text"
                          placeholder="Priya Sharma"
                          autoComplete="name"
                          disabled={isSendingOtp}
                          className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={phoneForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono">Mobile Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+91 98765 43210"
                          autoComplete="tel"
                          inputMode="tel"
                          disabled={isSendingOtp}
                          className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isSendingOtp}
                  className="h-11 w-full rounded-xl text-xs font-mono font-semibold cursor-pointer"
                >
                  {isSendingOtp ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Sending SMS OTP to Mobile…
                    </>
                  ) : (
                    "Send OTP to Mobile"
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 2: Verify 6-Digit OTP                                */}
        {/* ========================================================= */}
        {step === "enter-otp" && (
          <motion.div
            key="step-enter-otp"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStep("enter-details")}
                  className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
                >
                  <ArrowLeft className="size-3" /> Back
                </button>
                <span className="text-[11px] font-mono text-primary truncate max-w-[190px]">
                  {channel === "email" ? email : `+91 ${phone.replace(/\D/g, "").slice(-10)}`}
                </span>
              </div>

              <div className="text-center space-y-1">
                <h4 className="text-xs font-mono font-semibold text-foreground">
                  Enter 6-Digit {channel === "email" ? "Email" : "Mobile SMS"} Code
                </h4>
                <p className="text-[11px] text-muted-foreground">
                  {channel === "email" ? (
                    <>We sent a verification code to <strong>{email}</strong>.</>
                  ) : (
                    <>We sent an SMS code to <strong>+91 {phone.replace(/\D/g, "").slice(-10)}</strong>.</>
                  )}
                </p>
              </div>

              {/* 6 Discrete Digit Inputs */}
              <div className="flex items-center justify-center gap-2">
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => {
                      otpInputRefs.current[idx] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="size-11 rounded-xl border border-border/80 bg-background text-center font-mono text-lg font-bold text-foreground focus:border-primary focus:outline-hidden focus:ring-2 focus:ring-primary/20 shadow-xs"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>

              <div className="flex items-center justify-between text-xs font-mono text-muted-foreground pt-1">
                <span>Expires in 10 mins</span>
                <button
                  type="button"
                  disabled={resendTimer > 0 || isSendingOtp}
                  onClick={handleResendOtp}
                  className={`flex items-center gap-1 cursor-pointer transition-colors ${
                    resendTimer > 0 ? "opacity-50 cursor-not-allowed" : "text-primary hover:underline"
                  }`}
                >
                  <RefreshCw className={`size-3 ${isSendingOtp ? "animate-spin" : ""}`} />
                  {resendTimer > 0 ? `Resend in ${resendTimer}s` : "Resend OTP"}
                </button>
              </div>

              <Button
                type="submit"
                disabled={isVerifyingOtp || otpDigits.join("").length !== 6}
                className="h-11 w-full rounded-xl text-xs font-mono font-semibold cursor-pointer"
              >
                {isVerifyingOtp ? (
                  <>
                    <Loader2 className="size-4 animate-spin mr-2" />
                    Verifying Code…
                  </>
                ) : (
                  "Verify Code"
                )}
              </Button>
            </form>
          </motion.div>
        )}

        {/* ========================================================= */}
        {/* STEP 3: Set Password & Create Account                     */}
        {/* ========================================================= */}
        {step === "set-password" && (
          <motion.div
            key="step-set-password"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onFinalizeAccount)} className="space-y-4">
                <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3.5 text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-2.5">
                  <CheckCircle2 className="size-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block mb-0.5">OTP Verified Successfully!</strong>
                    <span>
                      {channel === "email" ? (
                        <>Email <strong>{email}</strong> is confirmed.</>
                      ) : (
                        <>Mobile <strong>+91 {phone.replace(/\D/g, "").slice(-10)}</strong> is confirmed.</>
                      )}{" "}
                      Set your secure password to complete account creation.
                    </span>
                  </div>
                </div>

                <FormField
                  control={passwordForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono">Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="8+ characters, letters & numbers"
                          autoComplete="new-password"
                          disabled={isCreatingAccount}
                          className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-mono">Confirm Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Repeat password"
                          autoComplete="new-password"
                          disabled={isCreatingAccount}
                          className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  disabled={isCreatingAccount}
                  className="h-11 w-full rounded-xl text-xs font-mono font-semibold cursor-pointer bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {isCreatingAccount ? (
                    <>
                      <Loader2 className="size-4 animate-spin mr-2" />
                      Creating Account & Storing in Database…
                    </>
                  ) : (
                    "Set Password & Create Account"
                  )}
                </Button>
              </form>
            </Form>
          </motion.div>
        )}
      </AnimatePresence>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          to="/login"
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
