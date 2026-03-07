'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, MapPin, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { updateGuidePoiCoordinates } from '@/lib/api/pois';
import { cn } from '@/lib/utils';

interface PoiEditorProps {
  isOpen: boolean;
  onClose: () => void;
  guideId: string;
  dayNumber: number;
  poiIndex: number;
  poi: {
    name: string;
    latitude: number;
    longitude: number;
    address?: string;
  };
  verifiedBy?: string;
}

export function PoiEditor({
  isOpen,
  onClose,
  guideId,
  dayNumber,
  poiIndex,
  poi,
  verifiedBy = 'admin',
}: PoiEditorProps) {
  const queryClient = useQueryClient();
  const [latitude, setLatitude] = useState(poi.latitude.toString());
  const [longitude, setLongitude] = useState(poi.longitude.toString());
  const [addressState, setAddressState] = useState<{ text: string; isLoading: boolean }>({ text: '', isLoading: false });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const updatePoiCoordinatesMutation = useMutation({
    mutationFn: (input: { latitude: number; longitude: number }) => updateGuidePoiCoordinates(guideId, {
      dayNumber,
      poiIndex,
      latitude: input.latitude,
      longitude: input.longitude,
      verifiedBy,
    }),
  });

  const parsedCoordinates = useMemo(() => {
    const lat = Number.parseFloat(latitude);
    const lng = Number.parseFloat(longitude);
    return {
      lat,
      lng,
      isValid: !Number.isNaN(lat) && !Number.isNaN(lng),
    };
  }, [latitude, longitude]);

  useEffect(() => {
    if (!parsedCoordinates.isValid) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void (async () => {
        setAddressState(prev => ({ ...prev, isLoading: true }));
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${parsedCoordinates.lat}&lon=${parsedCoordinates.lng}&zoom=18&addressdetails=1`,
          );
          if (response.ok) {
            const data = await response.json();
            setAddressState({ text: data.display_name || 'Address not found', isLoading: false });
          }
          else {
            setAddressState({ text: 'Could not fetch address', isLoading: false });
          }
        }
        catch {
          setAddressState({ text: 'Error fetching address', isLoading: false });
        }
      })();
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [parsedCoordinates]);

  const handleSave = async () => {
    const lat = Number.parseFloat(latitude);
    const lng = Number.parseFloat(longitude);

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Please enter valid coordinates');
      return;
    }

    if (lat < -90 || lat > 90) {
      setError('Latitude must be between -90 and 90');
      return;
    }

    if (lng < -180 || lng > 180) {
      setError('Longitude must be between -180 and 180');
      return;
    }

    setIsSaving(true);
    setError('');

    try {
      await updatePoiCoordinatesMutation.mutateAsync({ latitude: lat, longitude: lng });
      await queryClient.invalidateQueries({ queryKey: ['guide', guideId] });
      onClose();
    }
    catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update coordinates');
    }
    finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  const mapLat = Number.parseFloat(latitude);
  const mapLng = Number.parseFloat(longitude);
  const displayedAddress = parsedCoordinates.isValid ? addressState.text : '';
  const isLoadingAddress = parsedCoordinates.isValid ? addressState.isLoading : false;
  const mapDelta = 0.005;
  const mapUrl = Number.isNaN(mapLat) || Number.isNaN(mapLng)
    ? 'https://www.openstreetmap.org'
    : `https://www.openstreetmap.org/export/embed.html?bbox=${mapLng - mapDelta},${mapLat - mapDelta},${mapLng + mapDelta},${mapLat + mapDelta}&layer=mapnik&marker=${mapLat},${mapLng}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative bg-white rounded-xl shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Edit POI Coordinates</h2>
            <p className="text-sm text-gray-500 mt-1">{poi.name}</p>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors" aria-label="Close">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-900">Current Location</p>
                <p className="text-sm text-blue-700 mt-1">
                  {poi.latitude.toFixed(6)}
                  ,
                  {' '}
                  {poi.longitude.toFixed(6)}
                </p>
                {poi.address && <p className="text-xs text-blue-600 mt-1">{poi.address}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Map Preview</p>
            <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden border border-gray-200">
              <iframe title="Map Preview" src={mapUrl} className="w-full h-full" style={{ border: 0 }} />
              <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs text-gray-600">
                Click map to select location (external)
              </div>
            </div>
            <p className="text-xs text-gray-500">Tip: Open map in new tab to select precise coordinates, then paste them below</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="latitude" className="text-sm font-medium text-gray-700">Latitude</label>
              <input
                id="latitude"
                type="text"
                value={latitude}
                onChange={(e) => {
                  setLatitude(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="-90 to 90"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="longitude" className="text-sm font-medium text-gray-700">Longitude</label>
              <input
                id="longitude"
                type="text"
                value={longitude}
                onChange={(e) => {
                  setLongitude(e.target.value);
                  setError('');
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="-180 to 180"
              />
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">Address Preview</p>
            <div className={cn('px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm min-h-[2.5rem] flex items-center', isLoadingAddress && 'text-gray-400')}>
              {isLoadingAddress
                ? (
                    <span className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                      Loading address...
                    </span>
                  )
                : displayedAddress
                  ? <span className="text-gray-700">{displayedAddress}</span>
                  : <span className="text-gray-400">Enter valid coordinates to preview address</span>}
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2 text-gray-700 hover:text-gray-900 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={cn(
                'px-6 py-2 bg-emerald-600 text-white rounded-lg font-medium transition-all',
                'hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed',
                'flex items-center gap-2',
              )}
            >
              {isSaving
                ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Saving...
                    </>
                  )
                : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Save Coordinates
                    </>
                  )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
