"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";

type SystemContextValue = {
  config: {
    apiBaseUrl: string;
    isDevelopment: boolean;
  };
  error: {
    handleError: (error: Error, context?: string) => void;
  };
  activity: {
    info: (message: string, context?: string) => void;
    error: (message: string, context?: string) => void;
  };
};

const SystemContext = createContext<SystemContextValue | null>(null);

export function SystemProvider({ children }: { children: ReactNode }) {
  const isDevelopment = process.env.NODE_ENV !== "production";

  const value = useMemo<SystemContextValue>(
    () => ({
      config: {
        apiBaseUrl: "",
        isDevelopment,
      },
      error: {
        handleError: (error: Error, context?: string) => {
          const prefix = context ? `[${context}]` : "[SystemError]";
          console.error(prefix, error.message, error);
        },
      },
      activity: {
        info: (message: string, context?: string) => {
          if (isDevelopment) {
            const prefix = context ? `[${context}]` : "[Activity]";
            console.log(prefix, message);
          }
        },
        error: (message: string, context?: string) => {
          const prefix = context ? `[${context}]` : "[Activity]";
          console.error(prefix, message);
        },
      },
    }),
    [isDevelopment]
  );

  return (
    <SystemContext.Provider value={value}>{children}</SystemContext.Provider>
  );
}

export function useSystem(): SystemContextValue {
  const context = useContext(SystemContext);
  if (!context) {
    throw new Error("useSystem must be used within a SystemProvider");
  }
  return context;
}
