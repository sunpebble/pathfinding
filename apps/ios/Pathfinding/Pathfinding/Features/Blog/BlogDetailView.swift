import SwiftUI
import MapKit

struct BlogDetailView: View {
    let guide: BlogPost
    @State private var selectedDay: AiDay?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 20) {
                // Cover image
                AsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
                    image
                        .resizable()
                        .aspectRatio(16/9, contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(.quaternary)
                        .aspectRatio(16/9, contentMode: .fill)
                }
                .frame(maxWidth: .infinity)
                .clipped()
                
                VStack(alignment: .leading, spacing: 16) {
                    // Title
                    Text(guide.title)
                        .font(.title2)
                        .fontWeight(.bold)
                    
                    // Author & stats
                    HStack {
                        if let author = guide.author {
                            Label(author, systemImage: "person.circle")
                        }
                        Spacer()
                        if let views = guide.viewCount {
                            Label("\(views)", systemImage: "eye")
                        }
                        if let likes = guide.likeCount {
                            Label("\(likes)", systemImage: "heart")
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    
                    // AI Summary
                    if let summary = guide.aiSummary {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("AI 摘要", systemImage: "sparkles")
                                .font(.headline)
                                .foregroundStyle(.purple)
                            Text(summary)
                                .font(.body)
                        }
                        .padding()
                        .background(.purple.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    
                    // AI Trip Info
                    if guide.aiDuration != nil || guide.aiBudget != nil || guide.aiBestTime != nil {
                        HStack(spacing: 16) {
                            if let duration = guide.aiDuration {
                                InfoBadge(icon: "calendar", title: "时长", value: duration)
                            }
                            if let budget = guide.aiBudget {
                                InfoBadge(icon: "yensign.circle", title: "预算", value: budget)
                            }
                            if let bestTime = guide.aiBestTime {
                                InfoBadge(icon: "sun.max", title: "最佳时间", value: bestTime)
                            }
                        }
                    }
                    
                    // AI Days
                    if let days = guide.aiDays, !days.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Label("行程安排", systemImage: "map")
                                .font(.headline)
                            
                            ForEach(days) { day in
                                DayCard(day: day) {
                                    selectedDay = day
                                }
                            }
                        }
                    }
                    
                    // Tips
                    if let tips = guide.aiTips, !tips.isEmpty {
                        VStack(alignment: .leading, spacing: 8) {
                            Label("旅行贴士", systemImage: "lightbulb")
                                .font(.headline)
                            
                            ForEach(tips, id: \.self) { tip in
                                HStack(alignment: .top) {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(.green)
                                    Text(tip)
                                }
                                .font(.subheadline)
                            }
                        }
                        .padding()
                        .background(.green.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }
                    
                    // Import to itinerary button
                    if guide.aiDays != nil {
                        NavigationLink {
                            ImportedItineraryView(guide: guide)
                        } label: {
                            Label("导入行程", systemImage: "square.and.arrow.down")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                    }
                }
                .padding()
            }
        }
        .navigationBarTitleDisplayMode(.inline)
        .sheet(item: $selectedDay) { day in
            DayDetailSheet(day: day)
        }
    }
}

struct InfoBadge: View {
    let icon: String
    let title: String
    let value: String
    
    var body: some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .font(.title3)
            Text(title)
                .font(.caption2)
                .foregroundStyle(.secondary)
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(.quaternary)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

struct DayCard: View {
    let day: AiDay
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("第 \(day.dayNumber) 天")
                        .font(.headline)
                    if let theme = day.theme {
                        Text(theme)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    Text("\(day.pois.count) 个景点")
                        .font(.caption)
                        .foregroundStyle(.tertiary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(.tertiary)
            }
            .padding()
            .background(.background)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(color: .black.opacity(0.05), radius: 4)
        }
        .buttonStyle(.plain)
    }
}

struct DayDetailSheet: View {
    let day: AiDay
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        NavigationStack {
            List(day.pois) { poi in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(poi.name)
                            .font(.headline)
                        if let type = poi.type {
                            Text(type)
                                .font(.caption)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(.blue.opacity(0.1))
                                .clipShape(Capsule())
                        }
                    }
                    if let desc = poi.description {
                        Text(desc)
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    if let address = poi.address {
                        Label(address, systemImage: "mappin")
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                    }
                }
                .padding(.vertical, 4)
            }
            .navigationTitle("第 \(day.dayNumber) 天")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("完成") { dismiss() }
                }
            }
        }
    }
}

#Preview {
    NavigationStack {
        BlogDetailView(guide: BlogPost(
            id: "1",
            title: "东京5天深度游",
            author: "旅行达人",
            content: nil,
            summary: "这是一篇关于东京旅行的攻略",
            coverImage: nil,
            platform: "xiaohongshu",
            qualityScore: 85,
            viewCount: 1000,
            likeCount: 100,
            createdAt: nil,
            aiSummary: "东京是一座融合传统与现代的城市...",
            aiTips: ["提前订好JR Pass", "下载Google Maps离线地图"],
            aiBestTime: "3-5月",
            aiDuration: "5天",
            aiBudget: "8000-12000元",
            aiDays: [
                AiDay(dayNumber: 1, theme: "浅草寺与东京塔", pois: [
                    AiPoi(name: "浅草寺", type: "景点", description: "东京最古老的寺庙", latitude: 35.7147, longitude: 139.7966, address: "东京都台东区浅草2-3-1")
                ])
            ],
            aiProcessedAt: "2024-01-01"
        ))
    }
}
