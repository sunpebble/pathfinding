import type { TransportMode } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { TRANSPORT_MODE_VALUES, TRANSPORT_MODES } from '@pathfinding/constants';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { TimeConflictAlert, TimeSlotPicker } from '@/components/itinerary';
import { itineraryService } from '@/services/itineraryService';

/**
 * Add Item Screen for adding a POI or custom activity to a day
 */
export default function AddItemScreen() {
  const router = useRouter();
  const { itineraryId, dayId, poiId, poiName } = useLocalSearchParams<{
    itineraryId: string;
    dayId: string;
    poiId?: string;
    poiName?: string;
  }>();

  const [startTime, setStartTime] = useState<string | undefined>();
  const [endTime, setEndTime] = useState<string | undefined>();
  const [notes, setNotes] = useState('');
  const [transportMode, setTransportMode] = useState<TransportMode>('walking');
  const [transportMinutes, setTransportMinutes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [conflicts, setConflicts] = useState<
    {
      itemId: string;
      startTime: string;
      endTime: string;
      poiName?: string;
    }[]
  >([]);

  const handleTimeSelect = useCallback((start: string, end: string) => {
    setStartTime(start);
    setEndTime(end);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!itineraryId || !dayId) {
      Alert.alert('错误', '缺少行程信息');
      return;
    }

    setIsSubmitting(true);
    setConflicts([]);

    try {
      const input: Record<string, unknown> = {
        transportMode,
      };

      if (poiId) {
        input.poiId = poiId;
      }
      if (startTime) {
        input.startTime = startTime;
      }
      if (endTime) {
        input.endTime = endTime;
      }
      if (notes.trim()) {
        input.notes = notes.trim();
      }
      if (transportMinutes) {
        input.transportMinutes = Number.parseInt(transportMinutes, 10);
      }

      const result = await itineraryService.addItem(itineraryId, dayId, input);

      if (result.conflicts && result.conflicts.length > 0) {
        setConflicts(result.conflicts);
        // Still navigate back but show conflicts first
        Alert.alert('添加成功', '已添加到行程，但存在时间冲突，请注意调整。', [
          { text: '好的', onPress: () => router.back() },
        ]);
      } else {
        router.back();
      }
    } catch (err) {
      Alert.alert('添加失败', (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  }, [
    itineraryId,
    dayId,
    poiId,
    startTime,
    endTime,
    notes,
    transportMode,
    transportMinutes,
    router,
  ]);

  const renderTransportModeSelector = () => (
    <View style={styles.transportContainer}>
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
                size={24}
                color={isSelected ? '#007AFF' : '#666'}
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
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={styles.backButton}
          >
            <Ionicons name="close" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>添加到行程</Text>
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isSubmitting}
            style={styles.saveButton}
          >
            <Text
              style={[
                styles.saveButtonText,
                isSubmitting && styles.saveButtonDisabled,
              ]}
            >
              {isSubmitting ? '添加中...' : '添加'}
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
          {/* Selected POI */}
          {poiName && (
            <View style={styles.poiCard}>
              <Ionicons name="location" size={24} color="#007AFF" />
              <Text style={styles.poiName}>{poiName}</Text>
            </View>
          )}

          {/* Time conflicts warning */}
          {conflicts.length > 0 && <TimeConflictAlert conflicts={conflicts} />}

          {/* Time slot picker */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>时间安排</Text>
            <TimeSlotPicker
              startTime={startTime}
              endTime={endTime}
              onSelect={handleTimeSelect}
              placeholder="选择开始和结束时间"
            />
          </View>

          {/* Transport mode */}
          {renderTransportModeSelector()}

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  flex: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  saveButton: {
    padding: 4,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  saveButtonDisabled: {
    color: '#ccc',
  },
  content: {
    flex: 1,
  },
  poiCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f8ff',
    marginHorizontal: 16,
    marginTop: 16,
    padding: 14,
    borderRadius: 12,
    gap: 10,
  },
  poiName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  section: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  transportContainer: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  transportGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  transportOption: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 70,
    height: 70,
    borderRadius: 12,
    backgroundColor: '#f5f5f5',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  transportOptionSelected: {
    backgroundColor: '#f0f8ff',
    borderColor: '#007AFF',
  },
  transportLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  transportLabelSelected: {
    color: '#007AFF',
    fontWeight: '500',
  },
  transportTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  transportTimeLabel: {
    fontSize: 14,
    color: '#666',
  },
  transportTimeInput: {
    width: 80,
    height: 40,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    textAlign: 'center',
    fontSize: 15,
  },
  notesInput: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    minHeight: 100,
    color: '#333',
  },
});
