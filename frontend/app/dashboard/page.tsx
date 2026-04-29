"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import SearchBar from "@/components/trips/SearchBar";
import TripGrid from "@/components/trips/TripGrid";
import { createAIPlannedTrip, createBasicTrip } from "@/lib/trips";
import { useTrips } from "@/lib/useTrips";

function NewTripModal({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const [destination, setDestination] = useState("");
  const [timing, setTiming] = useState<"flexible" | "dates">("flexible");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [preferences, setPreferences] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!destination || loading) return;
    setLoading(true);
    try {
      const dates = {
        start_date: timing === "dates" ? startDate || null : null,
        end_date: timing === "dates" ? endDate || null : null,
      };
      const trip = preferences
        ? await createAIPlannedTrip({ destination, ...dates, interests: preferences })
        : await createBasicTrip(destination, dates);
      onCreated(trip.id);
    } catch {
      alert("Failed to create trip. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl overflow-hidden flex w-full max-w-2xl shadow-2xl">
        <div className="w-64 shrink-0 hidden sm:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="https://d3fphkxyf5o5bm.cloudfront.net/image-resize/format=webp,w=960/img/marketing-blue.jpg"
            alt=""
            className="h-full w-full object-cover"
          />
        </div>

        <div className="flex-1 p-8 relative overflow-y-auto max-h-[90vh]">
          <Button variant="ghost" size="icon" onClick={onClose} className="absolute top-3 right-3 h-8 w-8 text-gray-400">
            <X size={15} />
          </Button>

          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Where to?</h2>

          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Destination</Label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreate()}
                placeholder="Where are you headed?"
                className="rounded-xl"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Timing</Label>
              <div className="flex gap-2">
                {(["flexible", "dates"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    variant={timing === t ? "default" : "outline"}
                    size="sm"
                    onClick={() => setTiming(t)}
                    className="rounded-full"
                  >
                    {t === "flexible" ? "Flexible" : "Select dates"}
                  </Button>
                ))}
              </div>
              {timing === "dates" && (
                <div className="mt-2">
                  <DateRangePicker
                    startDate={startDate || undefined}
                    endDate={endDate || undefined}
                    onChange={(start, end) => { setStartDate(start); setEndDate(end); }}
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <Label>Trip preferences</Label>
              <Textarea
                value={preferences}
                onChange={(e) => setPreferences(e.target.value)}
                placeholder="Tell us what you know — companions, budget, must-dos, preferences"
                rows={3}
                maxLength={2000}
                className="rounded-xl resize-none"
              />
              <p className="text-xs text-gray-400 text-right">{preferences.length}/2000</p>
            </div>

            <Button onClick={handleCreate} disabled={!destination || loading} className="w-full rounded-xl">
              {loading ? <><Loader2 size={14} className="animate-spin mr-2" />Creating plan…</> : "Create"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const { trips, total, search, loading, setSearch } = useTrips();
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <>
      <div className="h-full flex flex-col overflow-hidden">
        <div className="px-8 pt-8 pb-4 shrink-0 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Chats</h1>
              <p className="text-sm text-gray-400 mt-0.5">{total} trip{total !== 1 ? "s" : ""}</p>
            </div>
            <Button onClick={() => setModalOpen(true)} className="rounded-full">New chat</Button>
          </div>
          <SearchBar value={search} onChange={setSearch} placeholder="Search trips…" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6">
          <TripGrid
            trips={trips}
            loading={loading}
            hrefFor={(trip) => `/dashboard/chat/${trip.id}`}
            emptyAction={<Button onClick={() => setModalOpen(true)} className="rounded-full">New chat</Button>}
          />
        </div>
      </div>

      {modalOpen && (
        <NewTripModal
          onClose={() => setModalOpen(false)}
          onCreated={(id) => router.push(`/dashboard/chat/${id}`)}
        />
      )}
    </>
  );
}
