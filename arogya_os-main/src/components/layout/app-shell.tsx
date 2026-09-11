import { LanguageToggle } from "@/components/language/language-toggle";
import { ArogyaMark } from "@/components/brand/arogya-mark";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { AnimatePresence, motion } from "framer-motion";
import { LogOut, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router";
import { toast } from "sonner";

const APP_LINKS = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/upload", label: "Upload Report" },
  { to: "/journey", label: "Health Journey" },
  { to: "/baseline", label: "Health Baseline" },
  { to: "/copilot", label: "Doctor Copilot" },
  { to: "/appointments", label: "Appointments" },
  { to: "/labflow", label: "LabFlow" },
  { to: "/patient-profile", label: "Patient Profile" },
  { to: "/profile", label: "Account" },
];

function initialsOf(name?: string | null, email?: string | null) {
  if (name && name.trim()) {
    const parts = name.trim().split(/\s+/);
    return `${parts[0][0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  }
  return (email?.[0] ?? "U").toUpperCase();
}

export function AppShell() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    navigate("/login", { replace: true });
  };

  return (
    <div className="auth-gradient min-h-screen">
      <header className="glass-card-vibrant sticky top-3 z-50 mx-auto mt-3 flex max-w-6xl items-center justify-between gap-3 rounded-2xl px-4 py-2.5 sm:px-5 shadow-lg shadow-teal-500/5">
        <Link to="/dashboard" aria-label="ArogyaOS dashboard" className="shrink-0 group">
          <span className="flex items-center gap-2.5 font-mono text-base font-bold tracking-tight text-foreground">
            <span className="relative flex size-8 items-center justify-center rounded-xl bg-gradient-to-tr from-teal-600 via-emerald-500 to-cyan-400 p-0.5 shadow-md shadow-teal-500/25 transition-transform group-hover:scale-105">
              <ArogyaMark className="size-full text-white" />
            </span>
            <span className="hidden sm:inline font-sans">
              arogya<span className="bg-gradient-to-r from-teal-600 to-emerald-500 dark:from-teal-400 dark:to-emerald-300 bg-clip-text text-transparent font-extrabold">OS</span>
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-1.5 lg:flex">
          {APP_LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `rounded-xl px-3 py-1.5 text-[13px] font-semibold transition-all ${
                  isActive
                    ? "bg-gradient-to-r from-teal-500/15 via-emerald-500/15 to-cyan-500/15 text-teal-600 dark:text-teal-300 border border-teal-500/30 shadow-xs"
                    : "text-muted-foreground hover:bg-teal-500/8 hover:text-foreground"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <LanguageToggle variant="compact" />
          <ThemeToggle />
          <span className="hidden items-center gap-2 rounded-full border border-teal-500/20 bg-background/80 py-1 pl-1 pr-3 sm:flex shadow-2xs">
            <span className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-emerald-600 text-[11px] font-bold text-white shadow-xs">
              {initialsOf(profile?.full_name, user?.email)}
            </span>
            <span className="max-w-[120px] truncate text-xs font-semibold text-foreground">
              {profile?.full_name ?? user?.email}
            </span>
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Sign out"
            className="cursor-pointer hover:bg-rose-500/10 hover:text-rose-600 rounded-xl"
            onClick={handleSignOut}
          >
            <LogOut className="size-4" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Toggle menu"
            className="cursor-pointer lg:hidden rounded-xl border-teal-500/30"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="size-4" /> : <Menu className="size-4" />}
          </Button>
        </div>
      </header>

      <AnimatePresence>
        {open && (
          <motion.nav
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="glass-card-vibrant mx-auto mt-2 flex max-w-6xl flex-col gap-1 rounded-2xl p-3 lg:hidden shadow-xl"
          >
            {APP_LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `rounded-xl px-3 py-2 text-sm font-semibold transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-teal-500/20 to-emerald-500/20 text-teal-600 dark:text-teal-300 border border-teal-500/30"
                      : "text-muted-foreground hover:bg-teal-500/10 hover:text-foreground"
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-1 flex w-full cursor-pointer items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-rose-600 dark:text-rose-400 transition-colors hover:bg-rose-500/10"
            >
              <LogOut className="size-4" /> Logout
            </button>
          </motion.nav>
        )}
      </AnimatePresence>

      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Outlet />
      </main>
    </div>
  );
}
