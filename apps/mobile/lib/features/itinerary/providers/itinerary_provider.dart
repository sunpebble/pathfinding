import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../data/models/itinerary.dart';
import '../../../data/services/itinerary_service.dart';

part 'itinerary_provider.g.dart';

/// Itinerary list provider
@riverpod
Future<List<ItineraryWithStats>> itineraryList(Ref ref) async {
  final response = await ref.watch(itineraryServiceProvider).list();
  return response.data;
}

/// Itinerary detail provider
@riverpod
Future<Itinerary> itineraryDetail(Ref ref, String id) async {
  return ref.watch(itineraryServiceProvider).getById(id);
}

/// Current itinerary notifier for editing
@riverpod
class CurrentItineraryNotifier extends _$CurrentItineraryNotifier {
  @override
  AsyncValue<Itinerary?> build() {
    return const AsyncValue.data(null);
  }

  /// Load itinerary by ID
  Future<void> loadItinerary(String id) async {
    state = const AsyncValue.loading();
    try {
      final itinerary = await ref.read(itineraryServiceProvider).getById(id);
      state = AsyncValue.data(itinerary);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Create new itinerary
  Future<ItineraryWithStats?> createItinerary(
    CreateItineraryInput input,
  ) async {
    try {
      final itinerary = await ref.read(itineraryServiceProvider).create(input);
      // Invalidate list to refresh
      ref.invalidate(itineraryListProvider);
      return itinerary;
    } catch (e, st) {
      print('Error creating itinerary: $e');
      print('Stack trace: $st');
      return null;
    }
  }

  /// Delete itinerary
  Future<bool> deleteItinerary(String id) async {
    try {
      await ref.read(itineraryServiceProvider).delete(id);
      // Invalidate list to refresh
      ref.invalidate(itineraryListProvider);
      return true;
    } catch (e) {
      return false;
    }
  }

  /// Clear current itinerary
  void clear() {
    state = const AsyncValue.data(null);
  }
}
