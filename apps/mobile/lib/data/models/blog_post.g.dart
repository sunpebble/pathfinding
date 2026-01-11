// GENERATED CODE - DO NOT MODIFY BY HAND

part of 'blog_post.dart';

// **************************************************************************
// JsonSerializableGenerator
// **************************************************************************

_BlogLocation _$BlogLocationFromJson(Map<String, dynamic> json) =>
    _BlogLocation(
      id: json['id'] as String,
      name: json['name'] as String,
      description: json['description'] as String?,
      latitude: (json['latitude'] as num).toDouble(),
      longitude: (json['longitude'] as num).toDouble(),
      order: (json['order'] as num).toInt(),
      category: json['category'] as String?,
    );

Map<String, dynamic> _$BlogLocationToJson(_BlogLocation instance) =>
    <String, dynamic>{
      'id': instance.id,
      'name': instance.name,
      'description': instance.description,
      'latitude': instance.latitude,
      'longitude': instance.longitude,
      'order': instance.order,
      'category': instance.category,
    };

_BlogPost _$BlogPostFromJson(Map<String, dynamic> json) => _BlogPost(
  id: json['id'] as String,
  title: json['title'] as String,
  content: json['content'] as String,
  summary: json['summary'] as String?,
  coverImageUrl: json['coverImageUrl'] as String?,
  authorId: json['authorId'] as String,
  authorName: json['authorName'] as String?,
  authorAvatarUrl: json['authorAvatarUrl'] as String?,
  locations:
      (json['locations'] as List<dynamic>?)
          ?.map((e) => BlogLocation.fromJson(e as Map<String, dynamic>))
          .toList() ??
      const [],
  tags:
      (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
      const [],
  createdAt: DateTime.parse(json['createdAt'] as String),
  updatedAt: DateTime.parse(json['updatedAt'] as String),
);

Map<String, dynamic> _$BlogPostToJson(_BlogPost instance) => <String, dynamic>{
  'id': instance.id,
  'title': instance.title,
  'content': instance.content,
  'summary': instance.summary,
  'coverImageUrl': instance.coverImageUrl,
  'authorId': instance.authorId,
  'authorName': instance.authorName,
  'authorAvatarUrl': instance.authorAvatarUrl,
  'locations': instance.locations,
  'tags': instance.tags,
  'createdAt': instance.createdAt.toIso8601String(),
  'updatedAt': instance.updatedAt.toIso8601String(),
};

_BlogPostWithStats _$BlogPostWithStatsFromJson(Map<String, dynamic> json) =>
    _BlogPostWithStats(
      id: json['id'] as String,
      title: json['title'] as String,
      content: json['content'] as String,
      summary: json['summary'] as String?,
      coverImageUrl: json['coverImageUrl'] as String?,
      authorId: json['authorId'] as String,
      authorName: json['authorName'] as String?,
      authorAvatarUrl: json['authorAvatarUrl'] as String?,
      locations:
          (json['locations'] as List<dynamic>?)
              ?.map((e) => BlogLocation.fromJson(e as Map<String, dynamic>))
              .toList() ??
          const [],
      tags:
          (json['tags'] as List<dynamic>?)?.map((e) => e as String).toList() ??
          const [],
      createdAt: DateTime.parse(json['createdAt'] as String),
      updatedAt: DateTime.parse(json['updatedAt'] as String),
      likeCount: (json['likeCount'] as num?)?.toInt() ?? 0,
      viewCount: (json['viewCount'] as num?)?.toInt() ?? 0,
      commentCount: (json['commentCount'] as num?)?.toInt() ?? 0,
      isLiked: json['isLiked'] as bool? ?? false,
    );

Map<String, dynamic> _$BlogPostWithStatsToJson(_BlogPostWithStats instance) =>
    <String, dynamic>{
      'id': instance.id,
      'title': instance.title,
      'content': instance.content,
      'summary': instance.summary,
      'coverImageUrl': instance.coverImageUrl,
      'authorId': instance.authorId,
      'authorName': instance.authorName,
      'authorAvatarUrl': instance.authorAvatarUrl,
      'locations': instance.locations,
      'tags': instance.tags,
      'createdAt': instance.createdAt.toIso8601String(),
      'updatedAt': instance.updatedAt.toIso8601String(),
      'likeCount': instance.likeCount,
      'viewCount': instance.viewCount,
      'commentCount': instance.commentCount,
      'isLiked': instance.isLiked,
    };
