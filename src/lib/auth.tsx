import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Sanction } from "@/lib/moderation";

export type Profile = {
  id: string;
  username: string;
  avatar_url: string | null;
  bio: string | null;
  badge: string | null;
  created_at: string;
};

type Ctx = {
  session: Session | null;
  userId: string | null;
  profile: Profile | null;
  isAdmin: boolean;
  isMod: boolean;
  isStaff: boolean;
  sanction: Sanction | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
};

const AuthCtx = createContext<Ctx>({
  session: null, userId: null, profile: null, isAdmin: false, isMod: false, isStaff: false, sanction: null, loading: true, refreshProfile: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMod, setIsMod] = useState(false);
  const [sanction, setSanction] = useState<Sanction | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async (uid: string | undefined) => {
    if (!uid) { setProfile(null); setIsAdmin(false); setIsMod(false); setSanction(null); return; }
    const [{ data: p }, { data: r }, { data: m }, { data: s }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", uid).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", uid),
      supabase.from("moderators").select("user_id").eq("user_id", uid).maybeSingle(),
      supabase.from("user_sanctions").select("user_id, muted_until, banned").eq("user_id", uid).maybeSingle(),
    ]);
    setProfile(p as Profile | null);
    setIsAdmin(!!r?.some((x) => x.role === "admin"));
    setIsMod(!!m);
    setSanction((s as Sanction | null) ?? null);
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((e, s) => {
      setSession(s);
      if (e === "PASSWORD_RECOVERY" && !window.location.pathname.startsWith("/sifre-sifirla")) window.location.assign("/sifre-sifirla?recovery=1");
      setTimeout(() => load(s?.user.id), 0);
    });
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      await load(data.session?.user.id);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return (
    <AuthCtx.Provider value={{
      session, userId: session?.user.id ?? null, profile, isAdmin, isMod, isStaff: isAdmin || isMod, sanction, loading,
      refreshProfile: () => load(session?.user.id),
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
