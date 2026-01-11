import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:riverpod_annotation/riverpod_annotation.dart';

import '../../../data/models/blog_post.dart';
import '../../../data/services/blog_service.dart';

part 'blog_provider.g.dart';

/// Blog list provider
@riverpod
Future<List<BlogPostWithStats>> blogList(Ref ref) async {
  return ref.watch(blogServiceProvider).list();
}

/// Blog detail provider
@riverpod
Future<BlogPostWithStats> blogDetail(Ref ref, String id) async {
  return ref.watch(blogServiceProvider).getById(id);
}

/// Blog state notifier for managing current blog post
@riverpod
class CurrentBlogNotifier extends _$CurrentBlogNotifier {
  @override
  AsyncValue<BlogPostWithStats?> build() {
    return const AsyncValue.data(null);
  }

  /// Load blog post by ID
  Future<void> loadBlogPost(String id) async {
    state = const AsyncValue.loading();
    try {
      final post = await ref.read(blogServiceProvider).getById(id);
      state = AsyncValue.data(post);
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Toggle like on current blog post
  Future<void> toggleLike() async {
    final currentPost = state.valueOrNull;
    if (currentPost == null) return;

    try {
      final result = await ref.read(blogServiceProvider).toggleLike(currentPost.id);
      state = AsyncValue.data(currentPost.copyWith(
        isLiked: result.isLiked,
        likeCount: result.likeCount,
      ));
    } catch (e, st) {
      state = AsyncValue.error(e, st);
    }
  }

  /// Clear current post
  void clear() {
    state = const AsyncValue.data(null);
  }
}
