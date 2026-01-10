import type { BlogLocation } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import MapView, { Callout, Marker, Region } from 'react-native-maps';

interface BlogMapViewProps {
  locations: BlogLocation[];
  height?: number;
}

// Default region when no locations are available (centered on China)
const DEFAULT_REGION: Region = {
  latitude: 35.8617,
  longitude: 104.1954,
  latitudeDelta: 20,
  longitudeDelta: 20,
};

// Padding for map bounds calculation
const MAP_PADDING = 0.02;

/**
 * BlogMapView - displays an interactive map with location markers
 */
export const BlogMapView: React.FC<BlogMapViewProps> = ({
  locations,
  height = 250,
}) => {
  // Calculate the initial region based on locations
  const initialRegion = useMemo<Region>(() => {
    if (!locations || locations.length === 0) {
      return DEFAULT_REGION;
    }

    if (locations.length === 1) {
      // Single location: center on it with reasonable zoom
      const loc = locations[0];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    // Multiple locations: calculate bounding box
    const latitudes = locations.map((loc) => loc.latitude);
    const longitudes = locations.map((loc) => loc.longitude);

    const minLat = Math.min(...latitudes);
    const maxLat = Math.max(...latitudes);
    const minLng = Math.min(...longitudes);
    const maxLng = Math.max(...longitudes);

    const latDelta = Math.max(maxLat - minLat, 0.01) + MAP_PADDING;
    const lngDelta = Math.max(maxLng - minLng, 0.01) + MAP_PADDING;

    return {
      latitude: (minLat + maxLat) / 2,
      longitude: (minLng + maxLng) / 2,
      latitudeDelta: latDelta,
      longitudeDelta: lngDelta,
    };
  }, [locations]);

  // Sort locations by order for display
  const sortedLocations = useMemo(() => {
    if (!locations || locations.length === 0) return [];
    return [...locations].sort((a, b) => a.order - b.order);
  }, [locations]);

  // Don't render map if no locations
  if (!locations || locations.length === 0) {
    return (
      <View style={[styles.emptyContainer, { height }]}>
        <Ionicons name="map-outline" size={32} color="#999" />
        <Text style={styles.emptyText}>暂无位置信息</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { height }]}>
      <MapView
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {sortedLocations.map((location, index) => (
          <Marker
            key={location.id}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name}
            description={location.description}
            pinColor="#1976d2"
          >
            <View style={styles.markerContainer}>
              <View style={styles.marker}>
                <Text style={styles.markerText}>{index + 1}</Text>
              </View>
            </View>
            <Callout style={styles.callout}>
              <View style={styles.calloutContent}>
                <Text style={styles.calloutTitle}>{location.name}</Text>
                {location.description && (
                  <Text style={styles.calloutDescription} numberOfLines={2}>
                    {location.description}
                  </Text>
                )}
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#f0f0f0',
  },
  map: {
    flex: 1,
  },
  emptyContainer: {
    width: '100%',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
  },
  markerContainer: {
    alignItems: 'center',
  },
  marker: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1976d2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 3,
  },
  markerText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
  },
  callout: {
    minWidth: 150,
    maxWidth: 250,
  },
  calloutContent: {
    padding: 8,
  },
  calloutTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  calloutDescription: {
    fontSize: 12,
    color: '#666',
  },
});
