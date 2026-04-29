"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import type { Trip, TripStatus } from "@/types";

export interface TripFormData {
  title: string;
  description: string;
  destination_city: string;
  destination_country: string;
  start_date: string;
  end_date: string;
  status: TripStatus;
  budget: string;
  currency: string;
  notes: string;
}

interface Props {
  initial?: Partial<Trip>;
  onSubmit: (data: TripFormData) => Promise<void>;
  loading?: boolean;
  submitLabel?: string;
}

export default function TripForm({ initial, onSubmit, loading, submitLabel = "Save" }: Props) {
  const [form, setForm] = useState<TripFormData>({
    title: initial?.title || "",
    description: initial?.description || "",
    destination_city: initial?.destination_city || "",
    destination_country: initial?.destination_country || "",
    start_date: initial?.start_date || "",
    end_date: initial?.end_date || "",
    status: initial?.status || "draft",
    budget: initial?.budget?.toString() || "",
    currency: initial?.currency || "USD",
    notes: initial?.notes || "",
  });

  const set = (field: keyof TripFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            required
            placeholder="Summer in Italy"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination_city">City *</Label>
          <Input
            id="destination_city"
            value={form.destination_city}
            onChange={(e) => set("destination_city", e.target.value)}
            required
            placeholder="Rome"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="destination_country">Country *</Label>
          <Input
            id="destination_country"
            value={form.destination_country}
            onChange={(e) => set("destination_country", e.target.value)}
            required
            placeholder="Italy"
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label>Dates</Label>
          <DateRangePicker
            startDate={form.start_date}
            endDate={form.end_date}
            onChange={(start, end) => setForm((prev) => ({ ...prev, start_date: start, end_date: end }))}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="budget">Budget</Label>
          <Input
            id="budget"
            type="number"
            value={form.budget}
            onChange={(e) => set("budget", e.target.value)}
            placeholder="1500"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            value={form.currency}
            onChange={(e) => set("currency", e.target.value)}
            placeholder="USD"
            maxLength={3}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v ?? "draft")}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">Description</Label>
          <Textarea
            id="description"
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            rows={3}
            placeholder="A wonderful trip..."
          />
        </div>

        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="notes">Notes</Label>
          <Textarea
            id="notes"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={2}
            placeholder="Any extra notes..."
          />
        </div>
      </div>

      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Saving..." : submitLabel}
      </Button>
    </form>
  );
}
