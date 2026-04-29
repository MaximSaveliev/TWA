import api from "@/lib/api";
import type { SavedPlace } from "@/types";
import type { SavedPlacePayload } from "@/components/destinations/SavedPlaceForm";

export const savedApi = {
  list: () => api.get<SavedPlace[]>("/api/saved").then((r) => r.data),
  create: (payload: SavedPlacePayload) =>
    api.post<SavedPlace>("/api/saved", payload).then((r) => r.data),
  update: (id: string, payload: Partial<SavedPlacePayload>) =>
    api.patch<SavedPlace>(`/api/saved/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/api/saved/${id}`),
};
