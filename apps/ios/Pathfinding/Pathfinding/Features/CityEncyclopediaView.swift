import MapKit
import SwiftUI

// MARK: - City Encyclopedia View

struct CityEncyclopediaView: View {
  let cityId: String
  let cityName: String

  @State private var cityWithEncyclopedia: CityWithEncyclopedia?
  @State private var isLoading = true
  @State private var errorMessage: String?
  @State private var selectedTab: EncyclopediaTab = .overview

  enum EncyclopediaTab: String, CaseIterable {
    case overview
    case history
    case customs
    case practical

    var displayName: String {
      switch self {
      case .overview: return "概览"
      case .history: return "历史文化"
      case .customs: return "风俗禁忌"
      case .practical: return "实用信息"
      }
    }

    var icon: String {
      switch self {
      case .overview: return "building.2.fill"
      case .history: return "book.fill"
      case .customs: return "person.2.fill"
      case .practical: return "info.circle.fill"
      }
    }
  }

  var body: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.lg) {
        if isLoading {
          loadingView
        } else if let error = errorMessage {
          errorView(error)
        } else if let city = cityWithEncyclopedia {
          // Tab selector
          tabSelector

          if let encyclopedia = city.encyclopedia {
            switch selectedTab {
            case .overview:
              OverviewTab(city: city, encyclopedia: encyclopedia)
            case .history:
              HistoryTab(encyclopedia: encyclopedia)
            case .customs:
              CustomsTab(encyclopedia: encyclopedia)
            case .practical:
              PracticalTab(encyclopedia: encyclopedia)
            }
          } else {
            noEncyclopediaView
          }
        }
      }
      .padding(DesignTokens.Spacing.lg)
    }
    .navigationTitle(cityName)
    .navigationBarTitleDisplayMode(.large)
    .task {
      await loadCityEncyclopedia()
    }
  }

  // MARK: - Tab Selector

  private var tabSelector: some View {
    Picker("", selection: $selectedTab) {
      ForEach(EncyclopediaTab.allCases, id: \.self) { tab in
        Label(tab.displayName, systemImage: tab.icon)
          .tag(tab)
      }
    }
    .pickerStyle(.segmented)
  }

  // MARK: - Loading View

  private var loadingView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      ShimmerView()
        .frame(height: 120)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      ShimmerView()
        .frame(height: 80)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      ShimmerView()
        .frame(height: 100)
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }
    .frame(maxWidth: .infinity)
    .padding(DesignTokens.Spacing.md)
    .cardSurface()
  }

  // MARK: - Error View

  private func errorView(_ error: String) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "exclamationmark.triangle.fill")
        .font(.largeTitle)
        .foregroundStyle(.orange)
      Text("加载失败")
        .font(.headline)
      Text(error)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
      Button("重试") {
        Task { await loadCityEncyclopedia() }
      }
      .buttonStyle(.glassProminent)
    }
    .frame(maxWidth: .infinity)
    .padding(DesignTokens.Spacing.md)
    .cardSurface()
  }

  // MARK: - No Encyclopedia View

  private var noEncyclopediaView: some View {
    EncyclopediaEmptyState(
      icon: "book.closed.fill",
      title: "暂无百科信息",
      subtitle: "该城市尚未有百科数据"
    )
  }

  // MARK: - Helper Functions

  private func loadCityEncyclopedia() async {
    isLoading = true
    errorMessage = nil

    do {
      let result = try await APIClient.shared.fetchCityWithEncyclopedia(cityId: cityId)
      await MainActor.run {
        cityWithEncyclopedia = result
        isLoading = false
      }
    } catch let error as APIError {
      await MainActor.run {
        errorMessage = error.localizedDescription
        isLoading = false
      }
    } catch {
      await MainActor.run {
        errorMessage = "加载失败: \(error.localizedDescription)"
        isLoading = false
      }
    }
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    CityEncyclopediaView(cityId: "tokyo_001", cityName: "东京")
  }
}
