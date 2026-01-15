import SwiftUI

/// PDF Export Sheet View
/// Allows users to configure and generate PDF exports for travel guides
struct PdfExportSheet: View {
  let guide: BlogPost
  let onDismiss: () -> Void

  @State private var selectedTemplate: PdfTemplateType = .modern
  @State private var selectedLanguage: PdfLanguage = .zh
  @State private var selectedPageSize: PdfPageSize = .A4
  @State private var includeMap = true
  @State private var includeCover = true
  @State private var includeToc = true
  @State private var includePhotos = true
  @State private var includeTransport = true
  @State private var primaryColor: Color = .indigo

  @State private var isGenerating = false
  @State private var generatedPdfUrl: URL?
  @State private var errorMessage: String?
  @State private var showShareSheet = false

  var body: some View {
    NavigationStack {
      Form {
        // Preview Section
        previewSection

        // Template Selection
        templateSection

        // Language & Page Size
        formatSection

        // Content Options
        contentOptionsSection

        // Generate Button
        generateSection
      }
      .navigationTitle("导出 PDF")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarLeading) {
          Button("取消") { onDismiss() }
        }
      }
      .sheet(isPresented: $showShareSheet) {
        if let url = generatedPdfUrl {
          ActivityShareSheet(items: [url])
        }
      }
      .alert("导出失败", isPresented: .constant(errorMessage != nil)) {
        Button("确定") { errorMessage = nil }
      } message: {
        if let error = errorMessage {
          Text(error)
        }
      }
    }
  }

  // MARK: - Preview Section

  private var previewSection: some View {
    Section {
      HStack(spacing: DesignTokens.Spacing.md) {
        // Cover image preview
        if let coverUrl = guide.coverImageUrl, let url = URL(string: coverUrl) {
          CachedAsyncImage(url: url) { image in
            image
              .resizable()
              .aspectRatio(contentMode: .fill)
          } placeholder: {
            Rectangle()
              .fill(Color(.systemGray5))
          }
          .frame(width: 80, height: 80)
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
        } else {
          RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(Color(.systemGray5))
            .frame(width: 80, height: 80)
            .overlay {
              Image(systemName: "doc.richtext")
                .font(.title)
                .foregroundStyle(.secondary)
            }
        }

        VStack(alignment: .leading, spacing: 4) {
          Text(guide.title)
            .font(.headline)
            .lineLimit(2)

          if let days = guide.aiDays {
            Text("\(days.count) 天行程")
              .font(.subheadline)
              .foregroundStyle(.secondary)
          }

          if let author = guide.authorName {
            Text("作者: \(author)")
              .font(.caption)
              .foregroundStyle(.tertiary)
          }
        }

        Spacer()
      }
      .padding(.vertical, DesignTokens.Spacing.xs)
    } header: {
      Text("预览")
    }
  }

  // MARK: - Template Section

  private var templateSection: some View {
    Section {
      ForEach(PdfTemplateType.allCases, id: \.self) { template in
        Button {
          selectedTemplate = template
        } label: {
          HStack {
            Circle()
              .fill(template.color)
              .frame(width: 24, height: 24)

            VStack(alignment: .leading, spacing: 2) {
              Text(template.displayName)
                .font(.subheadline)
                .fontWeight(.medium)
              Text(template.description)
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            if selectedTemplate == template {
              Image(systemName: "checkmark.circle.fill")
                .foregroundStyle(.blue)
            }
          }
        }
        .buttonStyle(.plain)
      }
    } header: {
      Text("模板样式")
    }
  }

  // MARK: - Format Section

  private var formatSection: some View {
    Section {
      // Language picker
      Picker("语言", selection: $selectedLanguage) {
        ForEach(PdfLanguage.allCases, id: \.self) { lang in
          Text(lang.displayName).tag(lang)
        }
      }

      // Page size picker
      Picker("页面大小", selection: $selectedPageSize) {
        ForEach(PdfPageSize.allCases, id: \.self) { size in
          Text("\(size.displayName) (\(size.description))").tag(size)
        }
      }

      // Primary color picker
      ColorPicker("主题色", selection: $primaryColor)
    } header: {
      Text("格式设置")
    }
  }

  // MARK: - Content Options Section

  private var contentOptionsSection: some View {
    Section {
      Toggle("包含封面", isOn: $includeCover)
      Toggle("包含目录", isOn: $includeToc)
      Toggle("包含地图", isOn: $includeMap)
      Toggle("包含照片", isOn: $includePhotos)
      Toggle("包含交通信息", isOn: $includeTransport)
    } header: {
      Text("内容选项")
    } footer: {
      Text("选择要包含在 PDF 中的内容")
    }
  }

  // MARK: - Generate Section

  private var generateSection: some View {
    Section {
      Button {
        Task {
          await generatePdf()
        }
      } label: {
        HStack {
          Spacer()
          if isGenerating {
            ProgressView()
              .progressViewStyle(.circular)
              .padding(.trailing, DesignTokens.Spacing.sm)
            Text("正在生成...")
          } else {
            Image(systemName: "doc.badge.arrow.up")
            Text("生成 PDF")
          }
          Spacer()
        }
        .font(.headline)
        .padding(.vertical, DesignTokens.Spacing.xs)
      }
      .disabled(isGenerating)
      .listRowBackground(DesignTokens.Colors.accent)
      .foregroundStyle(.white)
    } footer: {
      if let days = guide.aiDays {
        let poiCount = days.reduce(0) { $0 + $1.pois.count }
        Text("预计生成 \(estimatedPages(days: days.count, pois: poiCount)) 页")
      }
    }
  }

  // MARK: - Helper Methods

  private func estimatedPages(days: Int, pois: Int) -> Int {
    max(2, days + Int(ceil(Double(pois) / 4.0)))
  }

  private func generatePdf() async {
    isGenerating = true
    errorMessage = nil

    let options = PdfExportOptions(
      template: selectedTemplate.rawValue,
      language: selectedLanguage.rawValue,
      pageSize: selectedPageSize.rawValue,
      includeMap: includeMap,
      includeCover: includeCover,
      includeToc: includeToc,
      includePhotos: includePhotos,
      includeTransport: includeTransport,
      primaryColor: primaryColor.hexString,
      authorName: guide.authorName
    )

    do {
      let url = try await APIClient.shared.generateGuidePdf(
        guideId: guide.id,
        options: options
      )
      generatedPdfUrl = url
      showShareSheet = true
    } catch {
      errorMessage = error.localizedDescription
    }

    isGenerating = false
  }
}

// MARK: - Preview

#Preview {
  PdfExportSheet(
    guide: BlogPost(
      id: "preview-1",
      title: "东京5日深度游攻略",
      authorName: "旅行达人",
      content: nil,
      summary: "探索东京的传统与现代",
      coverImageUrl: nil,
      imageUrls: nil,
      sourcePlatform: "xiaohongshu",
      qualityScore: 0.85,
      viewsCount: 12500,
      likesCount: 890,
      savesCount: 456,
      createdAt: "2024-01-15",
      destinations: nil,
      aiSummary: "这是一份详细的东京5日游攻略",
      aiTips: ["提前购买JR Pass", "下载Google Maps离线地图"],
      aiBestTime: "3-5月或10-11月",
      aiDuration: "5天4夜",
      aiBudget: "人均8000-12000元",
      aiDays: [
        AiDay(dayNumber: 1, theme: "浅草寺与晴空塔", pois: []),
        AiDay(dayNumber: 2, theme: "涩谷与原宿", pois: []),
        AiDay(dayNumber: 3, theme: "迪士尼乐园", pois: []),
      ],
      aiProcessedAt: "2024-01-16"
    ),
    onDismiss: {}
  )
}
