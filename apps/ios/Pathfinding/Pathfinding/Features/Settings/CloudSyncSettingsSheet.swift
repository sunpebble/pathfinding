import SwiftUI

// MARK: - iCloud Sync Settings Sheet

struct iCloudSyncSettingsSheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var syncManager = CloudKitSyncManager.shared
  @State private var showConflictResolver = false
  @State private var selectedConflict: SyncConflict?

  var body: some View {
    NavigationStack {
      List {
        // MARK: - Account & Status
        Section {
          iCloudStatusCard(syncManager: syncManager)
        }

        // MARK: - Sync Toggle
        Section {
          Toggle(isOn: Binding(
            get: { syncManager.isSyncEnabled },
            set: { syncManager.isSyncEnabled = $0 }
          )) {
            HStack {
              Image(systemName: "icloud.fill")
                .foregroundStyle(.cyan)
              VStack(alignment: .leading, spacing: 2) {
                Text("icloud.enable_sync".localized)
                Text("icloud.enable_sync_description".localized)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }
          .disabled(!syncManager.isICloudAvailable)

          if syncManager.isSyncEnabled {
            Toggle(isOn: Binding(
              get: { syncManager.isAutoSyncEnabled },
              set: { syncManager.isAutoSyncEnabled = $0 }
            )) {
              HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                  .foregroundStyle(.blue)
                VStack(alignment: .leading, spacing: 2) {
                  Text("icloud.auto_sync".localized)
                  Text("icloud.auto_sync_description".localized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
              }
            }
          }
        } header: {
          Text("icloud.sync_options".localized)
        }

        // MARK: - Manual Sync
        if syncManager.isSyncEnabled {
          Section {
            Button {
              Task {
                await syncManager.startSync()
              }
            } label: {
              HStack {
                Image(systemName: "arrow.triangle.2.circlepath")
                  .foregroundStyle(.blue)
                Text("icloud.sync_now".localized)
                Spacer()
                if syncManager.syncStatus == .syncing {
                  ProgressView()
                    .controlSize(.small)
                }
              }
            }
            .disabled(syncManager.syncStatus == .syncing)
          } header: {
            Text("icloud.actions".localized)
          } footer: {
            if let lastSync = syncManager.lastSyncTime {
              Text(String(format: "icloud.last_sync".localized, lastSync.formatted(date: .abbreviated, time: .shortened)))
            }
          }
        }

        // MARK: - Conflicts
        if !syncManager.pendingConflicts.isEmpty {
          Section {
            ForEach(syncManager.pendingConflicts) { conflict in
              Button {
                selectedConflict = conflict
                showConflictResolver = true
              } label: {
                HStack {
                  Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                  VStack(alignment: .leading, spacing: 2) {
                    Text(conflict.localItinerary.title)
                      .foregroundStyle(.primary)
                    Text(conflict.conflictDescription)
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                  Spacer()
                  Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                }
              }
            }
          } header: {
            HStack {
              Text("icloud.conflicts".localized)
              Spacer()
              Text("\(syncManager.pendingConflicts.count)")
                .font(.caption)
                .foregroundStyle(.white)
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(.orange, in: Capsule())
            }
          } footer: {
            Text("icloud.conflicts_description".localized)
          }
        }

        // MARK: - Info
        Section {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("icloud.about".localized, systemImage: "info.circle")
              .font(.subheadline)
              .fontWeight(.medium)

            Text("icloud.about_description".localized)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          .padding(.vertical, DesignTokens.Spacing.xs)
        }
      }
      .navigationTitle("icloud.title".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.done".localized) { dismiss() }
        }
      }
      .sheet(isPresented: $showConflictResolver) {
        if let conflict = selectedConflict {
          ConflictResolverSheet(conflict: conflict, syncManager: syncManager)
        }
      }
    }
    .presentationDetents([.medium, .large])
    .presentationDragIndicator(.visible)
  }
}

// MARK: - iCloud Status Card

private struct iCloudStatusCard: View {
  let syncManager: CloudKitSyncManager

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.md) {
      ZStack {
        Circle()
          .fill(statusBackgroundColor.opacity(0.15))
          .frame(width: 56, height: 56)

        Image(systemName: statusIcon)
          .font(.title)
          .foregroundStyle(statusBackgroundColor)
          .symbolEffect(.pulse, isActive: syncManager.syncStatus == .syncing)
      }

      VStack(alignment: .leading, spacing: 4) {
        Text(accountStatusText)
          .font(.headline)

        Text(syncManager.syncStatus.displayText)
          .font(.subheadline)
          .foregroundStyle(.secondary)

        if !syncManager.isICloudAvailable {
          Text("icloud.sign_in_required".localized)
            .font(.caption)
            .foregroundStyle(.orange)
        }
      }

      Spacer()
    }
    .padding(.vertical, DesignTokens.Spacing.xs)
  }

  private var statusIcon: String {
    if !syncManager.isICloudAvailable {
      return "icloud.slash"
    }
    return syncManager.syncStatus.icon
  }

  private var statusBackgroundColor: Color {
    if !syncManager.isICloudAvailable {
      return .secondary
    }
    switch syncManager.syncStatus {
    case .idle:
      return .cyan
    case .syncing:
      return .blue
    case .success:
      return .green
    case .error:
      return .red
    }
  }

  private var accountStatusText: String {
    switch syncManager.accountStatus {
    case .available:
      return "icloud.account_available".localized
    case .noAccount:
      return "icloud.no_account".localized
    case .restricted:
      return "icloud.account_restricted".localized
    case .couldNotDetermine:
      return "icloud.account_checking".localized
    case .temporarilyUnavailable:
      return "icloud.account_unavailable".localized
    @unknown default:
      return "icloud.account_unknown".localized
    }
  }
}

// MARK: - Conflict Resolver Sheet

private struct ConflictResolverSheet: View {
  @Environment(\.dismiss) private var dismiss
  let conflict: SyncConflict
  let syncManager: CloudKitSyncManager

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.lg) {
          // Conflict Header
          VStack(spacing: DesignTokens.Spacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
              .font(.system(size: 48))
              .foregroundStyle(.orange)

            Text("icloud.conflict_detected".localized)
              .font(.title2)
              .fontWeight(.bold)

            Text("icloud.conflict_explanation".localized)
              .font(.subheadline)
              .foregroundStyle(.secondary)
              .multilineTextAlignment(.center)
              .padding(.horizontal)
          }
          .padding(.top, DesignTokens.Spacing.lg)

          // Version Comparison
          VStack(spacing: DesignTokens.Spacing.md) {
            VersionCard(
              title: "icloud.local_version".localized,
              itinerary: conflict.localItinerary,
              modifiedAt: conflict.localModifiedAt,
              icon: "iphone",
              color: .blue
            )

            Text("icloud.vs".localized)
              .font(.caption)
              .foregroundStyle(.secondary)
              .padding(.vertical, DesignTokens.Spacing.xs)

            VersionCard(
              title: "icloud.cloud_version".localized,
              itinerary: conflict.remoteItinerary,
              modifiedAt: conflict.remoteModifiedAt,
              icon: "icloud.fill",
              color: .cyan
            )
          }
          .padding(.horizontal)

          // Resolution Options
          VStack(spacing: DesignTokens.Spacing.sm) {
            Text("icloud.choose_resolution".localized)
              .font(.headline)

            ResolutionButton(
              title: "icloud.keep_local".localized,
              subtitle: "icloud.keep_local_description".localized,
              icon: "iphone",
              color: .blue
            ) {
              Task {
                await syncManager.resolveConflict(conflict, resolution: .useLocal)
                dismiss()
              }
            }

            ResolutionButton(
              title: "icloud.keep_cloud".localized,
              subtitle: "icloud.keep_cloud_description".localized,
              icon: "icloud.fill",
              color: .cyan
            ) {
              Task {
                await syncManager.resolveConflict(conflict, resolution: .useRemote)
                dismiss()
              }
            }

            ResolutionButton(
              title: "icloud.keep_both".localized,
              subtitle: "icloud.keep_both_description".localized,
              icon: "doc.on.doc.fill",
              color: .green
            ) {
              Task {
                await syncManager.resolveConflict(conflict, resolution: .keepBoth)
                dismiss()
              }
            }
          }
          .padding(.horizontal)
          .padding(.bottom, DesignTokens.Spacing.lg)
        }
      }
      .navigationTitle("icloud.resolve_conflict".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("common.cancel".localized) { dismiss() }
        }
      }
    }
  }
}

// MARK: - Version Card

private struct VersionCard: View {
  let title: String
  let itinerary: SavedItinerary
  let modifiedAt: Date
  let icon: String
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: icon)
          .foregroundStyle(color)
        Text(title)
          .font(.subheadline)
          .fontWeight(.semibold)
        Spacer()
      }

      VStack(alignment: .leading, spacing: 4) {
        Text(itinerary.title)
          .font(.headline)
          .lineLimit(2)

        HStack {
          Label("\(itinerary.days.count) 天", systemImage: "calendar")
          Spacer()
          Text(modifiedAt.formatted(date: .abbreviated, time: .shortened))
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }
    }
    .padding()
    .background(color.opacity(0.1), in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .stroke(color.opacity(0.3), lineWidth: 1)
    )
  }
}

// MARK: - Resolution Button

private struct ResolutionButton: View {
  let title: String
  let subtitle: String
  let icon: String
  let color: Color
  let action: () -> Void

  var body: some View {
    Button(action: action) {
      HStack(spacing: DesignTokens.Spacing.md) {
        Image(systemName: icon)
          .font(.title2)
          .foregroundStyle(color)
          .frame(width: 32)

        VStack(alignment: .leading, spacing: 2) {
          Text(title)
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(.primary)
          Text(subtitle)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
      .padding()
      .background(.quaternary, in: RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
    .buttonStyle(.plain)
  }
}
