import AsyncStorage from '@react-native-async-storage/async-storage';

const LOCATION_CONSENT_KEY = '@pathfinding/location_consent';

/**
 * Location consent record structure
 */
interface LocationConsentRecord {
  /** Whether user has consented to location access */
  hasConsented: boolean;
  /** Timestamp when consent was recorded */
  timestamp: string;
  /** Source of consent decision */
  source:
    | 'modal_granted'
    | 'modal_denied'
    | 'modal_user_declined'
    | 'modal_already_granted'
    | 'modal_error'
    | 'settings_granted'
    | 'settings_denied';
  /** App version when consent was recorded */
  appVersion?: string;
}

/**
 * Get stored location consent status
 *
 * @returns Location consent record or null if not set
 */
export async function getLocationConsent(): Promise<LocationConsentRecord | null> {
  try {
    const value = await AsyncStorage.getItem(LOCATION_CONSENT_KEY);
    if (!value) {
      return null;
    }
    return JSON.parse(value) as LocationConsentRecord;
  } catch (error) {
    console.error('Error reading location consent:', error);
    return null;
  }
}

/**
 * Set location consent status
 *
 * @param hasConsented - Whether user consented
 * @param source - Source of consent decision
 */
export async function setLocationConsent(
  hasConsented: boolean,
  source: LocationConsentRecord['source']
): Promise<void> {
  try {
    const record: LocationConsentRecord = {
      hasConsented,
      timestamp: new Date().toISOString(),
      source,
    };
    await AsyncStorage.setItem(LOCATION_CONSENT_KEY, JSON.stringify(record));
  } catch (error) {
    console.error('Error saving location consent:', error);
  }
}

/**
 * Check if location consent has been recorded
 *
 * @returns true if consent has been recorded (either granted or denied)
 */
export async function hasLocationConsentRecord(): Promise<boolean> {
  const consent = await getLocationConsent();
  return consent !== null;
}

/**
 * Clear location consent record
 * Useful for testing or when user wants to reset permissions
 */
export async function clearLocationConsent(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LOCATION_CONSENT_KEY);
  } catch (error) {
    console.error('Error clearing location consent:', error);
  }
}

/**
 * Update consent after user changes permission in system settings
 *
 * @param hasConsented - Whether permission is now granted
 */
export async function updateConsentFromSettings(
  hasConsented: boolean
): Promise<void> {
  await setLocationConsent(
    hasConsented,
    hasConsented ? 'settings_granted' : 'settings_denied'
  );
}
