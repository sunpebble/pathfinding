import MapKit
import SwiftUI

struct BlogDetailView: View {
  let guide: BlogPost
  @State private var selectedDay: AiDay?

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: 20) {
        AsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
          image.resizable().aspectRatio(16 / 9, contentMode: .fill)
        } placeholder: {
          Rectangle().fill(.quaternary).aspectRatio(16 / 9, contentMode: .fill)
        }
        .frame(maxWidth: .infinity).clipped()

        VStack(alignment: .leading, spacing: 16) {
          Text(guide.title).font(.title2).fontWeight(.bold)

          HStack {
            if let author = guide.author { Label(author, systemImage: "person.circle") }
            Spacer()
            if let views = guide.viewCount { Label("\(views)", systemImage: "eye") }
            if let likes = guide.likeCount { Label("\(likes)", systemImage: "heart") }
          }
          .font(.caption).foregroundStyle(.secondary)

          if let summary = guide.aiSummary {
            VStack(alignment: .leading, spacing: 8) {
              Label("AI 摘要", systemImage: "sparkles").font(.headline).foregroundStyle(.purple)
              Text(summary).font(.body)
            }
            .padding().background(.purple.opacity(0.1)).clipShape(
              RoundedRectangle(cornerRadius: 12))
          }

          if let days = guide.aiDays, !days.isEmpty {
            VStack(alignment: .leading, spacing: 12) {
              Label("行程安排", systemImage: "map").font(.headline)
              ForEach(days) { day in
                Button {
                  selectedDay = day
                } label: {
                  HStack {
                    VStack(alignment: .leading, spacing: 4) {
                      Text("第 \(day.dayNumber) 天").font(.headline)
                      if let theme = day.theme {
                        Text(theme).font(.subheadline).foregroundStyle(.secondary)
                      }
                      Text("\(day.pois.count) 个景点").font(.caption).foregroundStyle(.tertiary)
                    }
                    Spacer()
                    Image(systemName: "chevron.right").foregroundStyle(.tertiary)
                  }
                  .padding().background(.background).clipShape(RoundedRectangle(cornerRadius: 12))
                  .shadow(color: .black.opacity(0.05), radius: 4)
                }
                .buttonStyle(.plain)
              }
            }
          }

          if let tips = guide.aiTips, !tips.isEmpty {
            VStack(alignment: .leading, spacing: 8) {
              Label("旅行贴士", systemImage: "lightbulb").font(.headline)
              ForEach(tips, id: \.self) { tip in
                HStack(alignment: .top) {
                  Image(systemName: "checkmark.circle.fill").foregroundStyle(.green)
                  Text(tip)
                }
                .font(.subheadline)
              }
            }
            .padding().background(.green.opacity(0.1)).clipShape(RoundedRectangle(cornerRadius: 12))
          }

          if guide.aiDays != nil {
            NavigationLink {
              ImportedItineraryView(guide: guide)
            } label: {
              Label("导入行程", systemImage: "square.and.arrow.down").frame(maxWidth: .infinity)
            }
            .buttonStyle(.borderedProminent)
          }
        }
        .padding()
      }
    }
    .navigationBarTitleDisplayMode(.inline)
    .sheet(item: $selectedDay) { day in
      NavigationStack {
        List(day.pois) { poi in
          VStack(alignment: .leading, spacing: 4) {
            HStack {
              Text(poi.name).font(.headline)
              if let type = poi.type {
                Text(type).font(.caption).padding(.horizontal, 6).padding(.vertical, 2).background(
                  .blue.opacity(0.1)
                ).clipShape(Capsule())
              }
            }
            if let desc = poi.description {
              Text(desc).font(.subheadline).foregroundStyle(.secondary)
            }
            if let address = poi.address {
              Label(address, systemImage: "mappin").font(.caption).foregroundStyle(.tertiary)
            }
          }
          .padding(.vertical, 4)
        }
        .navigationTitle("第 \(day.dayNumber) 天")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { ToolbarItem(placement: .topBarTrailing) { Button("完成") { selectedDay = nil } } }
      }
    }
  }
}

#Preview {
  NavigationStack {
    BlogDetailView(
      guide: BlogPost(
        id: "1", title: "测试攻略", authorName: "作者", content: nil, summary: nil, coverImageUrl: nil,
        sourcePlatform: "test", qualityScore: nil, viewsCount: 100, likesCount: 10, savesCount: 0,
        createdAt: nil,
        aiSummary: "这是AI摘要", aiTips: ["提示1"], aiBestTime: nil, aiDuration: nil, aiBudget: nil,
        aiDays: nil, aiProcessedAt: nil))
  }
}
