import type { ItineraryItem, TransportMode } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { TRANSPORT_MODE_VALUES, TRANSPORT_MODES } from '@pathfinding/constants';
import React, { useCallback, useEffect, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TimeConflictAlert } from './TimeConflictAlert';
import { TimeSlotPicker } from './TimeSlotPicker';

interface EditItemModalProps {
  visible: boolean;
  item: ItineraryItem | null;
  onClose: () => void;
  onSave: (updates: {
    startTime?: string | null;
    endTime?: string | null;
    notes?: string;
    transportMode?: TransportMode;
    transportMinutes?: number | null;
  }) => Promise<{
    conflicts?: Array<{
      itemId: string;
      startTime: string;
      endTime: string;
      poiName?: string;
    }>;
  }>;
  onDelete?: () => void;
}

/**
 * EditItemModal - modal for editing itinerary item details
 */
export const EditItemModal: React.FC<EditItemModalProps> = ({
  visible,
  item,
  onClose,
  onSave,
  onDelete,
}) => {
  const [startTime, setStartTime] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [transportMinutes, setTransportMinutes] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [conflicts, setConflicts] = useState<
    Array<{
      itemId: string;
      startTime: string;
      endTime: string;
      poiName?: string;
    }>
  >([]);

  // Initialize form with item data
  useEffect(() => {
    if (item) {
      const initializeForm = () => {
        setStartTime(item.startTime);
        setEndTime(item.endTime);
        setNotes(item.notes || '');
        setTransportMode((item.transportMode as TransportMode) || 'walking');
        setTransportMinutes(item.transportMinutes?.toString() || '');
        setConflicts([]);
      };
      initializeForm();
    }
  }, [item?.id]); // Only depend on item id to avoid re-renders

  const handleTimeSelect = useCallback((start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  }, []);

  const handleSave = useCallback(async () => {
    if (!item) return;

    setIsSaving(true);
    setConflicts([]);

    try {
      const updates: Record<string, unknown> = {};

      // Only include changed fields
      if (startTime !== item.startTime) updates.startTime = startTime || null;
      if (endTime !== item.endTime) updates.endTime = endTime || null;
      if (notes !== (item.notes || '')) updates.notes = notes;
      if (transportMode !== item.transportMode)
        updates.transportMode = transportMode;

      const newTransportMinutes = transportMinutes
        ? Number.parseInt(transportMinutes, 10)
        : null;
      if (newTransportMinutes !== item.transportMinutes) {
        updates.transportMinutes = newTransportMinutes;
      }

      const result = await onSave(updates);

      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
      } else {
        onClose();
      }
    } catch (err) {
      console.error('Failed to save item:', err);
    } finally {
      setIsSaving(false);
    }
  }, [
    item,
    startTime,
    endTime,
    notes,
    transportMode,
    transportMinutes,
    onSave,
    onClose,
  ]);

  const handleDelete = useCallback(() => {
    if (onDelete) {
      onDelete();
      onClose();
    }
  }, [onDelete, onClose]);

  if (!item) return null;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.headerButton}>
            <Ionicons name="close" size={24} color="#666" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>编辑项目</Text>
          <TouchableOpacity
            onPress={handleSave}
            disabled={isSaving}
            style={styles.headerButton}
          >
            <Text
              style={[styles.saveText, isSaving && styles.saveTextDisabled]}
            >
              {isSaving ? '保存中...' : '保存'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* POI Info */}
          {item.poi && (
            <View style={styles.poiCard}>
              <Ionicons name="location" size={24} color="#1976d2" />
              <View style={styles.poiInfo}>
                <Text style={styles.poiName}>{item.poi.name}</Text>
                {item.poi.address && (
                  <Text style={styles.poiAddress} numberOfLines={1}>
                    {item.poi.address}
                  </Text>
                )}
              </View>
            </View>
          )}

          {/* Time conflicts warning */}
          {conflicts.length > 0 && <TimeConflictAlert conflicts={conflicts} />}

          {/* Time slot */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>时间安排</Text>
            <TimeSlotPicker
              startTime={startTime}
              endTime={endTime}
              onSelect={handleTimeSelect}
              placeholder="选择开始和结束时间"
            />
            {(startTime || endTime) && (
              <TouchableOpacity
                style={styles.clearTimeButton}
                onPress={() => {
                  setStartTime(undefined);
                  setEndTime(undefined);
                }}
              >
                <Text style={styles.clearTimeText}>清除时间</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Transport mode */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>到达方式</Text>
            <View style={styles.transportGrid}>
              {TRANSPORT_MODE_VALUES.map((mode) => {
                const info = TRANSPORT_MODES[mode];
                const isSelected = transportMode === mode;
                return (
                  <TouchableOpacity
                    key={mode}
                    style={[
                      styles.transportOption,
                      isSelected && styles.transportOptionSelected,
                    ]}
                    onPress={() => setTransportMode(mode)}
                  >
                    <Ionicons
                      name={info.icon as keyof typeof Ionicons.glyphMap}
                      size={20}
                      color={isSelected ? '#1976d2' : '#666'}
                    />
                    <Text
                      style={[
                        styles.transportLabel,
                        isSelected && styles.transportLabelSelected,
                      ]}
                    >
                      {info.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <View style={styles.transportTimeRow}>
              <Text style={styles.transportTimeLabel}>预计耗时（分钟）</Text>
              <TextInput
                style={styles.transportTimeInput}
                placeholder="30"
                value={transportMinutes}
                onChangeText={setTransportMinutes}
                keyboardType="number-pad"
              />
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>备注</Text>
            <TextInput
              style={styles.notesInput}
              placeholder="添加备注，如预订信息、注意事项等..."
              value={notes}
              onChangeText={setNotes}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
            />
          </View>

          {/* Delete button */}
          {onDelete && (
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color="#dc3545" />
              <Text style={styles.deleteButtonText}>删除此项目</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerButton: {
    padding: 4,
    minWidth: 60,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  saveText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1976d2',
    textAlign: 'right',
  },
  saveTextDisabled: {
    color: '#999',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  poiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 20,
    gap: 12,
  },
  poiInfo: {
    flex: 1,
  },
  poiName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  poiAddress: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  clearTimeButton: {
    alignSelf: 'flex-start',
    marginTop: 8,
  },
  clearTimeText: {
    fontSize: 14,
    color: '#1976d2',
  },
  transportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  transportOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    gap: 6,
  },
  transportOptionSelected: {
    backgroundColor: '#e3f2fd',
    borderWidth: 1,
    borderColor: '#1976d2',
  },
  transportLabel: {
    fontSize: 13,
    color: '#666',
  },
  transportLabelSelected: {
    color: '#1976d2',
    fontWeight: '600',
  },
  transportTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
  },
  transportTimeLabel: {
    fontSize: 14,
    color: '#666',
    marginRight: 12,
  },
  transportTimeInput: {
    width: 80,
    height: 40,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    backgroundColor: '#fafafa',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    marginTop: 12,
    marginBottom: 32,
    borderRadius: 12,
    backgroundColor: '#fff5f5',
    gap: 8,
  },
  deleteButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#dc3545',
  },
});
