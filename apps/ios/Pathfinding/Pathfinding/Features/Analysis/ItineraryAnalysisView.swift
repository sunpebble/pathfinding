import SwiftUI
import Charts

// MARK: - Analysis Report View

struct ItineraryAnalysisView: View {
  let itineraryId: String
  let itineraryTitle: String

  @State private var analysisStore = AnalysisStore.shared
  @State private var selectedTab = 0

  var body: some View {
    NavigationStack {
      Group {
        if analysisStore.isLoading {
          LoadingAnalysisView()
        } else if let report = analysisStore.currentReport {
          AnalysisReportContent(report: report, selectedTab: $selectedTab)
        } else if let error = analysisStore.error {
          AnalysisErrorView(error: error) {
            Task {
              await analysisStore.loadAnalysis(itineraryId: itineraryId, forceRefresh: true)
            }
          }
        } else {
          AnalysisEmptyView {
            Task {
              await analysisStore.loadAnalysis(itineraryId: itineraryId)
            }
          }
        }
      }
      .navigationTitle("行程分析")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            Task {
              await analysisStore.loadAnalysis(itineraryId: itineraryId, forceRefresh: true)
            }
          } label: {
            Image(systemName: "arrow.clockwise")
          }
          .disabled(analysisStore.isLoading)
        }
      }
    }
    .task {
      if analysisStore.currentReport?.itineraryId != itineraryId {
        await analysisStore.loadAnalysis(itineraryId: itineraryId)
      }
    }
  }
}

// MARK: - Loading View

struct LoadingAnalysisView: View {
  var body: some View {
    VStack(spacing: DesignTokens.Spacing.lg) {
      ProgressView()
        .controlSize(.large)

      Text("正在分析行程...")
        .font(.headline)

      Text("评估行程合理性、时间安排和预算")
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)
    }
    .padding()
  }
}

// MARK: - Error View

struct AnalysisErrorView: View {
  let error: Error
  let onRetry: () -> Void

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "exclamationmark.triangle.fill")
        .font(.system(size: 48))
        .foregroundStyle(.orange)

      Text("分析失败")
        .font(.headline)

      Text(error.localizedDescription)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)

      Button(action: onRetry) {
        Text("重试")
          .fontWeight(.semibold)
      }
      .buttonStyle(.glassProminent)
    }
    .padding()
  }
}

// MARK: - Empty View

struct AnalysisEmptyView: View {
  let onAnalyze: () -> Void

  var body: some View {
    ContentUnavailableView {
      Label("生成行程分析报告", systemImage: "chart.bar.doc.horizontal")
    } description: {
      Text("评估行程合理性、获取优化建议和预算分析")
    } actions: {
      Button(action: onAnalyze) {
        Text("开始分析")
          .fontWeight(.semibold)
      }
      .buttonStyle(.glassProminent)
    }
  }
}

// MARK: - Report Content

struct AnalysisReportContent: View {
  let report: ItineraryAnalysisReport
  @Binding var selectedTab: Int

  var body: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.lg) {
        // Overall Score Card
        GlassEffectContainer {
          OverallScoreCard(report: report)
        }

        // Tab Selector
        Picker("", selection: $selectedTab) {
          Text("概览").tag(0)
          Text("每日").tag(1)
          Text("预算").tag(2)
          Text("建议").tag(3)
        }
        .pickerStyle(.segmented)
        .padding(.horizontal)

        // Tab Content
        switch selectedTab {
        case 0:
          OverviewTabContent(report: report)
        case 1:
          DailyAnalysisTabContent(report: report)
        case 2:
          BudgetTabContent(report: report)
        case 3:
          RecommendationsTabContent(report: report)
        default:
          EmptyView()
        }
      }
      .padding()
    }
    .background(Color(.systemGroupedBackground))
  }
}

// MARK: - Overall Score Card

struct OverallScoreCard: View {
  let report: ItineraryAnalysisReport

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      HStack(alignment: .top) {
        VStack(alignment: .leading, spacing: 4) {
          Text(report.itineraryTitle)
            .font(.headline)
            .lineLimit(2)

          Text("\(report.cityName) | \(report.totalDays)天")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Text("\(report.startDate) - \(report.endDate)")
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        ScoreCircle(
          score: report.overallScore,
          level: report.scoreLevel
        )
      }

      // Score Breakdown
      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
      ], spacing: DesignTokens.Spacing.sm) {
        ForEach(report.scoreBreakdown) { breakdown in
          ScoreBreakdownItem(breakdown: breakdown)
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.lg)
  }
}

struct ScoreCircle: View {
  let score: Int
  let level: ItineraryAnalysisReport.ScoreLevel

  var scoreColor: Color {
    switch level {
    case .excellent: return .green
    case .good: return .blue
    case .fair: return .orange
    case .needsImprovement: return .red
    }
  }

  var body: some View {
    ZStack {
      Circle()
        .stroke(scoreColor.opacity(0.2), lineWidth: 6)
        .frame(width: 70, height: 70)

      Circle()
        .trim(from: 0, to: CGFloat(score) / 100)
        .stroke(
          scoreColor,
          style: StrokeStyle(lineWidth: 6, lineCap: .round)
        )
        .frame(width: 70, height: 70)
        .rotationEffect(.degrees(-90))

      VStack(spacing: 0) {
        Text("\(score)")
          .font(.title2)
          .fontWeight(.bold)
          .foregroundStyle(scoreColor)

        Text(level.displayName)
          .font(.caption2)
          .foregroundStyle(.secondary)
      }
    }
  }
}

struct ScoreBreakdownItem: View {
  let breakdown: ScoreBreakdown

  var scoreColor: Color {
    if breakdown.score >= 80 { return .green }
    if breakdown.score >= 60 { return .blue }
    if breakdown.score >= 40 { return .orange }
    return .red
  }

  var body: some View {
    VStack(alignment: .leading, spacing: 4) {
      HStack {
        Text(breakdown.categoryName)
          .font(.caption)
          .foregroundStyle(.secondary)

        Spacer()

        Text("\(breakdown.score)")
          .font(.caption)
          .fontWeight(.semibold)
          .foregroundStyle(scoreColor)
      }

      GeometryReader { geometry in
        ZStack(alignment: .leading) {
          RoundedRectangle(cornerRadius: 2)
            .fill(Color(.systemGray5))
            .frame(height: 4)

          RoundedRectangle(cornerRadius: 2)
            .fill(scoreColor)
            .frame(width: geometry.size.width * CGFloat(breakdown.score) / 100, height: 4)
        }
      }
      .frame(height: 4)
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Overview Tab

struct OverviewTabContent: View {
  let report: ItineraryAnalysisReport

  var body: some View {
    GlassEffectContainer {
      VStack(spacing: DesignTokens.Spacing.md) {
        // Time Analysis
        TimeAnalysisCard(timeAnalysis: report.timeAnalysis)

        // Strengths
        if !report.strengths.isEmpty {
          InsightsCard(
            title: "优势",
            icon: "checkmark.circle.fill",
            iconColor: .green,
            items: report.strengths
          )
        }

        // Critical Issues
        if !report.criticalIssues.isEmpty {
          InsightsCard(
            title: "需要注意",
            icon: "exclamationmark.triangle.fill",
            iconColor: .orange,
            items: report.criticalIssues
          )
        }

        // Improvements
        if !report.improvements.isEmpty {
          InsightsCard(
            title: "可改进",
            icon: "lightbulb.fill",
            iconColor: .yellow,
            items: report.improvements
          )
        }
      }
    }
  }
}

struct TimeAnalysisCard: View {
  let timeAnalysis: TimeAnalysis

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("时间分析")
        .font(.headline)
        .foregroundStyle(.secondary)

      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
      ], spacing: DesignTokens.Spacing.sm) {
        TimeStatItem(
          icon: "clock.fill",
          title: "开始时间",
          value: timeAnalysis.averageStartTime,
          color: .indigo
        )

        TimeStatItem(
          icon: "clock.badge.checkmark.fill",
          title: "结束时间",
          value: timeAnalysis.averageEndTime,
          color: .purple
        )

        TimeStatItem(
          icon: "figure.walk",
          title: "活动时间",
          value: formatMinutes(timeAnalysis.totalActivityMinutes),
          color: .green
        )

        TimeStatItem(
          icon: "car.fill",
          title: "交通时间",
          value: formatMinutes(timeAnalysis.totalTravelMinutes),
          color: .blue
        )
      }

      // Time Utilization Bar
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text("时间利用率")
            .font(.caption)
            .foregroundStyle(.secondary)

          Spacer()

          Text("\(timeAnalysis.timeUtilization)%")
            .font(.caption)
            .fontWeight(.semibold)
        }

        GeometryReader { geometry in
          ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 4)
              .fill(Color(.systemGray5))
              .frame(height: 8)

            RoundedRectangle(cornerRadius: 4)
              .fill(
                LinearGradient(
                  colors: [.indigo, .purple],
                  startPoint: .leading,
                  endPoint: .trailing
                )
              )
              .frame(width: geometry.size.width * CGFloat(timeAnalysis.timeUtilization) / 100, height: 8)
          }
        }
        .frame(height: 8)
      }
      .padding(.top, 4)

      // Break Suggestions
      if !timeAnalysis.suggestedBreaks.isEmpty {
        Divider()
          .padding(.vertical, 4)

        Text("建议休息")
          .font(.subheadline)
          .fontWeight(.medium)

        ForEach(timeAnalysis.suggestedBreaks) { breakSuggestion in
          BreakSuggestionRow(suggestion: breakSuggestion)
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.md)
  }

  private func formatMinutes(_ minutes: Int) -> String {
    let hours = minutes / 60
    let mins = minutes % 60
    if hours > 0 {
      return "\(hours)小时\(mins)分"
    }
    return "\(mins)分钟"
  }
}

struct TimeStatItem: View {
  let icon: String
  let title: String
  let value: String
  let color: Color

  var body: some View {
    HStack(spacing: 8) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(color)
        .frame(width: 28)

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.caption)
          .foregroundStyle(.secondary)

        Text(value)
          .font(.subheadline)
          .fontWeight(.medium)
      }
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding(8)
    .background(color.opacity(0.1))
    .clipShape(RoundedRectangle(cornerRadius: 8))
  }
}

struct BreakSuggestionRow: View {
  let suggestion: BreakSuggestion

  var body: some View {
    HStack(spacing: 8) {
      Image(systemName: suggestion.type.icon)
        .font(.subheadline)
        .foregroundStyle(.orange)
        .frame(width: 24)

      VStack(alignment: .leading, spacing: 2) {
        Text("在 \(suggestion.afterPoiName) 后")
          .font(.subheadline)

        Text("\(suggestion.reason) (\(suggestion.suggestedDuration)分钟)")
          .font(.caption)
          .foregroundStyle(.secondary)
      }

      Spacer()
    }
    .padding(.vertical, 4)
  }
}

struct InsightsCard: View {
  let title: String
  let icon: String
  let iconColor: Color
  let items: [String]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: icon)
          .foregroundStyle(iconColor)

        Text(title)
          .font(.headline)
          .foregroundStyle(.secondary)
      }

      ForEach(items, id: \.self) { item in
        HStack(alignment: .top, spacing: 8) {
          Circle()
            .fill(iconColor)
            .frame(width: 6, height: 6)
            .padding(.top, 6)

          Text(item)
            .font(.subheadline)
        }
      }
    }
    .padding()
    .frame(maxWidth: .infinity, alignment: .leading)
    .cardSurface(cornerRadius: DesignTokens.Radius.md)
  }
}

// MARK: - Daily Analysis Tab

struct DailyAnalysisTabContent: View {
  let report: ItineraryAnalysisReport
  @State private var selectedDay: Int = 1

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      // Day Selector
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: 8) {
          ForEach(report.dayAnalysis) { day in
            DaySelectorButton(
              dayNumber: day.dayNumber,
              paceRating: day.paceRating,
              isSelected: selectedDay == day.dayNumber
            ) {
              selectedDay = day.dayNumber
            }
          }
        }
        .padding(.horizontal)
      }

      // Selected Day Details
      if let dayAnalysis = report.dayAnalysis.first(where: { $0.dayNumber == selectedDay }) {
        GlassEffectContainer {
          VStack(spacing: DesignTokens.Spacing.md) {
            DayAnalysisCard(day: dayAnalysis)

            // Route Optimization for this day
            if let optimization = report.routeOptimizations.first(where: { $0.dayNumber == selectedDay }) {
              RouteOptimizationCard(optimization: optimization)
            }

            // POI List for this day
            if !dayAnalysis.poisAnalysis.isEmpty {
              PoiAnalysisListCard(pois: dayAnalysis.poisAnalysis)
            }
          }
        }
      }
    }
  }
}

struct DaySelectorButton: View {
  let dayNumber: Int
  let paceRating: DayAnalysis.PaceRating
  let isSelected: Bool
  let action: () -> Void

  var paceColor: Color {
    switch paceRating {
    case .relaxed: return .green
    case .moderate: return .blue
    case .intensive: return .orange
    case .exhausting: return .red
    }
  }

  var body: some View {
    Button(action: action) {
      VStack(spacing: 4) {
        Text("Day")
          .font(.caption2)
          .foregroundStyle(isSelected ? .white : .secondary)

        Text("\(dayNumber)")
          .font(.headline)
          .fontWeight(.bold)
          .foregroundStyle(isSelected ? .white : .primary)

        Image(systemName: paceRating.icon)
          .font(.caption)
          .foregroundStyle(isSelected ? .white : paceColor)
      }
      .padding(.vertical, 8)
      .padding(.horizontal, 12)
      .background(isSelected ? paceColor : Color(.systemGray6))
      .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    .buttonStyle(.plain)
  }
}

struct DayAnalysisCard: View {
  let day: DayAnalysis

  var paceColor: Color {
    switch day.paceRating {
    case .relaxed: return .green
    case .moderate: return .blue
    case .intensive: return .orange
    case .exhausting: return .red
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("第 \(day.dayNumber) 天")
            .font(.headline)

          Text(day.date)
            .font(.caption)
            .foregroundStyle(.secondary)
        }

        Spacer()

        HStack(spacing: 4) {
          Image(systemName: day.paceRating.icon)
          Text(day.paceRating.displayName)
        }
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(paceColor)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(paceColor.opacity(0.1))
        .clipShape(Capsule())
      }

      Divider()

      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible()),
      ], spacing: 12) {
        DayStatItem(
          icon: "mappin.circle.fill",
          title: "景点",
          value: "\(day.itemCount)个"
        )

        DayStatItem(
          icon: "clock.fill",
          title: "时长",
          value: formatMinutes(day.totalPlannedMinutes)
        )

        DayStatItem(
          icon: "arrow.triangle.swap",
          title: "路程",
          value: String(format: "%.1fkm", day.totalDistanceKm)
        )
      }

      // Route Efficiency
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text("路线效率")
            .font(.caption)
            .foregroundStyle(.secondary)

          Spacer()

          Text("\(day.routeEfficiency)%")
            .font(.caption)
            .fontWeight(.semibold)
        }

        GeometryReader { geometry in
          ZStack(alignment: .leading) {
            RoundedRectangle(cornerRadius: 2)
              .fill(Color(.systemGray5))
              .frame(height: 4)

            RoundedRectangle(cornerRadius: 2)
              .fill(day.routeEfficiency >= 80 ? .green : day.routeEfficiency >= 60 ? .blue : .orange)
              .frame(width: geometry.size.width * CGFloat(day.routeEfficiency) / 100, height: 4)
          }
        }
        .frame(height: 4)
      }

      // Warnings
      if !day.warnings.isEmpty {
        Divider()

        ForEach(day.warnings, id: \.self) { warning in
          HStack(spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
              .font(.caption)
              .foregroundStyle(.orange)

            Text(warning)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }

      // Suggestions
      if !day.suggestions.isEmpty {
        Divider()

        ForEach(day.suggestions, id: \.self) { suggestion in
          HStack(spacing: 8) {
            Image(systemName: "lightbulb.fill")
              .font(.caption)
              .foregroundStyle(.yellow)

            Text(suggestion)
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.md)
  }

  private func formatMinutes(_ minutes: Int) -> String {
    let hours = minutes / 60
    let mins = minutes % 60
    if hours > 0 {
      return "\(hours)h\(mins)m"
    }
    return "\(mins)分钟"
  }
}

struct DayStatItem: View {
  let icon: String
  let title: String
  let value: String

  var body: some View {
    VStack(spacing: 4) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(DesignTokens.Colors.accent)

      Text(value)
        .font(.subheadline)
        .fontWeight(.semibold)

      Text(title)
        .font(.caption2)
        .foregroundStyle(.secondary)
    }
  }
}

struct RouteOptimizationCard: View {
  let optimization: RouteOptimizationSuggestion

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "arrow.triangle.2.circlepath")
          .foregroundStyle(.blue)

        Text("路线优化建议")
          .font(.headline)
          .foregroundStyle(.secondary)
      }

      Text(optimization.reason)
        .font(.subheadline)

      HStack(spacing: 16) {
        HStack(spacing: 4) {
          Image(systemName: "clock.badge.checkmark.fill")
            .foregroundStyle(.green)

          Text("节省 \(optimization.estimatedTimeSavingMinutes) 分钟")
            .font(.caption)
        }

        HStack(spacing: 4) {
          Image(systemName: "arrow.down.circle.fill")
            .foregroundStyle(.blue)

          Text("减少 \(String(format: "%.1f", optimization.estimatedDistanceSavingKm)) km")
            .font(.caption)
        }
      }
      .padding(.top, 4)
    }
    .padding()
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Color.blue.opacity(0.1))
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }
}

struct PoiAnalysisListCard: View {
  let pois: [PoiAnalysis]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("景点分析")
        .font(.headline)
        .foregroundStyle(.secondary)

      ForEach(pois) { poi in
        PoiAnalysisRow(poi: poi)

        if poi.id != pois.last?.id {
          Divider()
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.md)
  }
}

struct PoiAnalysisRow: View {
  let poi: PoiAnalysis

  var statusColor: Color {
    switch poi.durationStatus {
    case .adequate: return .green
    case .tooShort: return .orange
    case .tooLong: return .blue
    }
  }

  var body: some View {
    HStack(alignment: .top, spacing: 12) {
      Image(systemName: poi.durationStatus.icon)
        .font(.title3)
        .foregroundStyle(statusColor)
        .frame(width: 28)

      VStack(alignment: .leading, spacing: 4) {
        Text(poi.poiName)
          .font(.subheadline)
          .fontWeight(.medium)

        HStack(spacing: 8) {
          Text("建议 \(poi.suggestedDuration) 分钟")
            .font(.caption)
            .foregroundStyle(.secondary)

          if let actual = poi.actualDuration {
            Text("实际 \(actual) 分钟")
              .font(.caption)
              .foregroundStyle(statusColor)
          }
        }

        if poi.openingHoursConflict {
          HStack(spacing: 4) {
            Image(systemName: "exclamationmark.triangle.fill")
              .font(.caption2)

            Text("可能不在营业时间")
              .font(.caption)
          }
          .foregroundStyle(.orange)
        }
      }

      Spacer()
    }
    .padding(.vertical, 4)
  }
}

// MARK: - Budget Tab

struct BudgetTabContent: View {
  let report: ItineraryAnalysisReport

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      if let budget = report.budgetAnalysis {
        GlassEffectContainer {
          VStack(spacing: DesignTokens.Spacing.md) {
            // Budget Overview
            BudgetOverviewCard(budget: budget)

            // Budget Breakdown Chart
            BudgetBreakdownChart(breakdown: budget.breakdown)

            // Saving Opportunities
            if !budget.savingOpportunities.isEmpty {
              SavingOpportunitiesCard(opportunities: budget.savingOpportunities)
            }
          }
        }
      } else {
        ContentUnavailableView(
          "预算分析不可用",
          systemImage: "yensign.circle",
          description: Text("该行程暂无预算数据")
        )
        .padding(40)
      }
    }
  }
}

struct BudgetOverviewCard: View {
  let budget: BudgetAnalysis

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("预计总费用")
            .font(.subheadline)
            .foregroundStyle(.secondary)

          Text("¥\(Int(budget.estimatedTotal))")
            .font(.title)
            .fontWeight(.bold)
        }

        Spacer()

        HStack(spacing: 4) {
          Image(systemName: budget.comparisonToAverage.icon)
          Text(budget.comparisonToAverage.displayName)
        }
        .font(.subheadline)
        .fontWeight(.medium)
        .foregroundStyle(DesignTokens.Colors.accent)
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(DesignTokens.Colors.accent.opacity(0.1))
        .clipShape(Capsule())
      }

      Divider()

      HStack {
        VStack(alignment: .leading, spacing: 4) {
          Text("日均")
            .font(.caption)
            .foregroundStyle(.secondary)

          Text("¥\(Int(budget.perDayAverage))")
            .font(.headline)
        }

        Spacer()

        if let perPerson = budget.perPersonAverage {
          VStack(alignment: .trailing, spacing: 4) {
            Text("人均")
              .font(.caption)
              .foregroundStyle(.secondary)

            Text("¥\(Int(perPerson))")
              .font(.headline)
          }
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.lg)
  }
}

struct BudgetBreakdownChart: View {
  let breakdown: [BudgetBreakdown]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("费用构成")
        .font(.headline)
        .foregroundStyle(.secondary)

      // Pie Chart
      Chart(breakdown) { item in
        SectorMark(
          angle: .value("Amount", item.amount),
          innerRadius: .ratio(0.5),
          angularInset: 1.5
        )
        .foregroundStyle(by: .value("Category", item.categoryName))
        .cornerRadius(4)
      }
      .frame(height: 200)

      // Legend
      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
      ], spacing: 8) {
        ForEach(breakdown) { item in
          HStack(spacing: 8) {
            Circle()
              .fill(categoryColor(for: item.category))
              .frame(width: 10, height: 10)

            Text(item.categoryName)
              .font(.caption)
              .lineLimit(1)

            Spacer()

            Text("¥\(Int(item.amount))")
              .font(.caption)
              .foregroundStyle(.secondary)
          }
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.md)
  }

  private func categoryColor(for category: String) -> Color {
    switch category {
    case "transportation": return .blue
    case "accommodation": return .purple
    case "meals": return .orange
    case "attraction", "museum": return .green
    case "shopping": return .pink
    case "entertainment": return .indigo
    default: return .gray
    }
  }
}

struct SavingOpportunitiesCard: View {
  let opportunities: [SavingOpportunity]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "lightbulb.fill")
          .foregroundStyle(.yellow)

        Text("省钱建议")
          .font(.headline)
          .foregroundStyle(.secondary)
      }

      ForEach(opportunities) { opportunity in
        HStack(alignment: .top, spacing: 12) {
          Circle()
            .fill(effortColor(opportunity.effort))
            .frame(width: 8, height: 8)
            .padding(.top, 6)

          VStack(alignment: .leading, spacing: 4) {
            Text(opportunity.suggestion)
              .font(.subheadline)

            HStack {
              Text("可节省 ¥\(Int(opportunity.potentialSaving))")
                .font(.caption)
                .foregroundStyle(.green)

              Spacer()

              Text(opportunity.effort.displayName)
                .font(.caption2)
                .foregroundStyle(effortColor(opportunity.effort))
                .padding(.horizontal, 8)
                .padding(.vertical, 2)
                .background(effortColor(opportunity.effort).opacity(0.1))
                .clipShape(Capsule())
            }
          }
        }

        if opportunity.id != opportunities.last?.id {
          Divider()
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.md)
  }

  private func effortColor(_ effort: SavingOpportunity.EffortLevel) -> Color {
    switch effort {
    case .easy: return .green
    case .moderate: return .orange
    case .difficult: return .red
    }
  }
}

// MARK: - Recommendations Tab

struct RecommendationsTabContent: View {
  let report: ItineraryAnalysisReport

  var body: some View {
    GlassEffectContainer {
      VStack(spacing: DesignTokens.Spacing.md) {
        // Top Recommendations
        if !report.topRecommendations.isEmpty {
          TopRecommendationsCard(recommendations: report.topRecommendations)
        }

        // Route Optimizations
        if !report.routeOptimizations.isEmpty {
          RouteOptimizationsCard(optimizations: report.routeOptimizations)
        }
      }
    }
  }
}

struct TopRecommendationsCard: View {
  let recommendations: [String]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "star.fill")
          .foregroundStyle(.yellow)

        Text("核心建议")
          .font(.headline)
          .foregroundStyle(.secondary)
      }

      ForEach(Array(recommendations.enumerated()), id: \.offset) { index, recommendation in
        HStack(alignment: .top, spacing: 12) {
          Text("\(index + 1)")
            .font(.caption)
            .fontWeight(.bold)
            .foregroundStyle(.white)
            .frame(width: 20, height: 20)
            .background(Circle().fill(.indigo))

          Text(recommendation)
            .font(.subheadline)
        }

        if index < recommendations.count - 1 {
          Divider()
            .padding(.leading, 32)
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.md)
  }
}

struct RouteOptimizationsCard: View {
  let optimizations: [RouteOptimizationSuggestion]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "arrow.triangle.2.circlepath")
          .foregroundStyle(.blue)

        Text("路线优化")
          .font(.headline)
          .foregroundStyle(.secondary)
      }

      ForEach(optimizations) { optimization in
        VStack(alignment: .leading, spacing: 8) {
          Text("第 \(optimization.dayNumber) 天")
            .font(.subheadline)
            .fontWeight(.semibold)

          Text(optimization.reason)
            .font(.caption)
            .foregroundStyle(.secondary)

          HStack(spacing: 16) {
            HStack(spacing: 4) {
              Image(systemName: "clock.badge.checkmark.fill")
                .font(.caption)
                .foregroundStyle(.green)

              Text("-\(optimization.estimatedTimeSavingMinutes)分钟")
                .font(.caption)
            }

            HStack(spacing: 4) {
              Image(systemName: "arrow.down.circle.fill")
                .font(.caption)
                .foregroundStyle(.blue)

              Text("-\(String(format: "%.1f", optimization.estimatedDistanceSavingKm))km")
                .font(.caption)
            }
          }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.blue.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 8))

        if optimization.id != optimizations.last?.id {
          Divider()
        }
      }
    }
    .padding()
    .cardSurface(cornerRadius: DesignTokens.Radius.md)
  }
}

// MARK: - Preview

#Preview {
  ItineraryAnalysisView(
    itineraryId: "test-id",
    itineraryTitle: "东京五日游"
  )
}
