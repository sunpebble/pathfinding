import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/itinerary.dart';
import 'api_client.dart';

part 'itinerary_service.g.dart';

/// Pagination meta data
class PaginationMeta {
  final int page;
  final int pageSize;
  final int totalCount;
  final int totalPages;

  PaginationMeta({
    required this.page,
    required this.pageSize,
    required this.totalCount,
    required this.totalPages,
  });
}

/// Paginated response
class PaginatedResponse<T> {
  final List<T> data;
  final PaginationMeta meta;

  PaginatedResponse({required this.data, required this.meta});
}

/// Itinerary service for handling itinerary operations via Supabase
class ItineraryService {
  final SupabaseClient _supabase;

  ItineraryService(this._supabase);

  /// Get list of itineraries
  Future<PaginatedResponse<ItineraryWithStats>> list({
    int page = 1,
    int pageSize = 20,
  }) async {
    final startIndex = (page - 1) * pageSize;

    // Query public itineraries from Supabase
    final response = await _supabase
        .from('itineraries')
        .select('*')
        .eq('visibility', 'public')
        .order('created_at', ascending: false)
        .range(startIndex, startIndex + pageSize - 1);

    final data = (response as List).map((json) {
      return ItineraryWithStats(
        id: json['id'] as String,
        userId: json['user_id'] as String,
        title: json['title'] as String,
        cityId: json['city_id'] as String?,
        cityName: null, // Would need to join with cities table
        startDate: json['start_date'] != null
            ? DateTime.parse(json['start_date'] as String)
            : null,
        endDate: json['end_date'] != null
            ? DateTime.parse(json['end_date'] as String)
            : null,
        visibility: json['visibility'] as String? ?? 'private',
        coverImageUrl: json['cover_image_url'] as String?,
        copiedFromId: json['copied_from_id'] as String?,
        days: [],
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
        dayCount: 0,
        itemCount: 0,
      );
    }).toList();

    return PaginatedResponse(
      data: data,
      meta: PaginationMeta(
        page: page,
        pageSize: pageSize,
        totalCount: data.length,
        totalPages: 1,
      ),
    );
  }

  /// Get itinerary by ID with days and items
  Future<Itinerary> getById(String id) async {
    final response = await _supabase
        .from('itineraries')
        .select('*')
        .eq('id', id)
        .single();

    // Get days
    final daysResponse = await _supabase
        .from('itinerary_days')
        .select('*')
        .eq('itinerary_id', id)
        .order('day_number');

    final daysList = (daysResponse as List).map((dayJson) async {
      // Get items for each day
      final itemsResponse = await _supabase
          .from('itinerary_items')
          .select('*')
          .eq('day_id', dayJson['id'])
          .order('order_index');

      final items = (itemsResponse as List).map((itemJson) {
        return ItineraryItem(
          id: itemJson['id'] as String,
          dayId: itemJson['day_id'] as String,
          poiId: itemJson['poi_id'] as String?,
          poiName: itemJson['poi_name'] as String?,
          latitude: (itemJson['latitude'] as num?)?.toDouble(),
          longitude: (itemJson['longitude'] as num?)?.toDouble(),
          orderIndex: itemJson['order_index'] as int,
          startTime: itemJson['start_time'] as String?,
          endTime: itemJson['end_time'] as String?,
          notes: itemJson['notes'] as String?,
          transportMode: itemJson['transport_mode'] as String? ?? 'walk',
          transportMinutes: itemJson['transport_minutes'] as int?,
          category: itemJson['category'] as String?,
        );
      }).toList();

      return ItineraryDay(
        id: dayJson['id'] as String,
        itineraryId: dayJson['itinerary_id'] as String,
        dayNumber: dayJson['day_number'] as int,
        date: dayJson['date'] != null
            ? DateTime.parse(dayJson['date'] as String)
            : null,
        items: items,
      );
    });

    final days = await Future.wait(daysList);

    return Itinerary(
      id: response['id'] as String,
      userId: response['user_id'] as String,
      title: response['title'] as String,
      cityId: response['city_id'] as String?,
      cityName: null,
      startDate: response['start_date'] != null
          ? DateTime.parse(response['start_date'] as String)
          : null,
      endDate: response['end_date'] != null
          ? DateTime.parse(response['end_date'] as String)
          : null,
      visibility: response['visibility'] as String? ?? 'private',
      coverImageUrl: response['cover_image_url'] as String?,
      copiedFromId: response['copied_from_id'] as String?,
      days: days,
      createdAt: DateTime.parse(response['created_at'] as String),
      updatedAt: DateTime.parse(response['updated_at'] as String),
    );
  }

  /// Create new itinerary with days and items
  Future<ItineraryWithStats> create(CreateItineraryInput input) async {
    final user = _supabase.auth.currentUser;
    if (user == null) {
      throw Exception('User not logged in');
    }

    // Build insert data, excluding null optional fields
    final insertData = <String, dynamic>{
      'user_id': user.id,
      'title': input.title,
      'visibility': input.visibility ?? 'private',
    };

    // Only add optional fields if they have values
    if (input.cityId != null) insertData['city_id'] = input.cityId;
    if (input.startDate != null) {
      insertData['start_date'] = input.startDate!.toIso8601String();
    }
    if (input.endDate != null) {
      insertData['end_date'] = input.endDate!.toIso8601String();
    }
    if (input.coverImageUrl != null) {
      insertData['cover_image_url'] = input.coverImageUrl;
    }

    // Insert itinerary
    final response = await _supabase
        .from('itineraries')
        .insert(insertData)
        .select()
        .single();

    final itineraryId = response['id'] as String;
    int totalItems = 0;

    // Insert days and items if provided
    if (input.days != null && input.days!.isNotEmpty) {
      for (final dayInput in input.days!) {
        // Insert day
        final dayResponse = await _supabase
            .from('itinerary_days')
            .insert({
              'itinerary_id': itineraryId,
              'day_number': dayInput.dayNumber,
              'date': dayInput.date?.toIso8601String(),
            })
            .select()
            .single();

        final dayId = dayResponse['id'] as String;

        // Insert items for this day
        if (dayInput.items.isNotEmpty) {
          for (final itemInput in dayInput.items) {
            await _supabase.from('itinerary_items').insert({
              'day_id': dayId,
              'poi_name': itemInput.poiName,
              'latitude': itemInput.latitude,
              'longitude': itemInput.longitude,
              'order_index': itemInput.orderIndex,
              'category': itemInput.category,
              'notes': itemInput.notes,
            });
            totalItems++;
          }
        }
      }
    }

    return ItineraryWithStats(
      id: itineraryId,
      userId: response['user_id'] as String,
      title: response['title'] as String,
      cityId: response['city_id'] as String?,
      cityName: null,
      startDate: response['start_date'] != null
          ? DateTime.parse(response['start_date'] as String)
          : null,
      endDate: response['end_date'] != null
          ? DateTime.parse(response['end_date'] as String)
          : null,
      visibility: response['visibility'] as String? ?? 'private',
      coverImageUrl: response['cover_image_url'] as String?,
      copiedFromId: null,
      days: [],
      createdAt: DateTime.parse(response['created_at'] as String),
      updatedAt: DateTime.parse(response['updated_at'] as String),
      dayCount: input.days?.length ?? 0,
      itemCount: totalItems,
    );
  }

  /// Delete itinerary
  Future<void> delete(String id) async {
    await _supabase.from('itineraries').delete().eq('id', id);
  }
}

/// Itinerary service provider
@riverpod
ItineraryService itineraryService(Ref ref) {
  return ItineraryService(ref.watch(supabaseProvider));
}
