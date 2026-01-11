import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/adaptive/adaptive.dart';
import '../../providers/blog_provider.dart';
import '../widgets/blog_map_view.dart';

/// Blog detail page showing full blog post content
class BlogDetailPage extends ConsumerStatefulWidget {
  final String blogPostId;

  const BlogDetailPage({super.key, required this.blogPostId});

  @override
  ConsumerState<BlogDetailPage> createState() => _BlogDetailPageState();
}

class _BlogDetailPageState extends ConsumerState<BlogDetailPage> {
  String? _selectedLocationId;

  @override
  void initState() {
    super.initState();
    // Load blog post
    Future.microtask(() {
      ref
          .read(currentBlogNotifierProvider.notifier)
          .loadBlogPost(widget.blogPostId);
    });
  }

  @override
  Widget build(BuildContext context) {
    final blogAsync = ref.watch(currentBlogNotifierProvider);

    return Scaffold(
      body: blogAsync.when(
        data: (post) {
          if (post == null) {
            return const Center(child: CircularProgressIndicator());
          }

          return CustomScrollView(
            slivers: [
              // App bar with cover image
              SliverAppBar(
                expandedHeight: 160,
                pinned: true,
                flexibleSpace: FlexibleSpaceBar(
                  titlePadding: const EdgeInsets.only(
                    left: 16,
                    right: 56,
                    bottom: 12,
                  ),
                  title: Text(
                    post.title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 15,
                      fontWeight: FontWeight.bold,
                      shadows: [
                        Shadow(blurRadius: 8, color: Colors.black87),
                        Shadow(blurRadius: 16, color: Colors.black54),
                      ],
                    ),
                  ),
                  background: post.coverImageUrl != null
                      ? CachedNetworkImage(
                          imageUrl: post.coverImageUrl!,
                          fit: BoxFit.cover,
                          colorBlendMode: BlendMode.darken,
                          color: Colors.black38,
                        )
                      : Container(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                AppColors.primary,
                                AppColors.primary.withAlpha(180),
                              ],
                            ),
                          ),
                        ),
                ),
                actions: [
                  IconButton(
                    icon: Icon(
                      post.isLiked ? Icons.favorite : Icons.favorite_border,
                      color: post.isLiked ? Colors.red : Colors.white,
                    ),
                    onPressed: () {
                      ref
                          .read(currentBlogNotifierProvider.notifier)
                          .toggleLike();
                    },
                  ),
                ],
              ),

              // Content
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.all(16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      // Author info
                      Row(
                        children: [
                          CircleAvatar(
                            radius: 20,
                            backgroundImage: post.authorAvatarUrl != null
                                ? CachedNetworkImageProvider(
                                    post.authorAvatarUrl!,
                                  )
                                : null,
                            child: post.authorAvatarUrl == null
                                ? const Icon(Icons.person)
                                : null,
                          ),
                          const SizedBox(width: 12),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                post.authorName ?? '匿名用户',
                                style: Theme.of(context).textTheme.titleMedium,
                              ),
                              Text(
                                _formatDate(post.createdAt),
                                style: Theme.of(context).textTheme.bodySmall,
                              ),
                            ],
                          ),
                          const Spacer(),
                          // Stats
                          Column(
                            children: [
                              Row(
                                children: [
                                  Icon(
                                    Icons.favorite,
                                    size: 16,
                                    color: AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 4),
                                  Text('${post.likeCount}'),
                                ],
                              ),
                              Row(
                                children: [
                                  Icon(
                                    Icons.remove_red_eye,
                                    size: 16,
                                    color: AppColors.textSecondary,
                                  ),
                                  const SizedBox(width: 4),
                                  Text('${post.viewCount}'),
                                ],
                              ),
                            ],
                          ),
                        ],
                      ),

                      const SizedBox(height: 24),

                      // Map showing locations
                      if (post.locations.isNotEmpty) ...[
                        Text(
                          '行程地点',
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        const SizedBox(height: 12),
                        BlogMapView(
                          locations: post.locations,
                          height: 300,
                          selectedLocationId: _selectedLocationId,
                          onLocationSelected: (locationId) {
                            setState(() {
                              _selectedLocationId = locationId;
                            });
                          },
                        ),
                        const SizedBox(height: 24),
                      ],

                      // Content
                      Text(
                        '正文',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 12),
                      Text(
                        post.content,
                        style: Theme.of(context).textTheme.bodyLarge,
                      ),

                      const SizedBox(height: 24),

                      // Tags
                      if (post.tags.isNotEmpty)
                        Wrap(
                          spacing: 8,
                          runSpacing: 8,
                          children: post.tags.map((tag) {
                            return Chip(
                              label: Text(tag),
                              backgroundColor: AppColors.primary.withOpacity(
                                0.1,
                              ),
                            );
                          }).toList(),
                        ),

                      const SizedBox(height: 100), // Space for bottom button
                    ],
                  ),
                ),
              ),
            ],
          );
        },
        loading: () => const Center(child: CircularProgressIndicator()),
        error: (error, stack) => Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(Icons.error_outline, size: 64, color: AppColors.error),
              const SizedBox(height: 16),
              Text('加载失败'),
              const SizedBox(height: 16),
              AdaptiveButton(
                onPressed: () {
                  ref
                      .read(currentBlogNotifierProvider.notifier)
                      .loadBlogPost(widget.blogPostId);
                },
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      ),

      // Get itinerary button
      bottomSheet: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Theme.of(context).scaffoldBackgroundColor,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.1),
              blurRadius: 8,
              offset: const Offset(0, -2),
            ),
          ],
        ),
        child: SafeArea(
          child: SizedBox(
            width: double.infinity,
            child: AdaptiveButton(
              onPressed: () {
                context.push(
                  '/itinerary/imported?blogPostId=${widget.blogPostId}',
                );
              },
              child: Row(
                mainAxisAlignment: MainAxisAlignment.center,
                children: const [
                  Icon(CupertinoIcons.arrow_down_doc, color: Colors.white),
                  SizedBox(width: 8),
                  Text('获取攻略'),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.year}-${date.month.toString().padLeft(2, '0')}-${date.day.toString().padLeft(2, '0')}';
  }
}
