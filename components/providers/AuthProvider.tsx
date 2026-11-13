"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import type { AuthSession } from "@/backend/types";
import { api } from "@/lib/api";
import { useToast } from "@/components/providers/ToastProvider";

interface AuthContextValue {
  session: AuthSession;
  student: AuthSession["student"];
  logout: () => Promise<void>;
  loggingOut: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  session,
  children,
}: {
  session: AuthSession;
  children: React.ReactNode;
}) {
  const [loggingOut, setLoggingOut] = useState(false);
  const router = useRouter();
  const toast = useToast();

  useEffect(() => {
    const onUnauthorized = () => {
      toast.error("Session expired", "Sign in again to continue where you left off.");
      router.replace("/login");
    };
    window.addEventListener("gapfinder:unauthorized", onUnauthorized);
    return () => window.removeEventListener("gapfinder:unauthorized", onUnauthorized);
  }, [router, toast]);

  const logout = useCallback(async () => {
    setLoggingOut(true);
    try {
      await api.post("/api/auth/logout");
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    } catch {
      toast.error("Could not sign out", "Please try again.");
      setLoggingOut(false);
    }
  }, [router, toast]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      student: session.student,
      logout,
      loggingOut,
    }),
    [session, logout, loggingOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider.");
  }
  return context;
}
