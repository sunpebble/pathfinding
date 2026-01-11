import type { TransportMode } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { TRANSPORT_MODE_VALUES, TRANSPORT_MODES } from '@pathfinding/constants';
import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TransportModePickerProps {
  visible: boolean;
  selectedMode: TransportMode;
  onSelect: (mode: TransportMode) => void;
  onClose: () => void;
}

// Icon mapping for transport modes
const TRANSPORT_ICONS: Record<TransportMode, keyof typeof Ionicons.glyphMap> = {
  walking: 'walk-outline',
  transit: 'bus-outline',
  driving: 'car-outline',
  cycling: 'bicycle-outline',
  taxi: 'car-sport-outline',
};

// Colors for transport modes
const TRANSPORT_COLORS: Record<TransportMode, string> = {
  walking: '#4CAF50',
  transit: '#2196F3',
  driving: '#FF9800',
  cycling: '#9C27B0',
  taxi: '#F44336',
};

// Descriptions for transport modes
const TRANSPORT_DESCRIPTIONS: Record<TransportMode, string> = {
  walking: '适合短距离，欣赏沿途风景',
  transit: '经济实惠，适合城市出行',
  driving: '自驾灵活，适合郊区和远距离',
  cycling: '环保健康，适合休闲骑行',
  taxi: '方便快捷，适合赶时间',
};

/**
 * TransportModePicker - modal for selecting transport mode
 */
export const TransportModePicker: React.FC<TransportModePickerProps> = ({
  visible,
  selectedMode,
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
            <Text style={styles.title}>选择出行方式</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Options */}
          <ScrollView style={styles.optionsList}>
            {TRANSPORT_MODE_VALUES.map((mode) => {
              const info = TRANSPORT_MODES[mode];
              const isSelected = mode === selectedMode;
              const color = TRANSPORT_COLORS[mode];

              return (
                <TouchableOpacity
                  key={mode}
                  style={[
                    styles.optionItem,
                    isSelected && { backgroundColor: `${color}10` },
                  ]}
                  onPress={() => {
                    onSelect(mode);
                    onClose();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: isSelected ? color : '#E0E0E0' },
                    ]}
                  >
                    <Ionicons
                      name={TRANSPORT_ICONS[mode]}
                      size={24}
                      color={isSelected ? '#fff' : '#666'}
                    />
                  </View>
                  <View style={styles.optionInfo}>
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && { color, fontWeight: '600' },
                      ]}
                    >
                      {info.label}
                    </Text>
                    <Text style={styles.optionDescription}>
                      {TRANSPORT_DESCRIPTIONS[mode]}
                    </Text>
                  </View>
                  {isSelected && (
                    <Ionicons name="checkmark-circle" size={24} color={color} />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Cancel button */}
          <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
            <Text style={styles.cancelText}>取消</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
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
    maxHeight: '80%',
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
  optionsList: {
    paddingHorizontal: 16,
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginVertical: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionInfo: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 13,
    color: '#999',
  },
  cancelButton: {
    marginHorizontal: 16,
    marginTop: 16,
    paddingVertical: 16,
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 16,
    color: '#666',
    fontWeight: '500',
  },
});
