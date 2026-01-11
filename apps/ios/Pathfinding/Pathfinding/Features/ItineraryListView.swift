import SwiftUI

struct ItineraryListView: View {
  @State private var itineraries: [SavedItinerary] = []
  @State private var showCreateSheet = false

  var body: some View {
    NavigationStack {
      Group {
        if itineraries.isEmpty {
          emptyView
        } else {
          itineraryList
        }
      }
      .navigationTitle("我的行程")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button {
            showCreateSheet = true
          } label: {
            Image(systemName: "plus.circle.fill")
              .symbolRenderingMode(.hierarchical)
          }
        }
      }
      .sheet(isPresented: $showCreateSheet) {
        CreateItinerarySheet { itinerary in
          withAnimation {
            itineraries.append(itinerary)
          }
        }
      }
    }
  }

  // MARK: - Empty View

  private var emptyView: some View {
    ContentUnavailableView {
      Label("暂无行程", systemImage: "map")
    } description: {
      Text("从攻略中导入行程，或创建新行程")
    } actions: {
      HStack(spacing: DesignTokens.Spacing.md) {
        NavigationLink {
          BlogListView()
        } label: {
          Label("浏览攻略", systemImage: "book")
        }
        .buttonStyle(.secondary)

        Button {
          showCreateSheet = true
        } label: {
          Label("新建行程", systemImage: "plus")
        }
        .buttonStyle(.primary)
      }
    }
  }

  // MARK: - Itinerary List

  private var itineraryList: some View {
    List {
      ForEach(itineraries) { itinerary in
        ItineraryCard(itinerary: itinerary)
          .listRowSeparator(.hidden)
          .listRowBackground(Color.clear)
          .listRowInsets(EdgeInsets(
            top: DesignTokens.Spacing.xxs,
            leading: DesignTokens.Spacing.md,
            bottom: DesignTokens.Spacing.xxs,
            trailing: DesignTokens.Spacing.md
          ))
      }
      .onDelete { indexSet in
        itineraries.remove(atOffsets: indexSet)
      }
    }
    .listStyle(.plain)
    .scrollContentBackground(.hidden)
    .background(Color(.systemGroupedBackground))
  }
}

// MARK: - Itinerary Card

struct ItineraryCard: View {
  let itinerary: SavedItinerary

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        // Cover image or gradient
        ZStack {
          RoundedRectangle(cornerRadius: DesignTokens.Radius.xs)
            .fill(
              LinearGradient(
                colors: itinerary.gradientColors,
                startPoint: .topLeading,
                endPoint: .bottomTrailing
              )
            )
            .frame(width: 60, height: 60)

          Image(systemName: "map.fill")
            .font(.title2)
            .foregroundStyle(.white.opacity(0.9))
        }

        VStack(alignment: .leading, spacing: 4) {
          Text(itinerary.title)
            .font(.headline)
            .lineLimit(1)

          Text(itinerary.destination)
            .font(.subheadline)
            .foregroundStyle(.secondary)

          HStack(spacing: DesignTokens.Spacing.sm) {
            Label("\(itinerary.days)天", systemImage: "calendar")
            Label("\(itinerary.poiCount)景点", systemImage: "mappin")
          }
          .font(.caption)
          .foregroundStyle(.tertiary)
        }

        Spacer()

        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.tertiary)
      }
    }
    .padding(DesignTokens.Spacing.sm)
    .subtleCardStyle(radius: DesignTokens.Radius.md)
  }
}

// MARK: - Create Itinerary Sheet

struct CreateItinerarySheet: View {
  @Environment(\.dismiss) private var dismiss
  @State private var title = ""
  @State private var destination = ""
  @State private var startDate = Date()
  @State private var endDate = Date().addingTimeInterval(3 * 24 * 60 * 60)

  let onCreate: (SavedItinerary) -> Void

  var body: some View {
    NavigationStack {
      Form {
        Section("基本信息") {
          TextField("行程名称", text: $title)
          TextField("目的地", text: $destination)
        }

        Section("时间安排") {
          DatePicker("开始日期", selection: $startDate, displayedComponents: .date)
          DatePicker("结束日期", selection: $endDate, displayedComponents: .date)
        }
      }
      .navigationTitle("新建行程")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { dismiss() }
        }
        ToolbarItem(placement: .topBarTrailing) {
          Button("创建") {
            let days = Calendar.current.dateComponents([.day], from: startDate, to: endDate).day ?? 1
            let itinerary = SavedItinerary(
              id: UUID().uuidString,
              title: title.isEmpty ? "我的行程" : title,
              destination: destination.isEmpty ? "未知目的地" : destination,
              days: max(1, days + 1),
              poiCount: 0,
              gradientColors: [.indigo, .purple]
            )
            onCreate(itinerary)
            dismiss()
          }
          .fontWeight(.semibold)
          .disabled(title.isEmpty)
        }
      }
    }
  }
}

// MARK: - Saved Itinerary Model

struct SavedItinerary: Identifiable {
  let id: String
  let title: String
  let destination: String
  let days: Int
  let poiCount: Int
  let gradientColors: [Color]
}

#Preview {
  ItineraryListView()
}
