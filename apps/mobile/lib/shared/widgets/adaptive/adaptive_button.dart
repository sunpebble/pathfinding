import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'platform_utils.dart';

/// Adaptive button that uses CupertinoButton on iOS and FilledButton on Android
class AdaptiveButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final bool isDestructive;
  final EdgeInsetsGeometry? padding;

  const AdaptiveButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.isDestructive = false,
    this.padding,
  });

  /// Create a filled/primary button
  factory AdaptiveButton.filled({
    Key? key,
    required VoidCallback? onPressed,
    required Widget child,
    EdgeInsetsGeometry? padding,
  }) {
    return AdaptiveButton(
      key: key,
      onPressed: onPressed,
      padding: padding,
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoButton.filled(
        onPressed: onPressed,
        padding:
            padding ?? const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
        child: child,
      );
    }

    return FilledButton(
      onPressed: onPressed,
      style: padding != null ? FilledButton.styleFrom(padding: padding) : null,
      child: child,
    );
  }
}

/// Adaptive text button
class AdaptiveTextButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget child;
  final bool isDestructive;

  const AdaptiveTextButton({
    super.key,
    required this.onPressed,
    required this.child,
    this.isDestructive = false,
  });

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoButton(
        onPressed: onPressed,
        child: DefaultTextStyle(
          style: TextStyle(
            color: isDestructive
                ? CupertinoColors.destructiveRed
                : CupertinoColors.activeBlue,
          ),
          child: child,
        ),
      );
    }

    return TextButton(
      onPressed: onPressed,
      style: isDestructive
          ? TextButton.styleFrom(foregroundColor: Colors.red)
          : null,
      child: child,
    );
  }
}

/// Adaptive icon button
class AdaptiveIconButton extends StatelessWidget {
  final VoidCallback? onPressed;
  final Widget icon;
  final String? tooltip;

  const AdaptiveIconButton({
    super.key,
    required this.onPressed,
    required this.icon,
    this.tooltip,
  });

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoButton(
        onPressed: onPressed,
        padding: EdgeInsets.zero,
        minSize: 44,
        child: icon,
      );
    }

    return IconButton(onPressed: onPressed, icon: icon, tooltip: tooltip);
  }
}
