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
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { z } from "zod";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Email or mobile number is required")
    .refine((val) => {
      const clean = val.trim();
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean);
      const isPhone = /^\+?[\d\s-]{10,15}$/.test(clean);
      return isEmail || isPhone;
    }, "Enter a valid email address or 10-digit mobile number"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

export default function Login() {
  const { isLoading, isAuthenticated, signIn } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo =
    searchParams.get("redirectTo")?.startsWith("/") ? searchParams.get("redirectTo")! : "/dashboard";

  const form = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  // Auto-redirect already-authenticated users away from the login page.
  useEffect(() => {
    if (!isLoading && isAuthenticated) navigate(redirectTo, { replace: true });
  }, [isLoading, isAuthenticated, navigate, redirectTo]);

  const onSubmit = async (values: LoginValues) => {
    try {
      await signIn({ identifier: values.email, email: values.email, password: values.password });
      toast.success("Welcome back to ArogyaOS");
      navigate(redirectTo, { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Unable to sign in.");
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in with your Email or Mobile Number to continue."
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-mono">Email or Mobile Number</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="name@example.com or 10-digit mobile"
                    autoComplete="username"
                    disabled={form.formState.isSubmitting}
                    className="h-11 rounded-xl bg-background/70 font-mono text-xs"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-mono">Password</FormLabel>
                  <Link
                    to="/forgot-password"
                    className="text-xs font-mono text-muted-foreground transition-colors hover:text-primary"
                  >
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="••••••••••••"
                    autoComplete="current-password"
                    disabled={form.formState.isSubmitting}
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
            disabled={form.formState.isSubmitting}
            className="h-11 w-full rounded-xl text-xs font-mono font-semibold cursor-pointer"
          >
            {form.formState.isSubmitting ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" />
                Signing in…
              </>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </Form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to ArogyaOS?{" "}
        <Link
          to="/signup"
          className="font-medium text-foreground transition-colors hover:text-primary"
        >
          Create an account
        </Link>
      </p>
    </AuthShell>
  );
}
