import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Session } from "@supabase/supabase-js";

import { supabase } from "@/lib/supabase";

interface AuthState {
  session: Session | null;
  loading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

async function checkAdmin(userId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("admin_users")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) {
    console.warn("admin_users lookup failed:", error.message);
    return false;
  }
  return !!data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  // Cache the admin result per user id so token refreshes don't re-query.
  const adminCache = useRef<Record<string, boolean>>({});

  useEffect(() => {
    let mounted = true;

    const resolveAdmin = async (userId: string | undefined) => {
      if (!userId) {
        if (mounted) setIsAdmin(false);
        return;
      }
      if (userId in adminCache.current) {
        if (mounted) setIsAdmin(adminCache.current[userId]);
        return;
      }
      const ok = await checkAdmin(userId);
      adminCache.current[userId] = ok;
      if (mounted) setIsAdmin(ok);
    };

    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      await resolveAdmin(data.session?.user?.id);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        // Defer Supabase calls OUT of the auth callback to avoid deadlocks.
        setTimeout(() => {
          void resolveAdmin(newSession?.user?.id);
        }, 0);
      }
    );

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      loading,
      isAdmin,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
        adminCache.current = {};
      },
    }),
    [session, loading, isAdmin]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
