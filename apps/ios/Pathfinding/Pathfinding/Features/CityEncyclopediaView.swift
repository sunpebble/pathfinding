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
      ProgressView()
        .scaleEffect(1.5)
      Text("加载城市百科...")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 100)
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
      .buttonStyle(.borderedProminent)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, 100)
  }

  // MARK: - No Encyclopedia View

  private var noEncyclopediaView: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "book.closed.fill")
        .font(.largeTitle)
        .foregroundStyle(.secondary)
      Text("暂无百科信息")
        .font(.headline)
      Text("该城市尚未有百科数据")
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.xl)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemGray6))
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
