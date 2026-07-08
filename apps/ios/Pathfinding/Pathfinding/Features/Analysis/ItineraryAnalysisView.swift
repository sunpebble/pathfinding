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
      .navigationTitle("itinerary.analysis".localized)
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

      Text("analysis.loading_title".localized)
        .font(.headline)

      Text("analysis.loading_subtitle".localized)
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

      Text("analysis.error_title".localized)
        .font(.headline)

      Text(error.localizedDescription)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)

      Button(action: onRetry) {
        Text("common.retry".localized)
          .fontWeight(.semibold)
      }
      .buttonStyle(.sunpebblePrimary)
    }
    .padding()
  }
}

// MARK: - Empty View

struct AnalysisEmptyView: View {
  let onAnalyze: () -> Void

  var body: some View {
    ContentUnavailableView {
      Label("analysis.empty_title".localized, systemImage: "chart.bar.doc.horizontal")
    } description: {
      Text("analysis.empty_subtitle".localized)
    } actions: {
      Button(action: onAnalyze) {
        Text("analysis.start".localized)
          .fontWeight(.semibold)
      }
      .buttonStyle(.sunpebblePrimary)
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
          Text("analysis.tab_overview".localized).tag(0)
          Text("analysis.tab_daily".localized).tag(1)
          Text("itinerary.budget".localized).tag(2)
          Text("analysis.tab_recommendations".localized).tag(3)
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
    .background(DesignTokens.Colors.background)
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

          Text("analysis.city_days".localized(report.cityName, report.totalDays))
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
            .fill(DesignTokens.Colors.border)
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
            title: "analysis.strengths".localized,
            icon: "checkmark.circle.fill",
            iconColor: .green,
            items: report.strengths
          )
        }

        // Critical Issues
        if !report.criticalIssues.isEmpty {
          InsightsCard(
            title: "analysis.critical_issues".localized,
            icon: "exclamationmark.triangle.fill",
            iconColor: .orange,
            items: report.criticalIssues
          )
        }

        // Improvements
        if !report.improvements.isEmpty {
          InsightsCard(
            title: "analysis.improvements".localized,
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
      Text("analysis.time_analysis".localized)
        .font(.headline)
        .foregroundStyle(.secondary)

      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
      ], spacing: DesignTokens.Spacing.sm) {
        TimeStatItem(
          icon: "clock.fill",
          title: "analysis.start_time".localized,
          value: timeAnalysis.averageStartTime,
          color: DesignTokens.Colors.accent
        )

        TimeStatItem(
          icon: "clock.badge.checkmark.fill",
          title: "analysis.end_time".localized,
          value: timeAnalysis.averageEndTime,
          color: DesignTokens.Colors.accent
        )

        TimeStatItem(
          icon: "figure.walk",
          title: "analysis.activity_time".localized,
          value: formatMinutes(timeAnalysis.totalActivityMinutes),
          color: .green
        )

        TimeStatItem(
          icon: "car.fill",
          title: "analysis.travel_time".localized,
          value: formatMinutes(timeAnalysis.totalTravelMinutes),
          color: DesignTokens.Colors.accent
        )
      }

      // Time Utilization Bar
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text("analysis.time_utilization".localized)
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
              .fill(DesignTokens.Colors.border)
              .frame(height: 8)

            RoundedRectangle(cornerRadius: 4)
              .fill(DesignTokens.Colors.accent)
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

        Text("analysis.suggested_breaks".localized)
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
      return "analysis.duration_hm".localized(hours, mins)
    }
    return "analysis.duration_minutes".localized(mins)
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
        Text("analysis.break_after".localized(suggestion.afterPoiName))
          .font(.subheadline)

        Text("analysis.break_reason_duration".localized(suggestion.reason, suggestion.suggestedDuration))
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
      .background(isSelected ? paceColor : DesignTokens.Colors.backgroundSecondary)
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
          Text("analysis.day_number".localized(day.dayNumber))
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
          title: "poi.attraction".localized,
          value: "analysis.poi_count_value".localized(day.itemCount)
        )

        DayStatItem(
          icon: "clock.fill",
          title: "analysis.duration".localized,
          value: formatMinutes(day.totalPlannedMinutes)
        )

        DayStatItem(
          icon: "arrow.triangle.swap",
          title: "analysis.distance".localized,
          value: String(format: "%.1fkm", day.totalDistanceKm)
        )
      }

      // Route Efficiency
      VStack(alignment: .leading, spacing: 4) {
        HStack {
          Text("analysis.route_efficiency".localized)
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
              .fill(DesignTokens.Colors.border)
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
    return "analysis.duration_minutes".localized(mins)
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
          .foregroundStyle(DesignTokens.Colors.accent)

        Text("analysis.route_optimization_suggestion".localized)
          .font(.headline)
          .foregroundStyle(.secondary)
      }

      Text(optimization.reason)
        .font(.subheadline)

      HStack(spacing: 16) {
        HStack(spacing: 4) {
          Image(systemName: "clock.badge.checkmark.fill")
            .foregroundStyle(.green)

          Text("analysis.save_minutes".localized(optimization.estimatedTimeSavingMinutes))
            .font(.caption)
        }

        HStack(spacing: 4) {
          Image(systemName: "arrow.down.circle.fill")
            .foregroundStyle(DesignTokens.Colors.accent)

          Text("analysis.reduce_km".localized(String(format: "%.1f", optimization.estimatedDistanceSavingKm)))
            .font(.caption)
        }
      }
      .padding(.top, 4)
    }
    .padding()
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(Sunpebble.sunSoft)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
  }
}

struct PoiAnalysisListCard: View {
  let pois: [PoiAnalysis]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("analysis.poi_analysis".localized)
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
          Text("analysis.suggested_minutes".localized(poi.suggestedDuration))
            .font(.caption)
            .foregroundStyle(.secondary)

          if let actual = poi.actualDuration {
            Text("analysis.actual_minutes".localized(actual))
              .font(.caption)
              .foregroundStyle(statusColor)
          }
        }

        if poi.openingHoursConflict {
          HStack(spacing: 4) {
            Image(systemName: "exclamationmark.triangle.fill")
              .font(.caption2)

            Text("analysis.opening_hours_conflict".localized)
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
          "analysis.budget_unavailable".localized,
          systemImage: "yensign.circle",
          description: Text("analysis.budget_no_data".localized)
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
          Text("analysis.estimated_total".localized)
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
          Text("analysis.per_day".localized)
            .font(.caption)
            .foregroundStyle(.secondary)

          Text("¥\(Int(budget.perDayAverage))")
            .font(.headline)
        }

        Spacer()

        if let perPerson = budget.perPersonAverage {
          VStack(alignment: .trailing, spacing: 4) {
            Text("analysis.per_person".localized)
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
      Text("analysis.cost_breakdown".localized)
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

        Text("analysis.saving_suggestions".localized)
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
              Text("analysis.potential_saving".localized(Int(opportunity.potentialSaving)))
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

        Text("analysis.core_recommendations".localized)
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
            .background(Circle().fill(Sunpebble.ink))

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
          .foregroundStyle(DesignTokens.Colors.accent)

        Text("analysis.route_optimizations".localized)
          .font(.headline)
          .foregroundStyle(.secondary)
      }

      ForEach(optimizations) { optimization in
        VStack(alignment: .leading, spacing: 8) {
          Text("analysis.day_number".localized(optimization.dayNumber))
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

              Text("analysis.minus_minutes".localized(optimization.estimatedTimeSavingMinutes))
                .font(.caption)
            }

            HStack(spacing: 4) {
              Image(systemName: "arrow.down.circle.fill")
                .font(.caption)
                .foregroundStyle(DesignTokens.Colors.accent)

              Text("-\(String(format: "%.1f", optimization.estimatedDistanceSavingKm))km")
                .font(.caption)
            }
          }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Sunpebble.sunSoft)
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
