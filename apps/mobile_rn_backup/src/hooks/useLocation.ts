import * as Location from 'expo-location';
import { useCallback, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';

interface LocationCoords {
  latitude: number;
  longitude: number;
}

interface UseLocationResult {
  location: LocationCoords | null;
  isLoading: boolean;
  error: string | null;
  permissionStatus: Location.PermissionStatus | null;
  requestPermission: () => Promise<boolean>;
  getCurrentLocation: () => Promise<LocationCoords | null>;
  openSettings: () => void;
}

/**
 * useLocation - hook for managing GPS location with permission flow
 */
export function useLocation(): UseLocationResult {
  const [location, setLocation] = useState<LocationCoords | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | null>(null);

  // Check initial permission status
  useEffect(() => {
    const checkPermission = async () => {
      const { status } = await Location.getForegroundPermissionsAsync();
      setPermissionStatus(status);
    };
    checkPermission();
  }, []);

  /**
   * Open app settings
   */
  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
  }, []);

  /**
   * Request location permission
   */
  const requestPermission = useCallback(async (): Promise<boolean> => {
    try {
      // First check current status
      const { status: currentStatus } =
        await Location.getForegroundPermissionsAsync();

      if (currentStatus === Location.PermissionStatus.GRANTED) {
        setPermissionStatus(currentStatus);
        return true;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();
      setPermissionStatus(status);

      if (status !== Location.PermissionStatus.GRANTED) {
        // Show alert to guide user to settings
        Alert.alert(
          '需要位置权限',
          '请在设置中允许应用访问您的位置，以便为您推荐附近的景点和餐厅。',
          [
            { text: '取消', style: 'cancel' },
            { text: '前往设置', onPress: () => openSettings() },
          ]
        );
        return false;
      }

      return true;
    } catch (err) {
      console.error('Error requesting location permission:', err);
      setError('无法请求位置权限');
      return false;
    }
  }, [openSettings]);

  /**
   * Get current GPS location
   */
  const getCurrentLocation =
    useCallback(async (): Promise<LocationCoords | null> => {
      setIsLoading(true);
      setError(null);

      try {
        // Check permission first
        const hasPermission = await requestPermission();
        if (!hasPermission) {
          setIsLoading(false);
          return null;
        }

        // Get location with high accuracy
        const result = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
          timeInterval: 5000,
        });

        const coords: LocationCoords = {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude,
        };

        setLocation(coords);
        setIsLoading(false);
        return coords;
      } catch (err) {
        console.error('Error getting location:', err);
        setError('无法获取当前位置');
        setIsLoading(false);
        return null;
      }
    }, [requestPermission]);

  return {
    location,
    isLoading,
    error,
    permissionStatus,
    requestPermission,
    getCurrentLocation,
    openSettings,
  };
}
