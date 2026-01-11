import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'platform_utils.dart';

/// Adaptive bottom navigation bar
class AdaptiveBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  final List<AdaptiveNavItem> items;
  final Color? activeColor;
  final Color? inactiveColor;
  final Color? backgroundColor;

  const AdaptiveBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
    required this.items,
    this.activeColor,
    this.inactiveColor,
    this.backgroundColor,
  });

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoTabBar(
        currentIndex: currentIndex,
        onTap: onTap,
        activeColor: activeColor ?? CupertinoColors.activeBlue,
        inactiveColor: inactiveColor ?? CupertinoColors.inactiveGray,
        backgroundColor: backgroundColor,
        items: items.map((item) {
          return BottomNavigationBarItem(
            icon: Icon(item.icon),
            activeIcon: item.activeIcon != null ? Icon(item.activeIcon) : null,
            label: item.label,
          );
        }).toList(),
      );
    }

    return NavigationBar(
      selectedIndex: currentIndex,
      onDestinationSelected: onTap,
      backgroundColor: backgroundColor,
      destinations: items.map((item) {
        return NavigationDestination(
          icon: Icon(item.icon),
          selectedIcon: item.activeIcon != null ? Icon(item.activeIcon) : null,
          label: item.label,
        );
      }).toList(),
    );
  }
}

/// Navigation item for adaptive bottom nav
class AdaptiveNavItem {
  final IconData icon;
  final IconData? activeIcon;
  final String label;

  const AdaptiveNavItem({
    required this.icon,
    this.activeIcon,
    required this.label,
  });
}
