import 'dart:io' show Platform;
import 'package:flutter/foundation.dart' show kIsWeb;

/// Platform detection utilities
class PlatformUtils {
  /// Check if running on iOS (native or simulator)
  static bool get isIOS {
    if (kIsWeb) return false;
    return Platform.isIOS;
  }

  /// Check if running on Android
  static bool get isAndroid {
    if (kIsWeb) return false;
    return Platform.isAndroid;
  }

  /// Check if should use Cupertino style
  static bool get useCupertino => isIOS;

  /// Check if should use Material style
  static bool get useMaterial => !isIOS;
}
