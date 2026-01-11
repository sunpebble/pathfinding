import { Ionicons } from '@expo/vector-icons';
import { formatDate, getDaysBetween } from '@pathfinding/utils';
import React, { useCallback, useState } from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DateRangePickerProps {
  startDate: Date | null;
  endDate: Date | null;
  onSelect: (startDate: Date, endDate: Date) => void;
  placeholder?: string;
  minDate?: Date;
  maxDays?: number;
}

/**
 * Date range picker component for selecting trip dates
 */
export function DateRangePicker({
  startDate,
  endDate,
  onSelect,
  placeholder = '选择出行日期',
  minDate = new Date(),
  maxDays = 30,
}: DateRangePickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [tempStartDate, setTempStartDate] = useState<Date | null>(
    () => startDate
  );
  const [tempEndDate, setTempEndDate] = useState<Date | null>(() => endDate);
  const [currentMonth, setCurrentMonth] = useState(() => new Date());

  const handleConfirm = useCallback(() => {
    if (tempStartDate && tempEndDate) {
      onSelect(tempStartDate, tempEndDate);
      setModalVisible(false);
    }
  }, [tempStartDate, tempEndDate, onSelect]);

  const handleDatePress = useCallback(
    (date: Date) => {
      if (!tempStartDate || (tempStartDate && tempEndDate)) {
        // Start new selection
        setTempStartDate(date);
        setTempEndDate(null);
      } else {
        // Complete selection
        if (date < tempStartDate) {
          setTempEndDate(tempStartDate);
          setTempStartDate(date);
        } else {
          // Check max days constraint
          const days = getDaysBetween(tempStartDate, date);
          if (days <= maxDays) {
            setTempEndDate(date);
          }
        }
      }
    },
    [tempStartDate, tempEndDate, maxDays]
  );

  const isDateSelected = useCallback(
    (date: Date) => {
      if (!tempStartDate) return false;
      if (!tempEndDate)
        return date.toDateString() === tempStartDate.toDateString();
      return date >= tempStartDate && date <= tempEndDate;
    },
    [tempStartDate, tempEndDate]
  );

  const isStartDate = useCallback(
    (date: Date) => {
      return tempStartDate?.toDateString() === date.toDateString();
    },
    [tempStartDate]
  );

  const isEndDate = useCallback(
    (date: Date) => {
      return tempEndDate?.toDateString() === date.toDateString();
    },
    [tempEndDate]
  );

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startDay = firstDay.getDay();

    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    for (let i = 0; i < startDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      days.push(new Date(year, month, i));
    }

    const weeks: (Date | null)[][] = [];
    for (let i = 0; i < days.length; i += 7) {
      weeks.push(days.slice(i, i + 7));
    }

    return (
      <View style={styles.calendar}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(year, month - 1, 1))}
          >
            <Ionicons name="chevron-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.monthTitle}>
            {year}年{month + 1}月
          </Text>
          <TouchableOpacity
            onPress={() => setCurrentMonth(new Date(year, month + 1, 1))}
          >
            <Ionicons name="chevron-forward" size={24} color="#333" />
          </TouchableOpacity>
        </View>

        <View style={styles.weekDays}>
          {['日', '一', '二', '三', '四', '五', '六'].map((day) => (
            <Text key={day} style={styles.weekDay}>
              {day}
            </Text>
          ))}
        </View>

        {weeks.map((week, weekIndex) => {
          // Generate a stable key based on the first valid date in the week
          const firstValidDate = week.find((d) => d !== null);
          const weekKey = firstValidDate
            ? `${firstValidDate.getFullYear()}-${firstValidDate.getMonth()}-w${weekIndex}`
            : `empty-week-${weekIndex}`;

          return (
            <View key={weekKey} style={styles.week}>
              {week.map((date, dayIndex) => {
                // Empty calendar cells need index-based keys since they have no unique identifier
                if (!date) {
                  return (
                    <View
                      // eslint-disable-next-line react/no-array-index-key
                      key={`${weekKey}-empty-${dayIndex}`}
                      style={styles.dayCell}
                    />
                  );
                }

                const isPast =
                  date < minDate &&
                  date.toDateString() !== minDate.toDateString();
                const selected = isDateSelected(date);
                const isStart = isStartDate(date);
                const isEnd = isEndDate(date);

                return (
                  <TouchableOpacity
                    key={date.toISOString()}
                    style={[
                      styles.dayCell,
                      selected && styles.selectedDay,
                      (isStart || isEnd) && styles.endpointDay,
                    ]}
                    onPress={() => !isPast && handleDatePress(date)}
                    disabled={isPast}
                  >
                    <Text
                      style={[
                        styles.dayText,
                        isPast && styles.pastDay,
                        selected && styles.selectedDayText,
                      ]}
                    >
                      {date.getDate()}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          );
        })}
      </View>
    );
  };

  const displayText =
    startDate && endDate
      ? `${formatDate(startDate)} - ${formatDate(endDate)} (${getDaysBetween(startDate, endDate)}天)`
      : placeholder;

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons
          name="calendar"
          size={20}
          color={startDate ? '#007AFF' : '#999'}
        />
        <Text style={[styles.selectorText, !startDate && styles.placeholder]}>
          {displayText}
        </Text>
        <Ionicons name="chevron-forward" size={20} color="#999" />
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
            <Text style={styles.modalTitle}>选择日期</Text>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={!tempStartDate || !tempEndDate}
            >
              <Text
                style={[
                  styles.confirmButton,
                  (!tempStartDate || !tempEndDate) && styles.disabledButton,
                ]}
              >
                确定
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.hint}>
            {!tempStartDate
              ? '请选择开始日期'
              : !tempEndDate
                ? '请选择结束日期'
                : `已选择 ${getDaysBetween(tempStartDate, tempEndDate)} 天`}
          </Text>

          {renderCalendar()}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  placeholder: {
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  cancelButton: {
    fontSize: 16,
    color: '#007AFF',
  },
  confirmButton: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: '600',
  },
  disabledButton: {
    color: '#999',
  },
  hint: {
    textAlign: 'center',
    padding: 16,
    fontSize: 14,
    color: '#666',
  },
  calendar: {
    padding: 16,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDays: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekDay: {
    flex: 1,
    textAlign: 'center',
    fontSize: 14,
    color: '#666',
  },
  week: {
    flexDirection: 'row',
  },
  dayCell: {
    flex: 1,
    aspectRatio: 1,
    alignItems: 'center',
    justifyContent: 'center',
    margin: 2,
  },
  dayText: {
    fontSize: 16,
    color: '#333',
  },
  pastDay: {
    color: '#CCC',
  },
  selectedDay: {
    backgroundColor: '#E3F2FD',
  },
  selectedDayText: {
    color: '#007AFF',
    fontWeight: '600',
  },
  endpointDay: {
    backgroundColor: '#007AFF',
    borderRadius: 20,
  },
});
