import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'platform_utils.dart';

/// Adaptive app bar that uses CupertinoNavigationBar on iOS and AppBar on Android
class AdaptiveAppBar extends StatelessWidget implements PreferredSizeWidget {
  final String? title;
  final Widget? titleWidget;
  final Widget? leading;
  final List<Widget>? actions;
  final bool automaticallyImplyLeading;
  final Color? backgroundColor;

  const AdaptiveAppBar({
    super.key,
    this.title,
    this.titleWidget,
    this.leading,
    this.actions,
    this.automaticallyImplyLeading = true,
    this.backgroundColor,
  });

  @override
  Size get preferredSize => const Size.fromHeight(kToolbarHeight);

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoNavigationBar(
        middle: titleWidget ?? (title != null ? Text(title!) : null),
        leading: leading,
        trailing: actions != null && actions!.isNotEmpty
            ? Row(mainAxisSize: MainAxisSize.min, children: actions!)
            : null,
        automaticallyImplyLeading: automaticallyImplyLeading,
        backgroundColor:
            backgroundColor ?? CupertinoTheme.of(context).barBackgroundColor,
      );
    }

    return AppBar(
      title: titleWidget ?? (title != null ? Text(title!) : null),
      leading: leading,
      actions: actions,
      automaticallyImplyLeading: automaticallyImplyLeading,
      backgroundColor: backgroundColor,
    );
  }
}

/// Adaptive sliver app bar for scrollable headers
class AdaptiveSliverAppBar extends StatelessWidget {
  final String? title;
  final Widget? flexibleSpace;
  final double expandedHeight;
  final bool pinned;
  final List<Widget>? actions;
  final Widget? leading;

  const AdaptiveSliverAppBar({
    super.key,
    this.title,
    this.flexibleSpace,
    this.expandedHeight = 200,
    this.pinned = true,
    this.actions,
    this.leading,
  });

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoSliverNavigationBar(
        largeTitle: title != null ? Text(title!) : null,
        trailing: actions != null && actions!.isNotEmpty
            ? Row(mainAxisSize: MainAxisSize.min, children: actions!)
            : null,
        leading: leading,
      );
    }

    return SliverAppBar(
      title: title != null ? Text(title!) : null,
      flexibleSpace: flexibleSpace,
      expandedHeight: expandedHeight,
      pinned: pinned,
      actions: actions,
      leading: leading,
    );
  }
}
