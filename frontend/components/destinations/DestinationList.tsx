"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import DaySection from "@/components/destinations/DaySection";
import StopCard from "@/components/destinations/StopCard";
import { buildDayGroups, isMultiDay } from "@/lib/itinerary";
import type { Destination, TripDetail } from "@/types";

interface Props {
  trip: TripDetail;
  expandedDays: Record<string, boolean>;
  onToggleDay: (key: string) => void;
  onEdit: (d: Destination) => void;
  onDelete: (id: string) => void;
  onAddToDay: (date: string | null) => void;
  onSave: (d: Destination) => void;
  savedIds: Set<string>;
  onDragEnd: (result: DropResult) => void;
  emptyAction?: React.ReactNode;
}

export default function DestinationList({
  trip, expandedDays, onToggleDay,
  onEdit, onDelete, onAddToDay, onSave, savedIds, onDragEnd, emptyAction,
}: Props) {
  if (trip.destinations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-gray-400 text-sm">No stops yet</p>
        {emptyAction && <div className="mt-2">{emptyAction}</div>}
      </div>
    );
  }

  const days = buildDayGroups(trip.destinations, trip.start_date, trip.end_date);

  if (isMultiDay(days)) {
    return (
      <DragDropContext onDragEnd={onDragEnd}>
        {days.map((day) => (
          <DaySection
            key={day.key}
            label={day.label}
            dayKey={day.key}
            items={day.items}
            expanded={!!expandedDays[day.key]}
            onToggle={() => onToggleDay(day.key)}
            onEdit={onEdit}
            onDelete={onDelete}
            onAddToDay={() => onAddToDay(day.date)}
            onSave={onSave}
            savedIds={savedIds}
          />
        ))}
      </DragDropContext>
    );
  }

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <Droppable droppableId="destinations">
        {(provided) => (
          <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1.5">
            {trip.destinations.map((dest, index) => (
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
                    <StopCard dest={dest} onEdit={onEdit} onDelete={onDelete} onSave={onSave} saved={savedIds.has(dest.id)} />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
