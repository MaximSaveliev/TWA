"use client";

import { MapPin } from "lucide-react";
import TripCard from "@/components/trips/TripCard";
import { Skeleton } from "@/components/ui/skeleton";
import type { Trip } from "@/types";

interface Props {
  trips: Trip[];
  loading: boolean;
  hrefFor: (trip: Trip) => string;
  emptyTitle?: string;
  emptyHint?: string;
  emptyAction?: React.ReactNode;
}

export default function TripGrid({
  trips, loading, hrefFor,
  emptyTitle = "No trips yet",
  emptyHint = "Start planning your first adventure",
  emptyAction,
}: Props) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
    );
  }

  if (trips.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <MapPin size={36} className="text-gray-200 dark:text-gray-700 mb-3" />
        <p className="text-gray-600 dark:text-gray-400 font-medium">{emptyTitle}</p>
        <p className="text-gray-400 text-sm mt-1">{emptyHint}</p>
        {emptyAction && <div className="mt-4">{emptyAction}</div>}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {trips.map((trip) => (
        <TripCard key={trip.id} trip={trip} href={hrefFor(trip)} />
      ))}
    </div>
  );
}
