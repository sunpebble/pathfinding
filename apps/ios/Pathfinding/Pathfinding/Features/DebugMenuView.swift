import SwiftUI

#if DEBUG
/// Debug menu for testing and development
struct DebugMenuView: View {
  @Environment(\.dismiss) private var dismiss
  @State private var isGenerating = false
  @State private var showSuccess = false

  var body: some View {
    NavigationStack {
      List {
        Section {
          Text("Performance Testing Tools")
            .font(.headline)
        }

        Section("Test Data Generation") {
          Button {
            generateTestData(poiCount: 10)
          } label: {
            Label("Generate Small (10 POIs)", systemImage: "1.circle")
          }

          Button {
            generateTestData(poiCount: 50)
          } label: {
            Label("Generate Medium (50 POIs)", systemImage: "5.circle")
          }

          Button {
            generateTestData(poiCount: 100)
          } label: {
            Label("Generate Large (100 POIs)", systemImage: "star.circle")
          }

          Button {
            generateTestData(poiCount: 200)
          } label: {
            Label("Generate XL (200 POIs)", systemImage: "star.circle.fill")
          }
          .foregroundStyle(.orange)
        }

        Section("Memory Testing") {
          Button {
            logCurrentMemory()
          } label: {
            Label("Log Current Memory", systemImage: "memorychip")
          }

          Button {
            simulateMemoryWarning()
          } label: {
            Label("Simulate Memory Warning", systemImage: "exclamationmark.triangle")
          }
          .foregroundStyle(.orange)
        }

        Section("Cleanup") {
          Button(role: .destructive) {
            clearTestData()
          } label: {
            Label("Clear All Test Itineraries", systemImage: "trash")
          }
        }
      }
      .navigationTitle("Debug Menu")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("Done") {
            dismiss()
          }
        }
      }
      .overlay {
        if isGenerating {
          ProgressView("Generating...")
            .padding()
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
      }
      .alert("Success", isPresented: $showSuccess) {
        Button("OK") { }
      } message: {
        Text("Test itinerary created successfully")
      }
    }
  }

  // MARK: - Actions

  private func generateTestData(poiCount: Int) {
    isGenerating = true

    Task { @MainActor in
      // Generate test data
      ItineraryStore.shared.generateTestItinerary(poiCount: poiCount)

      // Small delay for UI feedback
      try? await Task.sleep(nanoseconds: 500_000_000)

      isGenerating = false
      showSuccess = true

      // Log memory after generation
      let memory = MemoryManager.shared.appMemoryFootprint()
      let memoryStr = memory.map { "\($0)" } ?? "unknown"
      NSLog("[DebugMenu] Generated \(poiCount) POI itinerary. Memory: \(memoryStr)")
    }
  }

  private func clearTestData() {
    ItineraryStore.shared.clearTestItineraries()
    showSuccess = true
  }

  private func logCurrentMemory() {
    if let usage = MemoryManager.shared.currentMemoryUsage() {
      NSLog("[DebugMenu] Current Memory Usage:")
      NSLog("  - Used: \(String(format: "%.1f MB", usage.usedMB))")
      NSLog("  - Total: \(String(format: "%.1f MB", usage.totalMB))")
      NSLog("  - Available: \(String(format: "%.1f MB", usage.availableMB))")
      NSLog("  - Usage: \(String(format: "%.1f%%", usage.usagePercentage))")

      if let footprint = MemoryManager.shared.appMemoryFootprint() {
        NSLog("  - App Footprint: \(MemoryManager.shared.formatBytes(footprint))")
      }
    }
    showSuccess = true
  }

  private func simulateMemoryWarning() {
    NSLog("[DebugMenu] Simulating memory warning...")
    NotificationCenter.default.post(
      name: UIApplication.didReceiveMemoryWarningNotification,
      object: nil
    )
    showSuccess = true
  }
}

// MARK: - Preview

#Preview {
  DebugMenuView()
}
#endif
