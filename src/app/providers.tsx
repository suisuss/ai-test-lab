"use client";

import type { ReactNode } from "react";
import { SystemProvider } from "@/system/SystemProvider";
import { DataProvider } from "@/data/DataProvider";
import { HandlerProvider } from "@/handlers/HandlerProvider";
import { UIProvider } from "@/ui/UIProvider";

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <SystemProvider>
      <DataProvider>
        <HandlerProvider>
          <UIProvider>{children}</UIProvider>
        </HandlerProvider>
      </DataProvider>
    </SystemProvider>
  );
}
