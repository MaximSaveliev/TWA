"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, MapPin, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SavedPlaceForm, { type SavedPlacePayload } from "@/components/destinations/SavedPlaceForm";
import { categoryStyle } from "@/lib/categories";
import { savedApi } from "@/lib/saved";
import type { SavedPlace } from "@/types";

export default function SavedPage() {
  const router = useRouter();
  const [places, setPlaces] = useState<SavedPlace[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [editPlace, setEditPlace] = useState<SavedPlace | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlaces = async () => {
    setLoading(true);
    try { setPlaces(await savedApi.list()); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPlaces(); }, []);

  const handleCreate = async (payload: SavedPlacePayload) => {
    setSubmitting(true);
    try { await savedApi.create(payload); setAddOpen(false); fetchPlaces(); }
    finally { setSubmitting(false); }
  };

  const handleUpdate = async (payload: SavedPlacePayload) => {
    if (!editPlace) return;
    setSubmitting(true);
    try { await savedApi.update(editPlace.id, payload); setEditPlace(null); fetchPlaces(); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    await savedApi.remove(id);
    setPlaces((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-6 md:px-8 pt-6 md:pt-8 pb-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Saved</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {places.length} place{places.length !== 1 ? "s" : ""}
              </p>
            </div>
            <Button onClick={() => setAddOpen(true)} size="sm" className="gap-1.5 rounded-full">
              <Plus size={14} /> Save place
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 md:px-8 py-6">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-2xl" />)}
            </div>
          ) : places.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-950 flex items-center justify-center mb-4">
                <Bookmark size={24} className="text-amber-500" />
              </div>
              <p className="font-semibold text-gray-700 dark:text-gray-300">No saved places yet</p>
              <p className="text-sm text-gray-400 mt-1">Bookmark spots you&apos;d like to visit</p>
              <Button onClick={() => setAddOpen(true)} size="sm" className="mt-4 gap-1.5 rounded-full">
                <Plus size={14} /> Save a place
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {places.map((place) => {
                const cat = categoryStyle(place.category);
                return (
                  <div
                    key={place.id}
                    onClick={() => router.push(`/dashboard/saved/${place.id}`)}
                    className="group bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md transition-all duration-200 overflow-hidden cursor-pointer"
                  >
                    <div className={`h-1 w-full ${cat.bar}`} />
                    <div className="p-5">
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`w-9 h-9 rounded-lg border flex items-center justify-center shrink-0 ${cat.bg} ${cat.text} ${cat.border}`}>
                          {cat.icon}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <p className="font-bold text-sm text-gray-900 dark:text-gray-100 truncate">{place.name}</p>
                          <span className={`text-[11px] font-medium ${cat.text}`}>{cat.label}</span>
                        </div>
                        <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                            onClick={(e) => { e.stopPropagation(); setEditPlace(place); }}
                          >
                            <Pencil size={12} />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-gray-400 hover:text-red-500"
                            onClick={(e) => handleDelete(e, place.id)}
                          >
                            <Trash2 size={12} />
                          </Button>
                        </div>
                      </div>
                      {place.address && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-1">
                          <MapPin size={11} className="shrink-0" />
                          <span className="truncate">{place.address}</span>
                        </div>
                      )}
                      {place.notes && (
                        <p className="text-xs text-gray-400 mt-2 line-clamp-2 leading-relaxed border-t border-gray-50 dark:border-gray-800 pt-2">
                          {place.notes}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Save a place</DialogTitle></DialogHeader>
          <SavedPlaceForm
            onSubmit={handleCreate}
            onCancel={() => setAddOpen(false)}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editPlace} onOpenChange={(open) => !open && setEditPlace(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit place</DialogTitle></DialogHeader>
          <SavedPlaceForm
            initial={editPlace}
            onSubmit={handleUpdate}
            onCancel={() => setEditPlace(null)}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
