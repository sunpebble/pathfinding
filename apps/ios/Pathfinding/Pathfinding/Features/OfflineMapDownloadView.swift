import SwiftUI

/// Detailed view for a single region download with progress
struct OfflineMapDownloadView: View {
  let region: OfflineMapRegion
  @State private var manager = OfflineMapManager.shared
  @Environment(\.dismiss) private var dismiss

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.xl) {
          // Map preview header
          MapPreviewHeader(region: region)

          // Download status card
          DownloadStatusCard(region: currentRegion)

          // Region details
          RegionDetailsCard(region: region)

          // Action buttons
          ActionButtonsSection(
            region: currentRegion,
            onDownload: {
              Task {
                await manager.startDownload(regionId: region.id)
              }
            },
            onPause: {
              Task {
                await manager.pauseDownload(regionId: region.id)
              }
            },
            onResume: {
              Task {
                await manager.resumeDownload(regionId: region.id)
              }
            },
            onCancel: {
              Task {
                await manager.cancelDownload(regionId: region.id)
              }
            },
            onDelete: {
              Task {
                await manager.deleteRegion(regionId: region.id)
                dismiss()
              }
            }
          )

          Spacer(minLength: 40)
        }
        .padding()
      }
      .navigationTitle(region.localizedName)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.done".localized) {
            dismiss()
          }
        }
      }
    }
  }

  private var currentRegion: OfflineMapRegion {
    manager.region(for: region.id) ?? region
  }
}

// MARK: - Map Preview Header

struct MapPreviewHeader: View {
  let region: OfflineMapRegion

  var body: some View {
    ZStack {
      // Background gradient representing map
      RoundedRectangle(cornerRadius: 16)
        .fill(
          LinearGradient(
            colors: [.indigo.opacity(0.3), .purple.opacity(0.2)],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
          )
        )
        .frame(height: 180)

      // Grid pattern to simulate map
      GridPattern()
        .stroke(Color.white.opacity(0.3), lineWidth: 0.5)
        .frame(height: 180)
        .clipShape(RoundedRectangle(cornerRadius: 16))

      // City info overlay
      VStack(spacing: 8) {
        Image(systemName: "mappin.circle.fill")
          .font(.system(size: 44))
          .foregroundStyle(.white)
          .shadow(color: .black.opacity(0.3), radius: 4)

        Text(region.localizedName)
          .font(.title2)
          .fontWeight(.bold)
          .foregroundStyle(.white)
          .shadow(color: .black.opacity(0.3), radius: 2)

        if let province = region.province {
          Text(province)
            .font(.subheadline)
            .foregroundStyle(.white.opacity(0.9))
            .shadow(color: .black.opacity(0.3), radius: 2)
        }
      }
    }
  }
}

// MARK: - Grid Pattern

struct GridPattern: Shape {
  func path(in rect: CGRect) -> Path {
    var path = Path()
    let spacing: CGFloat = 20

    // Vertical lines
    for x in stride(from: 0, through: rect.width, by: spacing) {
      path.move(to: CGPoint(x: x, y: 0))
      path.addLine(to: CGPoint(x: x, y: rect.height))
    }

    // Horizontal lines
    for y in stride(from: 0, through: rect.height, by: spacing) {
      path.move(to: CGPoint(x: 0, y: y))
      path.addLine(to: CGPoint(x: rect.width, y: y))
    }

    return path
  }
}

// MARK: - Download Status Card

struct DownloadStatusCard: View {
  let region: OfflineMapRegion

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Status header
      HStack {
        statusIcon
        Text(statusText)
          .font(.headline)
        Spacer()
      }

      // Progress bar (if downloading)
      if region.isDownloading || region.downloadState == .updating {
        VStack(spacing: 8) {
          ProgressView(value: region.downloadProgress)
            .tint(.indigo)

          HStack {
            Text("\(Int(region.downloadProgress * 100))%")
              .font(.caption)
              .foregroundStyle(.secondary)

            Spacer()

            Text("offline_download.tiles_count".localized(region.downloadedTiles, region.totalTiles))
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }

      // Size info
      HStack {
        Label {
          if region.isDownloaded {
            Text("profile.offline_maps_downloaded".localized(region.formattedSize))
          } else {
            Text("offline_download.estimated_size".localized(region.formattedSize))
          }
        } icon: {
          Image(systemName: "internaldrive")
        }
        .font(.subheadline)
        .foregroundStyle(.secondary)

        Spacer()

        if let lastUpdated = region.lastUpdated {
          (Text("offline_download.updated_prefix".localized) + Text(" ") + Text(lastUpdated, style: .relative))
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
      }
    }
    .padding()
    .background(Color(.systemGray6))
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }

  @ViewBuilder
  private var statusIcon: some View {
    switch region.downloadState {
    case .notDownloaded:
      Image(systemName: "arrow.down.circle")
        .foregroundStyle(.secondary)
    case .downloading:
      ProgressView()
        .controlSize(.small)
    case .paused:
      Image(systemName: "pause.circle.fill")
        .foregroundStyle(.orange)
    case .downloaded:
      Image(systemName: "checkmark.circle.fill")
        .foregroundStyle(.green)
    case .failed:
      Image(systemName: "exclamationmark.circle.fill")
        .foregroundStyle(.red)
    case .updating:
      ProgressView()
        .controlSize(.small)
    }
  }

  private var statusText: String {
    switch region.downloadState {
    case .notDownloaded:
      return "offline_download.status_not_downloaded".localized
    case .downloading:
      return "map.downloading".localized
    case .paused:
      return "offline_download.status_paused".localized
    case .downloaded:
      return "offline_download.status_downloaded".localized
    case .failed:
      return "map.download_failed".localized
    case .updating:
      return "offline_download.status_updating".localized
    }
  }
}

// MARK: - Region Details Card

struct RegionDetailsCard: View {
  let region: OfflineMapRegion

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Text("offline_download.details_title".localized)
        .font(.headline)

      VStack(spacing: DesignTokens.Spacing.sm) {
        DetailRow(label: "offline_download.detail_city".localized, value: region.localizedName)
        DetailRow(label: "offline_download.detail_english_name".localized, value: region.name)
        if let province = region.province {
          DetailRow(label: "offline_download.detail_province".localized, value: province)
        }
        DetailRow(label: "offline_download.detail_zoom".localized, value: "\(region.minZoom) - \(region.maxZoom)")
        DetailRow(
          label: "offline_download.detail_coverage".localized,
          value: String(format: "%.2f° x %.2f°",
                        region.boundingBox.maxLat - region.boundingBox.minLat,
                        region.boundingBox.maxLon - region.boundingBox.minLon)
        )
        DetailRow(
          label: "offline_download.detail_center".localized,
          value: String(format: "%.4f, %.4f",
                        region.center.latitude,
                        region.center.longitude)
        )
      }
    }
    .padding()
    .background(Color(.systemGray6))
    .clipShape(RoundedRectangle(cornerRadius: 12))
  }
}

// MARK: - Detail Row

struct DetailRow: View {
  let label: String
  let value: String

  var body: some View {
    HStack {
      Text(label)
        .foregroundStyle(.secondary)
      Spacer()
      Text(value)
        .fontWeight(.medium)
    }
    .font(.subheadline)
  }
}

// MARK: - Action Buttons Section

struct ActionButtonsSection: View {
  let region: OfflineMapRegion
  let onDownload: () -> Void
  let onPause: () -> Void
  let onResume: () -> Void
  let onCancel: () -> Void
  let onDelete: () -> Void

  @State private var showDeleteConfirmation = false

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.sm) {
      switch region.downloadState {
      case .notDownloaded, .failed:
        Button {
          onDownload()
        } label: {
          Label("offline_download.download_button".localized, systemImage: "arrow.down.circle.fill")
            .frame(maxWidth: .infinity)
            .padding()
            .background(DesignTokens.Colors.accent)
            .foregroundStyle(.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }

      case .downloading:
        HStack(spacing: DesignTokens.Spacing.sm) {
          Button {
            onPause()
          } label: {
            Label("offline_download.pause".localized, systemImage: "pause.fill")
              .frame(maxWidth: .infinity)
              .padding()
              .background(Color.orange)
              .foregroundStyle(.white)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }

          Button {
            onCancel()
          } label: {
            Label("common.cancel".localized, systemImage: "xmark")
              .frame(maxWidth: .infinity)
              .padding()
              .background(Color(.systemGray5))
              .foregroundStyle(.primary)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }
        }

      case .paused:
        HStack(spacing: DesignTokens.Spacing.sm) {
          Button {
            onResume()
          } label: {
            Label("offline_download.resume".localized, systemImage: "play.fill")
              .frame(maxWidth: .infinity)
              .padding()
              .background(DesignTokens.Colors.accent)
              .foregroundStyle(.white)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }

          Button {
            onCancel()
          } label: {
            Label("common.cancel".localized, systemImage: "xmark")
              .frame(maxWidth: .infinity)
              .padding()
              .background(Color(.systemGray5))
              .foregroundStyle(.primary)
              .clipShape(RoundedRectangle(cornerRadius: 12))
          }
        }

      case .downloaded:
        Button(role: .destructive) {
          showDeleteConfirmation = true
        } label: {
          Label("offline_download.delete_button".localized, systemImage: "trash")
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color.red.opacity(0.1))
            .foregroundStyle(.red)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }

      case .updating:
        Button {
          onCancel()
        } label: {
          Label("offline_download.cancel_update".localized, systemImage: "xmark")
            .frame(maxWidth: .infinity)
            .padding()
            .background(Color(.systemGray5))
            .foregroundStyle(.primary)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
      }
    }
    .alert("offline_download.delete_button".localized, isPresented: $showDeleteConfirmation) {
      Button("common.cancel".localized, role: .cancel) {}
      Button("common.delete".localized, role: .destructive) {
        onDelete()
      }
    } message: {
      Text("offline_download.delete_confirm".localized(region.localizedName))
    }
  }
}

// MARK: - Preview

#Preview {
  OfflineMapDownloadView(region: OfflineMapRegion.popularCities[0])
}
