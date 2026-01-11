import SwiftUI

struct BlogListView: View {
    @State private var guides: [BlogPost] = []
    @State private var isLoading = false
    @State private var searchText = ""
    
    var filteredGuides: [BlogPost] {
        if searchText.isEmpty {
            return guides
        }
        return guides.filter { $0.title.localizedCaseInsensitiveContains(searchText) }
    }
    
    var body: some View {
        NavigationStack {
            List(filteredGuides) { guide in
                NavigationLink(value: guide) {
                    BlogRow(guide: guide)
                }
            }
            .listStyle(.plain)
            .navigationTitle("旅行攻略")
            .searchable(text: $searchText, prompt: "搜索攻略")
            .navigationDestination(for: BlogPost.self) { guide in
                BlogDetailView(guide: guide)
            }
            .overlay {
                if isLoading {
                    ProgressView()
                } else if guides.isEmpty {
                    ContentUnavailableView("暂无攻略", systemImage: "book", description: Text("下拉刷新加载"))
                }
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
        do {
            guides = try await APIClient.shared.fetchGuides(limit: 50)
        } catch {
            print("Failed to load guides: \(error)")
        }
        isLoading = false
    }
}

struct BlogRow: View {
    let guide: BlogPost
    
    var body: some View {
        HStack(spacing: 12) {
            AsyncImage(url: URL(string: guide.coverImage ?? "")) { image in
                image
                    .resizable()
                    .aspectRatio(contentMode: .fill)
            } placeholder: {
                Rectangle()
                    .fill(.quaternary)
            }
            .frame(width: 80, height: 60)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(guide.title)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .lineLimit(2)
                
                HStack {
                    if let author = guide.author {
                        Text(author)
                    }
                    Spacer()
                    if guide.aiProcessedAt != nil {
                        Label("AI", systemImage: "sparkles")
                            .foregroundStyle(.purple)
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}

#Preview {
    BlogListView()
}
