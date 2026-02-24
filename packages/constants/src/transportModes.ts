import type { TransportMode } from '@pathfinding/types';

/**
 * Transport mode definitions with display labels and defaults
 */
export const TRANSPORT_MODES: Record<
  TransportMode,
  { label: string; labelEn: string; icon: string; defaultSpeed: number }
> = {
  walking: {
    label: '步行',
    labelEn: 'Walking',
    icon: 'walk',
    defaultSpeed: 5, // km/h
  },
  driving: {
    label: '驾车',
    labelEn: 'Driving',
    icon: 'car',
    defaultSpeed: 40, // km/h (urban average)
  },
  transit: {
    label: '公共交通',
    labelEn: 'Public Transit',
    icon: 'bus',
    defaultSpeed: 25, // km/h (urban average including wait)
  },
  cycling: {
    label: '骑行',
    labelEn: 'Cycling',
    icon: 'bike',
    defaultSpeed: 15, // km/h
  },
  taxi: {
    label: '打车',
    labelEn: 'Taxi',
    icon: 'car-taxi',
    defaultSpeed: 35, // km/h (slightly slower than driving due to pickup)
  },
  bus: {
    label: '公交',
    labelEn: 'Bus',
    icon: 'bus',
    defaultSpeed: 20, // km/h (urban average with stops)
  },
  subway: {
    label: '地铁',
    labelEn: 'Subway',
    icon: 'subway',
    defaultSpeed: 35, // km/h (faster than bus)
  },
};

/**
 * All transport mode values
 */
export const TRANSPORT_MODE_VALUES: TransportMode[] = [
  'walking',
  'driving',
  'transit',
  'cycling',
  'taxi',
  'bus',
  'subway',
];

/**
 * Default transport mode
 */
export const DEFAULT_TRANSPORT_MODE: TransportMode = 'walking';

/**
 * Get transport mode display label
 */
export function getTransportLabel(
  mode: TransportMode,
  locale: 'zh' | 'en' = 'zh',
): string {
  const transport = TRANSPORT_MODES[mode];
  if (!transport)
    return mode;

  return locale === 'zh' ? transport.label : transport.labelEn;
}

/**
 * Get transport mode icon name
 */
export function getTransportIcon(mode: TransportMode): string {
  return TRANSPORT_MODES[mode]?.icon ?? 'car';
}

/**
 * Estimate travel time in minutes based on distance and transport mode
 */
export function estimateTravelTime(
  distanceKm: number,
  mode: TransportMode,
): number {
  const speed = TRANSPORT_MODES[mode]?.defaultSpeed ?? 40;
  const hours = distanceKm / speed;
  return Math.ceil(hours * 60);
}
