import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../data/models/itinerary.dart';
import '../../../../shared/widgets/adaptive/adaptive.dart';
import '../../providers/itinerary_provider.dart';

/// Itinerary detail page showing full itinerary with map
class ItineraryDetailPage extends ConsumerStatefulWidget {
  final String itineraryId;

  const ItineraryDetailPage({super.key, required this.itineraryId});

  @override
  ConsumerState<ItineraryDetailPage> createState() =>
      _ItineraryDetailPageState();
}

class _ItineraryDetailPageState extends ConsumerState<ItineraryDetailPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabController;
  int _selectedDayIndex = 0;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 0, vsync: this);
    // Load itinerary
    Future.microtask(() {
      ref
          .read(currentItineraryNotifierProvider.notifier)
          .loadItinerary(widget.itineraryId);
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final itineraryAsync = ref.watch(currentItineraryNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title:
            itineraryAsync.whenOrNull(
              data: (itinerary) => Text(itinerary?.title ?? '行程详情'),
            ) ??
            const Text('行程详情'),
        actions: [
          IconButton(
            icon: const Icon(Icons.edit),
            onPressed: () {
              // TODO: Navigate to edit page
            },
          ),
          PopupMenuButton<String>(
            onSelected: (value) async {
              if (value == 'delete') {
                final confirmed = await showDialog<bool>(
                  context: context,
                  builder: (context) => AlertDialog(
                    title: const Text('删除行程'),
                    content: const Text('确定要删除这个行程吗？此操作不可撤销。'),
                    actions: [
                      TextButton(
                        onPressed: () => Navigator.pop(context, false),
                        child: const Text('取消'),
                      ),
                      TextButton(
                        onPressed: () => Navigator.pop(context, true),
                        child: Text(
                          '删除',
                          style: TextStyle(color: AppColors.error),
                        ),
                      ),
                    ],
                  ),
                );
                if (confirmed == true && mounted) {
                  final success = await ref
                      .read(currentItineraryNotifierProvider.notifier)
                      .deleteItinerary(widget.itineraryId);
                  if (success && mounted) {
                    context.pop();
                  }
                }
              }
            },
            itemBuilder: (context) => [
              PopupMenuItem(
                value: 'share',
                child: Row(
                  children: [
                    const Icon(Icons.share),
                    const SizedBox(width: 8),
                    const Text('分享'),
                  ],
                ),
              ),
              PopupMenuItem(
                value: 'delete',
                child: Row(
                  children: [
                    Icon(Icons.delete, color: AppColors.error),
                    const SizedBox(width: 8),
                    Text('删除', style: TextStyle(color: AppColors.error)),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      body: itineraryAsync.when(
        data: (itinerary) {
          if (itinerary == null) {
            return const Center(child: CircularProgressIndicator());
          }

          if (itinerary.days.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.event_note, size: 64, color: AppColors.textHint),
                  const SizedBox(height: 16),
                  Text(
                    '暂无行程安排',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 24),
                  AdaptiveButton(
                    onPressed: () {
                      // TODO: Navigate to edit page
                    },
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(CupertinoIcons.add, color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Text('添加日程'),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }

          // Update tab controller if days changed
          if (_tabController.length != itinerary.days.length) {
            _tabController = TabController(
              length: itinerary.days.length,
              vsync: this,
              initialIndex: _selectedDayIndex.clamp(
                0,
                itinerary.days.length - 1,
              ),
            );
            _tabController.addListener(() {
              setState(() => _selectedDayIndex = _tabController.index);
            });
          }

          return Column(
            children: [
              // Day tabs
              Container(
                color: Theme.of(context).scaffoldBackgroundColor,
                child: TabBar(
                  controller: _tabController,
                  isScrollable: itinerary.days.length > 4,
                  tabs: itinerary.days.map((day) {
                    return Tab(text: '第 ${day.dayNumber} 天');
                  }).toList(),
                ),
              ),

              // Content
              Expanded(
                child: TabBarView(
                  controller: _tabController,
                  children: itinerary.days.map((day) {
                    return _DayContent(day: day);
                  }).toList(),
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
                      .read(currentItineraryNotifierProvider.notifier)
                      .loadItinerary(widget.itineraryId);
                },
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Day content widget
class _DayContent extends StatelessWidget {
  final ItineraryDay day;

  const _DayContent({required this.day});

  @override
  Widget build(BuildContext context) {
    if (day.items.isEmpty) {
      return Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(Icons.event_busy, size: 48, color: AppColors.textHint),
            const SizedBox(height: 12),
            Text(
              '这天还没有安排',
              style: Theme.of(
                context,
              ).textTheme.bodyLarge?.copyWith(color: AppColors.textSecondary),
            ),
          ],
        ),
      );
    }

    return ListView.builder(
      padding: const EdgeInsets.all(16),
      itemCount: day.items.length,
      itemBuilder: (context, index) {
        final item = day.items[index];
        return Card(
          margin: const EdgeInsets.only(bottom: 12),
          child: ListTile(
            leading: CircleAvatar(
              backgroundColor: AppColors.primary,
              child: Text(
                '${index + 1}',
                style: const TextStyle(color: Colors.white),
              ),
            ),
            title: Text(item.poiName ?? '未命名地点'),
            subtitle: item.notes != null ? Text(item.notes!) : null,
            trailing: item.startTime != null
                ? Text(
                    item.startTime!,
                    style: Theme.of(context).textTheme.bodySmall,
                  )
                : null,
          ),
        );
      },
    );
  }
}
