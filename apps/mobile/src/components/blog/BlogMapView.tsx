import type { BlogLocation } from '@pathfinding/types';
import type { Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Callout, Marker } from 'react-native-maps';
import { Text } from 'react-native-paper';

interface BlogMapViewProps {
  locations: BlogLocation[];
  height?: number;
  selectedLocationId?: string | null;
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
 *
 * IMPORTANT: Markers are kept completely static (no dynamic styling) to prevent
 * react-native-maps rendering issues that cause markers to disappear.
 * Selection is indicated by:
 * 1. Map animating to center on selected location
 * 2. Timeline list highlight (handled in parent component)
 */
export const BlogMapView: React.FC<BlogMapViewProps> = ({
  locations,
  height = 250,
  selectedLocationId,
}) => {
  const mapRef = useRef<MapView>(null);

  // Calculate the region to show ALL locations
  const allLocationsRegion = useMemo<Region>(() => {
    if (!locations || locations.length === 0) {
      return DEFAULT_REGION;
    }

    if (locations.length === 1) {
      const loc = locations[0];
      return {
        latitude: loc.latitude,
        longitude: loc.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }

    const lats = locations.map((l) => l.latitude);
    const lngs = locations.map((l) => l.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const deltaLat = (maxLat - minLat) * 1.5 + MAP_PADDING;
    const deltaLng = (maxLng - minLng) * 1.5 + MAP_PADDING;

    return {
      latitude: centerLat,
      longitude: centerLng,
      latitudeDelta: Math.max(deltaLat, 0.02),
      longitudeDelta: Math.max(deltaLng, 0.02),
    };
  }, [locations]);

  // Sort locations by order for display (memoized once)
  const sortedLocations = useMemo(() => {
    if (!locations || locations.length === 0) return [];
    return [...locations].sort((a, b) => a.order - b.order);
  }, [locations]);

  // Handle selection changes - animate map only
  useEffect(() => {
    if (!mapRef.current || !locations || locations.length === 0) return;

    try {
      if (selectedLocationId) {
        const selectedLocation = locations.find(
          (l) => l.id === selectedLocationId
        );
        if (selectedLocation?.latitude && selectedLocation?.longitude) {
          mapRef.current.animateToRegion(
            {
              latitude: selectedLocation.latitude,
              longitude: selectedLocation.longitude,
              latitudeDelta: 0.02,
              longitudeDelta: 0.02,
            },
            300
          );
        }
      } else {
        mapRef.current.animateToRegion(allLocationsRegion, 300);
      }
    } catch {
      // Silently handle animation errors
    }
  }, [selectedLocationId, locations, allLocationsRegion]);

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
        ref={mapRef}
        style={styles.map}
        initialRegion={allLocationsRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
      >
        {/* Static markers - NO dynamic styling to prevent disappearing */}
        {sortedLocations.map((location, index) => (
          <Marker
            key={location.id}
            coordinate={{
              latitude: location.latitude,
              longitude: location.longitude,
            }}
            title={location.name}
            description={location.description}
            tracksViewChanges={false}
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
    justifyContent: 'center',
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
