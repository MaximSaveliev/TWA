"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import TripForm, { TripFormData } from "@/components/trips/TripForm";
import api from "@/lib/api";
import { createAIPlannedTrip } from "@/lib/trips";

type Mode = "manual" | "ai";

const emptyPlan = { destination: "", start_date: "", end_date: "", budget: "", interests: "" };

export default function NewTripPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("manual");
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [planForm, setPlanForm] = useState(emptyPlan);

  const handleManualCreate = async (formData: TripFormData) => {
    setLoading(true);
    try {
      const { data } = await api.post("/api/trips", {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
      });
      router.push(`/dashboard/chat/${data.id}`);
    } finally { setLoading(false); }
  };

  const handleAIPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!planForm.destination) return;
    setAiLoading(true);
    try {
      const trip = await createAIPlannedTrip({
        destination: planForm.destination,
        start_date: planForm.start_date || null,
        end_date: planForm.end_date || null,
        budget: planForm.budget ? parseFloat(planForm.budget) : null,
        interests: planForm.interests || null,
      });
      router.push(`/dashboard/chat/${trip.id}`);
    } catch {
      alert("AI plan generation failed. Please try again.");
    } finally { setAiLoading(false); }
  };

  const setPlan = (k: keyof typeof planForm, v: string) =>
    setPlanForm((prev) => ({ ...prev, [k]: v }));

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-xl mx-auto px-8 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")} className="h-8 w-8 text-gray-400">
            <ArrowLeft size={16} />
          </Button>
          <h1 className="text-xl font-bold text-black dark:text-white">New trip</h1>
        </div>

        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl mb-6">
          {(["manual", "ai"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-lg transition-all ${
                mode === m
                  ? "bg-white dark:bg-gray-700 text-black dark:text-white shadow-sm"
                  : "text-gray-500 hover:text-black dark:hover:text-white"
              }`}
            >
              {m === "ai" && <Sparkles size={13} />}
              {m === "manual" ? "Manual" : "AI Plan"}
            </button>
          ))}
        </div>

        {mode === "manual" ? (
          <TripForm onSubmit={handleManualCreate} loading={loading} submitLabel="Create trip" />
        ) : (
          <form onSubmit={handleAIPlan} className="space-y-4">
            <div className="space-y-1.5">
              <Label>Destination *</Label>
              <Input
                value={planForm.destination}
                onChange={(e) => setPlan("destination", e.target.value)}
                placeholder="Paris, France"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Date</Label>
                <Input type="date" value={planForm.start_date} onChange={(e) => setPlan("start_date", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>End Date</Label>
                <Input type="date" value={planForm.end_date} onChange={(e) => setPlan("end_date", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Budget (USD)</Label>
              <Input
                type="number"
                value={planForm.budget}
                onChange={(e) => setPlan("budget", e.target.value)}
                placeholder="2000"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Interests</Label>
              <Textarea
                value={planForm.interests}
                onChange={(e) => setPlan("interests", e.target.value)}
                rows={2}
                placeholder="Art, food, hiking, history…"
              />
            </div>
            <Button type="submit" disabled={aiLoading || !planForm.destination} className="w-full gap-2">
              {aiLoading
                ? <><Loader2 size={14} className="animate-spin" />Generating plan…</>
                : <><Sparkles size={14} />Generate AI Trip Plan</>}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
