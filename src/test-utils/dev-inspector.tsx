"use client";

import { useEffect } from "react";
import { installComponentTreeInspector } from "./component-tree";

export function DevInspector() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      installComponentTreeInspector();
    }
  }, []);

  return null;
}
