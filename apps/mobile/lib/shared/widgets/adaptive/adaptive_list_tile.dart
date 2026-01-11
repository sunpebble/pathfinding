import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'platform_utils.dart';

/// Adaptive list tile that uses Cupertino style on iOS and ListTile on Android
class AdaptiveListTile extends StatelessWidget {
  final Widget? leading;
  final Widget? title;
  final Widget? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final EdgeInsetsGeometry? contentPadding;
  final bool selected;

  const AdaptiveListTile({
    super.key,
    this.leading,
    this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.contentPadding,
    this.selected = false,
  });

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoListTile(
        leading: leading,
        title: title ?? const SizedBox.shrink(),
        subtitle: subtitle,
        trailing: trailing ?? const CupertinoListTileChevron(),
        onTap: onTap,
        padding: contentPadding,
        backgroundColor: selected
            ? CupertinoColors.activeBlue.withOpacity(0.1)
            : null,
      );
    }

    return ListTile(
      leading: leading,
      title: title,
      subtitle: subtitle,
      trailing: trailing,
      onTap: onTap,
      contentPadding: contentPadding,
      selected: selected,
    );
  }
}

/// Adaptive list section for grouping list tiles
class AdaptiveListSection extends StatelessWidget {
  final String? header;
  final List<Widget> children;
  final EdgeInsetsGeometry? margin;

  const AdaptiveListSection({
    super.key,
    this.header,
    required this.children,
    this.margin,
  });

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoListSection.insetGrouped(
        header: header != null ? Text(header!) : null,
        margin: margin,
        children: children,
      );
    }

    // Material style
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (header != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
            child: Text(
              header!,
              style: Theme.of(context).textTheme.titleSmall?.copyWith(
                color: Theme.of(context).colorScheme.primary,
              ),
            ),
          ),
        Card(
          margin: margin ?? const EdgeInsets.symmetric(horizontal: 16),
          child: Column(children: children),
        ),
      ],
    );
  }
}
