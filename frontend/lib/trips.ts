import api from "@/lib/api";
import type { Trip } from "@/types";

export interface AIPlanRequest {
  destination: string;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  interests?: string | null;
}

interface AIPlanDestination {
  name: string;
  description?: string;
  category?: string;
  address?: string;
  visit_date?: string | null;
  duration_minutes?: number;
  order_index?: number;
}

interface AIPlanResponse {
  title: string;
  description: string;
  destination_city: string;
  destination_country: string;
  notes: string;
  destinations?: AIPlanDestination[];
}

export async function createAIPlannedTrip(req: AIPlanRequest): Promise<Trip> {
  const { data: plan } = await api.post<AIPlanResponse>("/api/ai/plan", req);

  const [city, country = ""] = req.destination.split(",").map((s) => s.trim());

  const { data: trip } = await api.post<Trip>("/api/trips", {
    title: plan.title,
    description: plan.description,
    destination_city: plan.destination_city || city || req.destination,
    destination_country: plan.destination_country || country,
    notes: plan.notes,
    start_date: req.start_date ?? null,
    end_date: req.end_date ?? null,
    budget: req.budget ?? null,
  });

  for (const dest of plan.destinations ?? []) {
    await api.post(`/api/trips/${trip.id}/destinations`, dest);
  }
  return trip;
}

export async function createBasicTrip(destination: string, dates: { start_date: string | null; end_date: string | null }): Promise<Trip> {
  const [city, country = ""] = destination.split(",").map((s) => s.trim());
  const { data } = await api.post<Trip>("/api/trips", {
    title: `Trip to ${city || destination}`,
    destination_city: city || destination,
    destination_country: country,
    ...dates,
  });
  return data;
}
