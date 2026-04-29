"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, FileText, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import SavedPlaceForm, { type SavedPlacePayload } from "@/components/destinations/SavedPlaceForm";
import { categoryStyle } from "@/lib/categories";
import { savedApi } from "@/lib/saved";
import type { SavedPlace } from "@/types";

export default function SavedPlacePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [place, setPlace] = useState<SavedPlace | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    savedApi.list()
      .then((data) => setPlace(data.find((x) => x.id === id) ?? null))
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpdate = async (payload: SavedPlacePayload) => {
    setSubmitting(true);
    try {
      const updated = await savedApi.update(id, payload);
      setPlace(updated);
      setEditOpen(false);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this saved place?")) return;
    await savedApi.remove(id);
    router.push("/dashboard/saved");
  };

  if (loading) {
    return (
      <div className="max-w-lg mx-auto px-8 py-8 space-y-4">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!place) {
    return <div className="flex items-center justify-center h-full text-gray-400">Place not found.</div>;
  }

  const cat = categoryStyle(place.category);

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-lg mx-auto px-6 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/saved")}
          className="mb-6 gap-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft size={15} /> Saved
        </Button>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className={`h-1.5 w-full ${cat.bar}`} />
          <div className="px-6 pt-5 pb-5">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 mt-0.5 ${cat.bg} ${cat.text} ${cat.border}`}>
                  {cat.icon}
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{place.name}</h1>
                  <span className={`text-xs font-medium ${cat.text}`}>{cat.label}</span>
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 dark:border-gray-700 dark:text-gray-300">
                  <Pencil size={12} /> Edit
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDelete}
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                >
                  <Trash2 size={12} />
                </Button>
              </div>
            </div>

            {place.address && (
              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 mb-3">
                <MapPin size={13} className="text-gray-300 dark:text-gray-600 shrink-0" />
                <span>{place.address}</span>
              </div>
            )}

            {place.notes && (
              <>
                <Separator className="my-3 dark:bg-gray-800" />
                <div className="flex items-start gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <FileText size={13} className="mt-0.5 shrink-0 text-gray-300 dark:text-gray-600" />
                  <p className="leading-relaxed">{place.notes}</p>
                </div>
              </>
            )}

            <Separator className="mt-4 mb-3 dark:bg-gray-800" />
            <p className="text-xs text-gray-400">
              Saved {new Date(place.created_at).toLocaleDateString("en", { year: "numeric", month: "long", day: "numeric" })}
            </p>
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit saved place</DialogTitle></DialogHeader>
          <SavedPlaceForm
            initial={place}
            onSubmit={handleUpdate}
            onCancel={() => setEditOpen(false)}
            loading={submitting}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
