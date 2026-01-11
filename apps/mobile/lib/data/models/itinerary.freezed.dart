// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'itinerary.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$ItineraryItem {

 String get id; String get dayId; String? get poiId; String? get poiName; double? get latitude; double? get longitude; int get orderIndex; String? get startTime; String? get endTime; String? get notes; String get transportMode; int? get transportMinutes; String? get category;
/// Create a copy of ItineraryItem
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ItineraryItemCopyWith<ItineraryItem> get copyWith => _$ItineraryItemCopyWithImpl<ItineraryItem>(this as ItineraryItem, _$identity);

  /// Serializes this ItineraryItem to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ItineraryItem&&(identical(other.id, id) || other.id == id)&&(identical(other.dayId, dayId) || other.dayId == dayId)&&(identical(other.poiId, poiId) || other.poiId == poiId)&&(identical(other.poiName, poiName) || other.poiName == poiName)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.orderIndex, orderIndex) || other.orderIndex == orderIndex)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.transportMode, transportMode) || other.transportMode == transportMode)&&(identical(other.transportMinutes, transportMinutes) || other.transportMinutes == transportMinutes)&&(identical(other.category, category) || other.category == category));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,dayId,poiId,poiName,latitude,longitude,orderIndex,startTime,endTime,notes,transportMode,transportMinutes,category);

@override
String toString() {
  return 'ItineraryItem(id: $id, dayId: $dayId, poiId: $poiId, poiName: $poiName, latitude: $latitude, longitude: $longitude, orderIndex: $orderIndex, startTime: $startTime, endTime: $endTime, notes: $notes, transportMode: $transportMode, transportMinutes: $transportMinutes, category: $category)';
}


}

/// @nodoc
abstract mixin class $ItineraryItemCopyWith<$Res>  {
  factory $ItineraryItemCopyWith(ItineraryItem value, $Res Function(ItineraryItem) _then) = _$ItineraryItemCopyWithImpl;
@useResult
$Res call({
 String id, String dayId, String? poiId, String? poiName, double? latitude, double? longitude, int orderIndex, String? startTime, String? endTime, String? notes, String transportMode, int? transportMinutes, String? category
});




}
/// @nodoc
class _$ItineraryItemCopyWithImpl<$Res>
    implements $ItineraryItemCopyWith<$Res> {
  _$ItineraryItemCopyWithImpl(this._self, this._then);

  final ItineraryItem _self;
  final $Res Function(ItineraryItem) _then;

/// Create a copy of ItineraryItem
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? dayId = null,Object? poiId = freezed,Object? poiName = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? orderIndex = null,Object? startTime = freezed,Object? endTime = freezed,Object? notes = freezed,Object? transportMode = null,Object? transportMinutes = freezed,Object? category = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,dayId: null == dayId ? _self.dayId : dayId // ignore: cast_nullable_to_non_nullable
as String,poiId: freezed == poiId ? _self.poiId : poiId // ignore: cast_nullable_to_non_nullable
as String?,poiName: freezed == poiName ? _self.poiName : poiName // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,orderIndex: null == orderIndex ? _self.orderIndex : orderIndex // ignore: cast_nullable_to_non_nullable
as int,startTime: freezed == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as String?,endTime: freezed == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,transportMode: null == transportMode ? _self.transportMode : transportMode // ignore: cast_nullable_to_non_nullable
as String,transportMinutes: freezed == transportMinutes ? _self.transportMinutes : transportMinutes // ignore: cast_nullable_to_non_nullable
as int?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [ItineraryItem].
extension ItineraryItemPatterns on ItineraryItem {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ItineraryItem value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ItineraryItem() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ItineraryItem value)  $default,){
final _that = this;
switch (_that) {
case _ItineraryItem():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ItineraryItem value)?  $default,){
final _that = this;
switch (_that) {
case _ItineraryItem() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String dayId,  String? poiId,  String? poiName,  double? latitude,  double? longitude,  int orderIndex,  String? startTime,  String? endTime,  String? notes,  String transportMode,  int? transportMinutes,  String? category)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ItineraryItem() when $default != null:
return $default(_that.id,_that.dayId,_that.poiId,_that.poiName,_that.latitude,_that.longitude,_that.orderIndex,_that.startTime,_that.endTime,_that.notes,_that.transportMode,_that.transportMinutes,_that.category);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String dayId,  String? poiId,  String? poiName,  double? latitude,  double? longitude,  int orderIndex,  String? startTime,  String? endTime,  String? notes,  String transportMode,  int? transportMinutes,  String? category)  $default,) {final _that = this;
switch (_that) {
case _ItineraryItem():
return $default(_that.id,_that.dayId,_that.poiId,_that.poiName,_that.latitude,_that.longitude,_that.orderIndex,_that.startTime,_that.endTime,_that.notes,_that.transportMode,_that.transportMinutes,_that.category);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String dayId,  String? poiId,  String? poiName,  double? latitude,  double? longitude,  int orderIndex,  String? startTime,  String? endTime,  String? notes,  String transportMode,  int? transportMinutes,  String? category)?  $default,) {final _that = this;
switch (_that) {
case _ItineraryItem() when $default != null:
return $default(_that.id,_that.dayId,_that.poiId,_that.poiName,_that.latitude,_that.longitude,_that.orderIndex,_that.startTime,_that.endTime,_that.notes,_that.transportMode,_that.transportMinutes,_that.category);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ItineraryItem implements ItineraryItem {
  const _ItineraryItem({required this.id, required this.dayId, this.poiId, this.poiName, this.latitude, this.longitude, required this.orderIndex, this.startTime, this.endTime, this.notes, this.transportMode = 'walk', this.transportMinutes, this.category});
  factory _ItineraryItem.fromJson(Map<String, dynamic> json) => _$ItineraryItemFromJson(json);

@override final  String id;
@override final  String dayId;
@override final  String? poiId;
@override final  String? poiName;
@override final  double? latitude;
@override final  double? longitude;
@override final  int orderIndex;
@override final  String? startTime;
@override final  String? endTime;
@override final  String? notes;
@override@JsonKey() final  String transportMode;
@override final  int? transportMinutes;
@override final  String? category;

/// Create a copy of ItineraryItem
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ItineraryItemCopyWith<_ItineraryItem> get copyWith => __$ItineraryItemCopyWithImpl<_ItineraryItem>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ItineraryItemToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ItineraryItem&&(identical(other.id, id) || other.id == id)&&(identical(other.dayId, dayId) || other.dayId == dayId)&&(identical(other.poiId, poiId) || other.poiId == poiId)&&(identical(other.poiName, poiName) || other.poiName == poiName)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.orderIndex, orderIndex) || other.orderIndex == orderIndex)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.transportMode, transportMode) || other.transportMode == transportMode)&&(identical(other.transportMinutes, transportMinutes) || other.transportMinutes == transportMinutes)&&(identical(other.category, category) || other.category == category));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,dayId,poiId,poiName,latitude,longitude,orderIndex,startTime,endTime,notes,transportMode,transportMinutes,category);

@override
String toString() {
  return 'ItineraryItem(id: $id, dayId: $dayId, poiId: $poiId, poiName: $poiName, latitude: $latitude, longitude: $longitude, orderIndex: $orderIndex, startTime: $startTime, endTime: $endTime, notes: $notes, transportMode: $transportMode, transportMinutes: $transportMinutes, category: $category)';
}


}

/// @nodoc
abstract mixin class _$ItineraryItemCopyWith<$Res> implements $ItineraryItemCopyWith<$Res> {
  factory _$ItineraryItemCopyWith(_ItineraryItem value, $Res Function(_ItineraryItem) _then) = __$ItineraryItemCopyWithImpl;
@override @useResult
$Res call({
 String id, String dayId, String? poiId, String? poiName, double? latitude, double? longitude, int orderIndex, String? startTime, String? endTime, String? notes, String transportMode, int? transportMinutes, String? category
});




}
/// @nodoc
class __$ItineraryItemCopyWithImpl<$Res>
    implements _$ItineraryItemCopyWith<$Res> {
  __$ItineraryItemCopyWithImpl(this._self, this._then);

  final _ItineraryItem _self;
  final $Res Function(_ItineraryItem) _then;

/// Create a copy of ItineraryItem
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? dayId = null,Object? poiId = freezed,Object? poiName = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? orderIndex = null,Object? startTime = freezed,Object? endTime = freezed,Object? notes = freezed,Object? transportMode = null,Object? transportMinutes = freezed,Object? category = freezed,}) {
  return _then(_ItineraryItem(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,dayId: null == dayId ? _self.dayId : dayId // ignore: cast_nullable_to_non_nullable
as String,poiId: freezed == poiId ? _self.poiId : poiId // ignore: cast_nullable_to_non_nullable
as String?,poiName: freezed == poiName ? _self.poiName : poiName // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,orderIndex: null == orderIndex ? _self.orderIndex : orderIndex // ignore: cast_nullable_to_non_nullable
as int,startTime: freezed == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as String?,endTime: freezed == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,transportMode: null == transportMode ? _self.transportMode : transportMode // ignore: cast_nullable_to_non_nullable
as String,transportMinutes: freezed == transportMinutes ? _self.transportMinutes : transportMinutes // ignore: cast_nullable_to_non_nullable
as int?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$ItineraryDay {

 String get id; String get itineraryId; int get dayNumber; DateTime? get date; List<ItineraryItem> get items;
/// Create a copy of ItineraryDay
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ItineraryDayCopyWith<ItineraryDay> get copyWith => _$ItineraryDayCopyWithImpl<ItineraryDay>(this as ItineraryDay, _$identity);

  /// Serializes this ItineraryDay to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ItineraryDay&&(identical(other.id, id) || other.id == id)&&(identical(other.itineraryId, itineraryId) || other.itineraryId == itineraryId)&&(identical(other.dayNumber, dayNumber) || other.dayNumber == dayNumber)&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other.items, items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,itineraryId,dayNumber,date,const DeepCollectionEquality().hash(items));

@override
String toString() {
  return 'ItineraryDay(id: $id, itineraryId: $itineraryId, dayNumber: $dayNumber, date: $date, items: $items)';
}


}

/// @nodoc
abstract mixin class $ItineraryDayCopyWith<$Res>  {
  factory $ItineraryDayCopyWith(ItineraryDay value, $Res Function(ItineraryDay) _then) = _$ItineraryDayCopyWithImpl;
@useResult
$Res call({
 String id, String itineraryId, int dayNumber, DateTime? date, List<ItineraryItem> items
});




}
/// @nodoc
class _$ItineraryDayCopyWithImpl<$Res>
    implements $ItineraryDayCopyWith<$Res> {
  _$ItineraryDayCopyWithImpl(this._self, this._then);

  final ItineraryDay _self;
  final $Res Function(ItineraryDay) _then;

/// Create a copy of ItineraryDay
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? itineraryId = null,Object? dayNumber = null,Object? date = freezed,Object? items = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,itineraryId: null == itineraryId ? _self.itineraryId : itineraryId // ignore: cast_nullable_to_non_nullable
as String,dayNumber: null == dayNumber ? _self.dayNumber : dayNumber // ignore: cast_nullable_to_non_nullable
as int,date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime?,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<ItineraryItem>,
  ));
}

}


/// Adds pattern-matching-related methods to [ItineraryDay].
extension ItineraryDayPatterns on ItineraryDay {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ItineraryDay value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ItineraryDay() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ItineraryDay value)  $default,){
final _that = this;
switch (_that) {
case _ItineraryDay():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ItineraryDay value)?  $default,){
final _that = this;
switch (_that) {
case _ItineraryDay() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String itineraryId,  int dayNumber,  DateTime? date,  List<ItineraryItem> items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ItineraryDay() when $default != null:
return $default(_that.id,_that.itineraryId,_that.dayNumber,_that.date,_that.items);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String itineraryId,  int dayNumber,  DateTime? date,  List<ItineraryItem> items)  $default,) {final _that = this;
switch (_that) {
case _ItineraryDay():
return $default(_that.id,_that.itineraryId,_that.dayNumber,_that.date,_that.items);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String itineraryId,  int dayNumber,  DateTime? date,  List<ItineraryItem> items)?  $default,) {final _that = this;
switch (_that) {
case _ItineraryDay() when $default != null:
return $default(_that.id,_that.itineraryId,_that.dayNumber,_that.date,_that.items);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ItineraryDay implements ItineraryDay {
  const _ItineraryDay({required this.id, required this.itineraryId, required this.dayNumber, this.date, final  List<ItineraryItem> items = const []}): _items = items;
  factory _ItineraryDay.fromJson(Map<String, dynamic> json) => _$ItineraryDayFromJson(json);

@override final  String id;
@override final  String itineraryId;
@override final  int dayNumber;
@override final  DateTime? date;
 final  List<ItineraryItem> _items;
@override@JsonKey() List<ItineraryItem> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}


/// Create a copy of ItineraryDay
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ItineraryDayCopyWith<_ItineraryDay> get copyWith => __$ItineraryDayCopyWithImpl<_ItineraryDay>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ItineraryDayToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ItineraryDay&&(identical(other.id, id) || other.id == id)&&(identical(other.itineraryId, itineraryId) || other.itineraryId == itineraryId)&&(identical(other.dayNumber, dayNumber) || other.dayNumber == dayNumber)&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other._items, _items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,itineraryId,dayNumber,date,const DeepCollectionEquality().hash(_items));

@override
String toString() {
  return 'ItineraryDay(id: $id, itineraryId: $itineraryId, dayNumber: $dayNumber, date: $date, items: $items)';
}


}

/// @nodoc
abstract mixin class _$ItineraryDayCopyWith<$Res> implements $ItineraryDayCopyWith<$Res> {
  factory _$ItineraryDayCopyWith(_ItineraryDay value, $Res Function(_ItineraryDay) _then) = __$ItineraryDayCopyWithImpl;
@override @useResult
$Res call({
 String id, String itineraryId, int dayNumber, DateTime? date, List<ItineraryItem> items
});




}
/// @nodoc
class __$ItineraryDayCopyWithImpl<$Res>
    implements _$ItineraryDayCopyWith<$Res> {
  __$ItineraryDayCopyWithImpl(this._self, this._then);

  final _ItineraryDay _self;
  final $Res Function(_ItineraryDay) _then;

/// Create a copy of ItineraryDay
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? itineraryId = null,Object? dayNumber = null,Object? date = freezed,Object? items = null,}) {
  return _then(_ItineraryDay(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,itineraryId: null == itineraryId ? _self.itineraryId : itineraryId // ignore: cast_nullable_to_non_nullable
as String,dayNumber: null == dayNumber ? _self.dayNumber : dayNumber // ignore: cast_nullable_to_non_nullable
as int,date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime?,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<ItineraryItem>,
  ));
}


}


/// @nodoc
mixin _$Itinerary {

 String get id; String get userId; String get title; String? get cityId; String? get cityName; DateTime? get startDate; DateTime? get endDate; String get visibility; String? get coverImageUrl; String? get copiedFromId; List<ItineraryDay> get days; DateTime get createdAt; DateTime get updatedAt;
/// Create a copy of Itinerary
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ItineraryCopyWith<Itinerary> get copyWith => _$ItineraryCopyWithImpl<Itinerary>(this as Itinerary, _$identity);

  /// Serializes this Itinerary to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is Itinerary&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.title, title) || other.title == title)&&(identical(other.cityId, cityId) || other.cityId == cityId)&&(identical(other.cityName, cityName) || other.cityName == cityName)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.visibility, visibility) || other.visibility == visibility)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.copiedFromId, copiedFromId) || other.copiedFromId == copiedFromId)&&const DeepCollectionEquality().equals(other.days, days)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,title,cityId,cityName,startDate,endDate,visibility,coverImageUrl,copiedFromId,const DeepCollectionEquality().hash(days),createdAt,updatedAt);

@override
String toString() {
  return 'Itinerary(id: $id, userId: $userId, title: $title, cityId: $cityId, cityName: $cityName, startDate: $startDate, endDate: $endDate, visibility: $visibility, coverImageUrl: $coverImageUrl, copiedFromId: $copiedFromId, days: $days, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $ItineraryCopyWith<$Res>  {
  factory $ItineraryCopyWith(Itinerary value, $Res Function(Itinerary) _then) = _$ItineraryCopyWithImpl;
@useResult
$Res call({
 String id, String userId, String title, String? cityId, String? cityName, DateTime? startDate, DateTime? endDate, String visibility, String? coverImageUrl, String? copiedFromId, List<ItineraryDay> days, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class _$ItineraryCopyWithImpl<$Res>
    implements $ItineraryCopyWith<$Res> {
  _$ItineraryCopyWithImpl(this._self, this._then);

  final Itinerary _self;
  final $Res Function(Itinerary) _then;

/// Create a copy of Itinerary
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? title = null,Object? cityId = freezed,Object? cityName = freezed,Object? startDate = freezed,Object? endDate = freezed,Object? visibility = null,Object? coverImageUrl = freezed,Object? copiedFromId = freezed,Object? days = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,cityId: freezed == cityId ? _self.cityId : cityId // ignore: cast_nullable_to_non_nullable
as String?,cityName: freezed == cityName ? _self.cityName : cityName // ignore: cast_nullable_to_non_nullable
as String?,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,visibility: null == visibility ? _self.visibility : visibility // ignore: cast_nullable_to_non_nullable
as String,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,copiedFromId: freezed == copiedFromId ? _self.copiedFromId : copiedFromId // ignore: cast_nullable_to_non_nullable
as String?,days: null == days ? _self.days : days // ignore: cast_nullable_to_non_nullable
as List<ItineraryDay>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [Itinerary].
extension ItineraryPatterns on Itinerary {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _Itinerary value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _Itinerary() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _Itinerary value)  $default,){
final _that = this;
switch (_that) {
case _Itinerary():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _Itinerary value)?  $default,){
final _that = this;
switch (_that) {
case _Itinerary() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String userId,  String title,  String? cityId,  String? cityName,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  String? copiedFromId,  List<ItineraryDay> days,  DateTime createdAt,  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _Itinerary() when $default != null:
return $default(_that.id,_that.userId,_that.title,_that.cityId,_that.cityName,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.copiedFromId,_that.days,_that.createdAt,_that.updatedAt);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String userId,  String title,  String? cityId,  String? cityName,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  String? copiedFromId,  List<ItineraryDay> days,  DateTime createdAt,  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _Itinerary():
return $default(_that.id,_that.userId,_that.title,_that.cityId,_that.cityName,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.copiedFromId,_that.days,_that.createdAt,_that.updatedAt);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String userId,  String title,  String? cityId,  String? cityName,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  String? copiedFromId,  List<ItineraryDay> days,  DateTime createdAt,  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _Itinerary() when $default != null:
return $default(_that.id,_that.userId,_that.title,_that.cityId,_that.cityName,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.copiedFromId,_that.days,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _Itinerary implements Itinerary {
  const _Itinerary({required this.id, required this.userId, required this.title, this.cityId, this.cityName, this.startDate, this.endDate, this.visibility = 'private', this.coverImageUrl, this.copiedFromId, final  List<ItineraryDay> days = const [], required this.createdAt, required this.updatedAt}): _days = days;
  factory _Itinerary.fromJson(Map<String, dynamic> json) => _$ItineraryFromJson(json);

@override final  String id;
@override final  String userId;
@override final  String title;
@override final  String? cityId;
@override final  String? cityName;
@override final  DateTime? startDate;
@override final  DateTime? endDate;
@override@JsonKey() final  String visibility;
@override final  String? coverImageUrl;
@override final  String? copiedFromId;
 final  List<ItineraryDay> _days;
@override@JsonKey() List<ItineraryDay> get days {
  if (_days is EqualUnmodifiableListView) return _days;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_days);
}

@override final  DateTime createdAt;
@override final  DateTime updatedAt;

/// Create a copy of Itinerary
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ItineraryCopyWith<_Itinerary> get copyWith => __$ItineraryCopyWithImpl<_Itinerary>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ItineraryToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _Itinerary&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.title, title) || other.title == title)&&(identical(other.cityId, cityId) || other.cityId == cityId)&&(identical(other.cityName, cityName) || other.cityName == cityName)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.visibility, visibility) || other.visibility == visibility)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.copiedFromId, copiedFromId) || other.copiedFromId == copiedFromId)&&const DeepCollectionEquality().equals(other._days, _days)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,title,cityId,cityName,startDate,endDate,visibility,coverImageUrl,copiedFromId,const DeepCollectionEquality().hash(_days),createdAt,updatedAt);

@override
String toString() {
  return 'Itinerary(id: $id, userId: $userId, title: $title, cityId: $cityId, cityName: $cityName, startDate: $startDate, endDate: $endDate, visibility: $visibility, coverImageUrl: $coverImageUrl, copiedFromId: $copiedFromId, days: $days, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$ItineraryCopyWith<$Res> implements $ItineraryCopyWith<$Res> {
  factory _$ItineraryCopyWith(_Itinerary value, $Res Function(_Itinerary) _then) = __$ItineraryCopyWithImpl;
@override @useResult
$Res call({
 String id, String userId, String title, String? cityId, String? cityName, DateTime? startDate, DateTime? endDate, String visibility, String? coverImageUrl, String? copiedFromId, List<ItineraryDay> days, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class __$ItineraryCopyWithImpl<$Res>
    implements _$ItineraryCopyWith<$Res> {
  __$ItineraryCopyWithImpl(this._self, this._then);

  final _Itinerary _self;
  final $Res Function(_Itinerary) _then;

/// Create a copy of Itinerary
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? title = null,Object? cityId = freezed,Object? cityName = freezed,Object? startDate = freezed,Object? endDate = freezed,Object? visibility = null,Object? coverImageUrl = freezed,Object? copiedFromId = freezed,Object? days = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_Itinerary(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,cityId: freezed == cityId ? _self.cityId : cityId // ignore: cast_nullable_to_non_nullable
as String?,cityName: freezed == cityName ? _self.cityName : cityName // ignore: cast_nullable_to_non_nullable
as String?,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,visibility: null == visibility ? _self.visibility : visibility // ignore: cast_nullable_to_non_nullable
as String,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,copiedFromId: freezed == copiedFromId ? _self.copiedFromId : copiedFromId // ignore: cast_nullable_to_non_nullable
as String?,days: null == days ? _self._days : days // ignore: cast_nullable_to_non_nullable
as List<ItineraryDay>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}


/// @nodoc
mixin _$ItineraryWithStats {

 String get id; String get userId; String get title; String? get cityId; String? get cityName; DateTime? get startDate; DateTime? get endDate; String get visibility; String? get coverImageUrl; String? get copiedFromId; List<ItineraryDay> get days; DateTime get createdAt; DateTime get updatedAt; int get dayCount; int get itemCount;
/// Create a copy of ItineraryWithStats
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$ItineraryWithStatsCopyWith<ItineraryWithStats> get copyWith => _$ItineraryWithStatsCopyWithImpl<ItineraryWithStats>(this as ItineraryWithStats, _$identity);

  /// Serializes this ItineraryWithStats to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is ItineraryWithStats&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.title, title) || other.title == title)&&(identical(other.cityId, cityId) || other.cityId == cityId)&&(identical(other.cityName, cityName) || other.cityName == cityName)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.visibility, visibility) || other.visibility == visibility)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.copiedFromId, copiedFromId) || other.copiedFromId == copiedFromId)&&const DeepCollectionEquality().equals(other.days, days)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.dayCount, dayCount) || other.dayCount == dayCount)&&(identical(other.itemCount, itemCount) || other.itemCount == itemCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,title,cityId,cityName,startDate,endDate,visibility,coverImageUrl,copiedFromId,const DeepCollectionEquality().hash(days),createdAt,updatedAt,dayCount,itemCount);

@override
String toString() {
  return 'ItineraryWithStats(id: $id, userId: $userId, title: $title, cityId: $cityId, cityName: $cityName, startDate: $startDate, endDate: $endDate, visibility: $visibility, coverImageUrl: $coverImageUrl, copiedFromId: $copiedFromId, days: $days, createdAt: $createdAt, updatedAt: $updatedAt, dayCount: $dayCount, itemCount: $itemCount)';
}


}

/// @nodoc
abstract mixin class $ItineraryWithStatsCopyWith<$Res>  {
  factory $ItineraryWithStatsCopyWith(ItineraryWithStats value, $Res Function(ItineraryWithStats) _then) = _$ItineraryWithStatsCopyWithImpl;
@useResult
$Res call({
 String id, String userId, String title, String? cityId, String? cityName, DateTime? startDate, DateTime? endDate, String visibility, String? coverImageUrl, String? copiedFromId, List<ItineraryDay> days, DateTime createdAt, DateTime updatedAt, int dayCount, int itemCount
});




}
/// @nodoc
class _$ItineraryWithStatsCopyWithImpl<$Res>
    implements $ItineraryWithStatsCopyWith<$Res> {
  _$ItineraryWithStatsCopyWithImpl(this._self, this._then);

  final ItineraryWithStats _self;
  final $Res Function(ItineraryWithStats) _then;

/// Create a copy of ItineraryWithStats
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? userId = null,Object? title = null,Object? cityId = freezed,Object? cityName = freezed,Object? startDate = freezed,Object? endDate = freezed,Object? visibility = null,Object? coverImageUrl = freezed,Object? copiedFromId = freezed,Object? days = null,Object? createdAt = null,Object? updatedAt = null,Object? dayCount = null,Object? itemCount = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,cityId: freezed == cityId ? _self.cityId : cityId // ignore: cast_nullable_to_non_nullable
as String?,cityName: freezed == cityName ? _self.cityName : cityName // ignore: cast_nullable_to_non_nullable
as String?,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,visibility: null == visibility ? _self.visibility : visibility // ignore: cast_nullable_to_non_nullable
as String,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,copiedFromId: freezed == copiedFromId ? _self.copiedFromId : copiedFromId // ignore: cast_nullable_to_non_nullable
as String?,days: null == days ? _self.days : days // ignore: cast_nullable_to_non_nullable
as List<ItineraryDay>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,dayCount: null == dayCount ? _self.dayCount : dayCount // ignore: cast_nullable_to_non_nullable
as int,itemCount: null == itemCount ? _self.itemCount : itemCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}

}


/// Adds pattern-matching-related methods to [ItineraryWithStats].
extension ItineraryWithStatsPatterns on ItineraryWithStats {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _ItineraryWithStats value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _ItineraryWithStats() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _ItineraryWithStats value)  $default,){
final _that = this;
switch (_that) {
case _ItineraryWithStats():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _ItineraryWithStats value)?  $default,){
final _that = this;
switch (_that) {
case _ItineraryWithStats() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String userId,  String title,  String? cityId,  String? cityName,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  String? copiedFromId,  List<ItineraryDay> days,  DateTime createdAt,  DateTime updatedAt,  int dayCount,  int itemCount)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _ItineraryWithStats() when $default != null:
return $default(_that.id,_that.userId,_that.title,_that.cityId,_that.cityName,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.copiedFromId,_that.days,_that.createdAt,_that.updatedAt,_that.dayCount,_that.itemCount);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String userId,  String title,  String? cityId,  String? cityName,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  String? copiedFromId,  List<ItineraryDay> days,  DateTime createdAt,  DateTime updatedAt,  int dayCount,  int itemCount)  $default,) {final _that = this;
switch (_that) {
case _ItineraryWithStats():
return $default(_that.id,_that.userId,_that.title,_that.cityId,_that.cityName,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.copiedFromId,_that.days,_that.createdAt,_that.updatedAt,_that.dayCount,_that.itemCount);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String userId,  String title,  String? cityId,  String? cityName,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  String? copiedFromId,  List<ItineraryDay> days,  DateTime createdAt,  DateTime updatedAt,  int dayCount,  int itemCount)?  $default,) {final _that = this;
switch (_that) {
case _ItineraryWithStats() when $default != null:
return $default(_that.id,_that.userId,_that.title,_that.cityId,_that.cityName,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.copiedFromId,_that.days,_that.createdAt,_that.updatedAt,_that.dayCount,_that.itemCount);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _ItineraryWithStats implements ItineraryWithStats {
  const _ItineraryWithStats({required this.id, required this.userId, required this.title, this.cityId, this.cityName, this.startDate, this.endDate, this.visibility = 'private', this.coverImageUrl, this.copiedFromId, final  List<ItineraryDay> days = const [], required this.createdAt, required this.updatedAt, this.dayCount = 0, this.itemCount = 0}): _days = days;
  factory _ItineraryWithStats.fromJson(Map<String, dynamic> json) => _$ItineraryWithStatsFromJson(json);

@override final  String id;
@override final  String userId;
@override final  String title;
@override final  String? cityId;
@override final  String? cityName;
@override final  DateTime? startDate;
@override final  DateTime? endDate;
@override@JsonKey() final  String visibility;
@override final  String? coverImageUrl;
@override final  String? copiedFromId;
 final  List<ItineraryDay> _days;
@override@JsonKey() List<ItineraryDay> get days {
  if (_days is EqualUnmodifiableListView) return _days;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_days);
}

@override final  DateTime createdAt;
@override final  DateTime updatedAt;
@override@JsonKey() final  int dayCount;
@override@JsonKey() final  int itemCount;

/// Create a copy of ItineraryWithStats
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$ItineraryWithStatsCopyWith<_ItineraryWithStats> get copyWith => __$ItineraryWithStatsCopyWithImpl<_ItineraryWithStats>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$ItineraryWithStatsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _ItineraryWithStats&&(identical(other.id, id) || other.id == id)&&(identical(other.userId, userId) || other.userId == userId)&&(identical(other.title, title) || other.title == title)&&(identical(other.cityId, cityId) || other.cityId == cityId)&&(identical(other.cityName, cityName) || other.cityName == cityName)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.visibility, visibility) || other.visibility == visibility)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.copiedFromId, copiedFromId) || other.copiedFromId == copiedFromId)&&const DeepCollectionEquality().equals(other._days, _days)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.dayCount, dayCount) || other.dayCount == dayCount)&&(identical(other.itemCount, itemCount) || other.itemCount == itemCount));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,userId,title,cityId,cityName,startDate,endDate,visibility,coverImageUrl,copiedFromId,const DeepCollectionEquality().hash(_days),createdAt,updatedAt,dayCount,itemCount);

@override
String toString() {
  return 'ItineraryWithStats(id: $id, userId: $userId, title: $title, cityId: $cityId, cityName: $cityName, startDate: $startDate, endDate: $endDate, visibility: $visibility, coverImageUrl: $coverImageUrl, copiedFromId: $copiedFromId, days: $days, createdAt: $createdAt, updatedAt: $updatedAt, dayCount: $dayCount, itemCount: $itemCount)';
}


}

/// @nodoc
abstract mixin class _$ItineraryWithStatsCopyWith<$Res> implements $ItineraryWithStatsCopyWith<$Res> {
  factory _$ItineraryWithStatsCopyWith(_ItineraryWithStats value, $Res Function(_ItineraryWithStats) _then) = __$ItineraryWithStatsCopyWithImpl;
@override @useResult
$Res call({
 String id, String userId, String title, String? cityId, String? cityName, DateTime? startDate, DateTime? endDate, String visibility, String? coverImageUrl, String? copiedFromId, List<ItineraryDay> days, DateTime createdAt, DateTime updatedAt, int dayCount, int itemCount
});




}
/// @nodoc
class __$ItineraryWithStatsCopyWithImpl<$Res>
    implements _$ItineraryWithStatsCopyWith<$Res> {
  __$ItineraryWithStatsCopyWithImpl(this._self, this._then);

  final _ItineraryWithStats _self;
  final $Res Function(_ItineraryWithStats) _then;

/// Create a copy of ItineraryWithStats
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? userId = null,Object? title = null,Object? cityId = freezed,Object? cityName = freezed,Object? startDate = freezed,Object? endDate = freezed,Object? visibility = null,Object? coverImageUrl = freezed,Object? copiedFromId = freezed,Object? days = null,Object? createdAt = null,Object? updatedAt = null,Object? dayCount = null,Object? itemCount = null,}) {
  return _then(_ItineraryWithStats(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,userId: null == userId ? _self.userId : userId // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,cityId: freezed == cityId ? _self.cityId : cityId // ignore: cast_nullable_to_non_nullable
as String?,cityName: freezed == cityName ? _self.cityName : cityName // ignore: cast_nullable_to_non_nullable
as String?,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,visibility: null == visibility ? _self.visibility : visibility // ignore: cast_nullable_to_non_nullable
as String,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,copiedFromId: freezed == copiedFromId ? _self.copiedFromId : copiedFromId // ignore: cast_nullable_to_non_nullable
as String?,days: null == days ? _self._days : days // ignore: cast_nullable_to_non_nullable
as List<ItineraryDay>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,dayCount: null == dayCount ? _self.dayCount : dayCount // ignore: cast_nullable_to_non_nullable
as int,itemCount: null == itemCount ? _self.itemCount : itemCount // ignore: cast_nullable_to_non_nullable
as int,
  ));
}


}


/// @nodoc
mixin _$CreateItineraryInput {

 String get title; String? get cityId; DateTime? get startDate; DateTime? get endDate; String get visibility; String? get coverImageUrl; List<CreateItineraryDayInput>? get days;
/// Create a copy of CreateItineraryInput
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CreateItineraryInputCopyWith<CreateItineraryInput> get copyWith => _$CreateItineraryInputCopyWithImpl<CreateItineraryInput>(this as CreateItineraryInput, _$identity);

  /// Serializes this CreateItineraryInput to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CreateItineraryInput&&(identical(other.title, title) || other.title == title)&&(identical(other.cityId, cityId) || other.cityId == cityId)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.visibility, visibility) || other.visibility == visibility)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&const DeepCollectionEquality().equals(other.days, days));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,title,cityId,startDate,endDate,visibility,coverImageUrl,const DeepCollectionEquality().hash(days));

@override
String toString() {
  return 'CreateItineraryInput(title: $title, cityId: $cityId, startDate: $startDate, endDate: $endDate, visibility: $visibility, coverImageUrl: $coverImageUrl, days: $days)';
}


}

/// @nodoc
abstract mixin class $CreateItineraryInputCopyWith<$Res>  {
  factory $CreateItineraryInputCopyWith(CreateItineraryInput value, $Res Function(CreateItineraryInput) _then) = _$CreateItineraryInputCopyWithImpl;
@useResult
$Res call({
 String title, String? cityId, DateTime? startDate, DateTime? endDate, String visibility, String? coverImageUrl, List<CreateItineraryDayInput>? days
});




}
/// @nodoc
class _$CreateItineraryInputCopyWithImpl<$Res>
    implements $CreateItineraryInputCopyWith<$Res> {
  _$CreateItineraryInputCopyWithImpl(this._self, this._then);

  final CreateItineraryInput _self;
  final $Res Function(CreateItineraryInput) _then;

/// Create a copy of CreateItineraryInput
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? title = null,Object? cityId = freezed,Object? startDate = freezed,Object? endDate = freezed,Object? visibility = null,Object? coverImageUrl = freezed,Object? days = freezed,}) {
  return _then(_self.copyWith(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,cityId: freezed == cityId ? _self.cityId : cityId // ignore: cast_nullable_to_non_nullable
as String?,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,visibility: null == visibility ? _self.visibility : visibility // ignore: cast_nullable_to_non_nullable
as String,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,days: freezed == days ? _self.days : days // ignore: cast_nullable_to_non_nullable
as List<CreateItineraryDayInput>?,
  ));
}

}


/// Adds pattern-matching-related methods to [CreateItineraryInput].
extension CreateItineraryInputPatterns on CreateItineraryInput {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CreateItineraryInput value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CreateItineraryInput() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CreateItineraryInput value)  $default,){
final _that = this;
switch (_that) {
case _CreateItineraryInput():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CreateItineraryInput value)?  $default,){
final _that = this;
switch (_that) {
case _CreateItineraryInput() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String title,  String? cityId,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  List<CreateItineraryDayInput>? days)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CreateItineraryInput() when $default != null:
return $default(_that.title,_that.cityId,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.days);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String title,  String? cityId,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  List<CreateItineraryDayInput>? days)  $default,) {final _that = this;
switch (_that) {
case _CreateItineraryInput():
return $default(_that.title,_that.cityId,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.days);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String title,  String? cityId,  DateTime? startDate,  DateTime? endDate,  String visibility,  String? coverImageUrl,  List<CreateItineraryDayInput>? days)?  $default,) {final _that = this;
switch (_that) {
case _CreateItineraryInput() when $default != null:
return $default(_that.title,_that.cityId,_that.startDate,_that.endDate,_that.visibility,_that.coverImageUrl,_that.days);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CreateItineraryInput implements CreateItineraryInput {
  const _CreateItineraryInput({required this.title, this.cityId, this.startDate, this.endDate, this.visibility = 'private', this.coverImageUrl, final  List<CreateItineraryDayInput>? days}): _days = days;
  factory _CreateItineraryInput.fromJson(Map<String, dynamic> json) => _$CreateItineraryInputFromJson(json);

@override final  String title;
@override final  String? cityId;
@override final  DateTime? startDate;
@override final  DateTime? endDate;
@override@JsonKey() final  String visibility;
@override final  String? coverImageUrl;
 final  List<CreateItineraryDayInput>? _days;
@override List<CreateItineraryDayInput>? get days {
  final value = _days;
  if (value == null) return null;
  if (_days is EqualUnmodifiableListView) return _days;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(value);
}


/// Create a copy of CreateItineraryInput
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CreateItineraryInputCopyWith<_CreateItineraryInput> get copyWith => __$CreateItineraryInputCopyWithImpl<_CreateItineraryInput>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CreateItineraryInputToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CreateItineraryInput&&(identical(other.title, title) || other.title == title)&&(identical(other.cityId, cityId) || other.cityId == cityId)&&(identical(other.startDate, startDate) || other.startDate == startDate)&&(identical(other.endDate, endDate) || other.endDate == endDate)&&(identical(other.visibility, visibility) || other.visibility == visibility)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&const DeepCollectionEquality().equals(other._days, _days));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,title,cityId,startDate,endDate,visibility,coverImageUrl,const DeepCollectionEquality().hash(_days));

@override
String toString() {
  return 'CreateItineraryInput(title: $title, cityId: $cityId, startDate: $startDate, endDate: $endDate, visibility: $visibility, coverImageUrl: $coverImageUrl, days: $days)';
}


}

/// @nodoc
abstract mixin class _$CreateItineraryInputCopyWith<$Res> implements $CreateItineraryInputCopyWith<$Res> {
  factory _$CreateItineraryInputCopyWith(_CreateItineraryInput value, $Res Function(_CreateItineraryInput) _then) = __$CreateItineraryInputCopyWithImpl;
@override @useResult
$Res call({
 String title, String? cityId, DateTime? startDate, DateTime? endDate, String visibility, String? coverImageUrl, List<CreateItineraryDayInput>? days
});




}
/// @nodoc
class __$CreateItineraryInputCopyWithImpl<$Res>
    implements _$CreateItineraryInputCopyWith<$Res> {
  __$CreateItineraryInputCopyWithImpl(this._self, this._then);

  final _CreateItineraryInput _self;
  final $Res Function(_CreateItineraryInput) _then;

/// Create a copy of CreateItineraryInput
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? title = null,Object? cityId = freezed,Object? startDate = freezed,Object? endDate = freezed,Object? visibility = null,Object? coverImageUrl = freezed,Object? days = freezed,}) {
  return _then(_CreateItineraryInput(
title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,cityId: freezed == cityId ? _self.cityId : cityId // ignore: cast_nullable_to_non_nullable
as String?,startDate: freezed == startDate ? _self.startDate : startDate // ignore: cast_nullable_to_non_nullable
as DateTime?,endDate: freezed == endDate ? _self.endDate : endDate // ignore: cast_nullable_to_non_nullable
as DateTime?,visibility: null == visibility ? _self.visibility : visibility // ignore: cast_nullable_to_non_nullable
as String,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,days: freezed == days ? _self._days : days // ignore: cast_nullable_to_non_nullable
as List<CreateItineraryDayInput>?,
  ));
}


}


/// @nodoc
mixin _$CreateItineraryDayInput {

 int get dayNumber; DateTime? get date; List<CreateItineraryItemInput> get items;
/// Create a copy of CreateItineraryDayInput
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CreateItineraryDayInputCopyWith<CreateItineraryDayInput> get copyWith => _$CreateItineraryDayInputCopyWithImpl<CreateItineraryDayInput>(this as CreateItineraryDayInput, _$identity);

  /// Serializes this CreateItineraryDayInput to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CreateItineraryDayInput&&(identical(other.dayNumber, dayNumber) || other.dayNumber == dayNumber)&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other.items, items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,dayNumber,date,const DeepCollectionEquality().hash(items));

@override
String toString() {
  return 'CreateItineraryDayInput(dayNumber: $dayNumber, date: $date, items: $items)';
}


}

/// @nodoc
abstract mixin class $CreateItineraryDayInputCopyWith<$Res>  {
  factory $CreateItineraryDayInputCopyWith(CreateItineraryDayInput value, $Res Function(CreateItineraryDayInput) _then) = _$CreateItineraryDayInputCopyWithImpl;
@useResult
$Res call({
 int dayNumber, DateTime? date, List<CreateItineraryItemInput> items
});




}
/// @nodoc
class _$CreateItineraryDayInputCopyWithImpl<$Res>
    implements $CreateItineraryDayInputCopyWith<$Res> {
  _$CreateItineraryDayInputCopyWithImpl(this._self, this._then);

  final CreateItineraryDayInput _self;
  final $Res Function(CreateItineraryDayInput) _then;

/// Create a copy of CreateItineraryDayInput
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? dayNumber = null,Object? date = freezed,Object? items = null,}) {
  return _then(_self.copyWith(
dayNumber: null == dayNumber ? _self.dayNumber : dayNumber // ignore: cast_nullable_to_non_nullable
as int,date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime?,items: null == items ? _self.items : items // ignore: cast_nullable_to_non_nullable
as List<CreateItineraryItemInput>,
  ));
}

}


/// Adds pattern-matching-related methods to [CreateItineraryDayInput].
extension CreateItineraryDayInputPatterns on CreateItineraryDayInput {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CreateItineraryDayInput value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CreateItineraryDayInput() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CreateItineraryDayInput value)  $default,){
final _that = this;
switch (_that) {
case _CreateItineraryDayInput():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CreateItineraryDayInput value)?  $default,){
final _that = this;
switch (_that) {
case _CreateItineraryDayInput() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int dayNumber,  DateTime? date,  List<CreateItineraryItemInput> items)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CreateItineraryDayInput() when $default != null:
return $default(_that.dayNumber,_that.date,_that.items);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int dayNumber,  DateTime? date,  List<CreateItineraryItemInput> items)  $default,) {final _that = this;
switch (_that) {
case _CreateItineraryDayInput():
return $default(_that.dayNumber,_that.date,_that.items);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int dayNumber,  DateTime? date,  List<CreateItineraryItemInput> items)?  $default,) {final _that = this;
switch (_that) {
case _CreateItineraryDayInput() when $default != null:
return $default(_that.dayNumber,_that.date,_that.items);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CreateItineraryDayInput implements CreateItineraryDayInput {
  const _CreateItineraryDayInput({required this.dayNumber, this.date, final  List<CreateItineraryItemInput> items = const []}): _items = items;
  factory _CreateItineraryDayInput.fromJson(Map<String, dynamic> json) => _$CreateItineraryDayInputFromJson(json);

@override final  int dayNumber;
@override final  DateTime? date;
 final  List<CreateItineraryItemInput> _items;
@override@JsonKey() List<CreateItineraryItemInput> get items {
  if (_items is EqualUnmodifiableListView) return _items;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_items);
}


/// Create a copy of CreateItineraryDayInput
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CreateItineraryDayInputCopyWith<_CreateItineraryDayInput> get copyWith => __$CreateItineraryDayInputCopyWithImpl<_CreateItineraryDayInput>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CreateItineraryDayInputToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CreateItineraryDayInput&&(identical(other.dayNumber, dayNumber) || other.dayNumber == dayNumber)&&(identical(other.date, date) || other.date == date)&&const DeepCollectionEquality().equals(other._items, _items));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,dayNumber,date,const DeepCollectionEquality().hash(_items));

@override
String toString() {
  return 'CreateItineraryDayInput(dayNumber: $dayNumber, date: $date, items: $items)';
}


}

/// @nodoc
abstract mixin class _$CreateItineraryDayInputCopyWith<$Res> implements $CreateItineraryDayInputCopyWith<$Res> {
  factory _$CreateItineraryDayInputCopyWith(_CreateItineraryDayInput value, $Res Function(_CreateItineraryDayInput) _then) = __$CreateItineraryDayInputCopyWithImpl;
@override @useResult
$Res call({
 int dayNumber, DateTime? date, List<CreateItineraryItemInput> items
});




}
/// @nodoc
class __$CreateItineraryDayInputCopyWithImpl<$Res>
    implements _$CreateItineraryDayInputCopyWith<$Res> {
  __$CreateItineraryDayInputCopyWithImpl(this._self, this._then);

  final _CreateItineraryDayInput _self;
  final $Res Function(_CreateItineraryDayInput) _then;

/// Create a copy of CreateItineraryDayInput
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? dayNumber = null,Object? date = freezed,Object? items = null,}) {
  return _then(_CreateItineraryDayInput(
dayNumber: null == dayNumber ? _self.dayNumber : dayNumber // ignore: cast_nullable_to_non_nullable
as int,date: freezed == date ? _self.date : date // ignore: cast_nullable_to_non_nullable
as DateTime?,items: null == items ? _self._items : items // ignore: cast_nullable_to_non_nullable
as List<CreateItineraryItemInput>,
  ));
}


}


/// @nodoc
mixin _$CreateItineraryItemInput {

 String? get poiId; String? get poiName; double? get latitude; double? get longitude; int get orderIndex; String? get startTime; String? get endTime; String? get notes; String get transportMode; int? get transportMinutes; String? get category;
/// Create a copy of CreateItineraryItemInput
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$CreateItineraryItemInputCopyWith<CreateItineraryItemInput> get copyWith => _$CreateItineraryItemInputCopyWithImpl<CreateItineraryItemInput>(this as CreateItineraryItemInput, _$identity);

  /// Serializes this CreateItineraryItemInput to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is CreateItineraryItemInput&&(identical(other.poiId, poiId) || other.poiId == poiId)&&(identical(other.poiName, poiName) || other.poiName == poiName)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.orderIndex, orderIndex) || other.orderIndex == orderIndex)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.transportMode, transportMode) || other.transportMode == transportMode)&&(identical(other.transportMinutes, transportMinutes) || other.transportMinutes == transportMinutes)&&(identical(other.category, category) || other.category == category));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,poiId,poiName,latitude,longitude,orderIndex,startTime,endTime,notes,transportMode,transportMinutes,category);

@override
String toString() {
  return 'CreateItineraryItemInput(poiId: $poiId, poiName: $poiName, latitude: $latitude, longitude: $longitude, orderIndex: $orderIndex, startTime: $startTime, endTime: $endTime, notes: $notes, transportMode: $transportMode, transportMinutes: $transportMinutes, category: $category)';
}


}

/// @nodoc
abstract mixin class $CreateItineraryItemInputCopyWith<$Res>  {
  factory $CreateItineraryItemInputCopyWith(CreateItineraryItemInput value, $Res Function(CreateItineraryItemInput) _then) = _$CreateItineraryItemInputCopyWithImpl;
@useResult
$Res call({
 String? poiId, String? poiName, double? latitude, double? longitude, int orderIndex, String? startTime, String? endTime, String? notes, String transportMode, int? transportMinutes, String? category
});




}
/// @nodoc
class _$CreateItineraryItemInputCopyWithImpl<$Res>
    implements $CreateItineraryItemInputCopyWith<$Res> {
  _$CreateItineraryItemInputCopyWithImpl(this._self, this._then);

  final CreateItineraryItemInput _self;
  final $Res Function(CreateItineraryItemInput) _then;

/// Create a copy of CreateItineraryItemInput
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? poiId = freezed,Object? poiName = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? orderIndex = null,Object? startTime = freezed,Object? endTime = freezed,Object? notes = freezed,Object? transportMode = null,Object? transportMinutes = freezed,Object? category = freezed,}) {
  return _then(_self.copyWith(
poiId: freezed == poiId ? _self.poiId : poiId // ignore: cast_nullable_to_non_nullable
as String?,poiName: freezed == poiName ? _self.poiName : poiName // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,orderIndex: null == orderIndex ? _self.orderIndex : orderIndex // ignore: cast_nullable_to_non_nullable
as int,startTime: freezed == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as String?,endTime: freezed == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,transportMode: null == transportMode ? _self.transportMode : transportMode // ignore: cast_nullable_to_non_nullable
as String,transportMinutes: freezed == transportMinutes ? _self.transportMinutes : transportMinutes // ignore: cast_nullable_to_non_nullable
as int?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [CreateItineraryItemInput].
extension CreateItineraryItemInputPatterns on CreateItineraryItemInput {
/// A variant of `map` that fallback to returning `orElse`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _CreateItineraryItemInput value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _CreateItineraryItemInput() when $default != null:
return $default(_that);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// Callbacks receives the raw object, upcasted.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case final Subclass2 value:
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _CreateItineraryItemInput value)  $default,){
final _that = this;
switch (_that) {
case _CreateItineraryItemInput():
return $default(_that);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `map` that fallback to returning `null`.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case final Subclass value:
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _CreateItineraryItemInput value)?  $default,){
final _that = this;
switch (_that) {
case _CreateItineraryItemInput() when $default != null:
return $default(_that);case _:
  return null;

}
}
/// A variant of `when` that fallback to an `orElse` callback.
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return orElse();
/// }
/// ```

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String? poiId,  String? poiName,  double? latitude,  double? longitude,  int orderIndex,  String? startTime,  String? endTime,  String? notes,  String transportMode,  int? transportMinutes,  String? category)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _CreateItineraryItemInput() when $default != null:
return $default(_that.poiId,_that.poiName,_that.latitude,_that.longitude,_that.orderIndex,_that.startTime,_that.endTime,_that.notes,_that.transportMode,_that.transportMinutes,_that.category);case _:
  return orElse();

}
}
/// A `switch`-like method, using callbacks.
///
/// As opposed to `map`, this offers destructuring.
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case Subclass2(:final field2):
///     return ...;
/// }
/// ```

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String? poiId,  String? poiName,  double? latitude,  double? longitude,  int orderIndex,  String? startTime,  String? endTime,  String? notes,  String transportMode,  int? transportMinutes,  String? category)  $default,) {final _that = this;
switch (_that) {
case _CreateItineraryItemInput():
return $default(_that.poiId,_that.poiName,_that.latitude,_that.longitude,_that.orderIndex,_that.startTime,_that.endTime,_that.notes,_that.transportMode,_that.transportMinutes,_that.category);case _:
  throw StateError('Unexpected subclass');

}
}
/// A variant of `when` that fallback to returning `null`
///
/// It is equivalent to doing:
/// ```dart
/// switch (sealedClass) {
///   case Subclass(:final field):
///     return ...;
///   case _:
///     return null;
/// }
/// ```

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String? poiId,  String? poiName,  double? latitude,  double? longitude,  int orderIndex,  String? startTime,  String? endTime,  String? notes,  String transportMode,  int? transportMinutes,  String? category)?  $default,) {final _that = this;
switch (_that) {
case _CreateItineraryItemInput() when $default != null:
return $default(_that.poiId,_that.poiName,_that.latitude,_that.longitude,_that.orderIndex,_that.startTime,_that.endTime,_that.notes,_that.transportMode,_that.transportMinutes,_that.category);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _CreateItineraryItemInput implements CreateItineraryItemInput {
  const _CreateItineraryItemInput({this.poiId, this.poiName, this.latitude, this.longitude, required this.orderIndex, this.startTime, this.endTime, this.notes, this.transportMode = 'walk', this.transportMinutes, this.category});
  factory _CreateItineraryItemInput.fromJson(Map<String, dynamic> json) => _$CreateItineraryItemInputFromJson(json);

@override final  String? poiId;
@override final  String? poiName;
@override final  double? latitude;
@override final  double? longitude;
@override final  int orderIndex;
@override final  String? startTime;
@override final  String? endTime;
@override final  String? notes;
@override@JsonKey() final  String transportMode;
@override final  int? transportMinutes;
@override final  String? category;

/// Create a copy of CreateItineraryItemInput
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$CreateItineraryItemInputCopyWith<_CreateItineraryItemInput> get copyWith => __$CreateItineraryItemInputCopyWithImpl<_CreateItineraryItemInput>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$CreateItineraryItemInputToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _CreateItineraryItemInput&&(identical(other.poiId, poiId) || other.poiId == poiId)&&(identical(other.poiName, poiName) || other.poiName == poiName)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.orderIndex, orderIndex) || other.orderIndex == orderIndex)&&(identical(other.startTime, startTime) || other.startTime == startTime)&&(identical(other.endTime, endTime) || other.endTime == endTime)&&(identical(other.notes, notes) || other.notes == notes)&&(identical(other.transportMode, transportMode) || other.transportMode == transportMode)&&(identical(other.transportMinutes, transportMinutes) || other.transportMinutes == transportMinutes)&&(identical(other.category, category) || other.category == category));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,poiId,poiName,latitude,longitude,orderIndex,startTime,endTime,notes,transportMode,transportMinutes,category);

@override
String toString() {
  return 'CreateItineraryItemInput(poiId: $poiId, poiName: $poiName, latitude: $latitude, longitude: $longitude, orderIndex: $orderIndex, startTime: $startTime, endTime: $endTime, notes: $notes, transportMode: $transportMode, transportMinutes: $transportMinutes, category: $category)';
}


}

/// @nodoc
abstract mixin class _$CreateItineraryItemInputCopyWith<$Res> implements $CreateItineraryItemInputCopyWith<$Res> {
  factory _$CreateItineraryItemInputCopyWith(_CreateItineraryItemInput value, $Res Function(_CreateItineraryItemInput) _then) = __$CreateItineraryItemInputCopyWithImpl;
@override @useResult
$Res call({
 String? poiId, String? poiName, double? latitude, double? longitude, int orderIndex, String? startTime, String? endTime, String? notes, String transportMode, int? transportMinutes, String? category
});




}
/// @nodoc
class __$CreateItineraryItemInputCopyWithImpl<$Res>
    implements _$CreateItineraryItemInputCopyWith<$Res> {
  __$CreateItineraryItemInputCopyWithImpl(this._self, this._then);

  final _CreateItineraryItemInput _self;
  final $Res Function(_CreateItineraryItemInput) _then;

/// Create a copy of CreateItineraryItemInput
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? poiId = freezed,Object? poiName = freezed,Object? latitude = freezed,Object? longitude = freezed,Object? orderIndex = null,Object? startTime = freezed,Object? endTime = freezed,Object? notes = freezed,Object? transportMode = null,Object? transportMinutes = freezed,Object? category = freezed,}) {
  return _then(_CreateItineraryItemInput(
poiId: freezed == poiId ? _self.poiId : poiId // ignore: cast_nullable_to_non_nullable
as String?,poiName: freezed == poiName ? _self.poiName : poiName // ignore: cast_nullable_to_non_nullable
as String?,latitude: freezed == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double?,longitude: freezed == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double?,orderIndex: null == orderIndex ? _self.orderIndex : orderIndex // ignore: cast_nullable_to_non_nullable
as int,startTime: freezed == startTime ? _self.startTime : startTime // ignore: cast_nullable_to_non_nullable
as String?,endTime: freezed == endTime ? _self.endTime : endTime // ignore: cast_nullable_to_non_nullable
as String?,notes: freezed == notes ? _self.notes : notes // ignore: cast_nullable_to_non_nullable
as String?,transportMode: null == transportMode ? _self.transportMode : transportMode // ignore: cast_nullable_to_non_nullable
as String,transportMinutes: freezed == transportMinutes ? _self.transportMinutes : transportMinutes // ignore: cast_nullable_to_non_nullable
as int?,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}

// dart format on
