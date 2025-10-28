'use client';

import { createContext, useContext, useMemo } from "react";
import type { Session } from "@/lib/session";

const SessionContext = createContext<Session | null>(null);

type SessionProviderProps = {
  value: Session;
  children: React.ReactNode;
};

export function SessionProvider({ value, children }: SessionProviderProps) {
  const memoized = useMemo(() => value, [value]);
  return (
    <SessionContext.Provider value={memoized}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const session = useContext(SessionContext);
  if (!session) {
    throw new Error("useSession must be used within a SessionProvider");
  }

  return session;
}
