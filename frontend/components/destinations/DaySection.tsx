"use client";

import { Draggable, Droppable } from "@hello-pangea/dnd";
import { ChevronDown, ChevronRight, Plus } from "lucide-react";
import StopCard from "@/components/destinations/StopCard";
import type { Destination } from "@/types";

interface Props {
  label: string;
  dayKey: string;
  items: Destination[];
  expanded: boolean;
  onToggle: () => void;
  onEdit: (d: Destination) => void;
  onDelete: (id: string) => void;
  onAddToDay: () => void;
  onSave: (d: Destination) => void;
  savedIds: Set<string>;
}

export default function DaySection({
  label, dayKey, items, expanded,
  onToggle, onEdit, onDelete, onAddToDay, onSave, savedIds,
}: Props) {
  return (
    <div className="mb-1">
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-2 px-1 py-2 text-sm font-semibold text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors"
      >
        {expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        <span className="flex-1 text-left">{label}</span>
        <span className="text-xs font-normal text-gray-400">{items.length}</span>
      </button>

      {expanded && (
        <div className="ml-2 mb-2">
          <Droppable droppableId={dayKey}>
            {(provided, snapshot) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className={`space-y-1.5 rounded-xl transition-all duration-150 ${
                  snapshot.isDraggingOver
                    ? "bg-gray-50 dark:bg-gray-800/60 ring-1 ring-gray-200 dark:ring-gray-700 p-1.5"
                    : items.length === 0
                      ? "min-h-[2rem]"
                      : ""
                }`}
              >
                {items.length === 0 && snapshot.isDraggingOver && (
                  <div className="flex items-center justify-center h-10 text-xs text-gray-400 dark:text-gray-500">
                    Drop here
                  </div>
                )}
                {items.map((dest, index) => (
                  <Draggable key={dest.id} draggableId={dest.id} index={index}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={`transition-all duration-150 ${
                          snap.isDragging
                            ? "relative z-50 rounded-xl overflow-hidden rotate-1 shadow-xl scale-[1.02] opacity-95"
                            : ""
                        }`}
                      >
                        <StopCard
                          dest={dest}
                          onEdit={onEdit}
                          onDelete={onDelete}
                          onSave={onSave}
                          saved={savedIds.has(dest.id)}
                        />
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>

          <button
            onClick={onAddToDay}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 px-1 py-1.5 mt-1.5 transition-colors"
          >
            <Plus size={12} /> Add stop
          </button>
        </div>
      )}
    </div>
  );
}
