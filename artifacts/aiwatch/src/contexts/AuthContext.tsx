import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { setAuthTokenGetter } from "@workspace/api-client-react";
import { getGetMeQueryKey } from "@workspace/api-client-react";
import { supabase } from "@/lib/supabaseClient";

interface AuthContextValue {
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAuthTokenGetter(async () => {
      const { data } = await supabase.auth.getSession();
      return data.session?.access_token ?? null;
    });

    const { data: subscription } = supabase.auth.onAuthStateChange(() => {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    });

    setReady(true);
    return () => {
      subscription.subscription.unsubscribe();
      setAuthTokenGetter(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async () => {
    // GitHub is the natural replacement for "Authenticate with Replit" —
    // confirm/adjust the enabled provider(s) against the real Supabase
    // project's Auth settings.
    await supabase.auth.signInWithOAuth({
      provider: "github",
      options: { redirectTo: window.location.origin },
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  if (!ready) return null;

  return (
    <AuthContext.Provider value={{ signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
