"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type UIContextValue = {
  appName: string;
};

const UIContext = createContext<UIContextValue | null>(null);

export function UIProvider({ children }: { children: ReactNode }) {
  const value = useMemo<UIContextValue>(
    () => ({
      appName: "ai-test-lab",
    }),
    []
  );

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
}

export function useUI(): UIContextValue {
  const context = useContext(UIContext);
  if (!context) {
    throw new Error("useUI must be used within a UIProvider");
  }
  return context;
}
