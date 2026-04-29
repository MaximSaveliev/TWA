import type { DropResult } from "@hello-pangea/dnd";
import api from "@/lib/api";
import { buildDayGroups, type DayGroup } from "@/lib/itinerary";
import type { Destination, TripDetail } from "@/types";

interface ReorderArgs {
  trip: TripDetail;
  result: DropResult;
  setTrip: (t: TripDetail) => void;
}

export async function reorderSingleDay({ trip, result, setTrip }: ReorderArgs): Promise<void> {
  if (!result.destination) return;

  const items = Array.from(trip.destinations);
  const [moved] = items.splice(result.source.index, 1);
  items.splice(result.destination.index, 0, moved);

  const reordered = items.map((d, idx) => ({ ...d, order_index: idx + 1 }));
  const previous = trip;
  setTrip({ ...trip, destinations: reordered });

  try {
    await api.patch(`/api/trips/${trip.id}/destinations/reorder`, {
      items: reordered.map((d) => ({ id: d.id, order_index: d.order_index })),
    });
  } catch {
    setTrip(previous);
  }
}

function flattenGroups(
  days: DayGroup[],
  srcKey: string,
  dstKey: string,
  srcItems: Destination[],
  dstItems: Destination[],
): Destination[] {
  const flat: Destination[] = [];
  for (const day of days) {
    if (day.key === srcKey && day.key === dstKey) flat.push(...dstItems);
    else if (day.key === srcKey) flat.push(...srcItems);
    else if (day.key === dstKey) flat.push(...dstItems);
    else flat.push(...day.items);
  }
  return flat;
}

export async function reorderMultiDay({ trip, result, setTrip }: ReorderArgs): Promise<void> {
  if (!result.destination) return;

  const srcKey = result.source.droppableId;
  const dstKey = result.destination.droppableId;
  const srcIdx = result.source.index;
  const dstIdx = result.destination.index;
  if (srcKey === dstKey && srcIdx === dstIdx) return;

  const days = buildDayGroups(trip.destinations, trip.start_date, trip.end_date);
  const srcDay = days.find((d) => d.key === srcKey);
  const dstDay = days.find((d) => d.key === dstKey);
  if (!srcDay || !dstDay) return;
  const crossDay = srcKey !== dstKey;

  const srcItems = Array.from(srcDay.items);
  const [movedItem] = srcItems.splice(srcIdx, 1);
  const updatedMoved = crossDay ? { ...movedItem, visit_date: dstDay.date } : movedItem;
  const dstItems = crossDay ? Array.from(dstDay.items) : srcItems;
  dstItems.splice(dstIdx, 0, updatedMoved);

  const flat = flattenGroups(days, srcKey, dstKey, srcItems, dstItems);
  const withIdx = flat.map((d, i) => ({ ...d, order_index: i + 1 }));

  const previous = trip;
  setTrip({ ...trip, destinations: withIdx });

  try {
    const calls: Promise<unknown>[] = [
      api.patch(`/api/trips/${trip.id}/destinations/reorder`, {
        items: withIdx.map((d) => ({ id: d.id, order_index: d.order_index })),
      }),
    ];
    if (crossDay) {
      calls.push(
        api.patch(`/api/trips/${trip.id}/destinations/${movedItem.id}`, {
          visit_date: dstDay.date,
        }),
      );
    }
    await Promise.all(calls);
  } catch {
    setTrip(previous);
  }
}
