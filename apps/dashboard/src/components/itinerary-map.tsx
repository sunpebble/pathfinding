'use client';

import type { ItineraryDay } from '@/lib/api/itineraries';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const ItineraryMapLeaflet = dynamic(
  () => import('./itinerary-map-leaflet').then(m => m.ItineraryMapLeaflet),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50"
        style={{ minHeight: 400 }}
      >
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
          Loading map...
        </div>
      </div>
    ),
  },
);

interface ItineraryMapProps {
  days: ItineraryDay[];
  className?: string;
}

export function ItineraryMap({ days, className }: ItineraryMapProps) {
  return (
    <ItineraryMapLeaflet
      days={days}
      className={cn(className)}
    />
  );
}
