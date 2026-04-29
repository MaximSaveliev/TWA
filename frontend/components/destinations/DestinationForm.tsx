"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import type { Destination, DestinationCategory } from "@/types";

export interface DestFormData {
  name: string;
  description: string;
  visit_date: string;
  visit_time: string;
  duration_minutes: string;
  category: string;
  address: string;
  notes: string;
}

interface Props {
  initial?: Partial<Destination>;
  onSubmit: (data: DestFormData) => Promise<void>;
  onCancel?: () => void;
  loading?: boolean;
  submitLabel?: string;
}

export default function DestinationForm({ initial, onSubmit, onCancel, loading, submitLabel = "Save" }: Props) {
  const [form, setForm] = useState<DestFormData>({
    name: initial?.name || "",
    description: initial?.description || "",
    visit_date: initial?.visit_date || "",
    visit_time: initial?.visit_time || "",
    duration_minutes: initial?.duration_minutes?.toString() || "",
    category: initial?.category || "",
    address: initial?.address || "",
    notes: initial?.notes || "",
  });

  const set = (field: keyof DestFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await onSubmit(form);
    } catch {
      // errors are handled by the caller
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="dest-name">Name *</Label>
        <Input
          id="dest-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          required
          placeholder="Colosseum"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dest-category">Category</Label>
        <Select value={form.category} onValueChange={(v) => set("category", v ?? "")}>
          <SelectTrigger>
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="accommodation">Accommodation</SelectItem>
            <SelectItem value="restaurant">Restaurant</SelectItem>
            <SelectItem value="attraction">Attraction</SelectItem>
            <SelectItem value="transport">Transport</SelectItem>
            <SelectItem value="activity">Activity</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dest-address">Address</Label>
        <Input
          id="dest-address"
          value={form.address}
          onChange={(e) => set("address", e.target.value)}
          placeholder="Piazza del Colosseo, 1"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label>Visit Date</Label>
          <DatePicker value={form.visit_date} onChange={(v) => set("visit_date", v)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="dest-time">Visit Time</Label>
          <Input
            id="dest-time"
            type="time"
            value={form.visit_time}
            onChange={(e) => set("visit_time", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="dest-duration">Duration (minutes)</Label>
        <Input
          id="dest-duration"
          type="number"
          value={form.duration_minutes}
          onChange={(e) => set("duration_minutes", e.target.value)}
          placeholder="120"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dest-desc">Description</Label>
        <Textarea
          id="dest-desc"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={2}
          placeholder="Ancient Roman amphitheater..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="dest-notes">Notes</Label>
        <Textarea
          id="dest-notes"
          value={form.notes}
          onChange={(e) => set("notes", e.target.value)}
          rows={2}
          placeholder="Book tickets in advance..."
        />
      </div>

      <div className="flex gap-2 justify-end">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" disabled={loading}>
          {loading ? "Saving..." : submitLabel}
        </Button>
      </div>
    </form>
  );
}
