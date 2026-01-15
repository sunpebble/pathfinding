import SwiftUI
import Charts

// MARK: - Statistics View

struct StatsView: View {
  @State private var statsStore = StatsStore.shared
  @State private var selectedYear: Int = Calendar.current.component(.year, from: Date())
  @State private var showYearPicker = false

  var body: some View {
    NavigationStack {
      ScrollView {
        VStack(spacing: DesignTokens.Spacing.lg) {
          // Quick Stats Cards
          QuickStatsSection(stats: statsStore.quickStats)

          // Yearly Review Section
          if let review = statsStore.currentYearReview, review.status == .ready {
            YearlyReviewSection(review: review)
          } else if statsStore.isGeneratingReview {
            GeneratingReviewCard()
          } else {
            GenerateReviewCard(year: selectedYear) {
              Task {
                await statsStore.generateYearlyReview(year: selectedYear)
              }
            }
          }

          // Expense Breakdown Chart
          if let stats = statsStore.fullStats, !stats.expensesByCategory.isEmpty {
            ExpenseBreakdownSection(expenses: stats.expensesByCategory)
          }

          // Top Destinations
          if let stats = statsStore.fullStats, !stats.topDestinations.isEmpty {
            TopDestinationsSection(destinations: stats.topDestinations)
          }

          // Monthly Activity Chart
          if let review = statsStore.currentYearReview, review.status == .ready {
            MonthlyActivitySection(activity: review.monthlyActivity)
          }

          // Achievements
          if let review = statsStore.currentYearReview,
             review.status == .ready,
             !review.achievements.isEmpty {
            AchievementsSection(achievements: review.achievements)
          }
        }
        .padding()
      }
      .background(Color(.systemGroupedBackground))
      .navigationTitle("stats.title".localized)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showYearPicker = true
          } label: {
            HStack(spacing: 4) {
              Text(String(format: "stats.year_suffix".localized, selectedYear))
              Image(systemName: "chevron.down")
                .font(.caption)
            }
          }
        }

        ToolbarItem(placement: .topBarTrailing) {
          Button {
            Task {
              await statsStore.calculateStats()
            }
          } label: {
            Image(systemName: "arrow.clockwise")
          }
          .disabled(statsStore.isLoadingFullStats)
        }
      }
      .sheet(isPresented: $showYearPicker) {
        YearPickerSheet(
          selectedYear: $selectedYear,
          availableYears: statsStore.availableYears
        ) {
          Task {
            await statsStore.loadYearlyReview(year: selectedYear)
          }
        }
      }
      .task {
        await loadData()
      }
      .refreshable {
        await loadData()
      }
    }
  }

  private func loadData() async {
    async let quickStats: () = statsStore.loadQuickStats()
    async let fullStats: () = statsStore.loadFullStats()
    async let availableYears: () = statsStore.loadAvailableYears()
    async let yearlyReview: () = statsStore.loadYearlyReview(year: selectedYear)

    _ = await (quickStats, fullStats, availableYears, yearlyReview)
  }
}

// MARK: - Quick Stats Section

struct QuickStatsSection: View {
  let stats: QuickStats?

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("stats.overview".localized)
        .font(.headline)
        .foregroundStyle(.secondary)

      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
      ], spacing: DesignTokens.Spacing.sm) {
        QuickStatCard(
          icon: "airplane",
          title: "stats.trips_count".localized,
          value: "\(stats?.totalTrips ?? 0)",
          color: .indigo
        )

        QuickStatCard(
          icon: "calendar",
          title: "stats.days_count".localized,
          value: "\(stats?.totalDays ?? 0)",
          color: .orange
        )

        QuickStatCard(
          icon: "building.2",
          title: "stats.cities_count".localized,
          value: "\(stats?.totalCities ?? 0)",
          color: .green
        )

        QuickStatCard(
          icon: "yensign.circle",
          title: "stats.total_expenses".localized,
          value: formatCurrency(stats?.totalExpenses ?? 0),
          color: .purple
        )
      }
    }
  }

  private func formatCurrency(_ amount: Double) -> String {
    if amount >= 10000 {
      return String(format: "%.1f万", amount / 10000)
    }
    return String(format: "%.0f", amount)
  }
}

struct QuickStatCard: View {
  let icon: String
  let title: String
  let value: String
  let color: Color

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
      HStack {
        Image(systemName: icon)
          .font(.title3)
          .foregroundStyle(color)

        Spacer()
      }

      Text(value)
        .font(.title)
        .fontWeight(.bold)

      Text(title)
        .font(.caption)
        .foregroundStyle(.secondary)
    }
    .padding()
    .frame(maxWidth: .infinity, alignment: .leading)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .shadow(
      color: DesignTokens.Shadow.sm.color,
      radius: DesignTokens.Shadow.sm.radius,
      y: DesignTokens.Shadow.sm.y
    )
  }
}

// MARK: - Yearly Review Section

struct YearlyReviewSection: View {
  let review: YearlyReview

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.md) {
      HStack {
        Text(String(format: "stats.year_review".localized, review.year))
          .font(.headline)
          .foregroundStyle(.secondary)

        Spacer()

        if let yoy = review.yearOverYear {
          YearOverYearBadge(change: yoy.tripsChange)
        }
      }

      // Highlights
      VStack(spacing: DesignTokens.Spacing.sm) {
        if let firstTrip = review.firstTripOfYear {
          HighlightRow(
            icon: "flag.fill",
            title: "stats.first_trip".localized,
            subtitle: "\(firstTrip.cityName) - \(firstTrip.title)",
            color: .green
          )
        }

        if let longestTrip = review.longestTrip {
          HighlightRow(
            icon: "clock.fill",
            title: "stats.longest_trip".localized,
            subtitle: "\(longestTrip.cityName) - " + String(format: "stats.days_suffix".localized, longestTrip.days),
            color: .orange
          )
        }

        if let mostExpensive = review.mostExpensiveTrip {
          HighlightRow(
            icon: "creditcard.fill",
            title: "stats.most_expensive".localized,
            subtitle: "\(mostExpensive.title) - \(Int(mostExpensive.amount))元",
            color: .purple
          )
        }
      }
      .padding()
      .background(.background)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      .shadow(
        color: DesignTokens.Shadow.sm.color,
        radius: DesignTokens.Shadow.sm.radius,
        y: DesignTokens.Shadow.sm.y
      )
    }
  }
}

struct HighlightRow: View {
  let icon: String
  let title: String
  let subtitle: String
  let color: Color

  var body: some View {
    HStack(spacing: DesignTokens.Spacing.sm) {
      Image(systemName: icon)
        .font(.title3)
        .foregroundStyle(color)
        .frame(width: 32)

      VStack(alignment: .leading, spacing: 2) {
        Text(title)
          .font(.caption)
          .foregroundStyle(.secondary)

        Text(subtitle)
          .font(.subheadline)
          .fontWeight(.medium)
      }

      Spacer()
    }
  }
}

struct YearOverYearBadge: View {
  let change: Double

  var body: some View {
    HStack(spacing: 2) {
      Image(systemName: change >= 0 ? "arrow.up.right" : "arrow.down.right")
      Text(String(format: "%.0f%%", abs(change)))
    }
    .font(.caption)
    .fontWeight(.medium)
    .foregroundStyle(change >= 0 ? .green : .red)
    .padding(.horizontal, 8)
    .padding(.vertical, 4)
    .background((change >= 0 ? Color.green : Color.red).opacity(0.1))
    .clipShape(Capsule())
  }
}

// MARK: - Generate Review Card

struct GenerateReviewCard: View {
  let year: Int
  let onGenerate: () -> Void

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      Image(systemName: "chart.bar.doc.horizontal")
        .font(.system(size: 48))
        .foregroundStyle(DesignTokens.Colors.accent)

      Text(String(format: "stats.generate_report".localized, year))
        .font(.headline)

      Text("stats.generate_report_desc".localized)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .multilineTextAlignment(.center)

      Button(action: onGenerate) {
        Text("stats.generate_button".localized)
          .fontWeight(.semibold)
      }
      .buttonStyle(.primary)
    }
    .padding(DesignTokens.Spacing.xl)
    .frame(maxWidth: .infinity)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    .shadow(
      color: DesignTokens.Shadow.md.color,
      radius: DesignTokens.Shadow.md.radius,
      y: DesignTokens.Shadow.md.y
    )
  }
}

struct GeneratingReviewCard: View {
  var body: some View {
    VStack(spacing: DesignTokens.Spacing.md) {
      ProgressView()
        .scaleEffect(1.5)

      Text("stats.generating".localized)
        .font(.headline)

      Text("stats.analyzing".localized)
        .font(.subheadline)
        .foregroundStyle(.secondary)
    }
    .padding(DesignTokens.Spacing.xl)
    .frame(maxWidth: .infinity)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.lg))
    .shadow(
      color: DesignTokens.Shadow.md.color,
      radius: DesignTokens.Shadow.md.radius,
      y: DesignTokens.Shadow.md.y
    )
  }
}

// MARK: - Expense Breakdown Section

struct ExpenseBreakdownSection: View {
  let expenses: [ExpenseCategoryBreakdown]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("stats.expense_analysis".localized)
        .font(.headline)
        .foregroundStyle(.secondary)

      VStack(spacing: DesignTokens.Spacing.md) {
        // Pie Chart
        Chart(expenses) { expense in
          SectorMark(
            angle: .value("Amount", expense.amount),
            innerRadius: .ratio(0.5),
            angularInset: 1.5
          )
          .foregroundStyle(by: .value("Category", expense.categoryName))
          .cornerRadius(4)
        }
        .frame(height: 200)

        // Legend
        LazyVGrid(columns: [
          GridItem(.flexible()),
          GridItem(.flexible()),
        ], spacing: DesignTokens.Spacing.xs) {
          ForEach(expenses) { expense in
            HStack(spacing: 6) {
              Circle()
                .fill(categoryColor(for: expense.categoryName))
                .frame(width: 10, height: 10)

              Text(expense.categoryName)
                .font(.caption)
                .lineLimit(1)

              Spacer()

              Text(String(format: "%.0f%%", expense.percentage))
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }
      }
      .padding()
      .background(.background)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      .shadow(
        color: DesignTokens.Shadow.sm.color,
        radius: DesignTokens.Shadow.sm.radius,
        y: DesignTokens.Shadow.sm.y
      )
    }
  }

  private func categoryColor(for name: String) -> Color {
    switch name {
    case "交通": return .blue
    case "住宿": return .purple
    case "餐饮": return .orange
    case "门票": return .green
    case "购物": return .pink
    default: return .gray
    }
  }
}

// MARK: - Top Destinations Section

struct TopDestinationsSection: View {
  let destinations: [DestinationStat]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("stats.top_destinations".localized)
        .font(.headline)
        .foregroundStyle(.secondary)

      VStack(spacing: 0) {
        ForEach(Array(destinations.enumerated()), id: \.element.id) { index, destination in
          HStack(spacing: DesignTokens.Spacing.sm) {
            // Rank
            Text("\(index + 1)")
              .font(.headline)
              .fontWeight(.bold)
              .foregroundStyle(rankColor(for: index))
              .frame(width: 28)

            // City info
            VStack(alignment: .leading, spacing: 2) {
              Text(destination.cityName)
                .font(.subheadline)
                .fontWeight(.medium)

              Text(String(format: "stats.visits_days".localized, destination.visitCount, destination.totalDays))
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            // Progress bar
            GeometryReader { geometry in
              let maxVisits = destinations.first?.visitCount ?? 1
              let width = CGFloat(destination.visitCount) / CGFloat(maxVisits) * geometry.size.width

              RoundedRectangle(cornerRadius: 4)
                .fill(rankColor(for: index).opacity(0.3))
                .frame(width: width, height: 8)
            }
            .frame(width: 80, height: 8)
          }
          .padding(.vertical, DesignTokens.Spacing.sm)

          if index < destinations.count - 1 {
            Divider()
          }
        }
      }
      .padding()
      .background(.background)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      .shadow(
        color: DesignTokens.Shadow.sm.color,
        radius: DesignTokens.Shadow.sm.radius,
        y: DesignTokens.Shadow.sm.y
      )
    }
  }

  private func rankColor(for index: Int) -> Color {
    switch index {
    case 0: return .yellow
    case 1: return .gray
    case 2: return .orange
    default: return .secondary
    }
  }
}

// MARK: - Monthly Activity Section

struct MonthlyActivitySection: View {
  let activity: [MonthlyActivity]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("stats.monthly_activity".localized)
        .font(.headline)
        .foregroundStyle(.secondary)

      Chart(activity) { month in
        BarMark(
          x: .value("Month", monthName(month.month)),
          y: .value("Days", month.daysCount)
        )
        .foregroundStyle(.indigo.gradient)
        .cornerRadius(4)
      }
      .frame(height: 180)
      .chartXAxis {
        AxisMarks(values: .automatic) { value in
          AxisValueLabel {
            if let month = value.as(String.self) {
              Text(month)
                .font(.caption2)
            }
          }
        }
      }
      .padding()
      .background(.background)
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      .shadow(
        color: DesignTokens.Shadow.sm.color,
        radius: DesignTokens.Shadow.sm.radius,
        y: DesignTokens.Shadow.sm.y
      )
    }
  }

  private func monthName(_ month: Int) -> String {
    let formatter = DateFormatter()
    formatter.locale = Locale(identifier: "zh_CN")
    return formatter.shortMonthSymbols[month - 1]
  }
}

// MARK: - Achievements Section

struct AchievementsSection: View {
  let achievements: [Achievement]

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      Text("stats.achievements".localized)
        .font(.headline)
        .foregroundStyle(.secondary)

      LazyVGrid(columns: [
        GridItem(.flexible()),
        GridItem(.flexible()),
        GridItem(.flexible()),
      ], spacing: DesignTokens.Spacing.sm) {
        ForEach(achievements) { achievement in
          AchievementBadge(achievement: achievement)
        }
      }
    }
  }
}

struct AchievementBadge: View {
  let achievement: Achievement

  var body: some View {
    VStack(spacing: DesignTokens.Spacing.xs) {
      ZStack {
        Circle()
          .fill(
            LinearGradient(
              colors: [.yellow, .orange],
              startPoint: .topLeading,
              endPoint: .bottomTrailing
            )
          )
          .frame(width: 56, height: 56)

        Image(systemName: achievement.icon)
          .font(.title2)
          .foregroundStyle(.white)
      }
      .shadow(color: .orange.opacity(0.3), radius: 8, y: 4)

      Text(achievement.title)
        .font(.caption)
        .fontWeight(.medium)
        .multilineTextAlignment(.center)
        .lineLimit(2)
    }
    .padding(.vertical, DesignTokens.Spacing.sm)
    .frame(maxWidth: .infinity)
    .background(.background)
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    .shadow(
      color: DesignTokens.Shadow.sm.color,
      radius: DesignTokens.Shadow.sm.radius,
      y: DesignTokens.Shadow.sm.y
    )
  }
}

// MARK: - Year Picker Sheet

struct YearPickerSheet: View {
  @Environment(\.dismiss) private var dismiss
  @Binding var selectedYear: Int
  let availableYears: [Int]
  let onSelect: () -> Void

  var body: some View {
    NavigationStack {
      List {
        ForEach(displayYears, id: \.self) { year in
          Button {
            selectedYear = year
            dismiss()
            onSelect()
          } label: {
            HStack {
              Text(String(format: "stats.year_suffix".localized, year))
                .foregroundStyle(.primary)

              Spacer()

              if year == selectedYear {
                Image(systemName: "checkmark")
                  .foregroundStyle(DesignTokens.Colors.accent)
              }

              if !availableYears.contains(year) {
                Text("stats.no_data".localized)
                  .font(.caption)
                  .foregroundStyle(.secondary)
              }
            }
          }
        }
      }
      .navigationTitle("stats.select_year".localized)
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("common.done".localized) { dismiss() }
        }
      }
    }
    .presentationDetents([.medium])
  }

  private var displayYears: [Int] {
    let currentYear = Calendar.current.component(.year, from: Date())
    return Array((currentYear - 5)...currentYear).reversed()
  }
}

// MARK: - Preview

#Preview {
  StatsView()
}
