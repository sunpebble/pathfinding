import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/blog_post.dart';
import '../../../../data/models/itinerary.dart';
import '../../../../shared/widgets/adaptive/adaptive.dart';
import '../../../auth/providers/auth_provider.dart';
import '../../../../data/services/auth_service.dart';
import '../../../blog/providers/blog_provider.dart';
import '../../providers/itinerary_provider.dart';

/// Imported itinerary page for creating itinerary from blog posts
class ImportedItineraryPage extends ConsumerStatefulWidget {
  final String? blogPostId;

  const ImportedItineraryPage({super.key, this.blogPostId});

  @override
  ConsumerState<ImportedItineraryPage> createState() =>
      _ImportedItineraryPageState();
}

class _ImportedItineraryPageState extends ConsumerState<ImportedItineraryPage> {
  List<BlogLocation> _locations = [];
  final _titleController = TextEditingController();
  bool _isLoading = false;
  bool _isEditMode = false;
  BlogPostWithStats? _blogPost;

  @override
  void initState() {
    super.initState();
    // Use addPostFrameCallback to ensure modification happens after widget tree is built
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.blogPostId != null && mounted) {
        ref
            .read(currentBlogNotifierProvider.notifier)
            .loadBlogPost(widget.blogPostId!);
      }
    });
  }

  Future<void> _loadBlogPost() async {
    if (widget.blogPostId == null) return;
    ref
        .read(currentBlogNotifierProvider.notifier)
        .loadBlogPost(widget.blogPostId!);
  }

  @override
  void dispose() {
    _titleController.dispose();
    super.dispose();
  }

  void _moveItem(int oldIndex, int newIndex) {
    setState(() {
      if (newIndex > oldIndex) newIndex -= 1;
      final item = _locations.removeAt(oldIndex);
      _locations.insert(newIndex, item);
    });
  }

  void _removeItem(int index) {
    setState(() {
      _locations.removeAt(index);
    });
  }

  Future<void> _saveItinerary() async {
    // Check if user is logged in
    final authService = ref.read(authServiceProvider);
    if (!authService.isAuthenticated) {
      final shouldLogin = await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('需要登录'),
          content: const Text('保存行程需要先登录账号'),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('取消'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('去登录'),
            ),
          ],
        ),
      );
      if (shouldLogin == true && mounted) {
        context.push('/login');
      }
      return;
    }

    if (_titleController.text.trim().isEmpty) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('请输入行程名称')));
      return;
    }

    setState(() => _isLoading = true);

    // Create itinerary items from locations
    final items = _locations.asMap().entries.map((entry) {
      final location = entry.value;
      return CreateItineraryItemInput(
        poiName: location.name,
        latitude: location.latitude,
        longitude: location.longitude,
        orderIndex: entry.key,
        category: location.category,
        notes: location.description,
      );
    }).toList();

    // Create a single day with all items
    final input = CreateItineraryInput(
      title: _titleController.text.trim(),
      days: [CreateItineraryDayInput(dayNumber: 1, items: items)],
    );

    final result = await ref
        .read(currentItineraryNotifierProvider.notifier)
        .createItinerary(input);

    setState(() => _isLoading = false);

    if (result != null && mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('行程已保存')));
      context.go('/itinerary/${result.id}');
    } else if (mounted) {
      ScaffoldMessenger.of(
        context,
      ).showSnackBar(const SnackBar(content: Text('保存失败，请重试')));
    }
  }

  @override
  Widget build(BuildContext context) {
    final blogAsync = ref.watch(currentBlogNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('导入攻略'),
        actions: [
          if (_locations.isNotEmpty)
            TextButton(
              onPressed: () => setState(() => _isEditMode = !_isEditMode),
              child: Text(_isEditMode ? '完成' : '编辑'),
            ),
        ],
      ),
      body: blogAsync.when(
        data: (blogPost) {
          if (blogPost == null) {
            return const Center(child: CircularProgressIndicator());
          }

          // Initialize locations if needed
          if (_locations.isEmpty && blogPost.locations.isNotEmpty) {
            _locations = List.from(blogPost.locations);
            _titleController.text = '${blogPost.title} 行程';
            _blogPost = blogPost;
          }

          return Column(
            children: [
              // Title input
              Padding(
                padding: const EdgeInsets.all(16),
                child: TextField(
                  controller: _titleController,
                  decoration: const InputDecoration(
                    labelText: '行程名称',
                    prefixIcon: Icon(Icons.title),
                  ),
                ),
              ),

              // Info card
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16),
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppColors.primary.withAlpha(25),
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Row(
                  children: [
                    Icon(Icons.info_outline, color: AppColors.primary),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        '来自：${blogPost.title}',
                        style: TextStyle(color: AppColors.primary),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Locations list
              Expanded(
                child: _locations.isEmpty
                    ? Center(
                        child: Text(
                          '该攻略没有地点信息',
                          style: Theme.of(context).textTheme.bodyLarge
                              ?.copyWith(color: AppColors.textSecondary),
                        ),
                      )
                    : ReorderableListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: _locations.length,
                        onReorder: _moveItem,
                        buildDefaultDragHandles: false,
                        proxyDecorator: (child, index, animation) {
                          return Material(
                            elevation: 4,
                            borderRadius: BorderRadius.circular(12),
                            child: child,
                          );
                        },
                        itemBuilder: (context, index) {
                          final location = _locations[index];
                          return Container(
                            key: ValueKey(location.id),
                            margin: const EdgeInsets.only(bottom: 8),
                            decoration: BoxDecoration(
                              color: Theme.of(context).cardColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(
                                color: Colors.grey.withAlpha(50),
                              ),
                            ),
                            child: ListTile(
                              contentPadding: const EdgeInsets.only(
                                left: 12,
                                right: 4,
                              ),
                              leading: CircleAvatar(
                                backgroundColor: AppColors.primary,
                                child: Text(
                                  '${index + 1}',
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                              title: Text(
                                location.name,
                                style: const TextStyle(
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              subtitle: location.description != null
                                  ? Text(
                                      location.description!,
                                      maxLines: 1,
                                      overflow: TextOverflow.ellipsis,
                                      style: TextStyle(
                                        color: AppColors.textSecondary,
                                        fontSize: 13,
                                      ),
                                    )
                                  : null,
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  if (_isEditMode)
                                    IconButton(
                                      icon: Icon(
                                        Icons.remove_circle,
                                        color: AppColors.error,
                                      ),
                                      onPressed: () => _removeItem(index),
                                    ),
                                  ReorderableDragStartListener(
                                    index: index,
                                    child: Container(
                                      padding: const EdgeInsets.all(8),
                                      child: Icon(
                                        Icons.drag_handle,
                                        color: AppColors.textHint,
                                      ),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
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
              AdaptiveButton(onPressed: _loadBlogPost, child: const Text('重试')),
            ],
          ),
        ),
      ),
      bottomNavigationBar: _locations.isNotEmpty
          ? SafeArea(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: AdaptiveButton(
                  onPressed: _isLoading ? null : _saveItinerary,
                  child: _isLoading
                      ? const CupertinoActivityIndicator(color: Colors.white)
                      : const Text('保存为我的行程'),
                ),
              ),
            )
          : null,
    );
  }
}
