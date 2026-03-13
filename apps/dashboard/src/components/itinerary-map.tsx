'use client';

import type { ItineraryDay } from '@/lib/api/itineraries';
import { useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';

/**
 * Day color palette — hex values for Leaflet markers and polylines,
 * plus Tailwind-compatible class names for the DivIcon dot.
 */
const DAY_COLORS = [
  { hex: '#059669', bg: 'bg-emerald-600' },
  { hex: '#2563eb', bg: 'bg-blue-600' },
  { hex: '#d97706', bg: 'bg-amber-600' },
  { hex: '#7c3aed', bg: 'bg-purple-600' },
  { hex: '#e11d48', bg: 'bg-rose-600' },
  { hex: '#0891b2', bg: 'bg-cyan-600' },
  { hex: '#ea580c', bg: 'bg-orange-600' },
  { hex: '#0d9488', bg: 'bg-teal-600' },
] as const;

/** Default center on China when no POIs are available */
const DEFAULT_CENTER: [number, number] = [35.86, 104.19];
const DEFAULT_ZOOM = 4;

interface ItineraryMapProps {
  days: ItineraryDay[];
  className?: string;
}

/** Extracted POI with coordinates guaranteed to be valid numbers */
interface MappablePoi {
  lat: number;
  lng: number;
  name: string;
  category?: string;
  address?: string;
  startTime?: string;
  endTime?: string;
  rating?: number;
  dayNumber: number;
  dayColorIndex: number;
}

/**
 * The inner map component — only rendered on the client after mount.
 *
 * All Leaflet / react-leaflet imports are inside this component so they
 * never execute during SSR.
 */
function ItineraryMapInner({ days, className }: ItineraryMapProps) {
  // Dynamic imports at the module body level would be fine for 'use client'
  // files, but we import here to make the SSR-safety absolutely explicit.
  // eslint-disable-next-line ts/no-require-imports
  const L = require('leaflet') as typeof import('leaflet');
  // eslint-disable-next-line ts/no-require-imports
  const { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } = require('react-leaflet') as typeof import('react-leaflet');

  // Fix Leaflet default marker icon paths (broken by webpack/turbopack)
  // eslint-disable-next-line ts/no-require-imports
  const markerIcon2x = require('leaflet/dist/images/marker-icon-2x.png') as { src?: string } | string;
  // eslint-disable-next-line ts/no-require-imports
  const markerIcon = require('leaflet/dist/images/marker-icon.png') as { src?: string } | string;
  // eslint-disable-next-line ts/no-require-imports
  const markerShadow = require('leaflet/dist/images/marker-shadow.png') as { src?: string } | string;

  // eslint-disable-next-line ts/no-require-imports
  require('leaflet/dist/leaflet.css');

  // eslint-disable-next-line ts/no-explicit-any
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: typeof markerIcon2x === 'string' ? markerIcon2x : markerIcon2x.src,
    iconUrl: typeof markerIcon === 'string' ? markerIcon : markerIcon.src,
    shadowUrl: typeof markerShadow === 'string' ? markerShadow : markerShadow.src,
  });

  // ---- Data preparation ----

  const { pois, polylines } = useMemo(() => {
    const collectedPois: MappablePoi[] = [];
    const collectedPolylines: { positions: [number, number][]; color: string; dayId: string }[] = [];

    for (const day of days) {
      const colorIndex = (day.dayNumber - 1) % DAY_COLORS.length;
      const color = DAY_COLORS[colorIndex]!;
      const dayPositions: [number, number][] = [];

      for (const item of day.items) {
        const poi = item.poi;
        if (!poi || poi.latitude == null || poi.longitude == null)
          continue;
        if (!Number.isFinite(poi.latitude) || !Number.isFinite(poi.longitude))
          continue;

        const position: [number, number] = [poi.latitude, poi.longitude];
        dayPositions.push(position);

        collectedPois.push({
          lat: poi.latitude,
          lng: poi.longitude,
          name: poi.name,
          category: poi.category,
          address: poi.address,
          startTime: item.startTime,
          endTime: item.endTime,
          rating: poi.rating,
          dayNumber: day.dayNumber,
          dayColorIndex: colorIndex,
        });
      }

      if (dayPositions.length >= 2) {
        collectedPolylines.push({ positions: dayPositions, color: color.hex, dayId: day.id });
      }
    }

    return { pois: collectedPois, polylines: collectedPolylines };
  }, [days]);

  // ---- Custom colored marker factory ----

  const createDayIcon = (colorIndex: number) => {
    const color = DAY_COLORS[colorIndex % DAY_COLORS.length]!;
    return L.divIcon({
      className: '',
      iconSize: [28, 28],
      iconAnchor: [14, 28],
      popupAnchor: [0, -28],
      html: `<div style="
        width: 28px;
        height: 28px;
        background-color: ${color.hex};
        border: 3px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 1px 4px rgba(0,0,0,0.3);
      "><div style="
        width: 8px;
        height: 8px;
        background: white;
        border-radius: 50%;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
      "></div></div>`,
    });
  };

  // ---- Auto-fit bounds ----

  // eslint-disable-next-line react/no-nested-component-definitions -- must be inside ItineraryMapInner to access dynamic L/useMap imports
  function FitBounds({ positions }: { positions: [number, number][] }) {
    const map = useMap();

    useEffect(() => {
      if (positions.length === 0)
        return;

      if (positions.length === 1) {
        map.setView(positions[0]!, 14);
        return;
      }

      const bounds = L.latLngBounds(positions.map(p => L.latLng(p[0], p[1])));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    }, [map, positions]);

    return null;
  }

  // ---- Empty state ----

  if (pois.length === 0) {
    return (
      <div className={cn('relative rounded-xl overflow-hidden border border-gray-200', className)}>
        <MapContainer
          center={DEFAULT_CENTER}
          zoom={DEFAULT_ZOOM}
          scrollWheelZoom={false}
          className="h-full w-full"
          style={{ minHeight: 400 }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
        </MapContainer>
        <div className="absolute inset-0 flex items-center justify-center bg-white/60 backdrop-blur-sm z-[1000]">
          <p className="text-gray-500 text-sm font-medium">暂无可显示的地点坐标</p>
        </div>
      </div>
    );
  }

  // ---- Map with markers ----

  const allPositions: [number, number][] = pois.map(p => [p.lat, p.lng]);

  return (
    <div className={cn('rounded-xl overflow-hidden border border-gray-200', className)}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={DEFAULT_ZOOM}
        scrollWheelZoom
        className="h-full w-full"
        style={{ minHeight: 400 }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <FitBounds positions={allPositions} />

        {/* Day polylines */}
        {polylines.map(line => (
          <Polyline
            key={`line-${line.dayId}`}
            positions={line.positions}
            pathOptions={{ color: line.color, weight: 3, opacity: 0.7, dashArray: '8 4' }}
          />
        ))}

        {/* POI markers */}
        {pois.map(poi => (
          <Marker
            key={`poi-d${poi.dayNumber}-${poi.lat}-${poi.lng}`}
            position={[poi.lat, poi.lng]}
            icon={createDayIcon(poi.dayColorIndex)}
          >
            <Popup minWidth={200} maxWidth={280}>
              <div className="space-y-1.5">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">
                    {poi.name}
                  </h4>
                  {poi.rating != null && (
                    <span className="flex items-center gap-0.5 text-xs text-amber-600 font-medium whitespace-nowrap">
                      <span>★</span>
                      {poi.rating.toFixed(1)}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span
                    className="inline-block w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: DAY_COLORS[poi.dayColorIndex % DAY_COLORS.length]!.hex }}
                  />
                  <span>
                    Day
                    {' '}
                    {poi.dayNumber}
                  </span>
                  {poi.category && (
                    <>
                      <span className="text-gray-300">·</span>
                      <span className="capitalize">{poi.category}</span>
                    </>
                  )}
                </div>

                {poi.address && (
                  <p className="text-xs text-gray-600 leading-snug">{poi.address}</p>
                )}

                {(poi.startTime || poi.endTime) && (
                  <p className="text-xs text-gray-600">
                    {poi.startTime && poi.endTime
                      ? `${poi.startTime} – ${poi.endTime}`
                      : poi.startTime || poi.endTime}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Day color legend */}
      {days.length > 1 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-white border-t border-gray-200 flex-wrap">
          {days.map((day) => {
            const colorIndex = (day.dayNumber - 1) % DAY_COLORS.length;
            const color = DAY_COLORS[colorIndex]!;
            return (
              <span key={day.id} className="inline-flex items-center gap-1.5 text-xs text-gray-600">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: color.hex }}
                />
                Day
                {' '}
                {day.dayNumber}
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}

/**
 * Exported map component — defers rendering until the client has mounted
 * so that Leaflet (which requires `window`) never runs during SSR.
 */
export function ItineraryMap(props: ItineraryMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect -- SSR guard requires client-side mount detection
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50',
          props.className,
        )}
        style={{ minHeight: 400 }}
      >
        <div className="flex items-center gap-2 text-sm text-gray-400">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-emerald-600" />
          Loading map...
        </div>
      </div>
    );
  }

  return <ItineraryMapInner {...props} />;
}
