"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Calendar, FileText, MapPin, Pencil, Plus, Trash2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import TripForm, { TripFormData } from "@/components/trips/TripForm";
import DestinationForm, { DestFormData } from "@/components/destinations/DestinationForm";
import DestinationList from "@/components/destinations/DestinationList";
import { tripStatusStyle } from "@/lib/categories";
import { reorderMultiDay, reorderSingleDay } from "@/lib/destinationDnd";
import { fmtBudget, fmtDate, tripDurationDays } from "@/lib/format";
import { buildDayGroups, isMultiDay } from "@/lib/itinerary";
import { savedApi } from "@/lib/saved";
import { useDayExpansion } from "@/lib/useDayExpansion";
import api from "@/lib/api";
import type { Destination, TripDetail } from "@/types";

export default function TripDataPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [editLoading, setEditLoading] = useState(false);
  const [addDestOpen, setAddDestOpen] = useState(false);
  const [addDestLoading, setAddDestLoading] = useState(false);
  const [addDestDate, setAddDestDate] = useState<string | null>(null);
  const [editDest, setEditDest] = useState<Destination | null>(null);
  const [editDestLoading, setEditDestLoading] = useState(false);
  const [savedDestIds, setSavedDestIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const { expanded, toggle, ensureExpanded } = useDayExpansion();

  const fetchTrip = useCallback(async () => {
    try {
      const { data } = await api.get<TripDetail>(`/api/trips/${id}`);
      setTrip(data);
      ensureExpanded(buildDayGroups(data.destinations, data.start_date, data.end_date));
    } finally {
      setLoading(false);
    }
  }, [id, ensureExpanded]);

  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  const handleUpdate = async (formData: TripFormData) => {
    setEditLoading(true);
    setError("");
    try {
      await api.put(`/api/trips/${id}`, {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      });
      setEditOpen(false);
      fetchTrip();
    } catch {
      setError("Failed to update trip.");
    } finally { setEditLoading(false); }
  };

  const handleDelete = async () => {
    if (!confirm("Delete this trip?")) return;
    try {
      await api.delete(`/api/trips/${id}`);
      router.push("/dashboard/trips");
    } catch {
      setError("Failed to delete trip.");
    }
  };

  const openAddDest = (date: string | null = null) => {
    setAddDestDate(date);
    setAddDestOpen(true);
    setError("");
  };

  const handleAddDest = async (formData: DestFormData) => {
    setAddDestLoading(true);
    setError("");
    try {
      await api.post(`/api/trips/${id}/destinations`, {
        ...formData,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        visit_date: formData.visit_date || addDestDate || null,
        visit_time: formData.visit_time || null,
        category: formData.category || null,
      });
      setAddDestOpen(false);
      setAddDestDate(null);
      fetchTrip();
    } catch {
      setError("Failed to add stop.");
    } finally { setAddDestLoading(false); }
  };

  const handleEditDest = async (formData: DestFormData) => {
    if (!editDest) return;
    setEditDestLoading(true);
    setError("");
    try {
      await api.put(`/api/trips/${id}/destinations/${editDest.id}`, {
        ...formData,
        duration_minutes: formData.duration_minutes ? parseInt(formData.duration_minutes) : null,
        visit_date: formData.visit_date || null,
        visit_time: formData.visit_time || null,
        category: formData.category || null,
      });
      setEditDest(null);
      fetchTrip();
    } catch {
      setError("Failed to save stop.");
    } finally { setEditDestLoading(false); }
  };

  const handleSaveDest = async (dest: Destination) => {
    try {
      await savedApi.create({
        name: dest.name,
        address: dest.address,
        category: dest.category,
        notes: dest.description,
      });
      setSavedDestIds((prev) => new Set([...prev, dest.id]));
    } catch {
      setError("Failed to save place.");
    }
  };

  const handleDeleteDest = async (destId: string) => {
    if (!confirm("Remove stop?")) return;
    try {
      await api.delete(`/api/trips/${id}/destinations/${destId}`);
      fetchTrip();
    } catch {
      setError("Failed to delete stop.");
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!trip) {
    return <div className="flex items-center justify-center h-full text-gray-400">Trip not found.</div>;
  }

  const status = tripStatusStyle(trip.status);
  const duration = tripDurationDays(trip.start_date, trip.end_date);
  const days = buildDayGroups(trip.destinations, trip.start_date, trip.end_date);
  const onDragEnd = isMultiDay(days)
    ? (result: Parameters<typeof reorderMultiDay>[0]["result"]) => reorderMultiDay({ trip, result, setTrip })
    : (result: Parameters<typeof reorderSingleDay>[0]["result"]) => reorderSingleDay({ trip, result, setTrip });

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/dashboard/trips")}
          className="mb-6 gap-2 -ml-2 text-gray-500 hover:text-gray-900 dark:hover:text-white"
        >
          <ArrowLeft size={15} /> Trips
        </Button>

        {error && <p className="text-sm text-red-500 mb-4">{error}</p>}

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 mb-5 overflow-hidden">
          <div className={`h-1.5 w-full ${status.bar}`} />
          <div className="px-6 pt-5 pb-2">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <MapPin size={10} />
                  {trip.destination_country}
                </p>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{trip.title}</h1>
                <p className="text-sm text-gray-400 mt-0.5">{trip.destination_city}</p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${status.pill}`}>
                {status.label}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-6 gap-y-1.5 text-sm py-3 border-t border-gray-50 dark:border-gray-800">
              {trip.start_date && (
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Calendar size={13} className="text-gray-300 dark:text-gray-600" />
                  <span>
                    {fmtDate(trip.start_date)}
                    {trip.end_date && ` → ${fmtDate(trip.end_date)}`}
                  </span>
                  {duration && <span className="text-gray-300 dark:text-gray-600">· {duration}d</span>}
                </div>
              )}
              {trip.budget != null && (
                <div className="flex items-center gap-1.5 text-gray-500 dark:text-gray-400">
                  <Wallet size={13} className="text-gray-300 dark:text-gray-600" />
                  <span>{fmtBudget(trip.budget, trip.currency)}</span>
                </div>
              )}
            </div>
          </div>

          {(trip.description || trip.notes) && (
            <div className="px-6 pb-4 space-y-3">
              {trip.description && (
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{trip.description}</p>
              )}
              {trip.notes && (
                <>
                  <Separator className="dark:bg-gray-800" />
                  <div className="flex items-start gap-2 text-sm text-gray-400">
                    <FileText size={13} className="mt-0.5 shrink-0" />
                    <p className="leading-relaxed">{trip.notes}</p>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="px-6 pb-4 pt-1">
            <Separator className="mb-4 dark:bg-gray-800" />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="gap-1.5 dark:border-gray-700 dark:text-gray-300">
                <Pencil size={12} /> Edit trip
              </Button>
              <Button variant="outline" size="sm" onClick={() => router.push(`/dashboard/chat/${id}`)} className="gap-1.5 dark:border-gray-700 dark:text-gray-300">
                Open chat
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950 ml-auto"
              >
                <Trash2 size={12} /> Delete
              </Button>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">Itinerary</span>
              <span className="ml-2 text-xs text-gray-400">{trip.destinations.length} stops</span>
            </div>
            <Button variant="outline" size="sm" onClick={() => openAddDest()} className="gap-1.5 h-8 dark:border-gray-700 dark:text-gray-300">
              <Plus size={13} /> Add stop
            </Button>
          </div>

          <div className="px-4 py-3">
            <DestinationList
              trip={trip}
              expandedDays={expanded}
              onToggleDay={toggle}
              onEdit={setEditDest}
              onDelete={handleDeleteDest}
              onAddToDay={openAddDest}
              onSave={handleSaveDest}
              savedIds={savedDestIds}
              onDragEnd={onDragEnd}
              emptyAction={
                <Button variant="ghost" size="sm" onClick={() => openAddDest()} className="text-gray-400">
                  Add first stop
                </Button>
              }
            />
          </div>
        </div>
      </div>

      <Dialog open={editOpen} onOpenChange={(open) => { setEditOpen(open); if (!open) setError(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Trip</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <TripForm initial={trip} onSubmit={handleUpdate} loading={editLoading} submitLabel="Save Changes" />
        </DialogContent>
      </Dialog>

      <Dialog open={addDestOpen} onOpenChange={(open) => { setAddDestOpen(open); if (!open) { setAddDestDate(null); setError(""); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Stop{addDestDate ? ` — ${addDestDate}` : ""}</DialogTitle>
          </DialogHeader>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <DestinationForm
            initial={addDestDate ? { visit_date: addDestDate } : undefined}
            onSubmit={handleAddDest}
            onCancel={() => { setAddDestOpen(false); setAddDestDate(null); setError(""); }}
            loading={addDestLoading}
            submitLabel="Add Stop"
          />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDest} onOpenChange={(open) => { if (!open) { setEditDest(null); setError(""); } }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Stop</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-500">{error}</p>}
          {editDest && (
            <DestinationForm
              initial={editDest}
              onSubmit={handleEditDest}
              onCancel={() => { setEditDest(null); setError(""); }}
              loading={editDestLoading}
              submitLabel="Save"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
