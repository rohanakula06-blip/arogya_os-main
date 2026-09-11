import { getAuthErrorMessage } from "@/lib/auth-errors";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";
import {
  findRegisteredAccount,
  getActiveLocalSession,
  setActiveLocalSession,
  saveRegisteredAccount,
} from "@/lib/account-store";
import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export interface Medication {
  name: string;
  dosage: string;
  frequency: string;
}

export interface Profile {
  id: string;
  full_name: string | null;
  age: number | null;
  gender: string | null;
  preferred_language: string | null;
  /* ---- Patient Profile fields (migration 0007) ---- */
  date_of_birth: string | null;
  blood_group: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  bmi: number | null;
  bmi_category: string | null;
  age_category: string | null;
  pregnant: boolean | null;
  trimester: string | null;
  smoking_status: string | null;
  alcohol_status: string | null;
  exercise_level: string | null;
  known_conditions: string[] | null;
  family_history: string[] | null;
  allergies: string | null;
  current_medications: Medication[] | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  fullName: string;
  email: string;
  password: string;
}

export interface SignInData {
  email?: string;
  identifier?: string;
  password: string;
}

interface AuthContextValue {
  isLoading: boolean;
  isAuthenticated: boolean;
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  /** True when the current session was restored from a password-recovery link. */
  isRecovery: boolean;
  signUp: (data: SignUpData) => Promise<{ needsEmailConfirmation: boolean }>;
  signIn: (data: SignInData) => Promise<void>;
  signInWithOtp: (email: string) => Promise<{ ok: boolean; message: string; debugOtp?: string }>;
  verifyOtpAndSetPassword: (email: string, otp: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  updateProfile: (patch: Partial<Profile>) => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function SupabaseAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRecovery, setIsRecovery] = useState(false);

  const refreshProfile = useCallback(async (userId: string) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await getSupabase()
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .single();
      if (!error && data) {
        setProfile(data as Profile);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // 1. First check if there is an active local verified session
    const localActive = getActiveLocalSession();
    if (localActive?.user) {
      const localUser: User = {
        id: localActive.user.id,
        email: localActive.user.email,
        phone: localActive.user.phone,
        user_metadata: localActive.user.user_metadata || { full_name: localActive.profile?.full_name },
        app_metadata: {},
        aud: "authenticated",
        created_at: localActive.user.created_at || new Date().toISOString(),
        role: "authenticated",
        updated_at: new Date().toISOString(),
      } as User;

      const localSess: Session = {
        access_token: `token_${localActive.user.id}`,
        refresh_token: `refresh_${localActive.user.id}`,
        expires_in: 3600 * 24 * 7,
        token_type: "bearer",
        user: localUser,
      } as Session;

      setSession(localSess);
      if (localActive.profile) {
        setProfile(localActive.profile as Profile);
      }
    }

    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }

    const supabase = getSupabase();

    // 2. Check Supabase session
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setSession(data.session);
        if (data.session.user) {
          void refreshProfile(data.session.user.id);
        }
      }
      setIsLoading(false);
    });

    // 3. React to Supabase auth events
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecovery(true);
        setSession(nextSession);
        if (nextSession?.user) void refreshProfile(nextSession.user.id);
        return;
      }
      if (
        event === "SIGNED_IN" ||
        event === "INITIAL_SESSION" ||
        event === "TOKEN_REFRESHED"
      ) {
        if (nextSession) {
          setIsRecovery(false);
          setSession(nextSession);
          if (nextSession?.user) void refreshProfile(nextSession.user.id);
        }
        return;
      }
      if (event === "SIGNED_OUT") {
        setIsRecovery(false);
        setActiveLocalSession(null);
        setSession(null);
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [refreshProfile]);

  const value = useMemo<AuthContextValue>(() => {
    const user = session?.user ?? null;

    const signUp: AuthContextValue["signUp"] = async ({
      fullName,
      email,
      password,
    }) => {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured. Add your API keys first.");
      }
      const { data, error } = await getSupabase().auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/login`,
        },
      });
      if (error) throw new Error(getAuthErrorMessage(error));
      if (!data.session) {
        return { needsEmailConfirmation: true };
      }
      if (user) await refreshProfile(user.id);
      return { needsEmailConfirmation: false };
    };

    const signIn: AuthContextValue["signIn"] = async (signInData) => {
      const targetId = (signInData.identifier || signInData.email || "").trim();
      const password = signInData.password;

      if (!targetId) {
        throw new Error("Please enter your email or mobile number.");
      }
      if (!password) {
        throw new Error("Please enter your password.");
      }

      // 1. Check local registered account store
      const localAccount = findRegisteredAccount(targetId);
      if (localAccount) {
        if (localAccount.password === password) {
          const localUser: User = {
            id: localAccount.id,
            email: localAccount.email,
            phone: localAccount.phone,
            user_metadata: { full_name: localAccount.fullName },
            app_metadata: {},
            aud: "authenticated",
            created_at: localAccount.createdAt,
            role: "authenticated",
            updated_at: new Date().toISOString(),
          } as User;

          const localSess: Session = {
            access_token: `token_${localAccount.id}`,
            refresh_token: `refresh_${localAccount.id}`,
            expires_in: 3600 * 24 * 7,
            token_type: "bearer",
            user: localUser,
          } as Session;

          const profileObj: Profile = {
            id: localAccount.id,
            full_name: localAccount.fullName,
            age: null,
            gender: null,
            preferred_language: "te",
            date_of_birth: null,
            blood_group: null,
            height_cm: null,
            weight_kg: null,
            bmi: null,
            bmi_category: null,
            age_category: null,
            pregnant: null,
            trimester: null,
            smoking_status: null,
            alcohol_status: null,
            exercise_level: null,
            known_conditions: null,
            family_history: null,
            allergies: null,
            current_medications: null,
            emergency_contact_name: null,
            emergency_contact_phone: null,
            emergency_contact_relationship: null,
            created_at: localAccount.createdAt,
            updated_at: new Date().toISOString(),
          };

          setActiveLocalSession({ user: localUser, profile: profileObj });
          setSession(localSess);
          setProfile(profileObj);

          // Also attempt background sync with Supabase if configured
          if (isSupabaseConfigured) {
            getSupabase()
              .auth.signInWithPassword({
                email: localAccount.email,
                password,
              })
              .then(({ data: supData }) => {
                if (supData?.session?.user) {
                  setSession(supData.session);
                  void refreshProfile(supData.session.user.id);
                }
              })
              .catch(() => {});
          }

          return;
        } else {
          throw new Error("Invalid password. Please enter the correct password.");
        }
      }

      // 2. Try Supabase directly
      if (isSupabaseConfigured) {
        // If it's a phone number, convert to synthetic email if needed
        let emailForSupabase = targetId;
        const cleanDigits = targetId.replace(/\D/g, "");
        if (!targetId.includes("@") && cleanDigits.length >= 10) {
          emailForSupabase = `${cleanDigits.slice(-10)}@phone.arogyaos.local`;
        }

        const { data: supData, error: supErr } = await getSupabase().auth.signInWithPassword({
          email: emailForSupabase,
          password,
        });

        if (!supErr && supData.session) {
          setSession(supData.session);
          if (supData.session.user) {
            await refreshProfile(supData.session.user.id);
          }
          return;
        }

        if (supErr) {
          throw new Error(getAuthErrorMessage(supErr));
        }
      }

      throw new Error("No account found with this email or mobile number. Please create an account.");
    };

    const signInWithOtp: AuthContextValue["signInWithOtp"] = async (email: string) => {
      const { sendOtpToEmail } = await import("@/lib/smtp-otp-service");
      const res = await sendOtpToEmail(email);
      return res;
    };

    const verifyOtpAndSetPassword: AuthContextValue["verifyOtpAndSetPassword"] = async (
      email: string,
      otp: string,
      newPassword: string,
    ) => {
      const { verifyEmailOtp, setNewPasswordAfterOtp } = await import("@/lib/smtp-otp-service");
      await verifyEmailOtp(email, otp);
      await setNewPasswordAfterOtp(email, newPassword);
      if (isSupabaseConfigured) {
        try {
          await getSupabase().auth.signInWithPassword({
            email,
            password: newPassword,
          });
        } catch {
          // ignore
        }
      }
    };

    const signOut: AuthContextValue["signOut"] = async () => {
      setActiveLocalSession(null);
      setSession(null);
      setProfile(null);
      if (isSupabaseConfigured) {
        try {
          await getSupabase().auth.signOut();
        } catch {
          // ignore
        }
      }
    };

    const sendPasswordReset: AuthContextValue["sendPasswordReset"] = async (
      email,
    ) => {
      if (!isSupabaseConfigured) {
        throw new Error("Supabase is not configured. Add your API keys first.");
      }
      const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw new Error(getAuthErrorMessage(error));
    };

    const updatePassword: AuthContextValue["updatePassword"] = async (
      newPassword,
    ) => {
      if (user?.email) {
        const acc = findRegisteredAccount(user.email);
        if (acc) {
          acc.password = newPassword;
          saveRegisteredAccount(acc);
        }
      }
      if (isSupabaseConfigured) {
        const { error } = await getSupabase().auth.updateUser({
          password: newPassword,
        });
        if (error) throw new Error(getAuthErrorMessage(error));
      }
    };

    const updateProfile: AuthContextValue["updateProfile"] = async (patch) => {
      if (!user) {
        throw new Error("You must be signed in to update your profile.");
      }

      const updatedProfile = {
        ...(profile || {}),
        id: user.id,
        updated_at: new Date().toISOString(),
        ...patch,
      } as Profile;

      setProfile(updatedProfile);
      setActiveLocalSession({ user, profile: updatedProfile });

      if (isSupabaseConfigured) {
        try {
          const { error } = await getSupabase()
            .from("profiles")
            .upsert({ id: user.id, updated_at: new Date().toISOString(), ...patch });
          if (error) {
            console.warn("[ArogyaOS Supabase Profile Update]", error.message);
          }
        } catch (err) {
          console.warn("[ArogyaOS Profile Sync Note]", err);
        }
      }
    };

    return {
      isLoading,
      isAuthenticated: Boolean(session),
      session,
      user,
      profile,
      isRecovery,
      signUp,
      signIn,
      signInWithOtp,
      verifyOtpAndSetPassword,
      signOut,
      sendPasswordReset,
      updatePassword,
      updateProfile,
      refreshProfile: () => (user ? refreshProfile(user.id) : Promise.resolve()),
    };
  }, [isLoading, session, profile, isRecovery, refreshProfile]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuthContext must be used within SupabaseAuthProvider");
  }
  return ctx;
}
