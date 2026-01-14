import SwiftUI

// MARK: - Activity Share Sheet

/// A simple UIActivityViewController wrapper for sharing items via the system share sheet.
/// Use this for basic sharing functionality. For advanced sharing with style options,
/// use ShareSheet from Features/Share/ShareSheet.swift instead.
struct ActivityShareSheet: UIViewControllerRepresentable {
  let items: [Any]

  func makeUIViewController(context: Context) -> UIActivityViewController {
    UIActivityViewController(activityItems: items, applicationActivities: nil)
  }

  func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
