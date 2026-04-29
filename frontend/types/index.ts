export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
  updated_at: string;
}

export type TripStatus = "draft" | "active" | "completed" | "cancelled";

export interface Trip {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  destination_city: string;
  destination_country: string;
  start_date: string | null;
  end_date: string | null;
  status: TripStatus;
  budget: number | null;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export type DestinationCategory =
  | "accommodation"
  | "restaurant"
  | "attraction"
  | "transport"
  | "activity"
  | "other";

export interface Destination {
  id: string;
  trip_id: string;
  name: string;
  description: string | null;
  visit_date: string | null;
  visit_time: string | null;
  duration_minutes: number | null;
  order_index: number;
  category: DestinationCategory | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TripDetail extends Trip {
  destinations: Destination[];
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TripListResponse {
  items: Trip[];
  total: number;
  page: number;
  per_page: number;
}

export interface SavedPlace {
  id: string;
  name: string;
  address: string | null;
  category: string | null;
  notes: string | null;
  created_at: string;
}
