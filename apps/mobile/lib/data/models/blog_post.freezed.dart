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

 String get id; String get title; String get content; String? get summary; String? get coverImageUrl; String get authorId; String? get authorName; String? get authorAvatarUrl; List<BlogLocation> get locations; List<String> get tags; DateTime get createdAt; DateTime get updatedAt; int get likeCount; int get viewCount; int get commentCount; bool get isLiked;
/// Create a copy of BlogPostWithStats
/// with the given fields replaced by the non-null parameter values.
@JsonKey(includeFromJson: false, includeToJson: false)
@pragma('vm:prefer-inline')
$BlogPostWithStatsCopyWith<BlogPostWithStats> get copyWith => _$BlogPostWithStatsCopyWithImpl<BlogPostWithStats>(this as BlogPostWithStats, _$identity);

  /// Serializes this BlogPostWithStats to a JSON map.
  Map<String, dynamic> toJson();


@override
bool operator ==(Object other) {
  return identical(this, other) || (other.runtimeType == runtimeType&&other is BlogPostWithStats&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.authorId, authorId) || other.authorId == authorId)&&(identical(other.authorName, authorName) || other.authorName == authorName)&&(identical(other.authorAvatarUrl, authorAvatarUrl) || other.authorAvatarUrl == authorAvatarUrl)&&const DeepCollectionEquality().equals(other.locations, locations)&&const DeepCollectionEquality().equals(other.tags, tags)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.likeCount, likeCount) || other.likeCount == likeCount)&&(identical(other.viewCount, viewCount) || other.viewCount == viewCount)&&(identical(other.commentCount, commentCount) || other.commentCount == commentCount)&&(identical(other.isLiked, isLiked) || other.isLiked == isLiked));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,content,summary,coverImageUrl,authorId,authorName,authorAvatarUrl,const DeepCollectionEquality().hash(locations),const DeepCollectionEquality().hash(tags),createdAt,updatedAt,likeCount,viewCount,commentCount,isLiked);

@override
String toString() {
  return 'BlogPostWithStats(id: $id, title: $title, content: $content, summary: $summary, coverImageUrl: $coverImageUrl, authorId: $authorId, authorName: $authorName, authorAvatarUrl: $authorAvatarUrl, locations: $locations, tags: $tags, createdAt: $createdAt, updatedAt: $updatedAt, likeCount: $likeCount, viewCount: $viewCount, commentCount: $commentCount, isLiked: $isLiked)';
}


}

/// @nodoc
abstract mixin class $BlogPostWithStatsCopyWith<$Res>  {
  factory $BlogPostWithStatsCopyWith(BlogPostWithStats value, $Res Function(BlogPostWithStats) _then) = _$BlogPostWithStatsCopyWithImpl;
@useResult
$Res call({
 String id, String title, String content, String? summary, String? coverImageUrl, String authorId, String? authorName, String? authorAvatarUrl, List<BlogLocation> locations, List<String> tags, DateTime createdAt, DateTime updatedAt, int likeCount, int viewCount, int commentCount, bool isLiked
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
@pragma('vm:prefer-inline') @override $Res call({Object? id = null,Object? title = null,Object? content = null,Object? summary = freezed,Object? coverImageUrl = freezed,Object? authorId = null,Object? authorName = freezed,Object? authorAvatarUrl = freezed,Object? locations = null,Object? tags = null,Object? createdAt = null,Object? updatedAt = null,Object? likeCount = null,Object? viewCount = null,Object? commentCount = null,Object? isLiked = null,}) {
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
as bool,
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

@optionalTypeArgs TResult maybeWhen<TResult extends Object?>(TResult Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt,  int likeCount,  int viewCount,  int commentCount,  bool isLiked)?  $default,{required TResult orElse(),}) {final _that = this;
switch (_that) {
case _BlogPostWithStats() when $default != null:
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt,_that.likeCount,_that.viewCount,_that.commentCount,_that.isLiked);case _:
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

@optionalTypeArgs TResult when<TResult extends Object?>(TResult Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt,  int likeCount,  int viewCount,  int commentCount,  bool isLiked)  $default,) {final _that = this;
switch (_that) {
case _BlogPostWithStats():
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt,_that.likeCount,_that.viewCount,_that.commentCount,_that.isLiked);case _:
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

@optionalTypeArgs TResult? whenOrNull<TResult extends Object?>(TResult? Function( String id,  String title,  String content,  String? summary,  String? coverImageUrl,  String authorId,  String? authorName,  String? authorAvatarUrl,  List<BlogLocation> locations,  List<String> tags,  DateTime createdAt,  DateTime updatedAt,  int likeCount,  int viewCount,  int commentCount,  bool isLiked)?  $default,) {final _that = this;
switch (_that) {
case _BlogPostWithStats() when $default != null:
return $default(_that.id,_that.title,_that.content,_that.summary,_that.coverImageUrl,_that.authorId,_that.authorName,_that.authorAvatarUrl,_that.locations,_that.tags,_that.createdAt,_that.updatedAt,_that.likeCount,_that.viewCount,_that.commentCount,_that.isLiked);case _:
  return null;

}
}

}

/// @nodoc
@JsonSerializable()

class _BlogPostWithStats implements BlogPostWithStats {
  const _BlogPostWithStats({required this.id, required this.title, required this.content, this.summary, this.coverImageUrl, required this.authorId, this.authorName, this.authorAvatarUrl, final  List<BlogLocation> locations = const [], final  List<String> tags = const [], required this.createdAt, required this.updatedAt, this.likeCount = 0, this.viewCount = 0, this.commentCount = 0, this.isLiked = false}): _locations = locations,_tags = tags;
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
  return identical(this, other) || (other.runtimeType == runtimeType&&other is _BlogPostWithStats&&(identical(other.id, id) || other.id == id)&&(identical(other.title, title) || other.title == title)&&(identical(other.content, content) || other.content == content)&&(identical(other.summary, summary) || other.summary == summary)&&(identical(other.coverImageUrl, coverImageUrl) || other.coverImageUrl == coverImageUrl)&&(identical(other.authorId, authorId) || other.authorId == authorId)&&(identical(other.authorName, authorName) || other.authorName == authorName)&&(identical(other.authorAvatarUrl, authorAvatarUrl) || other.authorAvatarUrl == authorAvatarUrl)&&const DeepCollectionEquality().equals(other._locations, _locations)&&const DeepCollectionEquality().equals(other._tags, _tags)&&(identical(other.createdAt, createdAt) || other.createdAt == createdAt)&&(identical(other.updatedAt, updatedAt) || other.updatedAt == updatedAt)&&(identical(other.likeCount, likeCount) || other.likeCount == likeCount)&&(identical(other.viewCount, viewCount) || other.viewCount == viewCount)&&(identical(other.commentCount, commentCount) || other.commentCount == commentCount)&&(identical(other.isLiked, isLiked) || other.isLiked == isLiked));
}

@JsonKey(includeFromJson: false, includeToJson: false)
@override
int get hashCode => Object.hash(runtimeType,id,title,content,summary,coverImageUrl,authorId,authorName,authorAvatarUrl,const DeepCollectionEquality().hash(_locations),const DeepCollectionEquality().hash(_tags),createdAt,updatedAt,likeCount,viewCount,commentCount,isLiked);

@override
String toString() {
  return 'BlogPostWithStats(id: $id, title: $title, content: $content, summary: $summary, coverImageUrl: $coverImageUrl, authorId: $authorId, authorName: $authorName, authorAvatarUrl: $authorAvatarUrl, locations: $locations, tags: $tags, createdAt: $createdAt, updatedAt: $updatedAt, likeCount: $likeCount, viewCount: $viewCount, commentCount: $commentCount, isLiked: $isLiked)';
}


}

/// @nodoc
abstract mixin class _$BlogPostWithStatsCopyWith<$Res> implements $BlogPostWithStatsCopyWith<$Res> {
  factory _$BlogPostWithStatsCopyWith(_BlogPostWithStats value, $Res Function(_BlogPostWithStats) _then) = __$BlogPostWithStatsCopyWithImpl;
@override @useResult
$Res call({
 String id, String title, String content, String? summary, String? coverImageUrl, String authorId, String? authorName, String? authorAvatarUrl, List<BlogLocation> locations, List<String> tags, DateTime createdAt, DateTime updatedAt, int likeCount, int viewCount, int commentCount, bool isLiked
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
@override @pragma('vm:prefer-inline') $Res call({Object? id = null,Object? title = null,Object? content = null,Object? summary = freezed,Object? coverImageUrl = freezed,Object? authorId = null,Object? authorName = freezed,Object? authorAvatarUrl = freezed,Object? locations = null,Object? tags = null,Object? createdAt = null,Object? updatedAt = null,Object? likeCount = null,Object? viewCount = null,Object? commentCount = null,Object? isLiked = null,}) {
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
as bool,
  ));
}


}

// dart format on
