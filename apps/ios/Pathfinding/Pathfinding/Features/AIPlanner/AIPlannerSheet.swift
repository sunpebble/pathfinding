import SwiftUI

/// AI Travel Planner Sheet - Interactive itinerary generation
struct AIPlannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @State private var sessionId = UUID().uuidString

    // Form inputs
    @State private var destination = ""
    @State private var startDate = Date()
    @State private var endDate = Date().addingTimeInterval(3 * 24 * 60 * 60)
    @State private var travelersCount = 2
    @State private var travelStyle: TravelStyle = .moderate
    @State private var budgetRange: BudgetRange = .moderate
    @State private var selectedPreferences: Set<TravelPreference> = []

    // Planning state
    @State private var planningState: PlanningState = .input
    @State private var currentPlan: AIPlanDraft?
    @State private var aiResponse = ""
    @State private var errorMessage: String?
    @State private var feedbackText = ""

    let onImport: (SavedItinerary) -> Void

    var durationDays: Int {
        let components = Calendar.current.dateComponents([.day], from: startDate, to: endDate)
        return max(1, (components.day ?? 0) + 1)
    }

    var body: some View {
        NavigationStack {
            ZStack {
                ScrollView {
                    VStack(spacing: 20) {
                        switch planningState {
                        case .input:
                            inputSection
                        case .generating:
                            loadingSection
                        case .preview:
                            previewSection
                        case .feedback:
                            feedbackSection
                        case .error:
                            errorSection
                        }
                    }
                    .padding()
                }
            }
            .navigationTitle("AI 行程规划")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("取消") { dismiss() }
                }

                if planningState == .input {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("生成") {
                            generateItinerary()
                        }
                        .fontWeight(.semibold)
                        .disabled(destination.isEmpty)
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Input Section

    private var inputSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            // Header
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Image(systemName: "sparkles")
                        .font(.title2)
                        .foregroundStyle(.blue)

                    Text("AI 智能规划")
                        .font(.title2)
                        .fontWeight(.bold)
                }

                Text("告诉我你的旅行需求，我会为你生成详细的行程安排")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Destination
            VStack(alignment: .leading, spacing: 8) {
                Label("目的地", systemImage: "location.fill")
                    .font(.headline)

                TextField("例如：京都", text: $destination)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.done)
            }

            // Date Range
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Label("日期", systemImage: "calendar")
                        .font(.headline)

                    Spacer()

                    Text("\(durationDays) 天")
                        .font(.subheadline)
                        .foregroundStyle(.blue)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.1))
                        .clipShape(Capsule())
                }

                HStack(spacing: 12) {
                    DatePicker("开始", selection: $startDate, displayedComponents: .date)
                        .labelsHidden()

                    Image(systemName: "arrow.right")
                        .foregroundStyle(.secondary)

                    DatePicker("结束", selection: $endDate, displayedComponents: .date)
                        .labelsHidden()
                }
            }

            Divider()

            // Travel Style
            VStack(alignment: .leading, spacing: 8) {
                Label("旅行节奏", systemImage: "figure.walk")
                    .font(.headline)

                Picker("Travel Style", selection: $travelStyle) {
                    ForEach(TravelStyle.allCases, id: \.self) { style in
                        Text(style.displayName).tag(style)
                    }
                }
                .pickerStyle(.segmented)
            }

            // Budget Range
            VStack(alignment: .leading, spacing: 8) {
                Label("预算范围", systemImage: "dollarsign.circle")
                    .font(.headline)

                Picker("Budget Range", selection: $budgetRange) {
                    ForEach(BudgetRange.allCases, id: \.self) { budget in
                        Text(budget.displayName).tag(budget)
                    }
                }
                .pickerStyle(.segmented)
            }

            Divider()

            // Travelers Count
            VStack(alignment: .leading, spacing: 8) {
                Label("旅行人数", systemImage: "person.2")
                    .font(.headline)

                Stepper("\(travelersCount) 人", value: $travelersCount, in: 1...10)
            }

            // Preferences
            VStack(alignment: .leading, spacing: 8) {
                Label("旅行偏好", systemImage: "heart.fill")
                    .font(.headline)

                FlowLayout(spacing: 8) {
                    ForEach(TravelPreference.allCases, id: \.self) { pref in
                        PreferenceChip(
                            preference: pref,
                            isSelected: selectedPreferences.contains(pref)
                        ) {
                            if selectedPreferences.contains(pref) {
                                selectedPreferences.remove(pref)
                            } else {
                                selectedPreferences.insert(pref)
                            }
                        }
                    }
                }
            }
        }
    }

    // MARK: - Loading Section

    private var loadingSection: some View {
        VStack(spacing: 24) {
            Spacer()

            ProgressView()
                .scaleEffect(1.5)

            VStack(spacing: 8) {
                Text("AI 正在规划中...")
                    .font(.headline)

                Text("分析目的地特点和最佳路线")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Preview Section

    private var previewSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            // AI Response
            if !aiResponse.isEmpty {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "sparkles")
                            .foregroundStyle(.blue)
                        Text("AI 建议")
                            .font(.headline)
                    }

                    Text(aiResponse)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding()
                .background(Color.blue.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Plan Preview
            if let plan = currentPlan {
                planPreview(plan)
            }

            // Actions
            HStack(spacing: 12) {
                Button {
                    planningState = .feedback
                } label: {
                    Label("修改", systemImage: "pencil")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                Button {
                    importPlan()
                } label: {
                    Label("导入行程", systemImage: "square.and.arrow.down")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.borderedProminent)
            }
        }
    }

    // MARK: - Feedback Section

    private var feedbackSection: some View {
        VStack(alignment: .leading, spacing: 20) {
            VStack(alignment: .leading, spacing: 8) {
                Label("修改建议", systemImage: "bubble.left.and.bubble.right")
                    .font(.headline)

                Text("告诉我你想调整什么，我会重新优化行程")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            TextEditor(text: $feedbackText)
                .frame(height: 120)
                .padding(8)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            HStack(spacing: 12) {
                Button("取消") {
                    planningState = .preview
                    feedbackText = ""
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)

                Button("提交反馈") {
                    submitFeedback()
                }
                .buttonStyle(.borderedProminent)
                .frame(maxWidth: .infinity)
                .disabled(feedbackText.isEmpty)
            }
        }
    }

    // MARK: - Error Section

    private var errorSection: some View {
        VStack(spacing: 20) {
            Image(systemName: "exclamationmark.triangle")
                .font(.largeTitle)
                .foregroundStyle(.red)

            Text("生成失败")
                .font(.headline)

            if let error = errorMessage {
                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button("重试") {
                planningState = .input
                errorMessage = nil
            }
            .buttonStyle(.borderedProminent)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    // MARK: - Plan Preview Component

    private func planPreview(_ plan: AIPlanDraft) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            // Title and Summary
            VStack(alignment: .leading, spacing: 8) {
                Text(plan.title)
                    .font(.title2)
                    .fontWeight(.bold)

                Text(plan.summary)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Days Summary
            VStack(alignment: .leading, spacing: 12) {
                Text("行程概览")
                    .font(.headline)

                ForEach(plan.days) { day in
                    HStack(alignment: .top, spacing: 12) {
                        // Day Badge
                        ZStack {
                            Circle()
                                .fill(Color.blue.opacity(0.2))
                                .frame(width: 40, height: 40)

                            Text("D\(day.dayNumber)")
                                .font(.caption)
                                .fontWeight(.bold)
                                .foregroundStyle(.blue)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            if let theme = day.theme {
                                Text(theme)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }

                            Text("\(day.activities.count) 个活动")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()
                    }
                    .padding()
                    .background(Color(.systemGray6))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }

            // Budget Estimate
            if let budget = plan.estimatedBudget {
                HStack {
                    Image(systemName: "dollarsign.circle.fill")
                        .foregroundStyle(.green)
                    Text("预估花费：\(budget)")
                        .font(.subheadline)
                }
                .padding()
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(Color.green.opacity(0.1))
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
        }
    }

    // MARK: - Actions

    private func generateItinerary() {
        planningState = .generating

        Task {
            do {
                let preferences = selectedPreferences.map { $0.rawValue }
                let message = buildPlanningMessage(
                    destination: destination,
                    startDate: startDate,
                    endDate: endDate,
                    travelersCount: travelersCount,
                    travelStyle: travelStyle,
                    budgetRange: budgetRange,
                    preferences: preferences
                )

                let response = try await AIPlannerAPIClient.shared.startPlanning(
                    sessionId: sessionId,
                    message: message,
                    userId: nil
                )

                await MainActor.run {
                    aiResponse = response.response
                    currentPlan = response.plan
                    planningState = response.waitingForFeedback ? .preview : .generating
                }

                // If not waiting for feedback, poll for result
                if !response.waitingForFeedback {
                    try await pollForResult()
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    planningState = .error
                }
            }
        }
    }

    private func submitFeedback() {
        planningState = .generating

        Task {
            do {
                let response = try await AIPlannerAPIClient.shared.submitFeedback(
                    sessionId: sessionId,
                    feedback: feedbackText
                )

                await MainActor.run {
                    aiResponse = response.response
                    currentPlan = response.plan
                    feedbackText = ""
                    planningState = response.completed ? .preview : .feedback
                }
            } catch {
                await MainActor.run {
                    errorMessage = error.localizedDescription
                    planningState = .error
                }
            }
        }
    }

    private func pollForResult() async throws {
        var attempts = 0
        let maxAttempts = 10

        while attempts < maxAttempts {
            try await Task.sleep(nanoseconds: 2_000_000_000) // 2 seconds

            let status = try await AIPlannerAPIClient.shared.getStatus(sessionId: sessionId)

            if status.hasFinalPlan || status.hasDraftPlan {
                let result = try await AIPlannerAPIClient.shared.getResult(sessionId: sessionId)

                await MainActor.run {
                    currentPlan = result.plan
                    planningState = .preview
                }
                return
            }

            attempts += 1
        }

        throw NSError(domain: "AIPlannerError", code: -1, userInfo: [
            NSLocalizedDescriptionKey: "规划超时，请重试"
        ])
    }

    private func importPlan() {
        guard let plan = currentPlan else { return }

        let itinerary = plan.toSavedItinerary(destination: destination)
        onImport(itinerary)
        dismiss()
    }

    private func buildPlanningMessage(
        destination: String,
        startDate: Date,
        endDate: Date,
        travelersCount: Int,
        travelStyle: TravelStyle,
        budgetRange: BudgetRange,
        preferences: [String]
    ) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        var message = "我想规划一次去\(destination)的旅行。\n\n"
        message += "时间：\(formatter.string(from: startDate)) 至 \(formatter.string(from: endDate))\n"
        message += "天数：\(durationDays)天\n"
        message += "人数：\(travelersCount)人\n"
        message += "旅行节奏：\(travelStyle.displayName)\n"
        message += "预算：\(budgetRange.displayName)\n"

        if !preferences.isEmpty {
            message += "偏好：\(preferences.joined(separator: "、"))\n"
        }

        return message
    }
}

// MARK: - Supporting Types

enum PlanningState {
    case input
    case generating
    case preview
    case feedback
    case error
}

enum TravelStyle: String, CaseIterable {
    case relaxed = "relaxed"
    case moderate = "moderate"
    case intensive = "intensive"

    var displayName: String {
        switch self {
        case .relaxed: return "悠闲"
        case .moderate: return "适中"
        case .intensive: return "紧凑"
        }
    }
}

enum BudgetRange: String, CaseIterable {
    case budgetFriendly = "budget-friendly"
    case moderate = "moderate"
    case luxury = "luxury"

    var displayName: String {
        switch self {
        case .budgetFriendly: return "经济"
        case .moderate: return "中等"
        case .luxury: return "豪华"
        }
    }
}

enum TravelPreference: String, CaseIterable {
    case food = "美食"
    case culture = "文化"
    case nature = "自然"
    case shopping = "购物"
    case nightlife = "夜生活"
    case photography = "摄影"
    case adventure = "冒险"
    case relaxation = "休闲"

    var icon: String {
        switch self {
        case .food: return "fork.knife"
        case .culture: return "building.columns"
        case .nature: return "leaf"
        case .shopping: return "bag"
        case .nightlife: return "moon.stars"
        case .photography: return "camera"
        case .adventure: return "figure.hiking"
        case .relaxation: return "spa"
        }
    }
}

// MARK: - Preference Chip

struct PreferenceChip: View {
    let preference: TravelPreference
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: preference.icon)
                    .font(.caption)

                Text(preference.rawValue)
                    .font(.caption)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(isSelected ? Color.blue : Color(.systemGray6))
            .foregroundStyle(isSelected ? .white : .primary)
            .clipShape(Capsule())
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(in: proposal.replacingUnspecifiedDimensions().width, subviews: subviews, spacing: spacing)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(in: bounds.width, subviews: subviews, spacing: spacing)
        for (index, subview) in subviews.enumerated() {
            subview.place(at: CGPoint(x: bounds.minX + result.positions[index].x, y: bounds.minY + result.positions[index].y), proposal: .unspecified)
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var x: CGFloat = 0
            var y: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)

                if x + size.width > maxWidth && x > 0 {
                    x = 0
                    y += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: x, y: y))
                lineHeight = max(lineHeight, size.height)
                x += size.width + spacing
            }

            self.size = CGSize(width: maxWidth, height: y + lineHeight)
        }
    }
}

#Preview {
    AIPlannerSheet { _ in }
}
