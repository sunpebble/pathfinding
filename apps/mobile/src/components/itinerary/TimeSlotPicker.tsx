import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

interface TimeSlotPickerProps {
  startTime?: string;
  endTime?: string;
  onSelect: (startTime: string, endTime: string) => void;
  placeholder?: string;
  minTime?: string;
  maxTime?: string;
}

/**
 * Generate time slots in 30-minute intervals
 */
function generateTimeSlots(minTime = '06:00', maxTime = '23:30'): string[] {
  const slots: string[] = [];
  const [minHour, minMin] = minTime.split(':').map(Number);
  const [maxHour, maxMin] = maxTime.split(':').map(Number);

  let currentHour = minHour;
  let currentMin = minMin;

  while (
    currentHour < maxHour ||
    (currentHour === maxHour && currentMin <= maxMin)
  ) {
    const timeStr = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`;
    slots.push(timeStr);

    currentMin += 30;
    if (currentMin >= 60) {
      currentMin = 0;
      currentHour += 1;
    }
  }

  return slots;
}

/**
 * Time slot picker component for selecting start and end times
 */
export function TimeSlotPicker({
  startTime,
  endTime,
  onSelect,
  placeholder = '选择时间段',
  minTime = '06:00',
  maxTime = '23:30',
}: TimeSlotPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selecting, setSelecting] = useState<'start' | 'end'>('start');
  const [tempStartTime, setTempStartTime] = useState(startTime || '09:00');
  const [tempEndTime, setTempEndTime] = useState(endTime || '12:00');

  const timeSlots = generateTimeSlots(minTime, maxTime);

  const handleOpenPicker = useCallback(() => {
    setTempStartTime(startTime || '09:00');
    setTempEndTime(endTime || '12:00');
    setSelecting('start');
    setModalVisible(true);
  }, [startTime, endTime]);

  const handleSelectTime = useCallback(
    (time: string) => {
      if (selecting === 'start') {
        setTempStartTime(time);
        // Auto-set end time to 2 hours later if not set or invalid
        if (!tempEndTime || time >= tempEndTime) {
          const [hour, min] = time.split(':').map(Number);
          const newEndHour = Math.min(hour + 2, 23);
          setTempEndTime(
            `${newEndHour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`
          );
        }
        setSelecting('end');
      } else {
        setTempEndTime(time);
      }
    },
    [selecting, tempEndTime]
  );

  const handleConfirm = useCallback(() => {
    if (tempStartTime && tempEndTime && tempStartTime < tempEndTime) {
      onSelect(tempStartTime, tempEndTime);
      setModalVisible(false);
    }
  }, [tempStartTime, tempEndTime, onSelect]);

  const displayText =
    startTime && endTime ? `${startTime} - ${endTime}` : placeholder;

  const isValidSelection = tempStartTime < tempEndTime;

  return (
    <>
      <TouchableOpacity
        style={styles.trigger}
        onPress={handleOpenPicker}
        activeOpacity={0.7}
      >
        <Ionicons name="time-outline" size={20} color="#666" />
        <Text
          style={[styles.triggerText, !startTime && styles.placeholderText]}
        >
          {displayText}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#999" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setModalVisible(false)}>
              <Text style={styles.cancelButton}>取消</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>选择时间</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!isValidSelection}
            >
              <Text
                style={[
                  styles.confirmButton,
                  !isValidSelection && styles.disabledButton,
                ]}
              >
                确定
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, selecting === 'start' && styles.activeTab]}
              onPress={() => setSelecting('start')}
            >
              <Text
                style={[
                  styles.tabText,
                  selecting === 'start' && styles.activeTabText,
                ]}
              >
                开始时间
              </Text>
              <Text style={styles.selectedTime}>{tempStartTime}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, selecting === 'end' && styles.activeTab]}
              onPress={() => setSelecting('end')}
            >
              <Text
                style={[
                  styles.tabText,
                  selecting === 'end' && styles.activeTabText,
                ]}
              >
                结束时间
              </Text>
              <Text style={styles.selectedTime}>{tempEndTime}</Text>
            </TouchableOpacity>
          </View>

          {!isValidSelection && (
            <Text style={styles.errorText}>结束时间必须晚于开始时间</Text>
          )}

          <ScrollView style={styles.timeList}>
            {timeSlots.map((time) => {
              const isSelected =
                (selecting === 'start' && time === tempStartTime) ||
                (selecting === 'end' && time === tempEndTime);
              const isDisabled = selecting === 'end' && time <= tempStartTime;

              return (
                <TouchableOpacity
                  key={time}
                  style={[
                    styles.timeItem,
                    isSelected && styles.selectedTimeItem,
                    isDisabled && styles.disabledTimeItem,
                  ]}
                  onPress={() => !isDisabled && handleSelectTime(time)}
                  disabled={isDisabled}
                >
                  <Text
                    style={[
                      styles.timeText,
                      isSelected && styles.selectedTimeText,
                      isDisabled && styles.disabledTimeText,
                    ]}
                  >
                    {time}
                  </Text>
                  {isSelected && (
                    <Ionicons name="checkmark" size={20} color="#007AFF" />
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  triggerText: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#333',
  },
  cancelButton: {
    fontSize: 16,
    color: '#666',
  },
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#ccc',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e0e0e0',
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#007AFF',
  },
  tabText: {
    fontSize: 13,
    color: '#999',
  },
  activeTabText: {
    color: '#007AFF',
  },
  selectedTime: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginTop: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    textAlign: 'center',
    paddingVertical: 8,
  },
  timeList: {
    flex: 1,
  },
  timeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  selectedTimeItem: {
    backgroundColor: '#f0f8ff',
  },
  disabledTimeItem: {
    opacity: 0.4,
  },
  timeText: {
    fontSize: 17,
    color: '#333',
  },
  selectedTimeText: {
    color: '#007AFF',
    fontWeight: '500',
  },
  disabledTimeText: {
    color: '#999',
  },
});
