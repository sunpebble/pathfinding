import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/adaptive/adaptive.dart';
import '../../providers/itinerary_provider.dart';

/// Itinerary list page showing all user's itineraries
class ItineraryListPage extends ConsumerWidget {
  const ItineraryListPage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final itineraryListAsync = ref.watch(itineraryListProvider);

    return Scaffold(
      appBar: AppBar(title: const Text('我的行程')),
      body: itineraryListAsync.when(
        data: (itineraries) {
          if (itineraries.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.map_outlined, size: 80, color: AppColors.textHint),
                  const SizedBox(height: 16),
                  Text(
                    '还没有行程',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: AppColors.textSecondary,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Text(
                    '浏览攻略获取灵感，或创建自己的行程',
                    style: Theme.of(
                      context,
                    ).textTheme.bodyMedium?.copyWith(color: AppColors.textHint),
                  ),
                  const SizedBox(height: 24),
                  AdaptiveButton(
                    onPressed: () => context.push('/itinerary/create'),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: const [
                        Icon(CupertinoIcons.add, color: Colors.white, size: 18),
                        SizedBox(width: 8),
                        Text('创建行程'),
                      ],
                    ),
                  ),
                ],
              ),
            );
          }

          return RefreshIndicator(
            onRefresh: () => ref.refresh(itineraryListProvider.future),
            child: ListView.builder(
              padding: const EdgeInsets.all(16),
              itemCount: itineraries.length,
              itemBuilder: (context, index) {
                final itinerary = itineraries[index];
                return _ItineraryCard(
                  itinerary: itinerary,
                  onTap: () => context.push('/itinerary/${itinerary.id}'),
                );
              },
            ),
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
                onPressed: () => ref.invalidate(itineraryListProvider),
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push('/itinerary/create'),
        icon: const Icon(Icons.add),
        label: const Text('创建'),
      ),
    );
  }
}

/// Itinerary card widget
class _ItineraryCard extends StatelessWidget {
  final dynamic itinerary;
  final VoidCallback onTap;

  const _ItineraryCard({required this.itinerary, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(
                    child: Text(
                      itinerary.title ?? '未命名行程',
                      style: Theme.of(context).textTheme.titleMedium,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  if (itinerary.visibility == 'public')
                    Icon(Icons.public, size: 18, color: AppColors.textSecondary)
                  else
                    Icon(
                      Icons.lock_outline,
                      size: 18,
                      color: AppColors.textSecondary,
                    ),
                ],
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  Icon(
                    Icons.calendar_today,
                    size: 16,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${itinerary.dayCount ?? 0} 天',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(width: 16),
                  Icon(
                    Icons.location_on_outlined,
                    size: 16,
                    color: AppColors.textSecondary,
                  ),
                  const SizedBox(width: 4),
                  Text(
                    '${itinerary.itemCount ?? 0} 个地点',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
              if (itinerary.cityName != null) ...[
                const SizedBox(height: 8),
                Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 4,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.primary.withAlpha(25),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: Text(
                    itinerary.cityName!,
                    style: Theme.of(
                      context,
                    ).textTheme.bodySmall?.copyWith(color: AppColors.primary),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}
