"use client";

import { Bookmark, Clock, MapPin, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categoryStyle } from "@/lib/categories";
import { fmtTime } from "@/lib/format";
import type { Destination } from "@/types";

interface Props {
  dest: Destination;
  onEdit: (d: Destination) => void;
  onDelete: (id: string) => void;
  onSave?: (d: Destination) => void;
  saved?: boolean;
}

function endTime(start: string, durationMinutes: number) {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + durationMinutes;
  const hh = String(Math.floor(total / 60) % 24).padStart(2, "0");
  const mm = String(total % 60).padStart(2, "0");
  return fmtTime(`${hh}:${mm}:00`);
}

export default function StopCard({ dest, onEdit, onDelete, onSave, saved }: Props) {
  const cat = categoryStyle(dest.category);
  const range = dest.visit_time && dest.duration_minutes
    ? `${fmtTime(dest.visit_time)} – ${endTime(dest.visit_time, dest.duration_minutes)}`
    : dest.visit_time
      ? fmtTime(dest.visit_time)
      : null;

  return (
    <div className="group flex items-start gap-2.5 p-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-200 dark:hover:border-gray-700 transition-colors cursor-grab active:cursor-grabbing">
      <div className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 mt-0.5 ${cat.bg} ${cat.text} ${cat.border}`}>
        {cat.icon}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap mb-0.5">
          <p className="text-sm font-semibold leading-tight text-gray-900 dark:text-gray-100">
            {dest.name}
          </p>
          {dest.category && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium ${cat.badge}`}>
              {dest.category}
            </span>
          )}
        </div>

        {range && (
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-1">
            <Clock size={10} />
            <span>{range}</span>
          </div>
        )}
        {dest.address && (
          <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 mt-0.5">
            <MapPin size={10} />
            <span className="truncate">{dest.address}</span>
          </div>
        )}
        {dest.description && (
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-2">
            {dest.description}
          </p>
        )}
      </div>

      <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
        {onSave && (
          <Button
            variant="ghost"
            size="icon"
            className={`h-6 w-6 transition-colors ${saved ? "text-amber-500 opacity-100" : "text-gray-400 hover:text-amber-500"}`}
            onClick={() => !saved && onSave(dest)}
            title={saved ? "Saved" : "Save place"}
          >
            <Bookmark size={11} className={saved ? "fill-amber-500" : ""} />
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onEdit(dest)}>
          <Pencil size={11} />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => onDelete(dest.id)}>
          <Trash2 size={11} />
        </Button>
      </div>
    </div>
  );
}
