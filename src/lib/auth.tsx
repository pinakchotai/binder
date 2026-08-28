"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { isNativePlatform } from "@/lib/platform";
import {
  getLocalProfileId,
  isLocalOnboarded,
} from "@/lib/local-db";
import { setSessionPresent, hasCloudSession } from "@/lib/storage";
import type { User, Session } from "@supabase/supabase-js";

export const LOCAL_AUTH_CHANGED = "thebinder:local-auth-changed";

/** Tell AuthProvider to re-read local profile state (onboarding finished, etc.). */
export function notifyLocalAuthChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(LOCAL_AUTH_CHANGED));
}

/**
 * Native offline mode has no Supabase session, but the app needs an identity.
 * Synthesize a pseudo user only once a local profile has been created
 * ("continue offline"), so the sign-in landing stays reachable before that.
 */
function localUser(): User | null {
  const profileId = getLocalProfileId();
  if (!profileId) return null;
  return {
    id: profileId,
    aud: "authenticated",
    role: "authenticated",
    email: null,
    app_metadata: {},
    user_metadata: {
      onboarding_completed: isLocalOnboarded(profileId),
      is_local_profile: true,
    },
    identities: [],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  } as unknown as User;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (
    email: string,
    password: string,
    fullName?: string,
  ) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  signIn: async () => "not implemented",
  signUp: async () => "not implemented",
  signInWithGoogle: async () => "not implemented",
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applySession = (session: Session | null) => {
      setSessionPresent(Boolean(session));
      if (session?.user) {
        setUser(session.user);
      } else if (isNativePlatform()) {
        setUser(localUser());
      } else {
        setUser(null);
      }
    };

    supabase.auth.getSession().then(({ data }) => {
      applySession(data.session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    const onLocalChanged = () => {
      if (!hasCloudSession()) setUser(localUser());
    };
    window.addEventListener(LOCAL_AUTH_CHANGED, onLocalChanged);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(LOCAL_AUTH_CHANGED, onLocalChanged);
    };
  }, []);

  const signIn = async (
    email: string,
    password: string,
  ): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return error ? error.message : null;
  };

  const signUp = async (
    email: string,
    password: string,
    fullName?: string,
  ): Promise<string | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: fullName ? { full_name: fullName } : undefined,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) return error.message;
    return null;
  };

  const signInWithGoogle = async (): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    return error ? error.message : null;
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setSessionPresent(false);
    if (isNativePlatform()) setUser(localUser());
    else setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signUp, signInWithGoogle, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}