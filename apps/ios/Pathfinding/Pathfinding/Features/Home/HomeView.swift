import SwiftUI

struct HomeView: View {
    @State private var guides: [BlogPost] = []
    @State private var isLoading = false
    @State private var errorMessage: String?
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Hero section
                    VStack(alignment: .leading, spacing: 8) {
                        Text("发现旅途")
                            .font(.largeTitle)
                            .fontWeight(.bold)
                        Text("探索精选旅行攻略")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                    }
                    .padding(.horizontal)
                    
                    // Featured guides
                    if isLoading {
                        ProgressView()
                            .frame(maxWidth: .infinity, minHeight: 200)
                    } else if let error = errorMessage {
                        ContentUnavailableView("加载失败", systemImage: "wifi.slash", description: Text(error))
                    } else {
                        LazyVStack(spacing: 16) {
                            ForEach(guides) { guide in
                                NavigationLink(value: guide) {
                                    GuideCard(guide: guide)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.horizontal)
                    }
                }
                .padding(.vertical)
            }
            .navigationTitle("首页")
            .navigationDestination(for: BlogPost.self) { guide in
                BlogDetailView(guide: guide)
            }
            .task {
                await loadGuides()
            }
            .refreshable {
                await loadGuides()
            }
        }
    }
    
    private func loadGuides() async {
        isLoading = true
        errorMessage = nil
        
        do {
            guides = try await APIClient.shared.fetchGuides(limit: 10)
        } catch {
            errorMessage = error.localizedDescription
        }
        
        isLoading = false
    }
}

struct GuideCard: View {
    let guide: BlogPost
    
    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Cover image
            AsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(16/9, contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(.quaternary)
                    .aspectRatio(16/9, contentMode: .fill)
                    .overlay {
                        Image(systemName: "photo")
                            .font(.largeTitle)
                            .foregroundStyle(.tertiary)
                    }
            }
            .clipShape(RoundedRectangle(cornerRadius: 12))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(guide.title)
                    .font(.headline)
                    .lineLimit(2)
                
                if let summary = guide.aiSummary ?? guide.summary {
                    Text(summary)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(2)
                }
                
                HStack {
                    if let author = guide.author {
                        Label(author, systemImage: "person.circle")
                    }
                    Spacer()
                    if guide.aiProcessedAt != nil {
                        Image(systemName: "sparkles")
                            .foregroundStyle(.purple)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal, 4)
        }
        .background(.background)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .shadow(color: .black.opacity(0.1), radius: 8, y: 4)
    }
}

#Preview {
    HomeView()
}
