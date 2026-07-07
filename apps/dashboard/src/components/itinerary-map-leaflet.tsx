'use client';

import type { ItineraryDay } from '@/lib/api/itineraries';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { useEffect, useMemo } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { cn } from '@/lib/utils';
import 'leaflet/dist/leaflet.css';

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

const DEFAULT_CENTER: [number, number] = [35.86, 104.19];
const DEFAULT_ZOOM = 4;

export interface ItineraryMapLeafletProps {
  days: ItineraryDay[];
  className?: string;
}

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

function iconUrl(asset: { src?: string } | string): string {
  return typeof asset === 'string' ? asset : (asset.src ?? '');
}

// eslint-disable-next-line ts/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: iconUrl(markerIcon2x),
  iconUrl: iconUrl(markerIcon),
  shadowUrl: iconUrl(markerShadow),
});

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

function createDayIcon(colorIndex: number) {
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
}

export function ItineraryMapLeaflet({ days, className }: ItineraryMapLeafletProps) {
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

        {polylines.map(line => (
          <Polyline
            key={`line-${line.dayId}`}
            positions={line.positions}
            pathOptions={{ color: line.color, weight: 3, opacity: 0.7, dashArray: '8 4' }}
          />
        ))}

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
