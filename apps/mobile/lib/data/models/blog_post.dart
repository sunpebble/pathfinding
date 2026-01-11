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
  }) = _BlogPostWithStats;

  factory BlogPostWithStats.fromJson(Map<String, dynamic> json) =>
      _$BlogPostWithStatsFromJson(json);
}
