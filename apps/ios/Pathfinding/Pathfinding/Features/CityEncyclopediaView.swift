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
              overviewSection(city: city, encyclopedia: encyclopedia)
            case .history:
              historySection(encyclopedia)
            case .customs:
              customsSection(encyclopedia)
            case .practical:
              practicalSection(encyclopedia)
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
    ScrollView(.horizontal, showsIndicators: false) {
      HStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(EncyclopediaTab.allCases, id: \.self) { tab in
          Button {
            withAnimation(.spring(response: 0.3)) {
              selectedTab = tab
            }
          } label: {
            HStack(spacing: 6) {
              Image(systemName: tab.icon)
                .font(.caption)
              Text(tab.displayName)
                .font(.subheadline)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(
              Capsule()
                .fill(selectedTab == tab ? Color.accentColor : Color(.systemGray5))
            )
            .foregroundStyle(selectedTab == tab ? .white : .primary)
          }
          .buttonStyle(.plain)
        }
      }
    }
    .scrollClipDisabled()
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

  // MARK: - Overview Section

  private func overviewSection(city: CityWithEncyclopedia, encyclopedia: CityEncyclopedia)
    -> some View
  {
    VStack(spacing: DesignTokens.Spacing.lg) {
      // City Header Card
      cityHeaderCard(city: city)

      // Basic Info
      if let basicInfo = encyclopedia.basicInfo {
        basicInfoSection(basicInfo)
      }

      // Best Travel Time
      if let travelTime = encyclopedia.bestTravelTime {
        bestTravelTimeSection(travelTime)
      }

      // Quick Facts
      if let practicalInfo = encyclopedia.practicalInfo {
        quickFactsSection(practicalInfo)
      }

      // Last Updated
      HStack {
        Image(systemName: "clock.fill")
          .foregroundStyle(.secondary)
        Text("最后更新: \(encyclopedia.formattedLastUpdated)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
  }

  // MARK: - City Header Card

  private func cityHeaderCard(city: CityWithEncyclopedia) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // City name and location
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text(city.name)
            .font(.title)
            .fontWeight(.bold)
          if let nameEn = city.nameEn {
            Text(nameEn)
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }
        }

        Spacer()

        // Country flag placeholder
        Text(countryFlag(city.countryCode))
          .font(.largeTitle)
      }

      Divider()

      // Location info
      HStack(spacing: DesignTokens.Spacing.lg) {
        VStack {
          Image(systemName: "location.fill")
            .foregroundStyle(.blue)
          Text(String(format: "%.2f, %.2f", city.latitude, city.longitude))
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        VStack {
          Image(systemName: "clock.fill")
            .foregroundStyle(.orange)
          Text(city.timezone)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        if let utcOffset = city.utcOffset {
          VStack {
            Image(systemName: "globe")
              .foregroundStyle(.green)
            Text(formatUtcOffset(utcOffset))
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.1), radius: 8, y: 2)
    )
  }

  // MARK: - Basic Info Section

  private func basicInfoSection(_ info: CityBasicInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("基本信息", systemImage: "info.circle.fill")
        .font(.headline)
        .foregroundStyle(.blue)

      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        if let population = info.formattedPopulation {
          infoCard(icon: "person.3.fill", label: "人口", value: population)
        }
        if let area = info.formattedArea {
          infoCard(icon: "map.fill", label: "面积", value: area)
        }
        if let elevation = info.formattedElevation {
          infoCard(icon: "mountain.2.fill", label: "海拔", value: elevation)
        }
        if let climate = info.climate {
          infoCard(icon: "cloud.sun.fill", label: "气候", value: climate)
        }
      }

      // Nicknames
      if let nicknames = info.nicknames, !nicknames.isEmpty {
        VStack(alignment: .leading, spacing: 8) {
          Text("别名")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          FlowLayout(spacing: 8) {
            ForEach(nicknames, id: \.self) { nickname in
              Text(nickname)
                .font(.caption)
                .padding(.horizontal, 10)
                .padding(.vertical, 4)
                .background(
                  Capsule()
                    .fill(Color.blue.opacity(0.1))
                )
                .foregroundStyle(.blue)
            }
          }
        }
      }

      // Motto
      if let motto = info.motto {
        VStack(alignment: .leading, spacing: 4) {
          Text("城市格言")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text("\"\(motto)\"")
            .font(.body)
            .italic()
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
    )
  }

  private func infoCard(icon: String, label: String, value: String) -> some View {
    VStack(spacing: 8) {
      Image(systemName: icon)
        .font(.title2)
        .foregroundStyle(.blue)
      Text(value)
        .font(.subheadline)
        .fontWeight(.semibold)
      Text(label)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .fill(Color.blue.opacity(0.05))
    )
  }

  // MARK: - Best Travel Time Section

  private func bestTravelTimeSection(_ travelTime: BestTravelTime) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("最佳旅行时间", systemImage: "calendar")
        .font(.headline)
        .foregroundStyle(.green)

      // Seasons
      HStack(spacing: DesignTokens.Spacing.sm) {
        ForEach(travelTime.seasons, id: \.self) { season in
          HStack(spacing: 4) {
            Image(systemName: season.icon)
            Text(season.displayName)
          }
          .font(.caption)
          .padding(.horizontal, 10)
          .padding(.vertical, 6)
          .background(
            Capsule()
              .fill(Color.green.opacity(0.1))
          )
          .foregroundStyle(.green)
        }
      }

      // Months
      Text("推荐月份: \(travelTime.formattedMonths)")
        .font(.subheadline)

      // Description
      Text(travelTime.description)
        .font(.body)
        .foregroundStyle(.secondary)

      // Weather notes
      if let notes = travelTime.weatherNotes {
        HStack(alignment: .top, spacing: 8) {
          Image(systemName: "cloud.fill")
            .foregroundStyle(.blue)
          Text(notes)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }

      // Crowd and price level
      HStack(spacing: DesignTokens.Spacing.lg) {
        if let crowdLevel = travelTime.crowdLevel {
          HStack {
            Image(systemName: "person.3.fill")
            Text(crowdLevel.displayName)
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }

        if let priceLevel = travelTime.priceLevel {
          HStack {
            Image(systemName: priceLevel.icon)
            Text(priceLevel.displayName)
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.green.opacity(0.05))
    )
  }

  // MARK: - Quick Facts Section

  private func quickFactsSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("快速了解", systemImage: "bolt.fill")
        .font(.headline)
        .foregroundStyle(.orange)

      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        factCard(icon: "bolt.fill", label: "电压", value: info.voltage)
        factCard(
          icon: "powerplug.fill", label: "插头", value: info.formattedPlugTypes)
        factCard(
          icon: info.waterSafety.icon, label: "饮用水",
          value: info.waterSafety.displayName)
        factCard(
          icon: "dollarsign.circle.fill", label: "货币",
          value: "\(info.currencySymbol) \(info.currency)")
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.orange.opacity(0.05))
    )
  }

  private func factCard(icon: String, label: String, value: String) -> some View {
    HStack {
      Image(systemName: icon)
        .foregroundStyle(.orange)
        .frame(width: 24)
      VStack(alignment: .leading) {
        Text(label)
          .font(.caption)
          .foregroundStyle(.secondary)
        Text(value)
          .font(.subheadline)
          .fontWeight(.medium)
      }
      Spacer()
    }
    .padding(DesignTokens.Spacing.sm)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .fill(Color(.systemBackground))
    )
  }

  // MARK: - History Section

  private func historySection(_ encyclopedia: CityEncyclopedia) -> some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      if let history = encyclopedia.history {
        // Founded year
        if let foundedYear = history.formattedFoundedYear {
          HStack {
            Image(systemName: "building.columns.fill")
              .foregroundStyle(.purple)
            Text("建城时间: \(foundedYear)")
              .font(.headline)
            Spacer()
          }
          .padding(DesignTokens.Spacing.md)
          .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
              .fill(Color.purple.opacity(0.1))
          )
        }

        // Historical names
        if let historicalNames = history.historicalNames, !historicalNames.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("历史名称", systemImage: "scroll.fill")
              .font(.headline)

            FlowLayout(spacing: 8) {
              ForEach(historicalNames, id: \.self) { name in
                Text(name)
                  .font(.caption)
                  .padding(.horizontal, 10)
                  .padding(.vertical, 4)
                  .background(
                    Capsule()
                      .fill(Color(.systemGray5))
                  )
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
              .fill(Color(.systemBackground))
              .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
          )
        }

        // Brief history
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Label("城市简史", systemImage: "book.fill")
            .font(.headline)

          Text(history.briefHistory)
            .font(.body)
            .foregroundStyle(.secondary)
        }
        .padding(DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
          RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
            .fill(Color(.systemBackground))
            .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
        )

        // Cultural highlights
        if !history.culturalHighlights.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("文化亮点", systemImage: "star.fill")
              .font(.headline)
              .foregroundStyle(.yellow)

            ForEach(Array(history.culturalHighlights.enumerated()), id: \.offset) {
              _, highlight in
              HStack(alignment: .top, spacing: 8) {
                Image(systemName: "sparkle")
                  .foregroundStyle(.yellow)
                  .font(.caption)
                Text(highlight)
                  .font(.subheadline)
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
              .fill(Color.yellow.opacity(0.05))
          )
        }

        // Famous for
        if !history.famousFor.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("闻名之处", systemImage: "trophy.fill")
              .font(.headline)
              .foregroundStyle(.orange)

            FlowLayout(spacing: 8) {
              ForEach(history.famousFor, id: \.self) { item in
                Text(item)
                  .font(.caption)
                  .padding(.horizontal, 10)
                  .padding(.vertical, 6)
                  .background(
                    Capsule()
                      .fill(Color.orange.opacity(0.1))
                  )
                  .foregroundStyle(.orange)
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
              .fill(Color(.systemBackground))
              .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
          )
        }

        // World Heritage Sites
        if let sites = history.worldHeritageSites, !sites.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Label("世界遗产", systemImage: "globe.americas.fill")
              .font(.headline)
              .foregroundStyle(.blue)

            ForEach(sites, id: \.self) { site in
              HStack(spacing: 8) {
                Image(systemName: "building.columns.circle.fill")
                  .foregroundStyle(.blue)
                Text(site)
                  .font(.subheadline)
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(
            RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
              .fill(Color.blue.opacity(0.05))
          )
        }
      } else {
        emptyStateView(
          icon: "book.closed.fill",
          title: "暂无历史信息",
          subtitle: "该城市尚未添加历史文化数据"
        )
      }
    }
  }

  // MARK: - Customs Section

  private func customsSection(_ encyclopedia: CityEncyclopedia) -> some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      if encyclopedia.customs.isEmpty {
        emptyStateView(
          icon: "person.2.fill",
          title: "暂无风俗信息",
          subtitle: "该城市尚未添加风俗禁忌数据"
        )
      } else {
        // Taboos (important warnings)
        let taboos = encyclopedia.tabooCustems
        if !taboos.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
            Label("禁忌事项", systemImage: "exclamationmark.triangle.fill")
              .font(.headline)
              .foregroundStyle(.red)

            ForEach(taboos) { custom in
              customCard(custom, isTaboo: true)
            }
          }
        }

        // Normal customs by category
        let normalCustoms = encyclopedia.normalCustoms
        let customsByCategory = Dictionary(grouping: normalCustoms, by: { $0.category })

        ForEach(CustomCategory.allCases, id: \.self) { category in
          if let customs = customsByCategory[category], !customs.isEmpty {
            VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
              Label(category.displayName, systemImage: category.icon)
                .font(.headline)

              ForEach(customs) { custom in
                customCard(custom, isTaboo: false)
              }
            }
          }
        }
      }
    }
  }

  private func customCard(_ custom: LocalCustom, isTaboo: Bool) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: custom.category.icon)
          .foregroundStyle(isTaboo ? .red : .blue)
        Text(custom.title)
          .font(.subheadline)
          .fontWeight(.semibold)

        Spacer()

        // Importance badge
        Text(custom.importance.displayName)
          .font(.caption2)
          .padding(.horizontal, 6)
          .padding(.vertical, 2)
          .background(
            Capsule()
              .fill(importanceColor(custom.importance).opacity(0.1))
          )
          .foregroundStyle(importanceColor(custom.importance))
      }

      Text(custom.description)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .fill(isTaboo ? Color.red.opacity(0.05) : Color(.systemBackground))
    )
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
        .stroke(isTaboo ? Color.red.opacity(0.3) : Color.clear, lineWidth: 1)
    )
  }

  // MARK: - Practical Section

  private func practicalSection(_ encyclopedia: CityEncyclopedia) -> some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      if let info = encyclopedia.practicalInfo {
        // Emergency Numbers
        emergencyNumbersSection(info)

        // Currency & Money
        currencySection(info)

        // Language
        languageSection(info)

        // Electricity & Water
        utilitiesSection(info)

        // Visa
        if let visaRequired = info.visaRequired {
          visaSection(required: visaRequired, note: info.visaNote)
        }

        // Tipping
        tippingSection(info)
      } else {
        emptyStateView(
          icon: "info.circle.fill",
          title: "暂无实用信息",
          subtitle: "该城市尚未添加实用信息数据"
        )
      }
    }
  }

  private func emergencyNumbersSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("紧急电话", systemImage: "phone.fill")
        .font(.headline)
        .foregroundStyle(.red)

      HStack(spacing: DesignTokens.Spacing.sm) {
        emergencyButton(icon: "shield.fill", label: "报警", number: info.emergencyNumber, color: .blue)
        emergencyButton(
          icon: "cross.fill", label: "急救", number: info.ambulanceNumber, color: .red)
        emergencyButton(icon: "flame.fill", label: "消防", number: info.fireNumber, color: .orange)
      }

      if let hotline = info.touristHotline {
        HStack {
          Image(systemName: "person.wave.2.fill")
            .foregroundStyle(.purple)
          Text("旅游热线: \(hotline)")
            .font(.subheadline)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.red.opacity(0.05))
    )
  }

  private func emergencyButton(icon: String, label: String, number: String, color: Color)
    -> some View
  {
    Button {
      if let url = URL(string: "tel:\(number)") {
        UIApplication.shared.open(url)
      }
    } label: {
      VStack(spacing: 4) {
        Image(systemName: icon)
          .font(.title3)
        Text(label)
          .font(.caption2)
        Text(number)
          .font(.caption)
          .fontWeight(.bold)
      }
      .frame(maxWidth: .infinity)
      .padding(DesignTokens.Spacing.sm)
      .background(
        RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
          .fill(color.opacity(0.1))
      )
      .foregroundStyle(color)
    }
    .buttonStyle(.plain)
  }

  private func currencySection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("货币信息", systemImage: "dollarsign.circle.fill")
        .font(.headline)
        .foregroundStyle(.green)

      HStack {
        VStack(alignment: .leading) {
          Text("货币代码")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(info.currency)
            .font(.title2)
            .fontWeight(.bold)
        }

        Spacer()

        VStack(alignment: .trailing) {
          Text("符号")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(info.currencySymbol)
            .font(.title2)
            .fontWeight(.bold)
        }
      }

      Divider()

      HStack {
        Text("当地名称: \(info.currencyNameLocal)")
          .font(.caption)
        Spacer()
        Text("英文: \(info.currencyNameEn)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.green.opacity(0.05))
    )
  }

  private func languageSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("语言", systemImage: "textformat")
        .font(.headline)

      VStack(alignment: .leading, spacing: 8) {
        HStack {
          Text("官方语言:")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text(info.languageOfficial.joined(separator: ", "))
            .font(.subheadline)
        }

        HStack {
          Text("常用语言:")
            .font(.subheadline)
            .foregroundStyle(.secondary)
          Text(info.languageCommon.joined(separator: ", "))
            .font(.subheadline)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color(.systemBackground))
        .shadow(color: .black.opacity(0.05), radius: 4, y: 1)
    )
  }

  private func utilitiesSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      Label("电力与饮水", systemImage: "bolt.fill")
        .font(.headline)
        .foregroundStyle(.yellow)

      LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 12) {
        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Image(systemName: "bolt.fill")
              .foregroundStyle(.yellow)
            Text("电压")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          Text(info.voltage)
            .font(.subheadline)
            .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(DesignTokens.Spacing.sm)
        .background(
          RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(Color(.systemGray6))
        )

        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Image(systemName: "powerplug.fill")
              .foregroundStyle(.yellow)
            Text("插头类型")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
          Text(info.formattedPlugTypes)
            .font(.subheadline)
            .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(DesignTokens.Spacing.sm)
        .background(
          RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(Color(.systemGray6))
        )
      }

      // Water safety
      HStack {
        Image(systemName: info.waterSafety.icon)
          .foregroundStyle(.blue)
        VStack(alignment: .leading) {
          Text("饮用水: \(info.waterSafety.displayName)")
            .font(.subheadline)
          if let note = info.waterSafetyNote {
            Text(note)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.yellow.opacity(0.05))
    )
  }

  private func visaSection(required: Bool, note: String?) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("签证信息", systemImage: "doc.text.fill")
        .font(.headline)
        .foregroundStyle(required ? .orange : .green)

      HStack {
        Image(systemName: required ? "exclamationmark.circle.fill" : "checkmark.circle.fill")
          .foregroundStyle(required ? .orange : .green)
        Text(required ? "需要签证" : "免签或落地签")
          .font(.subheadline)
      }

      if let note = note {
        Text(note)
          .font(.caption)
          .foregroundStyle(.secondary)
      }
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill((required ? Color.orange : Color.green).opacity(0.05))
    )
  }

  private func tippingSection(_ info: PracticalInfo) -> some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Label("小费习惯", systemImage: "hand.thumbsup.fill")
        .font(.headline)
        .foregroundStyle(.purple)

      Text(info.tippingCustom)
        .font(.subheadline)
    }
    .padding(DesignTokens.Spacing.md)
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .fill(Color.purple.opacity(0.05))
    )
  }

  // MARK: - Empty State View

  private func emptyStateView(icon: String, title: String, subtitle: String) -> some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: icon)
        .font(.largeTitle)
        .foregroundStyle(.secondary)
      Text(title)
        .font(.headline)
      Text(subtitle)
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity)
    .padding(.vertical, DesignTokens.Spacing.xl)
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

  private func countryFlag(_ countryCode: String) -> String {
    let base: UInt32 = 127397
    var flag = ""
    for scalar in countryCode.uppercased().unicodeScalars {
      if let s = Unicode.Scalar(base + scalar.value) {
        flag.append(String(s))
      }
    }
    return flag
  }

  private func formatUtcOffset(_ minutes: Int) -> String {
    let sign = minutes >= 0 ? "+" : "-"
    let absMinutes = abs(minutes)
    let hours = absMinutes / 60
    let mins = absMinutes % 60
    return mins > 0 ? "UTC\(sign)\(hours):\(String(format: "%02d", mins))" : "UTC\(sign)\(hours)"
  }

  private func importanceColor(_ importance: CustomImportance) -> Color {
    switch importance {
    case .low: return .green
    case .medium: return .orange
    case .high: return .red
    }
  }

  private func createSampleData() -> CityWithEncyclopedia {
    let basicInfo = CityBasicInfo(
      population: 37_400_000,
      populationYear: 2023,
      area: 2188,
      elevation: 40,
      climate: "亚热带季风气候",
      climateEn: "Humid subtropical climate",
      motto: "Tokyo for Tomorrow",
      mottoEn: "Tokyo for Tomorrow",
      nicknames: ["东京都", "江户"],
      nicknamesEn: ["Tokyo Metropolis", "Edo"]
    )

    let history = CityHistory(
      foundedYear: 1457,
      historicalNames: ["江户", "东京府"],
      briefHistory: "东京原名江户,于1457年由太田道灌建造江户城。1603年德川家康在此建立幕府,成为日本政治中心。1868年明治天皇迁都于此,改名东京。二战后经济高速发展,成为世界最大都市圈之一。",
      briefHistoryEn: "Tokyo, originally named Edo, was established in 1457.",
      culturalHighlights: ["传统茶道文化", "浮世绘艺术", "相扑运动", "动漫文化发源地"],
      culturalHighlightsEn: nil,
      famousFor: ["东京塔", "浅草寺", "皇居", "涩谷十字路口", "秋叶原"],
      famousForEn: nil,
      worldHeritageSites: ["国立西洋美术馆"]
    )

    let bestTravelTime = BestTravelTime(
      seasons: [.spring, .autumn],
      months: [3, 4, 5, 10, 11],
      description: "春季樱花盛开,秋季红叶美丽,是游览东京的最佳时节。避开梅雨季节(6月)和酷暑(7-8月)。",
      descriptionEn: nil,
      weatherNotes: "春季气温10-20度,秋季15-25度,舒适宜人",
      crowdLevel: .high,
      priceLevel: .high
    )

    let customs: [LocalCustom] = [
      LocalCustom(
        category: .etiquette,
        title: "鞠躬礼仪",
        titleEn: "Bowing etiquette",
        description: "日本人以鞠躬作为问候方式,角度越深表示越尊重。一般商务场合15-30度,正式场合45度。",
        descriptionEn: nil,
        isTaboo: false,
        importance: .high
      ),
      LocalCustom(
        category: .dining,
        title: "筷子使用禁忌",
        titleEn: "Chopstick taboos",
        description: "不要将筷子插在饭上(象征葬礼),不要用筷子传递食物给另一双筷子。",
        descriptionEn: nil,
        isTaboo: true,
        importance: .high
      ),
      LocalCustom(
        category: .general,
        title: "公共场所安静",
        titleEn: "Quiet in public places",
        description: "在电车、公交等公共场所请保持安静,手机调至静音模式,不要大声说话或打电话。",
        descriptionEn: nil,
        isTaboo: false,
        importance: .medium
      ),
      LocalCustom(
        category: .dress,
        title: "温泉入浴",
        titleEn: "Onsen bathing",
        description: "进入温泉前必须先在淋浴区彻底清洗身体,不要将毛巾带入温泉池中。",
        descriptionEn: nil,
        isTaboo: false,
        importance: .high
      ),
    ]

    let practicalInfo = PracticalInfo(
      voltage: "100V / 50-60Hz",
      plugType: ["A", "B"],
      currency: "JPY",
      currencySymbol: "¥",
      currencyNameLocal: "日元",
      currencyNameEn: "Japanese Yen",
      tippingCustom: "日本不流行小费文化,服务费通常已包含在账单中。给小费可能会被认为是不礼貌的行为。",
      tippingCustomEn: nil,
      waterSafety: .safe,
      waterSafetyNote: "日本自来水可直接饮用,水质优良",
      visaRequired: false,
      visaNote: "中国公民需申请签证,可办理单次、多次签证",
      languageOfficial: ["日语"],
      languageCommon: ["日语", "英语(旅游区)"],
      emergencyNumber: "110",
      ambulanceNumber: "119",
      fireNumber: "119",
      touristHotline: "0570-064-100"
    )

    let encyclopedia = CityEncyclopedia(
      id: "enc_tokyo_001",
      cityId: cityId,
      basicInfo: basicInfo,
      history: history,
      bestTravelTime: bestTravelTime,
      customs: customs,
      practicalInfo: practicalInfo,
      sources: ["日本国家旅游局", "东京都官方网站"],
      lastUpdatedAt: Int(Date().timeIntervalSince1970 * 1000),
      createdAt: Int(Date().timeIntervalSince1970 * 1000)
    )

    return CityWithEncyclopedia(
      id: cityId,
      name: cityName,
      nameEn: "Tokyo",
      timezone: "Asia/Tokyo",
      countryCode: "JP",
      latitude: 35.6762,
      longitude: 139.6503,
      utcOffset: 540,
      dstOffset: nil,
      observesDst: false,
      encyclopedia: encyclopedia,
      hasEncyclopedia: true
    )
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    CityEncyclopediaView(cityId: "tokyo_001", cityName: "东京")
  }
}
