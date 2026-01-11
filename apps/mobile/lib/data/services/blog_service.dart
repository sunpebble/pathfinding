import 'package:dio/dio.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../models/blog_post.dart';
import 'api_client.dart';

part 'blog_service.g.dart';

/// Blog/Travel Guide service for handling blog post operations via API
class BlogService {
  final Dio _dio;

  // Crawler API base URL for travel guides
  static const String _crawlerUrl = 'http://localhost:3001';

  BlogService(this._dio);

  /// Get list of travel guides
  Future<List<BlogPostWithStats>> list({
    int page = 1,
    int pageSize = 20,
    String? search,
  }) async {
    try {
      final offset = (page - 1) * pageSize;

      final response = await _dio.get(
        '$_crawlerUrl/api/guides',
        queryParameters: {
          'limit': pageSize,
          'offset': offset,
          if (search != null) 'q': search,
        },
      );

      final data = response.data['data'] as List? ?? [];

      return data.map((json) {
        return BlogPostWithStats(
          id: json['id'] as String,
          title: json['title'] as String? ?? '无标题',
          content: json['content'] as String? ?? '',
          summary: _truncateContent(json['content']),
          coverImageUrl: json['cover_image_url'] as String?,
          authorId: json['author_id'] as String? ?? '',
          authorName: json['author_name'] as String?,
          authorAvatarUrl: null,
          locations: _parseDestinations(json['destinations']),
          tags: (json['tags'] as List?)?.cast<String>() ?? [],
          createdAt:
              DateTime.tryParse(json['created_at'] as String? ?? '') ??
              DateTime.now(),
          updatedAt:
              DateTime.tryParse(json['updated_at'] as String? ?? '') ??
              DateTime.now(),
          likeCount: json['likes_count'] as int? ?? 0,
          viewCount: json['views_count'] as int? ?? 0,
          commentCount: json['comments_count'] as int? ?? 0,
          isLiked: false,
        );
      }).toList();
    } catch (e) {
      print('Error fetching guides: $e');
      return [];
    }
  }

  /// Truncate content for summary
  String? _truncateContent(dynamic content) {
    if (content == null) return null;
    final str = content.toString();
    return str.length > 100 ? str.substring(0, 100) : str;
  }

  /// Parse destinations into locations
  List<BlogLocation> _parseDestinations(dynamic destinations) {
    if (destinations == null) return [];
    if (destinations is! List) return [];

    return destinations.asMap().entries.map((entry) {
      final dest = entry.value.toString();
      return BlogLocation(
        id: 'loc_${entry.key}',
        name: dest,
        description: null,
        latitude: 0.0,
        longitude: 0.0,
        order: entry.key,
        category: null,
      );
    }).toList();
  }

  /// Get blog post by ID
  Future<BlogPostWithStats> getById(String id) async {
    try {
      final response = await _dio.get('$_crawlerUrl/api/guides/$id');
      final json = response.data['data'];

      return BlogPostWithStats(
        id: json['id'] as String,
        title: json['title'] as String? ?? '无标题',
        content: json['content'] as String? ?? '',
        summary: null,
        coverImageUrl: json['cover_image_url'] as String?,
        authorId: json['author_id'] as String? ?? '',
        authorName: json['author_name'] as String?,
        authorAvatarUrl: null,
        locations: _parseDestinations(json['destinations']),
        tags: (json['tags'] as List?)?.cast<String>() ?? [],
        createdAt:
            DateTime.tryParse(json['created_at'] as String? ?? '') ??
            DateTime.now(),
        updatedAt:
            DateTime.tryParse(json['updated_at'] as String? ?? '') ??
            DateTime.now(),
        likeCount: json['likes_count'] as int? ?? 0,
        viewCount: json['views_count'] as int? ?? 0,
        commentCount: json['comments_count'] as int? ?? 0,
        isLiked: false,
        // AI-enhanced fields
        aiProcessedAt: json['ai_processed_at'] != null
            ? DateTime.tryParse(json['ai_processed_at'] as String)
            : null,
        aiSummary: json['ai_summary'] as String?,
        aiTips: (json['ai_tips'] as List?)?.cast<String>() ?? [],
        aiBestTime: json['ai_best_time'] as String?,
        aiDuration: json['ai_duration'] as String?,
        aiBudget: json['ai_budget'] as String?,
        aiDays: _parseAiDays(json['ai_days']),
      );
    } catch (e) {
      print('Error fetching guide $id: $e');
      rethrow;
    }
  }

  /// Parse AI days from API response
  List<AiDay> _parseAiDays(dynamic aiDays) {
    if (aiDays == null || aiDays is! List) return [];

    return aiDays.map<AiDay>((day) {
      final pois =
          (day['pois'] as List?)?.map<AiPoi>((poi) {
            return AiPoi(
              name: poi['name'] as String? ?? '',
              type: poi['type'] as String? ?? 'attraction',
              description: poi['description'] as String?,
              latitude: (poi['latitude'] as num?)?.toDouble() ?? 0.0,
              longitude: (poi['longitude'] as num?)?.toDouble() ?? 0.0,
              address: poi['address'] as String?,
            );
          }).toList() ??
          [];

      return AiDay(
        dayNumber: day['dayNumber'] as int? ?? 1,
        theme: day['theme'] as String?,
        pois: pois,
      );
    }).toList();
  }

  /// Toggle like on a blog post
  Future<({bool isLiked, int likeCount})> toggleLike(String id) async {
    // Simulate like toggle
    return (isLiked: true, likeCount: 1);
  }
}

/// Blog service provider
@riverpod
BlogService blogService(Ref ref) {
  return BlogService(ref.watch(dioProvider));
}
