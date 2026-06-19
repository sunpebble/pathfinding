import MapKit
import SwiftUI

struct BlogDetailView: View {
  let guide: BlogPost
  @State private var selectedDay: AiDay?
  @State private var currentImageIndex: Int = 0
  @State private var isLiked = false
  @State private var isSaved = false
  @State private var showImageViewer = false
  @State private var showPdfExport = false
  @State private var showShareSheet = false
  @State private var showSaveSuccess = false
  @State private var mediaMode: MediaMode = .images
  @State private var selectedMapPoi: AiPoi?
  @State private var isArticleExpanded = true

  private var displayImages: [String] {
    if let images = guide.imageUrls, !images.isEmpty {
      return Array(images.prefix(10))
    } else if let cover = guide.coverImage {
      return [cover]
    }
    return []
  }

  private func colorForDay(_ dayNumber: Int) -> Color {
    BlogDetailDayColors.color(forDay: dayNumber)
  }

  var body: some View {
    ZStack {
      // Explorer background
      ExplorerPageBackground(style: .minimal, accentColor: colorForDay(1))

      ScrollView {
      VStack(alignment: .leading, spacing: 0) {
        // MARK: - Media (picker + gallery/map + POI list)
        BlogDetailMediaSection(
          guide: guide,
          mediaMode: $mediaMode,
          currentImageIndex: $currentImageIndex,
          showImageViewer: $showImageViewer,
          selectedMapPoi: $selectedMapPoi
        )

        // MARK: - Content
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
          // Header: Title / Meta / Quick Info / AI Summary
          BlogDetailHeaderSection(guide: guide)

          // Article Content (Rich Text or Plain Text)
          BlogDetailContentSection(guide: guide, isArticleExpanded: $isArticleExpanded)

          // Itinerary Days / Tips / Import
          BlogDetailItinerarySection(
            guide: guide,
            selectedDay: $selectedDay,
            onImport: {
              ItineraryStore.shared.save(from: guide)
              showSaveSuccess = true
            }
          )

          // MARK: - Comments Section
          Divider()
            .padding(.vertical, DesignTokens.Spacing.sm)

          CommentSectionView(itineraryId: guide.id)
        }
        .padding(DesignTokens.Spacing.lg)
      }
    }
    .scrollContentBackground(.hidden)
    } // end ZStack
    .navigationBarTitleDisplayMode(.inline)
    .toolbar {
      ToolbarItemGroup(placement: .topBarTrailing) {
        Button {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            isLiked.toggle()
          }
        } label: {
          Image(systemName: isLiked ? "heart.fill" : "heart")
            .foregroundStyle(isLiked ? .red : .secondary)
            .symbolEffect(.bounce, value: isLiked)
        }
        .accessibilityLabel(isLiked ? "取消喜欢" : "喜欢")
        .accessibilityHint(isLiked ? "取消喜欢这篇攻略" : "标记喜欢这篇攻略")

        Button {
          withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) {
            isSaved.toggle()
          }
        } label: {
          Image(systemName: isSaved ? "bookmark.fill" : "bookmark")
            .foregroundStyle(isSaved ? .orange : .secondary)
            .symbolEffect(.bounce, value: isSaved)
        }
        .accessibilityLabel(isSaved ? "取消收藏" : "收藏")
        .accessibilityHint(isSaved ? "取消收藏这篇攻略" : "收藏这篇攻略")

        Button {
          showShareSheet = true
        } label: {
          Image(systemName: "square.and.arrow.up")
        }
        .accessibilityLabel("分享")
        .accessibilityHint("分享这篇攻略")

        // PDF Export button
        if guide.aiDays != nil {
          Button {
            showPdfExport = true
          } label: {
            Image(systemName: "doc.richtext")
          }
          .accessibilityLabel("导出 PDF")
          .accessibilityHint("将攻略导出为 PDF 文件")
        }
      }
    }
    .sheet(item: $selectedDay) { day in
      DayDetailSheet(day: day) {
        selectedDay = nil
      }
    }
    .sheet(isPresented: $showPdfExport) {
      PdfExportSheet(guide: guide) {
        showPdfExport = false
      }
    }
    .imageViewer(
      images: displayImages,
      isPresented: $showImageViewer,
      selectedIndex: $currentImageIndex
    )
    .sheet(isPresented: $showShareSheet) {
      ShareSheet(
        title: guide.title,
        subtitle: guide.author,
        content: .blogPost(guide),
        onDismiss: { showShareSheet = false }
      )
    }
    .sheet(item: $selectedMapPoi) { poi in
      BlogDetailPoiSheet(poi: poi)
    }
    .alert("保存成功", isPresented: $showSaveSuccess) {
      Button("查看我的行程") {
        // Navigate to itinerary tab if needed
      }
      Button("继续浏览", role: .cancel) {}
    } message: {
      Text("行程已保存到\"我的旅程\"")
    }
  }
}

// MARK: - Preview

#Preview {
  NavigationStack {
    BlogDetailView(
      guide: BlogPost(
        id: "preview-1",
        title: "东京 3 日深度游攻略",
        authorName: "旅行者小明",
        content: "这是一篇示例攻略原文内容。",
        contentHtml: nil,
        contentMarkdown: nil,
        summary: "东京经典三日游",
        coverImageUrl: nil,
        imageUrls: nil,
        sourcePlatform: "preview",
        qualityScore: 4.8,
        viewsCount: 1280,
        likesCount: 342,
        savesCount: 88,
        createdAt: nil,
        destinations: ["东京"],
        aiSummary: "三天玩转东京核心景点，涵盖浅草、新宿、涩谷等热门区域。",
        aiTips: ["购买 Suica 卡更方便", "避开早晚高峰乘坐地铁"],
        aiBestTime: "春季 / 秋季",
        aiDuration: "3 天",
        aiBudget: "￥5000",
        aiDays: [
          AiDay(
            dayNumber: 1,
            theme: "浅草与上野",
            pois: [
              AiPoi(name: "浅草寺", type: "景点", description: "东京最古老的寺庙", latitude: 35.7148, longitude: 139.7967, address: "东京都台东区"),
              AiPoi(name: "上野公园", type: "景点", description: "赏樱胜地", latitude: 35.7156, longitude: 139.7745, address: "东京都台东区"),
            ]
          ),
          AiDay(
            dayNumber: 2,
            theme: "新宿与涩谷",
            pois: [
              AiPoi(name: "新宿御苑", type: "景点", description: "城市中的庭园", latitude: 35.6852, longitude: 139.7100, address: "东京都新宿区"),
            ]
          ),
        ],
        aiProcessedAt: 1_700_000_000
      )
    )
  }
}
