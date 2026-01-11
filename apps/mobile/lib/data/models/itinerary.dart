import 'package:freezed_annotation/freezed_annotation.dart';

part 'itinerary.freezed.dart';
part 'itinerary.g.dart';

/// Itinerary item model
@freezed
abstract class ItineraryItem with _$ItineraryItem {
  const factory ItineraryItem({
    required String id,
    required String dayId,
    String? poiId,
    String? poiName,
    double? latitude,
    double? longitude,
    required int orderIndex,
    String? startTime,
    String? endTime,
    String? notes,
    @Default('walk') String transportMode,
    int? transportMinutes,
    String? category,
  }) = _ItineraryItem;

  factory ItineraryItem.fromJson(Map<String, dynamic> json) =>
      _$ItineraryItemFromJson(json);
}

/// Itinerary day model
@freezed
abstract class ItineraryDay with _$ItineraryDay {
  const factory ItineraryDay({
    required String id,
    required String itineraryId,
    required int dayNumber,
    DateTime? date,
    @Default([]) List<ItineraryItem> items,
  }) = _ItineraryDay;

  factory ItineraryDay.fromJson(Map<String, dynamic> json) =>
      _$ItineraryDayFromJson(json);
}

/// Itinerary model
@freezed
abstract class Itinerary with _$Itinerary {
  const factory Itinerary({
    required String id,
    required String userId,
    required String title,
    String? cityId,
    String? cityName,
    DateTime? startDate,
    DateTime? endDate,
    @Default('private') String visibility,
    String? coverImageUrl,
    String? copiedFromId,
    @Default([]) List<ItineraryDay> days,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _Itinerary;

  factory Itinerary.fromJson(Map<String, dynamic> json) =>
      _$ItineraryFromJson(json);
}

/// Itinerary with stats
@freezed
abstract class ItineraryWithStats with _$ItineraryWithStats {
  const factory ItineraryWithStats({
    required String id,
    required String userId,
    required String title,
    String? cityId,
    String? cityName,
    DateTime? startDate,
    DateTime? endDate,
    @Default('private') String visibility,
    String? coverImageUrl,
    String? copiedFromId,
    @Default([]) List<ItineraryDay> days,
    required DateTime createdAt,
    required DateTime updatedAt,
    @Default(0) int dayCount,
    @Default(0) int itemCount,
  }) = _ItineraryWithStats;

  factory ItineraryWithStats.fromJson(Map<String, dynamic> json) =>
      _$ItineraryWithStatsFromJson(json);
}

/// Create itinerary input
@freezed
abstract class CreateItineraryInput with _$CreateItineraryInput {
  const factory CreateItineraryInput({
    required String title,
    String? cityId,
    DateTime? startDate,
    DateTime? endDate,
    @Default('private') String visibility,
    String? coverImageUrl,
    List<CreateItineraryDayInput>? days,
  }) = _CreateItineraryInput;

  factory CreateItineraryInput.fromJson(Map<String, dynamic> json) =>
      _$CreateItineraryInputFromJson(json);
}

/// Create itinerary day input
@freezed
abstract class CreateItineraryDayInput with _$CreateItineraryDayInput {
  const factory CreateItineraryDayInput({
    required int dayNumber,
    DateTime? date,
    @Default([]) List<CreateItineraryItemInput> items,
  }) = _CreateItineraryDayInput;

  factory CreateItineraryDayInput.fromJson(Map<String, dynamic> json) =>
      _$CreateItineraryDayInputFromJson(json);
}

/// Create itinerary item input
@freezed
abstract class CreateItineraryItemInput with _$CreateItineraryItemInput {
  const factory CreateItineraryItemInput({
    String? poiId,
    String? poiName,
    double? latitude,
    double? longitude,
    required int orderIndex,
    String? startTime,
    String? endTime,
    String? notes,
    @Default('walk') String transportMode,
    int? transportMinutes,
    String? category,
  }) = _CreateItineraryItemInput;

  factory CreateItineraryItemInput.fromJson(Map<String, dynamic> json) =>
      _$CreateItineraryItemInputFromJson(json);
}
