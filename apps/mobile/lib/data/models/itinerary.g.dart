// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'itinerary.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_ItineraryItem _$ItineraryItemFromJson(Map<String, dynamic> json) =>
    _ItineraryItem(
      id: json['id'] as String,
      dayId: json['dayId'] as String,
      poiId: json['poiId'] as String?,
      poiName: json['poiName'] as String?,
      latitude: (json['latitude'] as num?)?.toDouble(),
      longitude: (json['longitude'] as num?)?.toDouble(),
      orderIndex: (json['orderIndex'] as num).toInt(),
      startTime: json['startTime'] as String?,
      endTime: json['endTime'] as String?,
      notes: json['notes'] as String?,
      transportMode: json['transportMode'] as String? ?? 'walk',
      transportMinutes: (json['transportMinutes'] as num?)?.toInt(),
      category: json['category'] as String?,
    );

Map<String, dynamic> _$ItineraryItemToJson(_ItineraryItem instance) =>
    <String, dynamic>{
      'id': instance.id,
      'dayId': instance.dayId,
      'poiId': instance.poiId,
      'poiName': instance.poiName,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'orderIndex': instance.orderIndex,
      'startTime': instance.startTime,
      'endTime': instance.endTime,
      'notes': instance.notes,
      'transportMode': instance.transportMode,
      'transportMinutes': instance.transportMinutes,
      'category': instance.category,
    };

_ItineraryDay _$ItineraryDayFromJson(Map<String, dynamic> json) =>
    _ItineraryDay(
      id: json['id'] as String,
      itineraryId: json['itineraryId'] as String,
      dayNumber: (json['dayNumber'] as num).toInt(),
      date: json['date'] == null
          ? null
          : DateTime.parse(json['date'] as String),
      items:
          (json['items'] as List<dynamic>?)
              ?.map((e) => ItineraryItem.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
    );

Map<String, dynamic> _$ItineraryDayToJson(_ItineraryDay instance) =>
    <String, dynamic>{
      'id': instance.id,
      'itineraryId': instance.itineraryId,
      'dayNumber': instance.dayNumber,
      'date': instance.date?.toIso8601String(),
      'items': instance.items,
    };

_Itinerary _$ItineraryFromJson(Map<String, dynamic> json) => _Itinerary(
  id: json['id'] as String,
  userId: json['userId'] as String,
  title: json['title'] as String,
  cityId: json['cityId'] as String?,
  cityName: json['cityName'] as String?,
  startDate: json['startDate'] == null
      ? null
      : DateTime.parse(json['startDate'] as String),
  endDate: json['endDate'] == null
      ? null
      : DateTime.parse(json['endDate'] as String),
  visibility: json['visibility'] as String? ?? 'private',
  coverImageUrl: json['coverImageUrl'] as String?,
  copiedFromId: json['copiedFromId'] as String?,
  days:
      (json['days'] as List<dynamic>?)
          ?.map((e) => ItineraryDay.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$ItineraryToJson(_Itinerary instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'title': instance.title,
      'cityId': instance.cityId,
      'cityName': instance.cityName,
      'startDate': instance.startDate?.toIso8601String(),
      'endDate': instance.endDate?.toIso8601String(),
      'visibility': instance.visibility,
      'coverImageUrl': instance.coverImageUrl,
      'copiedFromId': instance.copiedFromId,
      'days': instance.days,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
    };

_ItineraryWithStats _$ItineraryWithStatsFromJson(Map<String, dynamic> json) =>
    _ItineraryWithStats(
      id: json['id'] as String,
      userId: json['userId'] as String,
      title: json['title'] as String,
      cityId: json['cityId'] as String?,
      cityName: json['cityName'] as String?,
      startDate: json['startDate'] == null
          ? null
          : DateTime.parse(json['startDate'] as String),
      endDate: json['endDate'] == null
          ? null
          : DateTime.parse(json['endDate'] as String),
      visibility: json['visibility'] as String? ?? 'private',
      coverImageUrl: json['coverImageUrl'] as String?,
      copiedFromId: json['copiedFromId'] as String?,
      days:
          (json['days'] as List<dynamic>?)
              ?.map((e) => ItineraryDay.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      dayCount: (json['dayCount'] as num?)?.toInt() ?? 0,
      itemCount: (json['itemCount'] as num?)?.toInt() ?? 0,
    );

Map<String, dynamic> _$ItineraryWithStatsToJson(_ItineraryWithStats instance) =>
    <String, dynamic>{
      'id': instance.id,
      'userId': instance.userId,
      'title': instance.title,
      'cityId': instance.cityId,
      'cityName': instance.cityName,
      'startDate': instance.startDate?.toIso8601String(),
      'endDate': instance.endDate?.toIso8601String(),
      'visibility': instance.visibility,
      'coverImageUrl': instance.coverImageUrl,
      'copiedFromId': instance.copiedFromId,
      'days': instance.days,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'dayCount': instance.dayCount,
      'itemCount': instance.itemCount,
    };

_CreateItineraryInput _$CreateItineraryInputFromJson(
  Map<String, dynamic> json,
) => _CreateItineraryInput(
  title: json['title'] as String,
  cityId: json['cityId'] as String?,
  startDate: json['startDate'] == null
      ? null
      : DateTime.parse(json['startDate'] as String),
  endDate: json['endDate'] == null
      ? null
      : DateTime.parse(json['endDate'] as String),
  visibility: json['visibility'] as String? ?? 'private',
  coverImageUrl: json['coverImageUrl'] as String?,
  days: (json['days'] as List<dynamic>?)
      ?.map((e) => CreateItineraryDayInput.fromJson(e as Map<String, dynamic>))
      .toList(),
);

Map<String, dynamic> _$CreateItineraryInputToJson(
  _CreateItineraryInput instance,
) => <String, dynamic>{
  'title': instance.title,
  'cityId': instance.cityId,
  'startDate': instance.startDate?.toIso8601String(),
  'endDate': instance.endDate?.toIso8601String(),
  'visibility': instance.visibility,
  'coverImageUrl': instance.coverImageUrl,
  'days': instance.days,
};

_CreateItineraryDayInput _$CreateItineraryDayInputFromJson(
  Map<String, dynamic> json,
) => _CreateItineraryDayInput(
  dayNumber: (json['dayNumber'] as num).toInt(),
  date: json['date'] == null ? null : DateTime.parse(json['date'] as String),
  items:
      (json['items'] as List<dynamic>?)
          ?.map(
            (e) => CreateItineraryItemInput.fromJson(e as Map<String, dynamic>),
          )
          .toList() ??
      const [],
);

Map<String, dynamic> _$CreateItineraryDayInputToJson(
  _CreateItineraryDayInput instance,
) => <String, dynamic>{
  'dayNumber': instance.dayNumber,
  'date': instance.date?.toIso8601String(),
  'items': instance.items,
};

_CreateItineraryItemInput _$CreateItineraryItemInputFromJson(
  Map<String, dynamic> json,
) => _CreateItineraryItemInput(
  poiId: json['poiId'] as String?,
  poiName: json['poiName'] as String?,
  latitude: (json['latitude'] as num?)?.toDouble(),
  longitude: (json['longitude'] as num?)?.toDouble(),
  orderIndex: (json['orderIndex'] as num).toInt(),
  startTime: json['startTime'] as String?,
  endTime: json['endTime'] as String?,
  notes: json['notes'] as String?,
  transportMode: json['transportMode'] as String? ?? 'walk',
  transportMinutes: (json['transportMinutes'] as num?)?.toInt(),
  category: json['category'] as String?,
);

Map<String, dynamic> _$CreateItineraryItemInputToJson(
  _CreateItineraryItemInput instance,
) => <String, dynamic>{
  'poiId': instance.poiId,
  'poiName': instance.poiName,
  'latitude': instance.latitude,
  'longitude': instance.longitude,
  'orderIndex': instance.orderIndex,
  'startTime': instance.startTime,
  'endTime': instance.endTime,
  'notes': instance.notes,
  'transportMode': instance.transportMode,
  'transportMinutes': instance.transportMinutes,
  'category': instance.category,
};
