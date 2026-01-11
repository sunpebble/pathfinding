import type { TransportMode } from '@pathfinding/types';
import { Alert, Linking, Platform } from 'react-native';

/**
 * Coordinate type for navigation
 */
interface Coordinate {
  latitude: number;
  longitude: number;
}

/**
 * Navigation target with POI info
 */
interface NavigationTarget {
  name: string;
  address?: string;
  coordinate: Coordinate;
}

/**
 * Deep link service for navigation apps
 */
export const deepLinkService = {
  /**
   * Open navigation to destination using specified app
   */
  async openNavigation(
    destination: NavigationTarget,
    mode: TransportMode,
    origin?: NavigationTarget
  ): Promise<boolean> {
    // Try to open in order of priority based on mode
    const apps = getNavigationApps(mode);

    for (const app of apps) {
      const url = buildDeepLink(app, destination, mode, origin);
      if (url && (await Linking.canOpenURL(url))) {
        await Linking.openURL(url);
        return true;
      }
    }

    // Fallback to Apple Maps / Google Maps
    const fallbackUrl = buildFallbackUrl(destination, mode, origin);
    if (await Linking.canOpenURL(fallbackUrl)) {
      await Linking.openURL(fallbackUrl);
      return true;
    }

    Alert.alert('无法打开导航', '请安装支持的地图应用');
    return false;
  },

  /**
   * Open ride-hailing app (DiDi, etc.)
   */
  async openRideHailing(
    destination: NavigationTarget,
    origin?: NavigationTarget
  ): Promise<boolean> {
    // Try DiDi first
    const didiUrl = buildDiDiUrl(destination, origin);
    if (await Linking.canOpenURL(didiUrl)) {
      await Linking.openURL(didiUrl);
      return true;
    }

    // Try Gaode (Amap) car-hailing
    const amapUrl = buildAmapCarUrl(destination, origin);
    if (await Linking.canOpenURL(amapUrl)) {
      await Linking.openURL(amapUrl);
      return true;
    }

    // Fallback: show alert with options
    Alert.alert('打车服务', '未检测到打车应用，请安装滴滴出行或高德地图', [
      { text: '取消', style: 'cancel' },
      {
        text: '下载滴滴',
        onPress: () => openAppStore('didi'),
      },
    ]);

    return false;
  },

  /**
   * Get estimated travel time (mock for now, would use real API)
   */
  async getEstimatedTime(
    origin: Coordinate,
    destination: Coordinate,
    mode: TransportMode
  ): Promise<number | null> {
    // Calculate straight-line distance
    const distance = calculateDistance(origin, destination);

    // Estimate time based on mode (very rough estimates)
    const speeds: Record<TransportMode, number> = {
      walking: 5, // km/h
      cycling: 15, // km/h
      transit: 30, // km/h average including waiting
      driving: 40, // km/h in city
      taxi: 35, // km/h in city
    };

    const speed = speeds[mode];
    const timeInHours = distance / speed;
    const timeInMinutes = Math.round(timeInHours * 60);

    // Add some buffer for walking to transit stops, etc.
    const buffer = mode === 'transit' ? 10 : 5;

    return Math.max(5, timeInMinutes + buffer);
  },
};

/**
 * Get navigation apps in priority order based on transport mode
 */
function getNavigationApps(mode: TransportMode): string[] {
  if (mode === 'taxi') {
    return ['didi', 'amap', 'baidumap'];
  }

  // For other modes, prefer Gaode/Amap for China
  return ['amap', 'baidumap', 'qqmap', 'apple', 'google'];
}

/**
 * Build deep link URL for specific app
 */
function buildDeepLink(
  app: string,
  destination: NavigationTarget,
  mode: TransportMode,
  origin?: NavigationTarget
): string | null {
  const { latitude: dlat, longitude: dlon } = destination.coordinate;
  const dname = encodeURIComponent(destination.name);

  const originParams = origin
    ? `&slat=${origin.coordinate.latitude}&slon=${origin.coordinate.longitude}&sname=${encodeURIComponent(origin.name)}`
    : '';

  // Mode mapping for different apps
  const modeMap: Record<string, Record<TransportMode, string>> = {
    amap: {
      walking: '4',
      transit: '1',
      driving: '0',
      cycling: '3',
      taxi: '0',
    },
    baidumap: {
      walking: 'walking',
      transit: 'transit',
      driving: 'driving',
      cycling: 'riding',
      taxi: 'driving',
    },
  };

  switch (app) {
    case 'amap': {
      // Gaode Map (Amap)
      const amapMode = modeMap.amap[mode];
      return `iosamap://path?sourceApplication=pathfinding&dlat=${dlat}&dlon=${dlon}&dname=${dname}&dev=0&t=${amapMode}${originParams}`;
    }

    case 'baidumap': {
      // Baidu Map
      const baiduMode = modeMap.baidumap[mode];
      return `baidumap://map/direction?destination=name:${dname}|latlng:${dlat},${dlon}&mode=${baiduMode}&coord_type=gcj02&src=pathfinding`;
    }

    case 'qqmap':
      // Tencent QQ Map
      return `qqmap://map/routeplan?type=${mode === 'walking' ? 'walk' : mode === 'transit' ? 'bus' : 'drive'}&to=${dname}&tocoord=${dlat},${dlon}`;

    default:
      return null;
  }
}

/**
 * Build DiDi deep link URL
 */
function buildDiDiUrl(
  destination: NavigationTarget,
  origin?: NavigationTarget
): string {
  const baseUrl = 'didiglobal://';
  const params = new URLSearchParams({
    destAddress: destination.name,
    destLat: destination.coordinate.latitude.toString(),
    destLng: destination.coordinate.longitude.toString(),
  });

  if (origin) {
    params.append('srcAddress', origin.name);
    params.append('srcLat', origin.coordinate.latitude.toString());
    params.append('srcLng', origin.coordinate.longitude.toString());
  }

  return `${baseUrl}?${params}`;
}

/**
 * Build Amap car-hailing URL
 */
function buildAmapCarUrl(
  destination: NavigationTarget,
  origin?: NavigationTarget
): string {
  const { latitude: dlat, longitude: dlon } = destination.coordinate;
  const dname = encodeURIComponent(destination.name);

  let url = `iosamap://path?sourceApplication=pathfinding&dlat=${dlat}&dlon=${dlon}&dname=${dname}&dev=0&t=0`;

  if (origin) {
    url += `&slat=${origin.coordinate.latitude}&slon=${origin.coordinate.longitude}&sname=${encodeURIComponent(origin.name)}`;
  }

  return url;
}

/**
 * Build fallback URL for Apple Maps or Google Maps
 */
function buildFallbackUrl(
  destination: NavigationTarget,
  mode: TransportMode,
  origin?: NavigationTarget
): string {
  const { latitude: dlat, longitude: dlon } = destination.coordinate;

  // Mode mapping for Apple/Google Maps
  const modeParam: Record<TransportMode, string> = {
    walking: 'w',
    transit: 'r',
    driving: 'd',
    cycling: 'b',
    taxi: 'd',
  };

  if (Platform.OS === 'ios') {
    // Apple Maps
    let url = `http://maps.apple.com/?daddr=${dlat},${dlon}&dirflg=${modeParam[mode]}`;
    if (origin) {
      url += `&saddr=${origin.coordinate.latitude},${origin.coordinate.longitude}`;
    }
    return url;
  } else {
    // Google Maps
    let url = `https://www.google.com/maps/dir/?api=1&destination=${dlat},${dlon}&travelmode=${mode === 'taxi' ? 'driving' : mode}`;
    if (origin) {
      url += `&origin=${origin.coordinate.latitude},${origin.coordinate.longitude}`;
    }
    return url;
  }
}

/**
 * Open app store for specific app
 */
function openAppStore(app: string): void {
  const appStoreUrls: Record<string, { ios: string; android: string }> = {
    didi: {
      ios: 'https://apps.apple.com/app/id554499054',
      android: 'market://details?id=com.sdu.didi.psnger',
    },
    amap: {
      ios: 'https://apps.apple.com/app/id461703208',
      android: 'market://details?id=com.autonavi.minimap',
    },
  };

  const urls = appStoreUrls[app];
  if (urls) {
    const url = Platform.OS === 'ios' ? urls.ios : urls.android;
    Linking.openURL(url);
  }
}

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
function calculateDistance(
  origin: Coordinate,
  destination: Coordinate
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(destination.latitude - origin.latitude);
  const dLon = toRad(destination.longitude - origin.longitude);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(origin.latitude)) *
      Math.cos(toRad(destination.latitude)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

export default deepLinkService;
