"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, Loader2, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import TripForm, { TripFormData } from "@/components/trips/TripForm";
import DestinationForm, { DestFormData } from "@/components/destinations/DestinationForm";
import DestinationList from "@/components/destinations/DestinationList";
import api from "@/lib/api";
import { reorderMultiDay, reorderSingleDay } from "@/lib/destinationDnd";
import { tripDurationDays } from "@/lib/format";
import { buildDayGroups, isMultiDay } from "@/lib/itinerary";
import { savedApi } from "@/lib/saved";
import { useDayExpansion } from "@/lib/useDayExpansion";
import type { ChatMessage, Destination, TripDetail } from "@/types";

const MIN_PANEL_W = 260;
const MAX_PANEL_W = 580;
const DEFAULT_PANEL_W = 360;

function MessageBubble({ msg }: { msg: ChatMessage }) {
  const isUser = msg.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-black dark:bg-white text-white dark:text-black rounded-br-none"
            : "bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-bl-none"
        }`}
      >
        {msg.content}
      </div>
    </div>
  );
}

function ChatComposer({ value, onChange, onSend, disabled }: {
  value: string; onChange: (v: string) => void; onSend: () => void; disabled: boolean;
}) {
  return (
    <>
      <div className="flex items-center gap-2 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-1 focus-within:ring-1 focus-within:ring-gray-400 transition-all bg-gray-50 dark:bg-gray-950">
        <span className="text-gray-300 select-none">+</span>
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              onSend();
            }
          }}
          placeholder="Ask anything"
          className="flex-1 border-0 shadow-none px-0 h-10 focus-visible:ring-0 bg-transparent dark:bg-transparent"
        />
        <Button onClick={onSend} disabled={disabled || !value.trim()} size="icon" className="h-8 w-8 rounded-xl shrink-0">
          <Send size={13} />
        </Button>
      </div>
      <p className="text-center text-[10px] text-muted-foreground">AI can make mistakes. Check important info.</p>
    </>
  );
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [trip, setTrip] = useState<TripDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [editTripOpen, setEditTripOpen] = useState(false);
  const [editTripLoading, setEditTripLoading] = useState(false);
  const [addDestOpen, setAddDestOpen] = useState(false);
  const [addDestLoading, setAddDestLoading] = useState(false);
  const [addDestDate, setAddDestDate] = useState<string | null>(null);
  const [editDest, setEditDest] = useState<Destination | null>(null);
  const [editDestLoading, setEditDestLoading] = useState(false);
  const [savedDestIds, setSavedDestIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");
  const { expanded, toggle, ensureExpanded } = useDayExpansion();

  const [planWidth, setPlanWidth] = useState(DEFAULT_PANEL_W);
  const [mobileTab, setMobileTab] = useState<"chat" | "itinerary">("chat");
  const isResizing = useRef(false);

  const fetchTrip = useCallback(async () => {
    try {
      const { data } = await api.get<TripDetail>(`/api/trips/${id}`);
      setTrip(data);
      ensureExpanded(buildDayGroups(data.destinations, data.start_date, data.end_date));
    } finally { setLoading(false); }
  }, [id, ensureExpanded]);

  useEffect(() => { fetchTrip(); }, [fetchTrip]);

  useEffect(() => {
    api.get<ChatMessage[]>(`/api/ai/messages/${id}`)
      .then(({ data }) => { if (data.length > 0) setMessages(data); })
      .catch(() => {});
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    const startX = e.clientX;
    const startW = planWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isResizing.current) return;
      setPlanWidth(Math.max(MIN_PANEL_W, Math.min(MAX_PANEL_W, startW + (startX - ev.clientX))));
    };
    const onUp = () => {
      isResizing.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  };

  const sendMessage = async () => {
    if (!input.trim() || chatLoading) return;
    const userMsg: ChatMessage = { role: "user", content: input.trim() };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setChatLoading(true);
    try {
      const { data } = await api.post("/api/ai/chat", { trip_id: id, messages: next });
      setMessages([...next, { role: "assistant", content: data.reply }]);
      if (data.trip_updated) await fetchTrip();
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, something went wrong." }]);
    } finally { setChatLoading(false); }
  };

  const handleDeleteTrip = async () => {
    if (!confirm("Delete this trip?")) return;
    try {
      await api.delete(`/api/trips/${id}`);
      router.push("/dashboard");
    } catch {
      setError("Failed to delete trip.");
    }
  };

  const handleUpdateTrip = async (formData: TripFormData) => {
    setEditTripLoading(true);
    setError("");
    try {
      await api.put(`/api/trips/${id}`, {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      });
      setEditTripOpen(false);
      fetchTrip();
    } catch {
      setError("Failed to update trip.");
    } finally { setEditTripLoading(false); }
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
    if (!confirm("Remove this stop?")) return;
    try {
      await api.delete(`/api/trips/${id}/destinations/${destId}`);
      fetchTrip();
    } catch {
      setError("Failed to delete stop.");
    }
  };

  if (loading) {
    return (
      <div className="flex h-full gap-4 p-6">
        <div className="flex-1 space-y-4">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-64 w-full" />
        </div>
        <div className="w-80 space-y-3">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-20 w-full" />
        </div>
      </div>
    );
  }

  if (!trip) {
    return <div className="flex items-center justify-center h-full text-muted-foreground text-sm">Trip not found.</div>;
  }

  const tripDays = tripDurationDays(trip.start_date, trip.end_date);
  const datePill = (() => {
    if (!trip.start_date) return null;
    if (!trip.end_date) return trip.start_date;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthIdx = Number(trip.start_date.slice(5, 7)) - 1;
    return `${tripDays} days in ${months[monthIdx] ?? ""}`;
  })();

  const days = buildDayGroups(trip.destinations, trip.start_date, trip.end_date);
  const onDragEnd = isMultiDay(days)
    ? (result: Parameters<typeof reorderMultiDay>[0]["result"]) => reorderMultiDay({ trip, result, setTrip })
    : (result: Parameters<typeof reorderSingleDay>[0]["result"]) => reorderSingleDay({ trip, result, setTrip });

  const planPanel = (
    <div className="flex flex-col h-full">
      <div className="px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <h2 className="text-base font-bold leading-snug mb-2 text-gray-900 dark:text-gray-100">{trip.title}</h2>
        <div className="flex flex-wrap gap-1.5">
          {[trip.destination_city, datePill, trip.budget ? `${trip.budget} ${trip.currency}` : null]
            .filter((v): v is string => !!v)
            .map((pill) => (
              <Badge key={pill} variant="outline" className="text-xs dark:border-gray-700 dark:text-gray-400">{pill}</Badge>
            ))}
        </div>
        {trip.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2 leading-relaxed">{trip.description}</p>
        )}
      </div>

      <div className="flex items-center justify-between px-5 py-2.5 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <div className="flex items-center gap-2">
          <CalendarDays size={14} className="text-gray-400" />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">Itinerary</span>
          <span className="text-xs text-gray-400">
            {tripDays ? `${tripDays} days` : `${trip.destinations.length} stops`}
          </span>
        </div>
        <button
          onClick={() => openAddDest()}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors px-1"
        >
          <Plus size={12} /> Add
        </button>
      </div>

      {error && <p className="text-sm text-red-500 px-5 pt-2">{error}</p>}
      <div className="flex-1 overflow-y-auto min-h-0 px-4 py-3">
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
            <button
              onClick={() => openAddDest()}
              className="text-xs text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 underline"
            >
              Add first stop
            </button>
          }
        />
      </div>
    </div>
  );

  const tripHeader = (
    <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
      <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="h-8 w-8">
        <ArrowLeft size={16} />
      </Button>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm truncate">{trip.title}</p>
        <p className="text-xs text-muted-foreground">{trip.destination_city}, {trip.destination_country}</p>
      </div>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setEditTripOpen(true)}>
        <Pencil size={14} />
      </Button>
      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleDeleteTrip}>
        <Trash2 size={14} />
      </Button>
    </div>
  );

  const chatStream = (
    <div className="flex-1 overflow-y-auto px-4 md:px-6 py-4 md:py-6 space-y-4">
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
          <p className="text-xl md:text-2xl font-bold mb-2 text-gray-900 dark:text-gray-100">{trip.title}</p>
          <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
            Ask anything about {trip.destination_city}. Say &quot;add a restaurant on day 2&quot; to update your itinerary.
          </p>
        </div>
      )}
      {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}
      {chatLoading && (
        <div className="flex">
          <div className="bg-gray-100 dark:bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3">
            <Loader2 size={14} className="animate-spin text-muted-foreground" />
          </div>
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  );

  return (
    <>
      <div className="md:hidden flex flex-col h-full">
        {tripHeader}
        <div className="flex border-b border-gray-100 dark:border-gray-800 shrink-0">
          {(["chat", "itinerary"] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setMobileTab(tab)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors capitalize ${
                mobileTab === tab
                  ? "border-b-2 border-black dark:border-white text-black dark:text-white"
                  : "text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              }`}
            >
              {tab === "itinerary" ? "Itinerary" : "Chat"}
            </button>
          ))}
        </div>

        {mobileTab === "chat" ? (
          <div className="flex-1 flex flex-col min-h-0">
            {chatStream}
            <div className="px-4 pb-4 shrink-0 space-y-1.5">
              <ChatComposer value={input} onChange={setInput} onSend={sendMessage} disabled={chatLoading} />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden">{planPanel}</div>
        )}
      </div>

      <div className="hidden md:flex h-full overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {tripHeader}
          {chatStream}
          <div className="px-6 pb-5 shrink-0 space-y-2">
            <ChatComposer value={input} onChange={setInput} onSend={sendMessage} disabled={chatLoading} />
          </div>
        </div>

        <div onMouseDown={startResize} className="group relative w-2 shrink-0 cursor-col-resize flex items-center justify-center z-10">
          <div className="w-px h-full bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-400 transition-colors" />
        </div>

        <div
          style={{ width: planWidth }}
          className="shrink-0 flex flex-col overflow-hidden border-l border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950"
        >
          {planPanel}
        </div>
      </div>

      <Dialog open={editTripOpen} onOpenChange={(open) => { setEditTripOpen(open); if (!open) setError(""); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Trip</DialogTitle></DialogHeader>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <TripForm initial={trip} onSubmit={handleUpdateTrip} loading={editTripLoading} submitLabel="Save Changes" />
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
    </>
  );
}
