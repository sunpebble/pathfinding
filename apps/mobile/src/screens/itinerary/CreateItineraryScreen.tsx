import type { City } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CityPicker, DateRangePicker } from '../../components/itinerary';
import { useItineraryStore } from '../../store/itineraryStore';

/**
 * Screen for creating a new itinerary
 */
export function CreateItineraryScreen() {
  const [title, setTitle] = useState('');
  const [selectedCity, setSelectedCity] = useState<City | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [description, setDescription] = useState('');

  const { createItinerary, isCreating } = useItineraryStore();

  const isFormValid =
    title.trim().length > 0 && selectedCity && startDate && endDate;

  const handleCreate = async () => {
    if (!isFormValid || !selectedCity || !startDate || !endDate) return;

    try {
      const itinerary = await createItinerary({
        title: title.trim(),
        cityId: selectedCity.id,
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        description: description.trim() || undefined,
        visibility: 'private',
      });

      if (itinerary) {
        router.replace(`/(tabs)/itinerary/${itinerary.id}`);
      }
    } catch {
      Alert.alert('创建失败', '无法创建行程，请重试');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Text style={styles.label}>行程标题 *</Text>
          <TextInput
            style={styles.textInput}
            placeholder="给行程起个名字"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>目的地城市 *</Text>
          <CityPicker
            selectedCity={selectedCity}
            onSelect={setSelectedCity}
            placeholder="选择目的地城市"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>出行日期 *</Text>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onSelect={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            placeholder="选择出行日期"
            maxDays={30}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>行程描述</Text>
          <TextInput
            style={[styles.textInput, styles.multilineInput]}
            placeholder="简单描述一下这次旅行（选填）"
            value={description}
            onChangeText={setDescription}
            multiline
            numberOfLines={4}
            maxLength={500}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.createButton, !isFormValid && styles.disabledButton]}
          onPress={handleCreate}
          disabled={!isFormValid || isCreating}
        >
          {isCreating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.createButtonText}>创建行程</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    padding: 16,
    fontSize: 16,
    color: '#333',
  },
  multilineInput: {
    minHeight: 100,
  },
  footer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  createButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 16,
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  createButtonText: {
    marginLeft: 8,
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});

export default CreateItineraryScreen;
