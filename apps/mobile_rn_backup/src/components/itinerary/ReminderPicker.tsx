import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

/**
 * Reminder preset options (in minutes)
 */
const REMINDER_PRESETS = [
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 120, label: '提前 2 小时' },
  { value: 1440, label: '提前 1 天' },
] as const;

interface ReminderPickerProps {
  visible: boolean;
  isEnabled: boolean;
  minutesBefore: number;
  onToggle: (enabled: boolean) => void;
  onSelect: (minutes: number) => void;
  onClose: () => void;
}

/**
 * ReminderPicker - component for setting item reminders
 */
export const ReminderPicker: React.FC<ReminderPickerProps> = ({
  visible,
  isEnabled,
  minutesBefore,
  onToggle,
  onSelect,
  onClose,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>提醒设置</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Toggle */}
          <View style={styles.toggleRow}>
            <View style={styles.toggleInfo}>
              <Ionicons
                name="notifications-outline"
                size={24}
                color="#007AFF"
              />
              <Text style={styles.toggleLabel}>开启提醒</Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={onToggle}
              trackColor={{ false: '#E0E0E0', true: '#007AFF' }}
              ios_backgroundColor="#E0E0E0"
            />
          </View>

          {/* Preset options */}
          {isEnabled && (
            <ScrollView style={styles.presetsList}>
              {REMINDER_PRESETS.map((preset) => (
                <TouchableOpacity
                  key={preset.value}
                  style={[
                    styles.presetItem,
                    minutesBefore === preset.value && styles.presetItemActive,
                  ]}
                  onPress={() => onSelect(preset.value)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.presetLabel,
                      minutesBefore === preset.value &&
                        styles.presetLabelActive,
                    ]}
                  >
                    {preset.label}
                  </Text>
                  {minutesBefore === preset.value && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Info */}
          {isEnabled && (
            <View style={styles.infoContainer}>
              <Ionicons
                name="information-circle-outline"
                size={16}
                color="#999"
              />
              <Text style={styles.infoText}>
                到达提醒时间时，您将收到推送通知
              </Text>
            </View>
          )}

          {/* Done button */}
          <TouchableOpacity style={styles.doneButton} onPress={onClose}>
            <Text style={styles.doneText}>完成</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

/**
 * Compact reminder toggle for inline use
 */
interface ReminderToggleProps {
  isEnabled: boolean;
  minutesBefore: number;
  onPress: () => void;
}

export const ReminderToggle: React.FC<ReminderToggleProps> = ({
  isEnabled,
  minutesBefore,
  onPress,
}) => {
  const getLabel = (): string => {
    if (!isEnabled) return '设置提醒';
    const preset = REMINDER_PRESETS.find((p) => p.value === minutesBefore);
    return preset?.label || `提前 ${minutesBefore} 分钟`;
  };

  return (
    <TouchableOpacity
      style={[styles.toggleButton, isEnabled && styles.toggleButtonActive]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name={isEnabled ? 'notifications' : 'notifications-outline'}
        size={16}
        color={isEnabled ? '#007AFF' : '#666'}
      />
      <Text
        style={[
          styles.toggleButtonText,
          isEnabled && styles.toggleButtonTextActive,
        ]}
      >
        {getLabel()}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34, // Safe area
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  closeButton: {
    padding: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  toggleInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  toggleLabel: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  presetsList: {
    maxHeight: 300,
    paddingHorizontal: 20,
    paddingVertical: 8,
  },
  presetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginVertical: 4,
  },
  presetItemActive: {
    backgroundColor: '#F0F7FF',
  },
  presetLabel: {
    fontSize: 16,
    color: '#333',
  },
  presetLabelActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#F5F5F5',
    marginHorizontal: 16,
    borderRadius: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#999',
  },
  doneButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
    alignItems: 'center',
  },
  doneText: {
    fontSize: 16,
    color: '#fff',
    fontWeight: '600',
  },
  // Toggle button styles
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  toggleButtonActive: {
    backgroundColor: '#E8F4FF',
  },
  toggleButtonText: {
    fontSize: 14,
    color: '#666',
  },
  toggleButtonTextActive: {
    color: '#007AFF',
    fontWeight: '500',
  },
});
