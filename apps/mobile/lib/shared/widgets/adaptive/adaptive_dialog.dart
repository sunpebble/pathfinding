import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'platform_utils.dart';

/// Adaptive dialog utilities
class AdaptiveDialog {
  /// Show an alert dialog
  static Future<T?> showAlert<T>({
    required BuildContext context,
    required String title,
    String? content,
    String? confirmText,
    String? cancelText,
    VoidCallback? onConfirm,
    VoidCallback? onCancel,
    bool isDestructive = false,
  }) {
    if (PlatformUtils.useCupertino) {
      return showCupertinoDialog<T>(
        context: context,
        builder: (context) => CupertinoAlertDialog(
          title: Text(title),
          content: content != null ? Text(content) : null,
          actions: [
            if (cancelText != null)
              CupertinoDialogAction(
                onPressed: () {
                  Navigator.of(context).pop();
                  onCancel?.call();
                },
                child: Text(cancelText),
              ),
            CupertinoDialogAction(
              isDestructiveAction: isDestructive,
              isDefaultAction: true,
              onPressed: () {
                Navigator.of(context).pop(true);
                onConfirm?.call();
              },
              child: Text(confirmText ?? '确定'),
            ),
          ],
        ),
      );
    }

    return showDialog<T>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(title),
        content: content != null ? Text(content) : null,
        actions: [
          if (cancelText != null)
            TextButton(
              onPressed: () {
                Navigator.of(context).pop();
                onCancel?.call();
              },
              child: Text(cancelText),
            ),
          TextButton(
            style: isDestructive
                ? TextButton.styleFrom(foregroundColor: Colors.red)
                : null,
            onPressed: () {
              Navigator.of(context).pop(true);
              onConfirm?.call();
            },
            child: Text(confirmText ?? '确定'),
          ),
        ],
      ),
    );
  }

  /// Show an action sheet / bottom sheet
  static Future<T?> showActionSheet<T>({
    required BuildContext context,
    String? title,
    String? message,
    required List<AdaptiveAction> actions,
    String? cancelText,
  }) {
    if (PlatformUtils.useCupertino) {
      return showCupertinoModalPopup<T>(
        context: context,
        builder: (context) => CupertinoActionSheet(
          title: title != null ? Text(title) : null,
          message: message != null ? Text(message) : null,
          actions: actions.map((action) {
            return CupertinoActionSheetAction(
              isDestructiveAction: action.isDestructive,
              isDefaultAction: action.isDefault,
              onPressed: () {
                Navigator.of(context).pop(action.value);
                action.onPressed?.call();
              },
              child: Text(action.label),
            );
          }).toList(),
          cancelButton: cancelText != null
              ? CupertinoActionSheetAction(
                  onPressed: () => Navigator.of(context).pop(),
                  child: Text(cancelText),
                )
              : null,
        ),
      );
    }

    return showModalBottomSheet<T>(
      context: context,
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (title != null)
              Padding(
                padding: const EdgeInsets.all(16),
                child: Text(
                  title,
                  style: Theme.of(context).textTheme.titleMedium,
                ),
              ),
            ...actions.map((action) {
              return ListTile(
                leading: action.icon != null ? Icon(action.icon) : null,
                title: Text(
                  action.label,
                  style: action.isDestructive
                      ? const TextStyle(color: Colors.red)
                      : null,
                ),
                onTap: () {
                  Navigator.of(context).pop(action.value);
                  action.onPressed?.call();
                },
              );
            }),
            if (cancelText != null)
              ListTile(
                title: Text(cancelText),
                onTap: () => Navigator.of(context).pop(),
              ),
          ],
        ),
      ),
    );
  }
}

/// Action item for action sheets
class AdaptiveAction<T> {
  final String label;
  final IconData? icon;
  final VoidCallback? onPressed;
  final T? value;
  final bool isDestructive;
  final bool isDefault;

  AdaptiveAction({
    required this.label,
    this.icon,
    this.onPressed,
    this.value,
    this.isDestructive = false,
    this.isDefault = false,
  });
}
