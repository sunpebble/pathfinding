import * as Location from 'expo-location';
import React, { useCallback, useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  getLocationConsent,
  setLocationConsent,
} from '../../lib/locationConsent';

interface GPSPermissionModalProps {
  visible: boolean;
  onClose: () => void;
  onPermissionGranted: () => void;
  onPermissionDenied?: () => void;
}

/**
 * GPSPermissionModal - Modal component for requesting GPS permission with consent explanation
 *
 * Follows constitution principle III: Location & Privacy Security
 * - Provides clear explanation of why location data is needed
 * - Tracks user consent status
 * - Offers settings navigation if permission denied
 */
export function GPSPermissionModal({
  visible,
  onClose,
  onPermissionGranted,
  onPermissionDenied,
}: GPSPermissionModalProps) {
  const [isRequesting, setIsRequesting] = useState(false);

  /**
   * Open app settings
   */
  const openSettings = useCallback(() => {
    if (Platform.OS === 'ios') {
      Linking.openURL('app-settings:');
    } else {
      Linking.openSettings();
    }
    onClose();
  }, [onClose]);

  /**
   * Handle permission request
   */
  const handleRequestPermission = useCallback(async () => {
    setIsRequesting(true);

    try {
      // Check current permission status
      const { status: currentStatus } =
        await Location.getForegroundPermissionsAsync();

      if (currentStatus === Location.PermissionStatus.GRANTED) {
        // Already granted, record consent and notify parent
        await setLocationConsent(true, 'modal_already_granted');
        onPermissionGranted();
        onClose();
        return;
      }

      // Request permission
      const { status } = await Location.requestForegroundPermissionsAsync();

      if (status === Location.PermissionStatus.GRANTED) {
        // Permission granted, record consent
        await setLocationConsent(true, 'modal_granted');
        onPermissionGranted();
        onClose();
      } else {
        // Permission denied, record denial
        await setLocationConsent(false, 'modal_denied');
        onPermissionDenied?.();
      }
    } catch (error) {
      console.error('Error requesting location permission:', error);
      await setLocationConsent(false, 'modal_error');
      onPermissionDenied?.();
    } finally {
      setIsRequesting(false);
    }
  }, [onClose, onPermissionDenied, onPermissionGranted]);

  /**
   * Handle user declining permission
   */
  const handleDecline = useCallback(async () => {
    await setLocationConsent(false, 'modal_user_declined');
    onPermissionDenied?.();
    onClose();
  }, [onClose, onPermissionDenied]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Text style={styles.icon}>📍</Text>
          </View>

          {/* Title */}
          <Text style={styles.title}>发现附近精彩</Text>

          {/* Description */}
          <Text style={styles.description}>
            探路需要访问您的位置信息，以便为您推荐附近的景点和美食。
          </Text>

          {/* Privacy notice */}
          <View style={styles.privacyNotice}>
            <Text style={styles.privacyIcon}>🔒</Text>
            <Text style={styles.privacyText}>
              您的位置数据仅在本地使用，不会上传到服务器或分享给第三方。
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleRequestPermission}
              disabled={isRequesting}
            >
              <Text style={styles.primaryButtonText}>
                {isRequesting ? '请求中...' : '允许访问位置'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleDecline}
              disabled={isRequesting}
            >
              <Text style={styles.secondaryButtonText}>暂不开启</Text>
            </TouchableOpacity>
          </View>

          {/* Settings link (shown after permission denied) */}
          <TouchableOpacity style={styles.settingsLink} onPress={openSettings}>
            <Text style={styles.settingsText}>如需修改，请前往系统设置</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/**
 * Hook to check if GPS permission modal should be shown
 */
export function useGPSPermissionModal() {
  const [showModal, setShowModal] = useState(false);

  const checkAndShowModal = useCallback(async (): Promise<boolean> => {
    // Check if user has already consented
    const consent = await getLocationConsent();

    if (consent?.hasConsented) {
      // User already granted consent, check actual permission
      const { status } = await Location.getForegroundPermissionsAsync();
      return status === Location.PermissionStatus.GRANTED;
    }

    // No consent recorded, show modal
    setShowModal(true);
    return false;
  }, []);

  const hideModal = useCallback(() => {
    setShowModal(false);
  }, []);

  return {
    showModal,
    checkAndShowModal,
    hideModal,
  };
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
    alignItems: 'center',
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  icon: {
    fontSize: 32,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 16,
  },
  privacyNotice: {
    flexDirection: 'row',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    padding: 12,
    marginBottom: 24,
    alignItems: 'flex-start',
  },
  privacyIcon: {
    fontSize: 14,
    marginRight: 8,
    marginTop: 1,
  },
  privacyText: {
    flex: 1,
    fontSize: 12,
    color: '#6B7280',
    lineHeight: 16,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#4F46E5',
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#6B7280',
    fontSize: 14,
  },
  settingsLink: {
    marginTop: 16,
    paddingVertical: 4,
  },
  settingsText: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'underline',
  },
});
