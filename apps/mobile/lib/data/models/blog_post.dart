import 'package:freezed_annotation/freezed_annotation.dart';

part 'blog_post.freezed.dart';
part 'blog_post.g.dart';

/// Blog post location model
@freezed
abstract class BlogLocation with _$BlogLocation {
  const factory BlogLocation({
    required String id,
    required String name,
    String? description,
    required double latitude,
    required double longitude,
    required int order,
    String? category,
  }) = _BlogLocation;

  factory BlogLocation.fromJson(Map<String, dynamic> json) =>
      _$BlogLocationFromJson(json);
}

/// AI-extracted POI with geocoded coordinates
@freezed
abstract class AiPoi with _$AiPoi {
  const factory AiPoi({
    required String name,
    required String type,
    String? description,
    required double latitude,
    required double longitude,
    String? address,
  }) = _AiPoi;

  factory AiPoi.fromJson(Map<String, dynamic> json) => _$AiPoiFromJson(json);
}

/// AI-extracted day itinerary
@freezed
abstract class AiDay with _$AiDay {
  const factory AiDay({
    required int dayNumber,
    String? theme,
    @Default([]) List<AiPoi> pois,
  }) = _AiDay;

  factory AiDay.fromJson(Map<String, dynamic> json) => _$AiDayFromJson(json);
}

/// Blog post model
@freezed
abstract class BlogPost with _$BlogPost {
  const factory BlogPost({
    required String id,
    required String title,
    required String content,
    String? summary,
    String? coverImageUrl,
    required String authorId,
    String? authorName,
    String? authorAvatarUrl,
    @Default([]) List<BlogLocation> locations,
    @Default([]) List<String> tags,
    required DateTime createdAt,
    required DateTime updatedAt,
  }) = _BlogPost;

  factory BlogPost.fromJson(Map<String, dynamic> json) =>
      _$BlogPostFromJson(json);
}

/// Blog post with stats (likes, views, etc.)
@freezed
abstract class BlogPostWithStats with _$BlogPostWithStats {
  const factory BlogPostWithStats({
    required String id,
    required String title,
    required String content,
    String? summary,
    String? coverImageUrl,
    required String authorId,
    String? authorName,
    String? authorAvatarUrl,
    @Default([]) List<BlogLocation> locations,
    @Default([]) List<String> tags,
    required DateTime createdAt,
    required DateTime updatedAt,
    @Default(0) int likeCount,
    @Default(0) int viewCount,
    @Default(0) int commentCount,
    @Default(false) bool isLiked,
    // AI-enhanced fields
    DateTime? aiProcessedAt,
    String? aiSummary,
    @Default([]) List<String> aiTips,
    String? aiBestTime,
    String? aiDuration,
    String? aiBudget,
    @Default([]) List<AiDay> aiDays,
  }) = _BlogPostWithStats;

  factory BlogPostWithStats.fromJson(Map<String, dynamic> json) =>
      _$BlogPostWithStatsFromJson(json);
}
