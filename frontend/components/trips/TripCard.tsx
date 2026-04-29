"use client";

import Link from "next/link";
import { ArrowRight, Calendar, MapPin, Wallet } from "lucide-react";
import { tripStatusStyle } from "@/lib/categories";
import { fmtBudget, fmtDate } from "@/lib/format";
import type { Trip } from "@/types";

interface Props {
  trip: Trip;
  href: string;
}

export default function TripCard({ trip, href }: Props) {
  const status = tripStatusStyle(trip.status);

  return (
    <Link href={href} className="group block">
      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 hover:border-gray-200 dark:hover:border-gray-700 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col h-full">
        <div className={`h-1 w-full ${status.bar}`} />
        <div className="p-5 flex flex-col flex-1">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-400 uppercase tracking-widest">
              <MapPin size={11} />
              {trip.destination_country}
            </div>
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${status.pill}`}>
              {status.label}
            </span>
          </div>

          <h3 className="text-[15px] font-bold text-gray-900 dark:text-gray-100 leading-snug line-clamp-2 mb-0.5">
            {trip.title}
          </h3>
          <p className="text-sm text-gray-400 mb-3">{trip.destination_city}</p>

          {trip.description && (
            <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed mb-3">
              {trip.description}
            </p>
          )}

          <div className="flex-1" />

          <div className="flex items-end justify-between pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="space-y-1.5">
              {trip.start_date && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar size={11} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  <span>
                    {fmtDate(trip.start_date)}
                    {trip.end_date && <> &rarr; {fmtDate(trip.end_date)}</>}
                  </span>
                </div>
              )}
              {trip.budget != null && (
                <div className="flex items-center gap-1.5 text-xs text-gray-500 dark:text-gray-400">
                  <Wallet size={11} className="text-gray-300 dark:text-gray-600 flex-shrink-0" />
                  <span>{fmtBudget(trip.budget, trip.currency)}</span>
                </div>
              )}
            </div>
            <div className="w-7 h-7 rounded-full bg-gray-100 dark:bg-gray-800 group-hover:bg-gray-200 dark:group-hover:bg-gray-700 flex items-center justify-center transition-colors flex-shrink-0">
              <ArrowRight size={13} className="text-gray-400 dark:text-gray-500 group-hover:text-gray-700 dark:group-hover:text-gray-200 transition-colors" />
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
