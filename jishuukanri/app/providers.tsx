"use client";

import { onAuthStateChanged } from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";

type AuthState = {
  userEmail: string | null;
  loading: boolean;
};

const AuthContext = createContext<AuthState>({ userEmail: null, loading: true });

export function Providers({ children }: { children: React.ReactNode }) {
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setUserEmail(user?.email ?? null);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const value = useMemo(() => ({ userEmail, loading }), [userEmail, loading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
