import type { City } from '@pathfinding/types';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

interface CityPickerProps {
  selectedCity: City | null;
  onSelect: (city: City) => void;
  placeholder?: string;
}

// Sample cities for development (will be replaced with API call)
const SAMPLE_CITIES: City[] = [
  {
    id: '1',
    name: '北京',
    timezone: 'Asia/Shanghai',
    countryCode: 'CN',
    latitude: 39.9042,
    longitude: 116.4074,
    createdAt: new Date(),
  },
  {
    id: '2',
    name: '上海',
    timezone: 'Asia/Shanghai',
    countryCode: 'CN',
    latitude: 31.2304,
    longitude: 121.4737,
    createdAt: new Date(),
  },
  {
    id: '3',
    name: '广州',
    timezone: 'Asia/Shanghai',
    countryCode: 'CN',
    latitude: 23.1291,
    longitude: 113.2644,
    createdAt: new Date(),
  },
  {
    id: '4',
    name: '深圳',
    timezone: 'Asia/Shanghai',
    countryCode: 'CN',
    latitude: 22.5431,
    longitude: 114.0579,
    createdAt: new Date(),
  },
  {
    id: '5',
    name: '成都',
    timezone: 'Asia/Shanghai',
    countryCode: 'CN',
    latitude: 30.5728,
    longitude: 104.0668,
    createdAt: new Date(),
  },
  {
    id: '6',
    name: '杭州',
    timezone: 'Asia/Shanghai',
    countryCode: 'CN',
    latitude: 30.2741,
    longitude: 120.1551,
    createdAt: new Date(),
  },
  {
    id: '7',
    name: '西安',
    timezone: 'Asia/Shanghai',
    countryCode: 'CN',
    latitude: 34.3416,
    longitude: 108.9398,
    createdAt: new Date(),
  },
  {
    id: '8',
    name: '重庆',
    timezone: 'Asia/Shanghai',
    countryCode: 'CN',
    latitude: 29.4316,
    longitude: 106.9123,
    createdAt: new Date(),
  },
];

/**
 * City picker component with search functionality
 */
export function CityPicker({
  selectedCity,
  onSelect,
  placeholder = '选择目的地城市',
}: CityPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [_isLoading, _setIsLoading] = useState(false);

  // Filter cities based on search query
  const filteredCities = SAMPLE_CITIES.filter((city) =>
    city.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelect = useCallback(
    (city: City) => {
      onSelect(city);
      setModalVisible(false);
      setSearchQuery('');
    },
    [onSelect]
  );

  const renderCityItem = useCallback(
    ({ item }: { item: City }) => (
      <TouchableOpacity
        style={styles.cityItem}
        onPress={() => handleSelect(item)}
      >
        <Ionicons name="location-outline" size={20} color="#666" />
        <Text style={styles.cityName}>{item.name}</Text>
        {selectedCity?.id === item.id && (
          <Ionicons name="checkmark" size={20} color="#007AFF" />
        )}
      </TouchableOpacity>
    ),
    [selectedCity, handleSelect]
  );

  return (
    <>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons
          name="location"
          size={20}
          color={selectedCity ? '#007AFF' : '#999'}
        />
        <Text
          style={[styles.selectorText, !selectedCity && styles.placeholder]}
        >
          {selectedCity?.name || placeholder}
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
            <Text style={styles.modalTitle}>选择城市</Text>
            <View style={{ width: 50 }} />
          </View>

          <View style={styles.searchContainer}>
            <Ionicons name="search" size={20} color="#999" />
            <TextInput
              style={styles.searchInput}
              placeholder="搜索城市"
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              autoCorrect={false}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <Ionicons name="close-circle" size={20} color="#999" />
              </TouchableOpacity>
            )}
          </View>

          {isLoading ? (
            <ActivityIndicator style={styles.loader} size="large" />
          ) : (
            <FlatList
              data={filteredCities}
              keyExtractor={(item) => item.id}
              renderItem={renderCityItem}
              ListEmptyComponent={
                <Text style={styles.emptyText}>未找到匹配的城市</Text>
              }
            />
          )}
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  cityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  cityName: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 40,
    fontSize: 16,
    color: '#999',
  },
  loader: {
    marginTop: 40,
  },
});
