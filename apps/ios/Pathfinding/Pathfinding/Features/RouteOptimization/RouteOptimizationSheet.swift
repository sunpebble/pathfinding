import SwiftUI

/// Sheet for route optimization options and results
struct RouteOptimizationSheet: View {
    let day: AiDay
    let onApply: ([AiPoi]) -> Void

    @Environment(\.dismiss) private var dismiss
    @State private var isLoading = false
    @State private var result: OptimizedRouteResult?
    @State private var comparison: RouteComparisonResult?
    @State private var error: String?
    @State private var selectedTransportMode: String = "transit"
    @State private var considerTimeWindows = true
    @State private var showOptions = false

    private let transportModes = [
        ("walking", "步行", "figure.walk"),
        ("cycling", "骑行", "bicycle"),
        ("transit", "公交", "bus.fill"),
        ("taxi", "出租车", "car.fill"),
        ("driving", "自驾", "car")
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DesignTokens.Spacing.lg) {
                    // Header info
                    headerSection

                    // Transport mode selector
                    transportModeSection

                    // Options toggle
                    optionsSection

                    // Results or loading
                    if isLoading {
                        loadingSection
                    } else if let result = result {
                        resultSection(result)
                    } else if let error = error {
                        errorSection(error)
                    } else {
                        instructionSection
                    }
                }
                .padding(DesignTokens.Spacing.lg)
            }
            .navigationTitle("路线优化")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    if result != nil {
                        Button("应用") {
                            if let optimizedPois = result?.optimizedOrder {
                                onApply(optimizedPois)
                                dismiss()
                            }
                        }
                        .fontWeight(.semibold)
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Header Section

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Image(systemName: "map")
                    .font(.title2)
                    .foregroundStyle(Color.accentColor)

                VStack(alignment: .leading) {
                    Text("Day \(day.dayNumber)")
                        .font(.headline)
                    if let theme = day.theme {
                        Text(theme)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                VStack(alignment: .trailing) {
                    Text("\(day.pois.count) 个景点")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)

                    let validPois = day.pois.filter { $0.latitude != nil && $0.latitude != 0 }
                    Text("\(validPois.count) 个有坐标")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
            }
        }
        .padding()
        .background(Color(.systemGray6))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    }

    // MARK: - Transport Mode Section

    private var transportModeSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("交通方式")
                .font(.headline)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DesignTokens.Spacing.sm) {
                    ForEach(transportModes, id: \.0) { mode in
                        TransportModeButton(
                            id: mode.0,
                            name: mode.1,
                            icon: mode.2,
                            isSelected: selectedTransportMode == mode.0
                        ) {
                            selectedTransportMode = mode.0
                        }
                    }
                }
            }
        }
    }

    // MARK: - Options Section

    private var optionsSection: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Button {
                withAnimation {
                    showOptions.toggle()
                }
            } label: {
                HStack {
                    Text("高级选项")
                        .font(.headline)
                        .foregroundStyle(.primary)

                    Spacer()

                    Image(systemName: showOptions ? "chevron.up" : "chevron.down")
                        .foregroundStyle(.secondary)
                }
            }
            .buttonStyle(.plain)

            if showOptions {
                VStack(spacing: DesignTokens.Spacing.sm) {
                    Toggle("考虑营业时间", isOn: $considerTimeWindows)
                }
                .padding()
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }

            // Optimize button
            Button {
                Task {
                    await optimizeRoute()
                }
            } label: {
                HStack {
                    Image(systemName: "wand.and.stars")
                    Text("开始优化")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
            .disabled(isLoading || day.pois.count < 2)
        }
    }

    // MARK: - Loading Section

    private var loadingSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            ProgressView()
                .scaleEffect(1.5)

            Text("正在计算最优路线...")
                .font(.subheadline)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    // MARK: - Result Section

    private func resultSection(_ result: OptimizedRouteResult) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
            // Savings summary
            savingsSummary(result.savings)

            // Route comparison
            routeComparison(result)

            // Feasibility issues
            if !result.feasibilityIssues.isEmpty {
                feasibilityIssues(result.feasibilityIssues)
            }

            // Route segments
            if !result.segments.isEmpty {
                routeSegments(result.segments)
            }
        }
    }

    private func savingsSummary(_ savings: RouteSavings) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("优化效果")
                .font(.headline)

            HStack(spacing: DesignTokens.Spacing.lg) {
                SavingCard(
                    title: "距离节省",
                    value: String(format: "%.1f km", savings.distanceKm),
                    percent: Int(savings.distancePercent),
                    icon: "arrow.triangle.swap",
                    color: .green
                )

                SavingCard(
                    title: "时间节省",
                    value: "\(savings.durationMinutes) 分钟",
                    percent: Int(savings.durationPercent),
                    icon: "clock",
                    color: .blue
                )
            }
        }
    }

    private func routeComparison(_ result: OptimizedRouteResult) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("路线对比")
                .font(.headline)

            VStack(spacing: DesignTokens.Spacing.xs) {
                // Original order
                HStack {
                    Text("原顺序")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .frame(width: 50, alignment: .leading)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 4) {
                            ForEach(Array(result.originalOrder.enumerated()), id: \.offset) { index, poi in
                                Text("\(index + 1).\(poi.name)")
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(.systemGray5))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }

                // Optimized order
                HStack {
                    Text("优化后")
                        .font(.caption)
                        .foregroundStyle(.green)
                        .frame(width: 50, alignment: .leading)

                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack(spacing: 4) {
                            ForEach(Array(result.optimizedOrder.enumerated()), id: \.offset) { index, poi in
                                Text("\(index + 1).\(poi.name)")
                                    .font(.caption2)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color.green.opacity(0.2))
                                    .clipShape(Capsule())
                            }
                        }
                    }
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
    }

    private func feasibilityIssues(_ issues: [String]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
                Image(systemName: "exclamationmark.triangle.fill")
                    .foregroundStyle(.orange)
                Text("注意事项")
                    .font(.headline)
            }

            VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
                ForEach(issues, id: \.self) { issue in
                    HStack(alignment: .top, spacing: DesignTokens.Spacing.xs) {
                        Circle()
                            .fill(.orange)
                            .frame(width: 6, height: 6)
                            .padding(.top, 6)

                        Text(issue)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
            .padding()
            .background(Color.orange.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
    }

    private func routeSegments(_ segments: [RouteSegment]) -> some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("路线详情")
                .font(.headline)

            VStack(spacing: 0) {
                ForEach(Array(segments.enumerated()), id: \.element.id) { index, segment in
                    RouteSegmentRow(segment: segment, isLast: index == segments.count - 1)
                }
            }
            .padding()
            .background(Color(.systemGray6))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
    }

    // MARK: - Error Section

    private func errorSection(_ error: String) -> some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "exclamationmark.circle")
                .font(.largeTitle)
                .foregroundStyle(.red)

            Text("优化失败")
                .font(.headline)

            Text(error)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)

            Button("重试") {
                Task {
                    await optimizeRoute()
                }
            }
            .buttonStyle(.bordered)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    // MARK: - Instruction Section

    private var instructionSection: some View {
        VStack(spacing: DesignTokens.Spacing.md) {
            Image(systemName: "arrow.triangle.branch")
                .font(.largeTitle)
                .foregroundStyle(.secondary)

            Text("选择交通方式后点击「开始优化」")
                .font(.subheadline)
                .foregroundStyle(.secondary)

            Text("系统将自动计算最短路线，减少不必要的绕路")
                .font(.caption)
                .foregroundStyle(.tertiary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DesignTokens.Spacing.xl)
    }

    // MARK: - Optimize Route

    private func optimizeRoute() async {
        isLoading = true
        error = nil
        result = nil

        let options = RouteOptimizationOptions(
            preferredTransportMode: selectedTransportMode,
            considerTimeWindows: considerTimeWindows
        )

        do {
            let optimizedResult = try await RouteOptimizationAPIClient.shared.optimizeDayRoute(day: day, options: options)
            await MainActor.run {
                self.result = optimizedResult
                self.isLoading = false
            }
        } catch {
            await MainActor.run {
                self.error = error.localizedDescription
                self.isLoading = false
            }
        }
    }
}

// MARK: - Transport Mode Button

struct TransportModeButton: View {
    let id: String
    let name: String
    let icon: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.title3)

                Text(name)
                    .font(.caption2)
            }
            .frame(width: 60, height: 60)
            .background(isSelected ? Color.accentColor : Color(.systemGray6))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Saving Card

struct SavingCard: View {
    let title: String
    let value: String
    let percent: Int
    let icon: String
    let color: Color

    var body: some View {
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.xs) {
            HStack {
                Image(systemName: icon)
                    .foregroundStyle(color)
                Text(title)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Text(value)
                .font(.headline)

            if percent > 0 {
                Text("-\(percent)%")
                    .font(.caption)
                    .foregroundStyle(color)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(color.opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
    }
}

// MARK: - Route Segment Row

struct RouteSegmentRow: View {
    let segment: RouteSegment
    let isLast: Bool

    private var transportIcon: String {
        switch segment.transportMode {
        case "walking": return "figure.walk"
        case "cycling": return "bicycle"
        case "transit": return "bus.fill"
        case "taxi": return "car.fill"
        case "driving": return "car"
        default: return "arrow.right"
        }
    }

    var body: some View {
        VStack(spacing: 0) {
            HStack(alignment: .top, spacing: DesignTokens.Spacing.sm) {
                // Timeline
                VStack(spacing: 0) {
                    Circle()
                        .fill(Color.accentColor)
                        .frame(width: 10, height: 10)

                    if !isLast {
                        Rectangle()
                            .fill(Color(.systemGray4))
                            .frame(width: 2)
                            .frame(height: 40)
                    }
                }

                // Content
                VStack(alignment: .leading, spacing: 2) {
                    Text(segment.from)
                        .font(.subheadline)
                        .fontWeight(.medium)

                    HStack(spacing: DesignTokens.Spacing.xs) {
                        Image(systemName: transportIcon)
                            .font(.caption)

                        Text(String(format: "%.1f km", segment.distanceKm))
                            .font(.caption)

                        Text("\(segment.durationMinutes) 分钟")
                            .font(.caption)

                        if let departure = segment.departureTime {
                            Text(departure)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .foregroundStyle(.secondary)
                }

                Spacer()
            }
        }
    }
}

#Preview {
    RouteOptimizationSheet(
        day: AiDay(
            dayNumber: 1,
            theme: "城市探索",
            pois: [
                AiPoi(name: "故宫", type: "景点", latitude: 39.9163, longitude: 116.3972),
                AiPoi(name: "天安门", type: "景点", latitude: 39.9087, longitude: 116.3975),
                AiPoi(name: "王府井", type: "购物", latitude: 39.9142, longitude: 116.4103)
            ]
        )
    ) { _ in }
}
