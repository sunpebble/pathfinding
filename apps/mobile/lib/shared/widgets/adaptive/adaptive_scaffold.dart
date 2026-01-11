import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';

import 'platform_utils.dart';

/// Adaptive scaffold that uses CupertinoPageScaffold on iOS and Scaffold on Android
class AdaptiveScaffold extends StatelessWidget {
  final Widget body;
  final PreferredSizeWidget? appBar;
  final Widget? navigationBar;
  final Widget? bottomNavigationBar;
  final Widget? floatingActionButton;
  final Color? backgroundColor;
  final bool resizeToAvoidBottomInset;

  const AdaptiveScaffold({
    super.key,
    required this.body,
    this.appBar,
    this.navigationBar,
    this.bottomNavigationBar,
    this.floatingActionButton,
    this.backgroundColor,
    this.resizeToAvoidBottomInset = true,
  });

  @override
  Widget build(BuildContext context) {
    if (PlatformUtils.useCupertino) {
      return CupertinoPageScaffold(
        navigationBar: navigationBar as CupertinoNavigationBar?,
        backgroundColor:
            backgroundColor ?? CupertinoColors.systemGroupedBackground,
        resizeToAvoidBottomInset: resizeToAvoidBottomInset,
        child: Stack(
          children: [
            body,
            if (floatingActionButton != null)
              Positioned(
                right: 16,
                bottom: 16 + (bottomNavigationBar != null ? 80 : 0),
                child: floatingActionButton!,
              ),
          ],
        ),
      );
    }

    return Scaffold(
      appBar: appBar,
      body: body,
      bottomNavigationBar: bottomNavigationBar,
      floatingActionButton: floatingActionButton,
      backgroundColor: backgroundColor,
      resizeToAvoidBottomInset: resizeToAvoidBottomInset,
    );
  }
}
