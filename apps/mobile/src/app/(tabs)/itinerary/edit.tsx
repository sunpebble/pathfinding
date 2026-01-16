import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
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
import { useItineraryStore } from '@/store/itineraryStore';

/**
 * Edit itinerary screen
 */
export default function EditItineraryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentItinerary, updateItinerary, isUpdating } = useItineraryStore();

  const [title, setTitle] = useState(currentItinerary?.title || '');
  const [visibility, setVisibility] = useState<'private' | 'public'>(
    currentItinerary?.visibility || 'private'
  );

  const hasChanges =
    title !== currentItinerary?.title ||
    visibility !== currentItinerary?.visibility;

  const handleSave = async () => {
    if (!id || !title.trim()) {
      Alert.alert('错误', '请输入行程标题');
      return;
    }

    try {
      updateItinerary(id, {
        title: title.trim(),
        visibility,
      });
      router.back();
    } catch {
      Alert.alert('保存失败', '无法保存更改，请重试');
    }
  };

  const handleCancel = () => {
    if (hasChanges) {
      Alert.alert('放弃更改', '确定要放弃所有更改吗？', [
        { text: '继续编辑', style: 'cancel' },
        { text: '放弃', style: 'destructive', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  if (!currentItinerary) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>行程不存在</Text>
      </View>
    );
  }

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
          <Text style={styles.label}>行程标题</Text>
          <TextInput
            style={styles.textInput}
            placeholder="给行程起个名字"
            value={title}
            onChangeText={setTitle}
            maxLength={100}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>可见性</Text>
          <View style={styles.visibilityOptions}>
            {[
              { value: 'private', label: '仅自己可见', icon: 'lock-closed' },
              { value: 'public', label: '公开', icon: 'globe' },
            ].map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.visibilityOption,
                  visibility === option.value && styles.selectedOption,
                ]}
                onPress={() => setVisibility(option.value as typeof visibility)}
              >
                <Ionicons
                  name={option.icon as 'lock-closed' | 'globe'}
                  size={20}
                  color={visibility === option.value ? '#007AFF' : '#666'}
                />
                <Text
                  style={[
                    styles.optionLabel,
                    visibility === option.value && styles.selectedOptionLabel,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelButtonText}>取消</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.saveButton, !hasChanges && styles.disabledButton]}
          onPress={handleSave}
          disabled={!hasChanges || isUpdating}
        >
          {isUpdating ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>保存</Text>
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
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorText: {
    fontSize: 16,
    color: '#999',
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
  visibilityOptions: {
    gap: 8,
  },
  visibilityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5E5',
  },
  selectedOption: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  optionLabel: {
    marginLeft: 12,
    fontSize: 16,
    color: '#666',
  },
  selectedOptionLabel: {
    color: '#007AFF',
    fontWeight: '500',
  },
  footer: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 12,
  },
  cancelButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#666',
  },
  saveButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    backgroundColor: '#007AFF',
    borderRadius: 12,
  },
  disabledButton: {
    backgroundColor: '#CCC',
  },
  saveButtonText: {
    fontSize: 17,
    fontWeight: '600',
    color: '#fff',
  },
});
