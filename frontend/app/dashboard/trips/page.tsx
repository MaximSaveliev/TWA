"use client";

import SearchBar from "@/components/trips/SearchBar";
import TripGrid from "@/components/trips/TripGrid";
import { useTrips } from "@/lib/useTrips";

export default function TripsPage() {
  const { trips, total, search, loading, setSearch } = useTrips();

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
        <div className="mb-4">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Trips</h1>
          <p className="text-sm text-gray-400 mt-0.5">{total} trip{total !== 1 ? "s" : ""}</p>
        </div>
        <SearchBar value={search} onChange={setSearch} placeholder="Search trips…" />
      </div>

      <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
        <TripGrid
          trips={trips}
          loading={loading}
          hrefFor={(trip) => `/dashboard/trips/${trip.id}`}
          emptyHint="Create a new chat to start planning"
        />
      </div>
    </div>
  );
}
