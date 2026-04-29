import type { Destination } from "@/types";

export interface DayGroup {
  key: string;
  label: string;
  date: string | null;
  items: Destination[];
}

const UNSCHEDULED_KEY = "__none__";

function dayLabel(dayIdx: number, items: Destination[]): string {
  if (items.length === 0) return `Day ${dayIdx}`;
  const names = items.slice(0, 2).map((d) => d.name).filter(Boolean);
  return `Day ${dayIdx} · ${names.join(", ") || "Stops"}`;
}

// Pure-string date math. `new Date('YYYY-MM-DD')` is local-time in JS but
// `.toISOString()` is UTC, so any positive timezone offset shifts the
// rendered day back by one — making Day 1 render empty and stops fall into
// the wrong group. Iterating as strings sidesteps this entirely.
function addDays(yyyymmdd: string, n: number): string {
  const [y, m, d] = yyyymmdd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function groupByVisitDate(destinations: Destination[]): DayGroup[] {
  const map = new Map<string, Destination[]>();
  for (const d of destinations) {
    const key = d.visit_date || UNSCHEDULED_KEY;
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(d);
  }

  const groups: DayGroup[] = [];
  let dayIdx = 1;
  for (const [key, items] of map) {
    if (key === UNSCHEDULED_KEY) {
      groups.push({ key, label: "Stops", date: null, items });
    } else {
      groups.push({ key, label: dayLabel(dayIdx, items), date: key, items });
      dayIdx++;
    }
  }
  return groups;
}

export function buildDayGroups(
  destinations: Destination[],
  startDate?: string | null,
  endDate?: string | null,
): DayGroup[] {
  if (!startDate || !endDate) return groupByVisitDate(destinations);

  const groups: DayGroup[] = [];
  const knownDates = new Set<string>();

  let cursor = startDate;
  let dayIdx = 1;
  while (cursor <= endDate) {
    knownDates.add(cursor);
    const items = destinations.filter((d) => d.visit_date === cursor);
    groups.push({ key: cursor, label: dayLabel(dayIdx, items), date: cursor, items });
    dayIdx++;
    cursor = addDays(cursor, 1);
  }

  const unscheduled = destinations.filter(
    (d) => !d.visit_date || !knownDates.has(d.visit_date),
  );
  if (unscheduled.length > 0) {
    groups.push({ key: UNSCHEDULED_KEY, label: "Unscheduled", date: null, items: unscheduled });
  }
  return groups;
}

export function isMultiDay(groups: DayGroup[]): boolean {
  return groups.length > 1 || (groups.length === 1 && groups[0].date !== null);
}
