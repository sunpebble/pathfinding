// GENERATED CODE - DO NOT MODIFY BY HAND
// coverage:ignore-file
// ignore_for_file: type=lint
// ignore_for_file: unused_element, deprecated_member_use, deprecated_member_use_from_same_package, use_function_type_syntax_for_parameters, unnecessary_const, avoid_init_to_null, invalid_override_different_default_values_named, prefer_expression_function_bodies, annotate_overrides, invalid_annotation_target, unnecessary_question_mark

part of 'blog_post.dart';

// **************************************************************************
// FreezedGenerator
// **************************************************************************

// dart format off
T _$identity<T>(T value) => value;

/// @nodoc
mixin _$BlogLocation {

 String get id; String get name; String? get description; double get latitude; double get longitude; int get order; String? get category;
/// Create a copy of BlogLocation
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BlogLocationCopyWith<BlogLocation> get copyWith => _$BlogLocationCopyWithImpl<BlogLocation>(this as BlogLocation, _$identity);

  /// Serializes this BlogLocation to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BlogLocation&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.order, order) || other.order == order)&&(identical(other.category, category) || other.category == category));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,description,latitude,longitude,order,category);

@override
String toString() {
  return 'BlogLocation(id: $id, name: $name, description: $description, latitude: $latitude, longitude: $longitude, order: $order, category: $category)';
}


}

/// @nodoc
abstract mixin class $BlogLocationCopyWith<$Res>  {
  factory $BlogLocationCopyWith(BlogLocation value, $Res Function(BlogLocation) _then) = _$BlogLocationCopyWithImpl;
@useResult
$Res call({
 String id, String name, String? description, double latitude, double longitude, int order, String? category
});




}
/// @nodoc
class _$BlogLocationCopyWithImpl<$Res>
    implements $BlogLocationCopyWith<$Res> {
  _$BlogLocationCopyWithImpl(this._self, this._then);

  final BlogLocation _self;
  final $Res Function(BlogLocation) _then;

/// Create a copy of BlogLocation
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? name = null,Object? description = freezed,Object? latitude = null,Object? longitude = null,Object? order = null,Object? category = freezed,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,latitude: null == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double,longitude: null == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double,order: null == order ? _self.order : order // ignore: cast_nullable_to_non_nullable
as int,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [BlogLocation].
extension BlogLocationPatterns on BlogLocation {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BlogLocation value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BlogLocation() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BlogLocation value)  $default,){
final _that = this;
switch (_that) {
case _BlogLocation():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BlogLocation value)?  $default,){
final _that = this;
switch (_that) {
case _BlogLocation() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String name,  String? description,  double latitude,  double longitude,  int order,  String? category)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BlogLocation() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.latitude,_that.longitude,_that.order,_that.category);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String name,  String? description,  double latitude,  double longitude,  int order,  String? category)  $default,) {final _that = this;
switch (_that) {
case _BlogLocation():
return $default(_that.id,_that.name,_that.description,_that.latitude,_that.longitude,_that.order,_that.category);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String name,  String? description,  double latitude,  double longitude,  int order,  String? category)?  $default,) {final _that = this;
switch (_that) {
case _BlogLocation() when $default != null:
return $default(_that.id,_that.name,_that.description,_that.latitude,_that.longitude,_that.order,_that.category);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BlogLocation implements BlogLocation {
  const _BlogLocation({required this.id, required this.name, this.description, required this.latitude, required this.longitude, required this.order, this.category});
  factory _BlogLocation.fromJson(Map<String, dynamic> json) => _$BlogLocationFromJson(json);

@override final  String id;
@override final  String name;
@override final  String? description;
@override final  double latitude;
@override final  double longitude;
@override final  int order;
@override final  String? category;

/// Create a copy of BlogLocation
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BlogLocationCopyWith<_BlogLocation> get copyWith => __$BlogLocationCopyWithImpl<_BlogLocation>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BlogLocationToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BlogLocation&&(identical(other.id, id) || other.id == id)&&(identical(other.name, name) || other.name == name)&&(identical(other.description, description) || other.description == description)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.order, order) || other.order == order)&&(identical(other.category, category) || other.category == category));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,name,description,latitude,longitude,order,category);

@override
String toString() {
  return 'BlogLocation(id: $id, name: $name, description: $description, latitude: $latitude, longitude: $longitude, order: $order, category: $category)';
}


}

/// @nodoc
abstract mixin class _$BlogLocationCopyWith<$Res> implements $BlogLocationCopyWith<$Res> {
  factory _$BlogLocationCopyWith(_BlogLocation value, $Res Function(_BlogLocation) _then) = __$BlogLocationCopyWithImpl;
@override @useResult
$Res call({
 String id, String name, String? description, double latitude, double longitude, int order, String? category
});




}
/// @nodoc
class __$BlogLocationCopyWithImpl<$Res>
    implements _$BlogLocationCopyWith<$Res> {
  __$BlogLocationCopyWithImpl(this._self, this._then);

  final _BlogLocation _self;
  final $Res Function(_BlogLocation) _then;

/// Create a copy of BlogLocation
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? name = null,Object? description = freezed,Object? latitude = null,Object? longitude = null,Object? order = null,Object? category = freezed,}) {
  return _then(_BlogLocation(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,latitude: null == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double,longitude: null == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double,order: null == order ? _self.order : order // ignore: cast_nullable_to_non_nullable
as int,category: freezed == category ? _self.category : category // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$AiPoi {

 String get name; String get type; String? get description; double get latitude; double get longitude; String? get address;
/// Create a copy of AiPoi
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AiPoiCopyWith<AiPoi> get copyWith => _$AiPoiCopyWithImpl<AiPoi>(this as AiPoi, _$identity);

  /// Serializes this AiPoi to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AiPoi&&(identical(other.name, name) || other.name == name)&&(identical(other.type, type) || other.type == type)&&(identical(other.description, description) || other.description == description)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.address, address) || other.address == address));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,type,description,latitude,longitude,address);

@override
String toString() {
  return 'AiPoi(name: $name, type: $type, description: $description, latitude: $latitude, longitude: $longitude, address: $address)';
}


}

/// @nodoc
abstract mixin class $AiPoiCopyWith<$Res>  {
  factory $AiPoiCopyWith(AiPoi value, $Res Function(AiPoi) _then) = _$AiPoiCopyWithImpl;
@useResult
$Res call({
 String name, String type, String? description, double latitude, double longitude, String? address
});




}
/// @nodoc
class _$AiPoiCopyWithImpl<$Res>
    implements $AiPoiCopyWith<$Res> {
  _$AiPoiCopyWithImpl(this._self, this._then);

  final AiPoi _self;
  final $Res Function(AiPoi) _then;

/// Create a copy of AiPoi
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? name = null,Object? type = null,Object? description = freezed,Object? latitude = null,Object? longitude = null,Object? address = freezed,}) {
  return _then(_self.copyWith(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,latitude: null == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double,longitude: null == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}

}


/// Adds pattern-matching-related methods to [AiPoi].
extension AiPoiPatterns on AiPoi {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AiPoi value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AiPoi() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AiPoi value)  $default,){
final _that = this;
switch (_that) {
case _AiPoi():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AiPoi value)?  $default,){
final _that = this;
switch (_that) {
case _AiPoi() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String name,  String type,  String? description,  double latitude,  double longitude,  String? address)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AiPoi() when $default != null:
return $default(_that.name,_that.type,_that.description,_that.latitude,_that.longitude,_that.address);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String name,  String type,  String? description,  double latitude,  double longitude,  String? address)  $default,) {final _that = this;
switch (_that) {
case _AiPoi():
return $default(_that.name,_that.type,_that.description,_that.latitude,_that.longitude,_that.address);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String name,  String type,  String? description,  double latitude,  double longitude,  String? address)?  $default,) {final _that = this;
switch (_that) {
case _AiPoi() when $default != null:
return $default(_that.name,_that.type,_that.description,_that.latitude,_that.longitude,_that.address);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AiPoi implements AiPoi {
  const _AiPoi({required this.name, required this.type, this.description, required this.latitude, required this.longitude, this.address});
  factory _AiPoi.fromJson(Map<String, dynamic> json) => _$AiPoiFromJson(json);

@override final  String name;
@override final  String type;
@override final  String? description;
@override final  double latitude;
@override final  double longitude;
@override final  String? address;

/// Create a copy of AiPoi
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AiPoiCopyWith<_AiPoi> get copyWith => __$AiPoiCopyWithImpl<_AiPoi>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AiPoiToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AiPoi&&(identical(other.name, name) || other.name == name)&&(identical(other.type, type) || other.type == type)&&(identical(other.description, description) || other.description == description)&&(identical(other.latitude, latitude) || other.latitude == latitude)&&(identical(other.longitude, longitude) || other.longitude == longitude)&&(identical(other.address, address) || other.address == address));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,name,type,description,latitude,longitude,address);

@override
String toString() {
  return 'AiPoi(name: $name, type: $type, description: $description, latitude: $latitude, longitude: $longitude, address: $address)';
}


}

/// @nodoc
abstract mixin class _$AiPoiCopyWith<$Res> implements $AiPoiCopyWith<$Res> {
  factory _$AiPoiCopyWith(_AiPoi value, $Res Function(_AiPoi) _then) = __$AiPoiCopyWithImpl;
@override @useResult
$Res call({
 String name, String type, String? description, double latitude, double longitude, String? address
});




}
/// @nodoc
class __$AiPoiCopyWithImpl<$Res>
    implements _$AiPoiCopyWith<$Res> {
  __$AiPoiCopyWithImpl(this._self, this._then);

  final _AiPoi _self;
  final $Res Function(_AiPoi) _then;

/// Create a copy of AiPoi
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? name = null,Object? type = null,Object? description = freezed,Object? latitude = null,Object? longitude = null,Object? address = freezed,}) {
  return _then(_AiPoi(
name: null == name ? _self.name : name // ignore: cast_nullable_to_non_nullable
as String,type: null == type ? _self.type : type // ignore: cast_nullable_to_non_nullable
as String,description: freezed == description ? _self.description : description // ignore: cast_nullable_to_non_nullable
as String?,latitude: null == latitude ? _self.latitude : latitude // ignore: cast_nullable_to_non_nullable
as double,longitude: null == longitude ? _self.longitude : longitude // ignore: cast_nullable_to_non_nullable
as double,address: freezed == address ? _self.address : address // ignore: cast_nullable_to_non_nullable
as String?,
  ));
}


}


/// @nodoc
mixin _$AiDay {

 int get dayNumber; String? get theme; List<AiPoi> get pois;
/// Create a copy of AiDay
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$AiDayCopyWith<AiDay> get copyWith => _$AiDayCopyWithImpl<AiDay>(this as AiDay, _$identity);

  /// Serializes this AiDay to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is AiDay&&(identical(other.dayNumber, dayNumber) || other.dayNumber == dayNumber)&&(identical(other.theme, theme) || other.theme == theme)&&const DeepCollectionEquality().equals(other.pois, pois));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,dayNumber,theme,const DeepCollectionEquality().hash(pois));

@override
String toString() {
  return 'AiDay(dayNumber: $dayNumber, theme: $theme, pois: $pois)';
}


}

/// @nodoc
abstract mixin class $AiDayCopyWith<$Res>  {
  factory $AiDayCopyWith(AiDay value, $Res Function(AiDay) _then) = _$AiDayCopyWithImpl;
@useResult
$Res call({
 int dayNumber, String? theme, List<AiPoi> pois
});




}
/// @nodoc
class _$AiDayCopyWithImpl<$Res>
    implements $AiDayCopyWith<$Res> {
  _$AiDayCopyWithImpl(this._self, this._then);

  final AiDay _self;
  final $Res Function(AiDay) _then;

/// Create a copy of AiDay
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? dayNumber = null,Object? theme = freezed,Object? pois = null,}) {
  return _then(_self.copyWith(
dayNumber: null == dayNumber ? _self.dayNumber : dayNumber // ignore: cast_nullable_to_non_nullable
as int,theme: freezed == theme ? _self.theme : theme // ignore: cast_nullable_to_non_nullable
as String?,pois: null == pois ? _self.pois : pois // ignore: cast_nullable_to_non_nullable
as List<AiPoi>,
  ));
}

}


/// Adds pattern-matching-related methods to [AiDay].
extension AiDayPatterns on AiDay {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _AiDay value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _AiDay() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _AiDay value)  $default,){
final _that = this;
switch (_that) {
case _AiDay():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _AiDay value)?  $default,){
final _that = this;
switch (_that) {
case _AiDay() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( int dayNumber,  String? theme,  List<AiPoi> pois)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _AiDay() when $default != null:
return $default(_that.dayNumber,_that.theme,_that.pois);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( int dayNumber,  String? theme,  List<AiPoi> pois)  $default,) {final _that = this;
switch (_that) {
case _AiDay():
return $default(_that.dayNumber,_that.theme,_that.pois);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( int dayNumber,  String? theme,  List<AiPoi> pois)?  $default,) {final _that = this;
switch (_that) {
case _AiDay() when $default != null:
return $default(_that.dayNumber,_that.theme,_that.pois);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _AiDay implements AiDay {
  const _AiDay({required this.dayNumber, this.theme, final  List<AiPoi> pois = const []}): _pois = pois;
  factory _AiDay.fromJson(Map<String, dynamic> json) => _$AiDayFromJson(json);

@override final  int dayNumber;
@override final  String? theme;
 final  List<AiPoi> _pois;
@override@JsonKey() List<AiPoi> get pois {
  if (_pois is EqualUnmodifiableListView) return _pois;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_pois);
}


/// Create a copy of AiDay
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$AiDayCopyWith<_AiDay> get copyWith => __$AiDayCopyWithImpl<_AiDay>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$AiDayToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _AiDay&&(identical(other.dayNumber, dayNumber) || other.dayNumber == dayNumber)&&(identical(other.theme, theme) || other.theme == theme)&&const DeepCollectionEquality().equals(other._pois, _pois));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,dayNumber,theme,const DeepCollectionEquality().hash(_pois));

@override
String toString() {
  return 'AiDay(dayNumber: $dayNumber, theme: $theme, pois: $pois)';
}


}

/// @nodoc
abstract mixin class _$AiDayCopyWith<$Res> implements $AiDayCopyWith<$Res> {
  factory _$AiDayCopyWith(_AiDay value, $Res Function(_AiDay) _then) = __$AiDayCopyWithImpl;
@override @useResult
$Res call({
 int dayNumber, String? theme, List<AiPoi> pois
});




}
/// @nodoc
class __$AiDayCopyWithImpl<$Res>
    implements _$AiDayCopyWith<$Res> {
  __$AiDayCopyWithImpl(this._self, this._then);

  final _AiDay _self;
  final $Res Function(_AiDay) _then;

/// Create a copy of AiDay
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? dayNumber = null,Object? theme = freezed,Object? pois = null,}) {
  return _then(_AiDay(
dayNumber: null == dayNumber ? _self.dayNumber : dayNumber // ignore: cast_nullable_to_non_nullable
as int,theme: freezed == theme ? _self.theme : theme // ignore: cast_nullable_to_non_nullable
as String?,pois: null == pois ? _self._pois : pois // ignore: cast_nullable_to_non_nullable
as List<AiPoi>,
  ));
}


}


/// @nodoc
mixin _$BlogPost {

 String get id; String get title; String get content; String? get summary; String? get coverImageUrl; String get authorId; String? get authorName; String? get authorAvatarUrl; List<BlogLocation> get locations; List<String> get tags; DateTime get createdAt; DateTime get updatedAt;
/// Create a copy of BlogPost
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BlogPostCopyWith<BlogPost> get copyWith => _$BlogPostCopyWithImpl<BlogPost>(this as BlogPost, _$identity);

  /// Serializes this BlogPost to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BlogPost&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.authorId, authorId) || other.authorId == authorId)&&(identical(other.authorName, authorName) || other.authorName == authorName)&&(identical(other.authorAvatarUrl, authorAvatarUrl) || other.authorAvatarUrl == authorAvatarUrl)&&const DeepCollectionEquality().equals(other.locations, locations)&&const DeepCollectionEquality().equals(other.tags, tags)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,content,summary,coverImageUrl,authorId,authorName,authorAvatarUrl,const DeepCollectionEquality().hash(locations),const DeepCollectionEquality().hash(tags),createdAt,updatedAt);

@override
String toString() {
  return 'BlogPost(id: $id, title: $title, content: $content, summary: $summary, coverImageUrl: $coverImageUrl, authorId: $authorId, authorName: $authorName, authorAvatarUrl: $authorAvatarUrl, locations: $locations, tags: $tags, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class $BlogPostCopyWith<$Res>  {
  factory $BlogPostCopyWith(BlogPost value, $Res Function(BlogPost) _then) = _$BlogPostCopyWithImpl;
@useResult
$Res call({
 String id, String title, String content, String? summary, String? coverImageUrl, String authorId, String? authorName, String? authorAvatarUrl, List<BlogLocation> locations, List<String> tags, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class _$BlogPostCopyWithImpl<$Res>
    implements $BlogPostCopyWith<$Res> {
  _$BlogPostCopyWithImpl(this._self, this._then);

  final BlogPost _self;
  final $Res Function(BlogPost) _then;

/// Create a copy of BlogPost
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? content = null,Object? summary = freezed,Object? coverImageUrl = freezed,Object? authorId = null,Object? authorName = freezed,Object? authorAvatarUrl = freezed,Object? locations = null,Object? tags = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,content: null == content ? _self.content : content // ignore: cast_nullable_to_non_nullable
as String,summary: freezed == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as String?,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,authorId: null == authorId ? _self.authorId : authorId // ignore: cast_nullable_to_non_nullable
as String,authorName: freezed == authorName ? _self.authorName : authorName // ignore: cast_nullable_to_non_nullable
as String?,authorAvatarUrl: freezed == authorAvatarUrl ? _self.authorAvatarUrl : authorAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,locations: null == locations ? _self.locations : locations // ignore: cast_nullable_to_non_nullable
as List<BlogLocation>,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}

}


/// Adds pattern-matching-related methods to [BlogPost].
extension BlogPostPatterns on BlogPost {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BlogPost value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BlogPost() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BlogPost value)  $default,){
final _that = this;
switch (_that) {
case _BlogPost():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BlogPost value)?  $default,){
final _that = this;
switch (_that) {
case _BlogPost() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BlogPost() when $default != null:
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt)  $default,) {final _that = this;
switch (_that) {
case _BlogPost():
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt)?  $default,) {final _that = this;
switch (_that) {
case _BlogPost() when $default != null:
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BlogPost implements BlogPost {
  const _BlogPost({required this.id, required this.title, required this.content, this.summary, this.coverImageUrl, required this.authorId, this.authorName, this.authorAvatarUrl, final  List<BlogLocation> locations = const [], final  List<String> tags = const [], required this.createdAt, required this.updatedAt}): _locations = locations,_tags = tags;
  factory _BlogPost.fromJson(Map<String, dynamic> json) => _$BlogPostFromJson(json);

@override final  String id;
@override final  String title;
@override final  String content;
@override final  String? summary;
@override final  String? coverImageUrl;
@override final  String authorId;
@override final  String? authorName;
@override final  String? authorAvatarUrl;
 final  List<BlogLocation> _locations;
@override@JsonKey() List<BlogLocation> get locations {
  if (_locations is EqualUnmodifiableListView) return _locations;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_locations);
}

 final  List<String> _tags;
@override@JsonKey() List<String> get tags {
  if (_tags is EqualUnmodifiableListView) return _tags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tags);
}

@override final  DateTime createdAt;
@override final  DateTime updatedAt;

/// Create a copy of BlogPost
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BlogPostCopyWith<_BlogPost> get copyWith => __$BlogPostCopyWithImpl<_BlogPost>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BlogPostToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BlogPost&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.authorId, authorId) || other.authorId == authorId)&&(identical(other.authorName, authorName) || other.authorName == authorName)&&(identical(other.authorAvatarUrl, authorAvatarUrl) || other.authorAvatarUrl == authorAvatarUrl)&&const DeepCollectionEquality().equals(other._locations, _locations)&&const DeepCollectionEquality().equals(other._tags, _tags)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,content,summary,coverImageUrl,authorId,authorName,authorAvatarUrl,const DeepCollectionEquality().hash(_locations),const DeepCollectionEquality().hash(_tags),createdAt,updatedAt);

@override
String toString() {
  return 'BlogPost(id: $id, title: $title, content: $content, summary: $summary, coverImageUrl: $coverImageUrl, authorId: $authorId, authorName: $authorName, authorAvatarUrl: $authorAvatarUrl, locations: $locations, tags: $tags, createdAt: $createdAt, updatedAt: $updatedAt)';
}


}

/// @nodoc
abstract mixin class _$BlogPostCopyWith<$Res> implements $BlogPostCopyWith<$Res> {
  factory _$BlogPostCopyWith(_BlogPost value, $Res Function(_BlogPost) _then) = __$BlogPostCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String content, String? summary, String? coverImageUrl, String authorId, String? authorName, String? authorAvatarUrl, List<BlogLocation> locations, List<String> tags, DateTime createdAt, DateTime updatedAt
});




}
/// @nodoc
class __$BlogPostCopyWithImpl<$Res>
    implements _$BlogPostCopyWith<$Res> {
  __$BlogPostCopyWithImpl(this._self, this._then);

  final _BlogPost _self;
  final $Res Function(_BlogPost) _then;

/// Create a copy of BlogPost
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? content = null,Object? summary = freezed,Object? coverImageUrl = freezed,Object? authorId = null,Object? authorName = freezed,Object? authorAvatarUrl = freezed,Object? locations = null,Object? tags = null,Object? createdAt = null,Object? updatedAt = null,}) {
  return _then(_BlogPost(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,content: null == content ? _self.content : content // ignore: cast_nullable_to_non_nullable
as String,summary: freezed == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as String?,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,authorId: null == authorId ? _self.authorId : authorId // ignore: cast_nullable_to_non_nullable
as String,authorName: freezed == authorName ? _self.authorName : authorName // ignore: cast_nullable_to_non_nullable
as String?,authorAvatarUrl: freezed == authorAvatarUrl ? _self.authorAvatarUrl : authorAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,locations: null == locations ? _self._locations : locations // ignore: cast_nullable_to_non_nullable
as List<BlogLocation>,tags: null == tags ? _self._tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,
  ));
}


}


/// @nodoc
mixin _$BlogPostWithStats {

 String get id; String get title; String get content; String? get summary; String? get coverImageUrl; String get authorId; String? get authorName; String? get authorAvatarUrl; List<BlogLocation> get locations; List<String> get tags; DateTime get createdAt; DateTime get updatedAt; int get likeCount; int get viewCount; int get commentCount; bool get isLiked;// AI-enhanced fields
 DateTime? get aiProcessedAt; String? get aiSummary; List<String> get aiTips; String? get aiBestTime; String? get aiDuration; String? get aiBudget; List<AiDay> get aiDays;
/// Create a copy of BlogPostWithStats
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BlogPostWithStatsCopyWith<BlogPostWithStats> get copyWith => _$BlogPostWithStatsCopyWithImpl<BlogPostWithStats>(this as BlogPostWithStats, _$identity);

  /// Serializes this BlogPostWithStats to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BlogPostWithStats&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.authorId, authorId) || other.authorId == authorId)&&(identical(other.authorName, authorName) || other.authorName == authorName)&&(identical(other.authorAvatarUrl, authorAvatarUrl) || other.authorAvatarUrl == authorAvatarUrl)&&const DeepCollectionEquality().equals(other.locations, locations)&&const DeepCollectionEquality().equals(other.tags, tags)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.likeCount, likeCount) || other.likeCount == likeCount)&&(identical(other.viewCount, viewCount) || other.viewCount == viewCount)&&(identical(other.commentCount, commentCount) || other.commentCount == commentCount)&&(identical(other.isLiked, isLiked) || other.isLiked == isLiked)&&(identical(other.aiProcessedAt, aiProcessedAt) || other.aiProcessedAt == aiProcessedAt)&&(identical(other.aiSummary, aiSummary) || other.aiSummary == aiSummary)&&const DeepCollectionEquality().equals(other.aiTips, aiTips)&&(identical(other.aiBestTime, aiBestTime) || other.aiBestTime == aiBestTime)&&(identical(other.aiDuration, aiDuration) || other.aiDuration == aiDuration)&&(identical(other.aiBudget, aiBudget) || other.aiBudget == aiBudget)&&const DeepCollectionEquality().equals(other.aiDays, aiDays));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,title,content,summary,coverImageUrl,authorId,authorName,authorAvatarUrl,const DeepCollectionEquality().hash(locations),const DeepCollectionEquality().hash(tags),createdAt,updatedAt,likeCount,viewCount,commentCount,isLiked,aiProcessedAt,aiSummary,const DeepCollectionEquality().hash(aiTips),aiBestTime,aiDuration,aiBudget,const DeepCollectionEquality().hash(aiDays)]);

@override
String toString() {
  return 'BlogPostWithStats(id: $id, title: $title, content: $content, summary: $summary, coverImageUrl: $coverImageUrl, authorId: $authorId, authorName: $authorName, authorAvatarUrl: $authorAvatarUrl, locations: $locations, tags: $tags, createdAt: $createdAt, updatedAt: $updatedAt, likeCount: $likeCount, viewCount: $viewCount, commentCount: $commentCount, isLiked: $isLiked, aiProcessedAt: $aiProcessedAt, aiSummary: $aiSummary, aiTips: $aiTips, aiBestTime: $aiBestTime, aiDuration: $aiDuration, aiBudget: $aiBudget, aiDays: $aiDays)';
}


}

/// @nodoc
abstract mixin class $BlogPostWithStatsCopyWith<$Res>  {
  factory $BlogPostWithStatsCopyWith(BlogPostWithStats value, $Res Function(BlogPostWithStats) _then) = _$BlogPostWithStatsCopyWithImpl;
@useResult
$Res call({
 String id, String title, String content, String? summary, String? coverImageUrl, String authorId, String? authorName, String? authorAvatarUrl, List<BlogLocation> locations, List<String> tags, DateTime createdAt, DateTime updatedAt, int likeCount, int viewCount, int commentCount, bool isLiked, DateTime? aiProcessedAt, String? aiSummary, List<String> aiTips, String? aiBestTime, String? aiDuration, String? aiBudget, List<AiDay> aiDays
});




}
/// @nodoc
class _$BlogPostWithStatsCopyWithImpl<$Res>
    implements $BlogPostWithStatsCopyWith<$Res> {
  _$BlogPostWithStatsCopyWithImpl(this._self, this._then);

  final BlogPostWithStats _self;
  final $Res Function(BlogPostWithStats) _then;

/// Create a copy of BlogPostWithStats
/// with the given fields replaced by the non-null parameter values.
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? content = null,Object? summary = freezed,Object? coverImageUrl = freezed,Object? authorId = null,Object? authorName = freezed,Object? authorAvatarUrl = freezed,Object? locations = null,Object? tags = null,Object? createdAt = null,Object? updatedAt = null,Object? likeCount = null,Object? viewCount = null,Object? commentCount = null,Object? isLiked = null,Object? aiProcessedAt = freezed,Object? aiSummary = freezed,Object? aiTips = null,Object? aiBestTime = freezed,Object? aiDuration = freezed,Object? aiBudget = freezed,Object? aiDays = null,}) {
  return _then(_self.copyWith(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,content: null == content ? _self.content : content // ignore: cast_nullable_to_non_nullable
as String,summary: freezed == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as String?,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,authorId: null == authorId ? _self.authorId : authorId // ignore: cast_nullable_to_non_nullable
as String,authorName: freezed == authorName ? _self.authorName : authorName // ignore: cast_nullable_to_non_nullable
as String?,authorAvatarUrl: freezed == authorAvatarUrl ? _self.authorAvatarUrl : authorAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,locations: null == locations ? _self.locations : locations // ignore: cast_nullable_to_non_nullable
as List<BlogLocation>,tags: null == tags ? _self.tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,likeCount: null == likeCount ? _self.likeCount : likeCount // ignore: cast_nullable_to_non_nullable
as int,viewCount: null == viewCount ? _self.viewCount : viewCount // ignore: cast_nullable_to_non_nullable
as int,commentCount: null == commentCount ? _self.commentCount : commentCount // ignore: cast_nullable_to_non_nullable
as int,isLiked: null == isLiked ? _self.isLiked : isLiked // ignore: cast_nullable_to_non_nullable
as bool,aiProcessedAt: freezed == aiProcessedAt ? _self.aiProcessedAt : aiProcessedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,aiSummary: freezed == aiSummary ? _self.aiSummary : aiSummary // ignore: cast_nullable_to_non_nullable
as String?,aiTips: null == aiTips ? _self.aiTips : aiTips // ignore: cast_nullable_to_non_nullable
as List<String>,aiBestTime: freezed == aiBestTime ? _self.aiBestTime : aiBestTime // ignore: cast_nullable_to_non_nullable
as String?,aiDuration: freezed == aiDuration ? _self.aiDuration : aiDuration // ignore: cast_nullable_to_non_nullable
as String?,aiBudget: freezed == aiBudget ? _self.aiBudget : aiBudget // ignore: cast_nullable_to_non_nullable
as String?,aiDays: null == aiDays ? _self.aiDays : aiDays // ignore: cast_nullable_to_non_nullable
as List<AiDay>,
  ));
}

}


/// Adds pattern-matching-related methods to [BlogPostWithStats].
extension BlogPostWithStatsPatterns on BlogPostWithStats {
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

@optionalTypeArgs TResult maybeMap<TResult extends Object?>(TResult Function( _BlogPostWithStats value)?  $default,{required TResult orElse(),}){
final _that = this;
switch (_that) {
case _BlogPostWithStats() when $default != null:
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

@optionalTypeArgs TResult map<TResult extends Object?>(TResult Function( _BlogPostWithStats value)  $default,){
final _that = this;
switch (_that) {
case _BlogPostWithStats():
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

@optionalTypeArgs TResult? mapOrNull<TResult extends Object?>(TResult? Function( _BlogPostWithStats value)?  $default,){
final _that = this;
switch (_that) {
case _BlogPostWithStats() when $default != null:
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt,  int likeCount,  int viewCount,  int commentCount,  bool isLiked,  DateTime? aiProcessedAt,  String? aiSummary,  List<String> aiTips,  String? aiBestTime,  String? aiDuration,  String? aiBudget,  List<AiDay> aiDays)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BlogPostWithStats() when $default != null:
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt,_that.likeCount,_that.viewCount,_that.commentCount,_that.isLiked,_that.aiProcessedAt,_that.aiSummary,_that.aiTips,_that.aiBestTime,_that.aiDuration,_that.aiBudget,_that.aiDays);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt,  int likeCount,  int viewCount,  int commentCount,  bool isLiked,  DateTime? aiProcessedAt,  String? aiSummary,  List<String> aiTips,  String? aiBestTime,  String? aiDuration,  String? aiBudget,  List<AiDay> aiDays)  $default,) {final _that = this;
switch (_that) {
case _BlogPostWithStats():
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt,_that.likeCount,_that.viewCount,_that.commentCount,_that.isLiked,_that.aiProcessedAt,_that.aiSummary,_that.aiTips,_that.aiBestTime,_that.aiDuration,_that.aiBudget,_that.aiDays);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt,  int likeCount,  int viewCount,  int commentCount,  bool isLiked,  DateTime? aiProcessedAt,  String? aiSummary,  List<String> aiTips,  String? aiBestTime,  String? aiDuration,  String? aiBudget,  List<AiDay> aiDays)?  $default,) {final _that = this;
switch (_that) {
case _BlogPostWithStats() when $default != null:
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt,_that.likeCount,_that.viewCount,_that.commentCount,_that.isLiked,_that.aiProcessedAt,_that.aiSummary,_that.aiTips,_that.aiBestTime,_that.aiDuration,_that.aiBudget,_that.aiDays);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BlogPostWithStats implements BlogPostWithStats {
  const _BlogPostWithStats({required this.id, required this.title, required this.content, this.summary, this.coverImageUrl, required this.authorId, this.authorName, this.authorAvatarUrl, final  List<BlogLocation> locations = const [], final  List<String> tags = const [], required this.createdAt, required this.updatedAt, this.likeCount = 0, this.viewCount = 0, this.commentCount = 0, this.isLiked = false, this.aiProcessedAt, this.aiSummary, final  List<String> aiTips = const [], this.aiBestTime, this.aiDuration, this.aiBudget, final  List<AiDay> aiDays = const []}): _locations = locations,_tags = tags,_aiTips = aiTips,_aiDays = aiDays;
  factory _BlogPostWithStats.fromJson(Map<String, dynamic> json) => _$BlogPostWithStatsFromJson(json);

@override final  String id;
@override final  String title;
@override final  String content;
@override final  String? summary;
@override final  String? coverImageUrl;
@override final  String authorId;
@override final  String? authorName;
@override final  String? authorAvatarUrl;
 final  List<BlogLocation> _locations;
@override@JsonKey() List<BlogLocation> get locations {
  if (_locations is EqualUnmodifiableListView) return _locations;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_locations);
}

 final  List<String> _tags;
@override@JsonKey() List<String> get tags {
  if (_tags is EqualUnmodifiableListView) return _tags;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_tags);
}

@override final  DateTime createdAt;
@override final  DateTime updatedAt;
@override@JsonKey() final  int likeCount;
@override@JsonKey() final  int viewCount;
@override@JsonKey() final  int commentCount;
@override@JsonKey() final  bool isLiked;
// AI-enhanced fields
@override final  DateTime? aiProcessedAt;
@override final  String? aiSummary;
 final  List<String> _aiTips;
@override@JsonKey() List<String> get aiTips {
  if (_aiTips is EqualUnmodifiableListView) return _aiTips;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_aiTips);
}

@override final  String? aiBestTime;
@override final  String? aiDuration;
@override final  String? aiBudget;
 final  List<AiDay> _aiDays;
@override@JsonKey() List<AiDay> get aiDays {
  if (_aiDays is EqualUnmodifiableListView) return _aiDays;
  // ignore: implicit_dynamic_type
  return EqualUnmodifiableListView(_aiDays);
}


/// Create a copy of BlogPostWithStats
/// with the given fields replaced by the non-null parameter values.
@override @JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
_$BlogPostWithStatsCopyWith<_BlogPostWithStats> get copyWith => __$BlogPostWithStatsCopyWithImpl<_BlogPostWithStats>(this, _$identity);

@override
Map<String, dynamic> toJson() {
  return _$BlogPostWithStatsToJson(this, );
}

@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BlogPostWithStats&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.authorId, authorId) || other.authorId == authorId)&&(identical(other.authorName, authorName) || other.authorName == authorName)&&(identical(other.authorAvatarUrl, authorAvatarUrl) || other.authorAvatarUrl == authorAvatarUrl)&&const DeepCollectionEquality().equals(other._locations, _locations)&&const DeepCollectionEquality().equals(other._tags, _tags)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.likeCount, likeCount) || other.likeCount == likeCount)&&(identical(other.viewCount, viewCount) || other.viewCount == viewCount)&&(identical(other.commentCount, commentCount) || other.commentCount == commentCount)&&(identical(other.isLiked, isLiked) || other.isLiked == isLiked)&&(identical(other.aiProcessedAt, aiProcessedAt) || other.aiProcessedAt == aiProcessedAt)&&(identical(other.aiSummary, aiSummary) || other.aiSummary == aiSummary)&&const DeepCollectionEquality().equals(other._aiTips, _aiTips)&&(identical(other.aiBestTime, aiBestTime) || other.aiBestTime == aiBestTime)&&(identical(other.aiDuration, aiDuration) || other.aiDuration == aiDuration)&&(identical(other.aiBudget, aiBudget) || other.aiBudget == aiBudget)&&const DeepCollectionEquality().equals(other._aiDays, _aiDays));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hashAll([runtimeType,id,title,content,summary,coverImageUrl,authorId,authorName,authorAvatarUrl,const DeepCollectionEquality().hash(_locations),const DeepCollectionEquality().hash(_tags),createdAt,updatedAt,likeCount,viewCount,commentCount,isLiked,aiProcessedAt,aiSummary,const DeepCollectionEquality().hash(_aiTips),aiBestTime,aiDuration,aiBudget,const DeepCollectionEquality().hash(_aiDays)]);

@override
String toString() {
  return 'BlogPostWithStats(id: $id, title: $title, content: $content, summary: $summary, coverImageUrl: $coverImageUrl, authorId: $authorId, authorName: $authorName, authorAvatarUrl: $authorAvatarUrl, locations: $locations, tags: $tags, createdAt: $createdAt, updatedAt: $updatedAt, likeCount: $likeCount, viewCount: $viewCount, commentCount: $commentCount, isLiked: $isLiked, aiProcessedAt: $aiProcessedAt, aiSummary: $aiSummary, aiTips: $aiTips, aiBestTime: $aiBestTime, aiDuration: $aiDuration, aiBudget: $aiBudget, aiDays: $aiDays)';
}


}

/// @nodoc
abstract mixin class _$BlogPostWithStatsCopyWith<$Res> implements $BlogPostWithStatsCopyWith<$Res> {
  factory _$BlogPostWithStatsCopyWith(_BlogPostWithStats value, $Res Function(_BlogPostWithStats) _then) = __$BlogPostWithStatsCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String content, String? summary, String? coverImageUrl, String authorId, String? authorName, String? authorAvatarUrl, List<BlogLocation> locations, List<String> tags, DateTime createdAt, DateTime updatedAt, int likeCount, int viewCount, int commentCount, bool isLiked, DateTime? aiProcessedAt, String? aiSummary, List<String> aiTips, String? aiBestTime, String? aiDuration, String? aiBudget, List<AiDay> aiDays
});




}
/// @nodoc
class __$BlogPostWithStatsCopyWithImpl<$Res>
    implements _$BlogPostWithStatsCopyWith<$Res> {
  __$BlogPostWithStatsCopyWithImpl(this._self, this._then);

  final _BlogPostWithStats _self;
  final $Res Function(_BlogPostWithStats) _then;

/// Create a copy of BlogPostWithStats
/// with the given fields replaced by the non-null parameter values.
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? content = null,Object? summary = freezed,Object? coverImageUrl = freezed,Object? authorId = null,Object? authorName = freezed,Object? authorAvatarUrl = freezed,Object? locations = null,Object? tags = null,Object? createdAt = null,Object? updatedAt = null,Object? likeCount = null,Object? viewCount = null,Object? commentCount = null,Object? isLiked = null,Object? aiProcessedAt = freezed,Object? aiSummary = freezed,Object? aiTips = null,Object? aiBestTime = freezed,Object? aiDuration = freezed,Object? aiBudget = freezed,Object? aiDays = null,}) {
  return _then(_BlogPostWithStats(
id: null == id ? _self.id : id // ignore: cast_nullable_to_non_nullable
as String,title: null == title ? _self.title : title // ignore: cast_nullable_to_non_nullable
as String,content: null == content ? _self.content : content // ignore: cast_nullable_to_non_nullable
as String,summary: freezed == summary ? _self.summary : summary // ignore: cast_nullable_to_non_nullable
as String?,coverImageUrl: freezed == coverImageUrl ? _self.coverImageUrl : coverImageUrl // ignore: cast_nullable_to_non_nullable
as String?,authorId: null == authorId ? _self.authorId : authorId // ignore: cast_nullable_to_non_nullable
as String,authorName: freezed == authorName ? _self.authorName : authorName // ignore: cast_nullable_to_non_nullable
as String?,authorAvatarUrl: freezed == authorAvatarUrl ? _self.authorAvatarUrl : authorAvatarUrl // ignore: cast_nullable_to_non_nullable
as String?,locations: null == locations ? _self._locations : locations // ignore: cast_nullable_to_non_nullable
as List<BlogLocation>,tags: null == tags ? _self._tags : tags // ignore: cast_nullable_to_non_nullable
as List<String>,createdAt: null == createdAt ? _self.createdAt : createdAt // ignore: cast_nullable_to_non_nullable
as DateTime,updatedAt: null == updatedAt ? _self.updatedAt : updatedAt // ignore: cast_nullable_to_non_nullable
as DateTime,likeCount: null == likeCount ? _self.likeCount : likeCount // ignore: cast_nullable_to_non_nullable
as int,viewCount: null == viewCount ? _self.viewCount : viewCount // ignore: cast_nullable_to_non_nullable
as int,commentCount: null == commentCount ? _self.commentCount : commentCount // ignore: cast_nullable_to_non_nullable
as int,isLiked: null == isLiked ? _self.isLiked : isLiked // ignore: cast_nullable_to_non_nullable
as bool,aiProcessedAt: freezed == aiProcessedAt ? _self.aiProcessedAt : aiProcessedAt // ignore: cast_nullable_to_non_nullable
as DateTime?,aiSummary: freezed == aiSummary ? _self.aiSummary : aiSummary // ignore: cast_nullable_to_non_nullable
as String?,aiTips: null == aiTips ? _self._aiTips : aiTips // ignore: cast_nullable_to_non_nullable
as List<String>,aiBestTime: freezed == aiBestTime ? _self.aiBestTime : aiBestTime // ignore: cast_nullable_to_non_nullable
as String?,aiDuration: freezed == aiDuration ? _self.aiDuration : aiDuration // ignore: cast_nullable_to_non_nullable
as String?,aiBudget: freezed == aiBudget ? _self.aiBudget : aiBudget // ignore: cast_nullable_to_non_nullable
as String?,aiDays: null == aiDays ? _self._aiDays : aiDays // ignore: cast_nullable_to_non_nullable
as List<AiDay>,
  ));
}


}

// dart format on
