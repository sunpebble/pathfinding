import Foundation

/// Memory management utility for monitoring app memory usage.
/// This type is safe to use across concurrency boundaries because it holds no
/// mutable state — all methods read from the OS kernel or create local values.
final class MemoryManager: Sendable {
  // MARK: - Shared Instance

  static let shared = MemoryManager()

  private init() {}

  // MARK: - Memory Information

  /// Memory usage information in bytes
  struct MemoryUsage {
    let used: UInt64
    let total: UInt64
    let available: UInt64

    var usedMB: Double {
      Double(used) / 1024 / 1024
    }

    var totalMB: Double {
      Double(total) / 1024 / 1024
    }

    var availableMB: Double {
      Double(available) / 1024 / 1024
    }

    var usagePercentage: Double {
      total > 0 ? Double(used) / Double(total) * 100 : 0
    }
  }

  // MARK: - Memory Monitoring

  /// Get current memory usage
  func currentMemoryUsage() -> MemoryUsage? {
    var info = mach_task_basic_info()
    var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4

    let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
      $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
        task_info(
          mach_task_self_,
          task_flavor_t(MACH_TASK_BASIC_INFO),
          $0,
          &count
        )
      }
    }

    guard kerr == KERN_SUCCESS else {
      return nil
    }

    let used = UInt64(info.resident_size)
    let total = ProcessInfo.processInfo.physicalMemory
    let available = total > used ? total - used : 0

    return MemoryUsage(used: used, total: total, available: available)
  }

  /// Get app memory footprint in bytes
  func appMemoryFootprint() -> UInt64? {
    var info = mach_task_basic_info()
    var count = mach_msg_type_number_t(MemoryLayout<mach_task_basic_info>.size) / 4

    let kerr: kern_return_t = withUnsafeMutablePointer(to: &info) {
      $0.withMemoryRebound(to: integer_t.self, capacity: 1) {
        task_info(
          mach_task_self_,
          task_flavor_t(MACH_TASK_BASIC_INFO),
          $0,
          &count
        )
      }
    }

    guard kerr == KERN_SUCCESS else {
      return nil
    }

    return UInt64(info.resident_size)
  }

  // MARK: - Memory Warnings

  /// Check if memory usage is above threshold
  func isMemoryPressureHigh(threshold: Double = 80.0) -> Bool {
    guard let usage = currentMemoryUsage() else {
      return false
    }
    return usage.usagePercentage > threshold
  }

  // MARK: - Formatting

  /// Format bytes to human-readable string
  func formatBytes(_ bytes: UInt64) -> String {
    let formatter = ByteCountFormatter()
    formatter.allowedUnits = [.useBytes, .useKB, .useMB, .useGB]
    formatter.countStyle = .memory
    return formatter.string(fromByteCount: Int64(bytes))
  }
}
