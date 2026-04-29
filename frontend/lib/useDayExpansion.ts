"use client";

import { useCallback, useState } from "react";
import type { DayGroup } from "@/lib/itinerary";

export function useDayExpansion() {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const ensureExpanded = useCallback((days: DayGroup[]) => {
    setExpanded((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const d of days) {
        if (next[d.key] === undefined) { next[d.key] = true; changed = true; }
      }
      return changed ? next : prev;
    });
  }, []);

  const toggle = useCallback((key: string) =>
    setExpanded((prev) => ({ ...prev, [key]: !prev[key] })), []);

  return { expanded, toggle, ensureExpanded };
}
