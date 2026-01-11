import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';
import 'package:supabase_flutter/supabase_flutter.dart';

import '../models/blog_post.dart';
import 'api_client.dart';

part 'blog_service.g.dart';

/// Blog service for handling blog post operations via Supabase
class BlogService {
  final SupabaseClient _supabase;

  BlogService(this._supabase);

  /// Get list of blog posts
  Future<List<BlogPostWithStats>> list({
    int page = 1,
    int pageSize = 20,
    String? search,
  }) async {
    final startIndex = (page - 1) * pageSize;
    
    // Build and execute query - no search filtering for now to avoid API issues
    final response = await _supabase
        .from('travel_blog_posts')
        .select('*')
        .order('created_at', ascending: false)
        .range(startIndex, startIndex + pageSize - 1);

    return (response as List).map((json) {
      // Transform JSON to match our model
      return BlogPostWithStats(
        id: json['id'] as String,
        title: json['title'] as String,
        content: json['content'] as String? ?? '',
        summary: _truncateContent(json['content']),
        coverImageUrl: json['cover_image_url'] as String?,
        authorId: json['user_id'] as String,
        authorName: null,
        authorAvatarUrl: null,
        locations: _parseLocations(json['locations']),
        tags: [],
        createdAt: DateTime.parse(json['created_at'] as String),
        updatedAt: DateTime.parse(json['updated_at'] as String),
        likeCount: json['like_count'] as int? ?? 0,
        viewCount: 0,
        commentCount: 0,
        isLiked: false,
      );
    }).toList();
  }

  /// Truncate content for summary
  String? _truncateContent(dynamic content) {
    if (content == null) return null;
    final str = content.toString();
    return str.length > 100 ? str.substring(0, 100) : str;
  }

  /// Parse locations from JSON
  List<BlogLocation> _parseLocations(dynamic locationsJson) {
    if (locationsJson == null) return [];
    if (locationsJson is! List) return [];
    
    return locationsJson.asMap().entries.map((entry) {
      final json = entry.value as Map<String, dynamic>;
      return BlogLocation(
        id: json['id'] as String? ?? 'loc_${entry.key}',
        name: json['name'] as String? ?? '未知地点',
        description: json['description'] as String?,
        latitude: (json['latitude'] as num?)?.toDouble() ?? 0.0,
        longitude: (json['longitude'] as num?)?.toDouble() ?? 0.0,
        order: json['order'] as int? ?? entry.key,
        category: json['category'] as String?,
      );
    }).toList();
  }

  /// Get blog post by ID
  Future<BlogPostWithStats> getById(String id) async {
    final response = await _supabase
        .from('travel_blog_posts')
        .select('*')
        .eq('id', id)
        .single();

    return BlogPostWithStats(
      id: response['id'] as String,
      title: response['title'] as String,
      content: response['content'] as String? ?? '',
      summary: null,
      coverImageUrl: response['cover_image_url'] as String?,
      authorId: response['user_id'] as String,
      authorName: null,
      authorAvatarUrl: null,
      locations: _parseLocations(response['locations']),
      tags: [],
      createdAt: DateTime.parse(response['created_at'] as String),
      updatedAt: DateTime.parse(response['updated_at'] as String),
      likeCount: response['like_count'] as int? ?? 0,
      viewCount: 0,
      commentCount: 0,
      isLiked: false,
    );
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
  return BlogService(ref.watch(supabaseProvider));
}
