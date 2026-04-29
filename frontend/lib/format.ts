// `new Date('YYYY-MM-DD')` parses as UTC midnight; `new Date('YYYY-MM-DDT00:00:00')`
// parses as LOCAL midnight. Either way, `toLocaleDateString` then renders in
// local time — which can shift the displayed day across the UTC boundary.
// We want a stable rendering of the calendar date the DB is holding, so
// pull the parts out manually.
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function fmtDate(d: string) {
  if (d.length >= 10 && /^\d{4}-\d{2}-\d{2}/.test(d)) {
    const [, mm, dd] = d.slice(0, 10).split("-");
    return `${MONTHS[Number(mm) - 1]} ${Number(dd)}`;
  }
  return new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function fmtTime(t: string) {
  const [h, m] = t.split(":").map(Number);
  const hour12 = (h % 12) || 12;
  const minute = String(m).padStart(2, "0");
  return `${hour12}:${minute} ${h >= 12 ? "PM" : "AM"}`;
}

export function fmtBudget(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function tripDurationDays(start: string | null, end: string | null) {
  if (!start || !end) return null;
  // Use UTC midnight of each date so DST and TZ offsets can't shift the count.
  const [sy, sm, sd] = start.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = end.slice(0, 10).split("-").map(Number);
  const startMs = Date.UTC(sy, sm - 1, sd);
  const endMs = Date.UTC(ey, em - 1, ed);
  return Math.round((endMs - startMs) / 86_400_000) + 1;
}
