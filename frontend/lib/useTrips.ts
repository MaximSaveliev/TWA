"use client";

import { useCallback, useEffect, useState } from "react";
import api from "@/lib/api";
import type { Trip, TripListResponse } from "@/types";

export function useTrips(perPage = 50) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchTrips = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { page: 1, per_page: perPage };
      if (q) params.search = q;
      const { data } = await api.get<TripListResponse>("/api/trips", { params });
      setTrips(data.items);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }, [perPage]);

  useEffect(() => { fetchTrips(""); }, [fetchTrips]);

  const updateSearch = (q: string) => {
    setSearch(q);
    fetchTrips(q);
  };

  return { trips, total, search, loading, setSearch: updateSearch, refresh: () => fetchTrips(search) };
}
