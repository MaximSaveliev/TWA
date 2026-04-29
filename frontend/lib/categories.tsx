import { Bed, Car, MoreHorizontal, Star, Utensils, Zap } from "lucide-react";
import type { ReactNode } from "react";
import type { DestinationCategory } from "@/types";

export interface CategoryStyle {
  label: string;
  icon: ReactNode;
  bg: string;
  text: string;
  border: string;
  bar: string;
  badge: string;
}

const ICON_SIZE = 13;

export const CATEGORY_STYLES: Record<DestinationCategory, CategoryStyle> = {
  accommodation: {
    label: "Accommodation",
    icon: <Bed size={ICON_SIZE} />,
    bg: "bg-blue-50 dark:bg-blue-950",
    text: "text-blue-600 dark:text-blue-400",
    border: "border-blue-100 dark:border-blue-900",
    bar: "bg-blue-400",
    badge: "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400",
  },
  restaurant: {
    label: "Restaurant",
    icon: <Utensils size={ICON_SIZE} />,
    bg: "bg-orange-50 dark:bg-orange-950",
    text: "text-orange-600 dark:text-orange-400",
    border: "border-orange-100 dark:border-orange-900",
    bar: "bg-orange-400",
    badge: "bg-orange-50 text-orange-600 dark:bg-orange-950 dark:text-orange-400",
  },
  attraction: {
    label: "Attraction",
    icon: <Star size={ICON_SIZE} />,
    bg: "bg-purple-50 dark:bg-purple-950",
    text: "text-purple-600 dark:text-purple-400",
    border: "border-purple-100 dark:border-purple-900",
    bar: "bg-purple-400",
    badge: "bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400",
  },
  transport: {
    label: "Transport",
    icon: <Car size={ICON_SIZE} />,
    bg: "bg-slate-50 dark:bg-slate-900",
    text: "text-slate-600 dark:text-slate-400",
    border: "border-slate-100 dark:border-slate-800",
    bar: "bg-slate-400",
    badge: "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-400",
  },
  activity: {
    label: "Activity",
    icon: <Zap size={ICON_SIZE} />,
    bg: "bg-emerald-50 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-100 dark:border-emerald-900",
    bar: "bg-emerald-400",
    badge: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400",
  },
  other: {
    label: "Other",
    icon: <MoreHorizontal size={ICON_SIZE} />,
    bg: "bg-gray-50 dark:bg-gray-800",
    text: "text-gray-500 dark:text-gray-400",
    border: "border-gray-100 dark:border-gray-700",
    bar: "bg-gray-300 dark:bg-gray-600",
    badge: "bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400",
  },
};

export function categoryStyle(category: string | null | undefined): CategoryStyle {
  if (!category) return CATEGORY_STYLES.other;
  return CATEGORY_STYLES[category as DestinationCategory] ?? CATEGORY_STYLES.other;
}

export const CATEGORY_KEYS: DestinationCategory[] = [
  "accommodation", "restaurant", "attraction", "transport", "activity", "other",
];

export interface TripStatusStyle {
  label: string;
  pill: string;
  bar: string;
}

export const TRIP_STATUS_STYLES: Record<string, TripStatusStyle> = {
  draft: {
    label: "Draft",
    pill: "bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900",
    bar: "bg-amber-400",
  },
  active: {
    label: "Active",
    pill: "bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900",
    bar: "bg-emerald-400",
  },
  completed: {
    label: "Completed",
    pill: "bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900",
    bar: "bg-blue-400",
  },
  cancelled: {
    label: "Cancelled",
    pill: "bg-red-50 dark:bg-red-950 text-red-500 dark:text-red-400 border-red-100 dark:border-red-900",
    bar: "bg-red-400",
  },
};

export function tripStatusStyle(status: string): TripStatusStyle {
  return TRIP_STATUS_STYLES[status] ?? TRIP_STATUS_STYLES.draft;
}
