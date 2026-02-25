"use client";

import { useEffect } from "react";
import { installComponentTreeInspector } from "./component-tree";
import { installFetchTracker } from "./fetch-tracker";

export function DevInspector() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      installComponentTreeInspector();
      installFetchTracker();
    }
  }, []);

  return null;
}
