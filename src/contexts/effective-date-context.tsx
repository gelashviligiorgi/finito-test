"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

type EffectiveDateContextValue = {
  effectiveDate: string;
  setEffectiveDate: (date: string) => void;
};

const EffectiveDateContext = createContext<EffectiveDateContextValue | null>(null);

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10);
}

export function EffectiveDateProvider({ children }: { children: ReactNode }) {
  const [effectiveDate, setEffectiveDate] = useState(getTodayString);

  return (
    <EffectiveDateContext.Provider value={{ effectiveDate, setEffectiveDate }}>
      {children}
    </EffectiveDateContext.Provider>
  );
}

export function useEffectiveDate(): EffectiveDateContextValue {
  const ctx = useContext(EffectiveDateContext);
  if (!ctx) throw new Error("useEffectiveDate must be used within EffectiveDateProvider");
  return ctx;
}
