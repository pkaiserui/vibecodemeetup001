import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { apiFetch } from "./api";
import { supabase } from "./supabase";

export type Profile = {
  id: string;
  display_name: string;
  bio: string;
  avatar_url?: string | null;
  role: "attendee" | "organizer" | "admin";
  created_at: string;
};

type AuthContextValue = {
  session: Session | null;
  profile: Profile | null;
  isAuthed: boolean;
  authDisabled: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const authDisabled = import.meta.env.VITE_AUTH_DISABLED === "true";

  const loadProfile = useCallback(async () => {
    try {
      const data = await apiFetch<Profile>("/profiles/me");
      setProfile(data);
    } catch (error) {
      console.warn("Failed to load profile", error);
      setProfile(null);
    }
  }, []);

  useEffect(() => {
    if (authDisabled) {
      setLoading(false);
      loadProfile();
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
      setLoading(false);
      if (data.session) {
        loadProfile();
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession) {
        loadProfile();
      } else {
        setProfile(null);
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [authDisabled, loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    if (authDisabled) return "Auth is disabled in local mode.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return error.message;
    return null;
  }, [authDisabled]);

  const signUp = useCallback(async (email: string, password: string) => {
    if (authDisabled) return "Auth is disabled in local mode.";
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) return error.message;
    return null;
  }, [authDisabled]);

  const signOut = useCallback(async () => {
    if (authDisabled) return;
    await supabase.auth.signOut();
    setProfile(null);
  }, [authDisabled]);

  const isAuthed = authDisabled || !!session;

  const value = useMemo(
    () => ({
      session,
      profile,
      isAuthed,
      authDisabled,
      loading,
      signIn,
      signUp,
      signOut,
      refreshProfile: loadProfile,
    }),
    [session, profile, isAuthed, authDisabled, loading, signIn, signUp, signOut, loadProfile]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
