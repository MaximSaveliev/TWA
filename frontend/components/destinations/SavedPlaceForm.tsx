"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CATEGORY_KEYS, categoryStyle } from "@/lib/categories";
import type { SavedPlace } from "@/types";

export interface SavedPlacePayload {
  name: string;
  address: string | null;
  category: string | null;
  notes: string | null;
}

interface Props {
  initial?: SavedPlace | null;
  onSubmit: (payload: SavedPlacePayload) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const empty = { name: "", address: "", category: "", notes: "" };

export default function SavedPlaceForm({ initial, onSubmit, onCancel, loading }: Props) {
  const [form, setForm] = useState(empty);

  useEffect(() => {
    setForm(initial
      ? {
          name: initial.name,
          address: initial.address ?? "",
          category: initial.category ?? "",
          notes: initial.notes ?? "",
        }
      : empty);
  }, [initial]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onSubmit({
      name: form.name.trim(),
      address: form.address || null,
      category: form.category || null,
      notes: form.notes || null,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Name *</Label>
        <Input
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="Eiffel Tower"
          required
        />
      </div>

      <div className="space-y-1.5">
        <Label>Category</Label>
        <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v ?? "" })}>
          <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
          <SelectContent>
            {CATEGORY_KEYS.map((c) => (
              <SelectItem key={c} value={c}>{categoryStyle(c).label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label>Address</Label>
        <Input
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
          placeholder="Champ de Mars, Paris"
        />
      </div>

      <div className="space-y-1.5">
        <Label>Notes</Label>
        <Textarea
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          rows={2}
          placeholder="Must visit at sunset…"
        />
      </div>

      <div className="flex gap-2 justify-end">
        <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={loading || !form.name.trim()}>
          {loading ? "Saving…" : initial ? "Save changes" : "Save place"}
        </Button>
      </div>
    </form>
  );
}
