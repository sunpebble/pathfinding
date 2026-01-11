import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:cached_network_image/cached_network_image.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../shared/widgets/adaptive/adaptive.dart';
import '../../../auth/providers/auth_provider.dart';

/// Profile page showing user info and settings
class ProfilePage extends ConsumerWidget {
  const ProfilePage({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final userProfileAsync = ref.watch(userProfileProvider);
    final authState = ref.watch(authNotifierProvider);

    return Scaffold(
      appBar: AppBar(
        title: const Text('我的'),
        actions: [
          IconButton(
            icon: const Icon(Icons.settings),
            onPressed: () {
              // TODO: Navigate to settings
            },
          ),
        ],
      ),
      body: userProfileAsync.when(
        data: (profile) {
          if (profile == null) {
            return _NotLoggedInView(onLogin: () => context.push('/login'));
          }

          return ListView(
            children: [
              // Profile header
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      AppColors.primary,
                      AppColors.primary.withAlpha(200),
                    ],
                  ),
                ),
                child: Column(
                  children: [
                    // Avatar
                    CircleAvatar(
                      radius: 48,
                      backgroundColor: Colors.white,
                      backgroundImage: profile.avatarUrl != null
                          ? CachedNetworkImageProvider(profile.avatarUrl!)
                          : null,
                      child: profile.avatarUrl == null
                          ? Icon(
                              Icons.person,
                              size: 48,
                              color: AppColors.primary,
                            )
                          : null,
                    ),
                    const SizedBox(height: 12),

                    // Name
                    Text(
                      profile.displayName ?? '未设置昵称',
                      style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.bold,
                      ),
                    ),

                    // Email/Phone
                    if (profile.email != null || profile.phone != null)
                      Text(
                        profile.email ?? profile.phone ?? '',
                        style: Theme.of(
                          context,
                        ).textTheme.bodyMedium?.copyWith(color: Colors.white70),
                      ),

                    // Bio
                    if (profile.bio != null) ...[
                      const SizedBox(height: 8),
                      Text(
                        profile.bio!,
                        style: Theme.of(
                          context,
                        ).textTheme.bodySmall?.copyWith(color: Colors.white70),
                        textAlign: TextAlign.center,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ],
                ),
              ),

              const SizedBox(height: 16),

              // Menu items
              _MenuSection(
                title: '我的内容',
                items: [
                  _MenuItem(
                    icon: Icons.map,
                    title: '我的行程',
                    onTap: () => context.go('/itinerary'),
                  ),
                  _MenuItem(
                    icon: Icons.favorite,
                    title: '我的收藏',
                    onTap: () {
                      // TODO: Navigate to favorites
                    },
                  ),
                  _MenuItem(
                    icon: Icons.history,
                    title: '浏览历史',
                    onTap: () {
                      // TODO: Navigate to history
                    },
                  ),
                ],
              ),

              _MenuSection(
                title: '设置',
                items: [
                  _MenuItem(
                    icon: Icons.person_outline,
                    title: '编辑资料',
                    onTap: () {
                      // TODO: Navigate to edit profile
                    },
                  ),
                  _MenuItem(
                    icon: Icons.notifications_outlined,
                    title: '通知设置',
                    onTap: () {
                      // TODO: Navigate to notification settings
                    },
                  ),
                  _MenuItem(
                    icon: Icons.palette_outlined,
                    title: '主题设置',
                    onTap: () {
                      // TODO: Navigate to theme settings
                    },
                  ),
                  _MenuItem(
                    icon: Icons.cloud_sync_outlined,
                    title: '数据同步',
                    onTap: () {
                      // TODO: Navigate to sync settings
                    },
                  ),
                ],
              ),

              _MenuSection(
                title: '其他',
                items: [
                  _MenuItem(
                    icon: Icons.help_outline,
                    title: '帮助与反馈',
                    onTap: () {
                      // TODO: Navigate to help
                    },
                  ),
                  _MenuItem(
                    icon: Icons.info_outline,
                    title: '关于我们',
                    onTap: () {
                      // TODO: Navigate to about
                    },
                  ),
                ],
              ),

              // Logout button
              Padding(
                padding: const EdgeInsets.all(16),
                child: OutlinedButton.icon(
                  onPressed: () async {
                    final confirmed = await showDialog<bool>(
                      context: context,
                      builder: (context) => AlertDialog(
                        title: const Text('退出登录'),
                        content: const Text('确定要退出登录吗？'),
                        actions: [
                          TextButton(
                            onPressed: () => Navigator.pop(context, false),
                            child: const Text('取消'),
                          ),
                          TextButton(
                            onPressed: () => Navigator.pop(context, true),
                            child: Text(
                              '退出',
                              style: TextStyle(color: AppColors.error),
                            ),
                          ),
                        ],
                      ),
                    );
                    if (confirmed == true) {
                      await ref.read(authNotifierProvider.notifier).signOut();
                      if (context.mounted) {
                        context.go('/login');
                      }
                    }
                  },
                  icon: const Icon(Icons.logout),
                  label: const Text('退出登录'),
                  style: OutlinedButton.styleFrom(
                    foregroundColor: AppColors.error,
                    side: BorderSide(color: AppColors.error),
                  ),
                ),
              ),

              const SizedBox(height: 32),
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
                onPressed: () => ref.invalidate(userProfileProvider),
                child: const Text('重试'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Not logged in view
class _NotLoggedInView extends StatelessWidget {
  final VoidCallback onLogin;

  const _NotLoggedInView({required this.onLogin});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.account_circle_outlined,
              size: 80,
              color: AppColors.textHint,
            ),
            const SizedBox(height: 16),
            Text(
              '登录后查看个人资料',
              style: Theme.of(
                context,
              ).textTheme.titleMedium?.copyWith(color: AppColors.textSecondary),
            ),
            const SizedBox(height: 8),
            Text(
              '登录后可同步数据、收藏攻略',
              style: Theme.of(
                context,
              ).textTheme.bodyMedium?.copyWith(color: AppColors.textHint),
            ),
            const SizedBox(height: 24),
            AdaptiveButton(onPressed: onLogin, child: const Text('立即登录')),
          ],
        ),
      ),
    );
  }
}

/// Menu section widget
class _MenuSection extends StatelessWidget {
  final String title;
  final List<_MenuItem> items;

  const _MenuSection({required this.title, required this.items});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Padding(
          padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
          child: Text(
            title,
            style: Theme.of(
              context,
            ).textTheme.titleSmall?.copyWith(color: AppColors.textSecondary),
          ),
        ),
        Card(
          margin: const EdgeInsets.symmetric(horizontal: 16),
          child: Column(
            children: items.map((item) {
              final isLast = items.last == item;
              return Column(
                children: [
                  ListTile(
                    leading: Icon(item.icon, color: AppColors.primary),
                    title: Text(item.title),
                    trailing: const Icon(Icons.chevron_right),
                    onTap: item.onTap,
                  ),
                  if (!isLast) const Divider(height: 1, indent: 56),
                ],
              );
            }).toList(),
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

/// Menu item data
class _MenuItem {
  final IconData icon;
  final String title;
  final VoidCallback onTap;

  const _MenuItem({
    required this.icon,
    required this.title,
    required this.onTap,
  });
}
