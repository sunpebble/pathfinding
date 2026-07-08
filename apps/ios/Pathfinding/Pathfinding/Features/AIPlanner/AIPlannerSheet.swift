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
    @State private var travelStyle: PlannerTravelStyle = .moderate
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
            .navigationTitle("planner.title".localized)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("common.cancel".localized) { dismiss() }
                }

                if planningState == .input {
                    ToolbarItem(placement: .topBarTrailing) {
                        Button("planner.generate".localized) {
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

                    Text("planner.header.title".localized)
                        .font(.title2)
                        .fontWeight(.bold)
                }

                Text("planner.header.subtitle".localized)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            // Destination
            VStack(alignment: .leading, spacing: 8) {
                Label("planner.destination".localized, systemImage: "location.fill")
                    .font(.headline)

                TextField("planner.destination.placeholder".localized, text: $destination)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.done)
            }

            // Date Range
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Label("planner.date".localized, systemImage: "calendar")
                        .font(.headline)

                    Spacer()

                    Text("planner.days".localized(durationDays))
                        .font(.subheadline)
                        .foregroundStyle(.blue)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 4)
                        .background(Color.blue.opacity(0.1))
                        .clipShape(Capsule())
                }

                HStack(spacing: 12) {
                    DatePicker("planner.date.start".localized, selection: $startDate, displayedComponents: .date)
                        .labelsHidden()

                    Image(systemName: "arrow.right")
                        .foregroundStyle(.secondary)

                    DatePicker("planner.date.end".localized, selection: $endDate, displayedComponents: .date)
                        .labelsHidden()
                }
            }

            Divider()

            // Travel Style
            VStack(alignment: .leading, spacing: 8) {
                Label("planner.style".localized, systemImage: "figure.walk")
                    .font(.headline)

                Picker("Travel Style", selection: $travelStyle) {
                    ForEach(PlannerTravelStyle.allCases, id: \.self) { style in
                        Text(style.displayName).tag(style)
                    }
                }
                .pickerStyle(.segmented)
            }

            // Budget Range
            VStack(alignment: .leading, spacing: 8) {
                Label("planner.budget".localized, systemImage: "dollarsign.circle")
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
                Label("planner.travelers".localized, systemImage: "person.2")
                    .font(.headline)

                Stepper("planner.travelers.count".localized(travelersCount), value: $travelersCount, in: 1...10)
            }

            // Preferences
            VStack(alignment: .leading, spacing: 8) {
                Label("planner.preferences".localized, systemImage: "heart.fill")
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
                Text("planner.loading.title".localized)
                    .font(.headline)

                Text("planner.loading.subtitle".localized)
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
                        Text("planner.ai_suggestion".localized)
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
                    Label("common.edit".localized, systemImage: "pencil")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(.bordered)

                Button {
                    importPlan()
                } label: {
                    Label("planner.import".localized, systemImage: "square.and.arrow.down")
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
                Label("planner.feedback.title".localized, systemImage: "bubble.left.and.bubble.right")
                    .font(.headline)

                Text("planner.feedback.subtitle".localized)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            TextEditor(text: $feedbackText)
                .frame(height: 120)
                .padding(8)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 8))

            HStack(spacing: 12) {
                Button("common.cancel".localized) {
                    planningState = .preview
                    feedbackText = ""
                }
                .buttonStyle(.bordered)
                .frame(maxWidth: .infinity)

                Button("planner.feedback.submit".localized) {
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

            Text("planner.error.title".localized)
                .font(.headline)

            if let error = errorMessage {
                Text(error)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button("common.retry".localized) {
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
                Text("planner.overview".localized)
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

                            Text("planner.activities.count".localized(day.activities.count))
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
                    Text("planner.estimated_budget".localized(budget))
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
            NSLocalizedDescriptionKey: "planner.timeout".localized
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
        travelStyle: PlannerTravelStyle,
        budgetRange: BudgetRange,
        preferences: [String]
    ) -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"

        var message = "我想规划一次去\(destination)的旅行。\n\n"
        message += "时间：\(formatter.string(from: startDate)) 至 \(formatter.string(from: endDate))\n"
        message += "天数：\(durationDays)天\n"
        message += "人数：\(travelersCount)人\n"
        message += "旅行节奏：\(travelStyle.promptValue)\n"
        message += "预算：\(budgetRange.promptValue)\n"

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

enum PlannerTravelStyle: String, CaseIterable {
    case relaxed = "relaxed"
    case moderate = "moderate"
    case intensive = "intensive"

    /// Localized label for the UI picker.
    var displayName: String {
        switch self {
        case .relaxed: return "planner.style.relaxed".localized
        case .moderate: return "planner.style.moderate".localized
        case .intensive: return "planner.style.intensive".localized
        }
    }

    /// Chinese label embedded in the AI planning prompt — the backend planner
    /// expects Chinese, so this stays fixed regardless of UI language.
    var promptValue: String {
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

    /// Localized label for the UI picker.
    var displayName: String {
        switch self {
        case .budgetFriendly: return "planner.budget.friendly".localized
        case .moderate: return "planner.budget.moderate".localized
        case .luxury: return "planner.budget.luxury".localized
        }
    }

    /// Chinese label embedded in the AI planning prompt (see PlannerTravelStyle).
    var promptValue: String {
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

    /// Localized chip label. The rawValue stays Chinese because it is sent to
    /// the AI planner backend as the preference value.
    var displayName: String {
        switch self {
        case .food: return "planner.pref.food".localized
        case .culture: return "planner.pref.culture".localized
        case .nature: return "planner.pref.nature".localized
        case .shopping: return "planner.pref.shopping".localized
        case .nightlife: return "planner.pref.nightlife".localized
        case .photography: return "planner.pref.photography".localized
        case .adventure: return "planner.pref.adventure".localized
        case .relaxation: return "planner.pref.relaxation".localized
        }
    }

    var icon: String {
        switch self {
        case .food: return "fork.knife"
        case .culture: return "building.columns"
        case .nature: return "leaf"
        case .shopping: return "bag"
        case .nightlife: return "moon.stars"
        case .photography: return "camera"
        case .adventure: return "figure.hiking"
        case .relaxation: return "beach.umbrella"
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

                Text(preference.displayName)
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

#Preview {
    AIPlannerSheet { _ in }
}
