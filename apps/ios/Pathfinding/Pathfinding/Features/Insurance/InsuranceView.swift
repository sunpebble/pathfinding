import SwiftUI

// MARK: - Insurance List View

struct InsuranceListView: View {
  private var store: InsuranceStore { InsuranceStore.shared }
  @State private var selectedTab: InsuranceTab = .recommend
  @State private var searchDestination = ""
  @State private var tripDays = 7
  @State private var showCompareSheet = false
  @State private var selectedProductsForCompare: Set<String> = []

  enum InsuranceTab: String, CaseIterable {
    case recommend = "推荐"
    case products = "全部产品"
    case myInsurance = "我的保险"
    case claimGuide = "理赔指南"
  }

  var body: some View {
    NavigationStack {
      VStack(spacing: 0) {
        // Tab Picker
        Picker("", selection: $selectedTab) {
          ForEach(InsuranceTab.allCases, id: \.self) { tab in
            Text(tab.rawValue).tag(tab)
          }
        }
        .pickerStyle(.segmented)
        .padding(.horizontal, DesignTokens.Spacing.md)
        .padding(.vertical, DesignTokens.Spacing.sm)

        // Content
        Group {
          switch selectedTab {
          case .recommend:
            recommendationView
          case .products:
            allProductsView
          case .myInsurance:
            myInsuranceView
          case .claimGuide:
            claimGuideView
          }
        }
      }
      .navigationTitle("旅行保险")
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          if selectedTab == .products && !selectedProductsForCompare.isEmpty {
            Button {
              showCompareSheet = true
            } label: {
              Label("比较 (\(selectedProductsForCompare.count))", systemImage: "arrow.left.arrow.right")
            }
          }
        }
      }
      .sheet(isPresented: $showCompareSheet) {
        InsuranceCompareView(productIds: Array(selectedProductsForCompare))
      }
    }
  }

  // MARK: - Recommendation View

  private var recommendationView: some View {
    ScrollView {
      VStack(spacing: DesignTokens.Spacing.lg) {
        // Search Card
        VStack(spacing: DesignTokens.Spacing.md) {
          HStack {
            Image(systemName: "magnifyingglass")
              .foregroundStyle(.secondary)
            TextField("输入目的地", text: $searchDestination)
              .textFieldStyle(.plain)
          }
          .padding(DesignTokens.Spacing.sm)
          .background(Color(.systemGray6))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))

          HStack {
            Text("行程天数")
              .foregroundStyle(.secondary)
            Spacer()
            Stepper("\(tripDays) 天", value: $tripDays, in: 1...365)
          }

          Button {
            Task {
              await store.getRecommendations(destination: searchDestination, tripDays: tripDays)
            }
          } label: {
            HStack {
              Image(systemName: "sparkles")
              Text("获取推荐")
            }
            .frame(maxWidth: .infinity)
          }
          .buttonStyle(.glassProminent)
          .disabled(searchDestination.isEmpty)
        }
        .padding(DesignTokens.Spacing.md)
        .cardSurface()
        .padding(.horizontal, DesignTokens.Spacing.md)

        // Risk Profile
        if let riskProfile = store.currentRiskProfile {
          RiskProfileCard(profile: riskProfile)
            .padding(.horizontal, DesignTokens.Spacing.md)
        }

        // Recommended Products
        if store.isLoadingRecommendations {
          ProgressView("获取推荐中...")
            .padding()
        } else if !store.recommendedProducts.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            HStack {
              Text("推荐保险")
                .font(.headline)
              Spacer()
              Text("\(store.recommendedProducts.count) 款")
                .font(.caption)
                .foregroundStyle(.secondary)
            }
            .padding(.horizontal, DesignTokens.Spacing.md)

            LazyVStack(spacing: DesignTokens.Spacing.sm) {
              ForEach(store.recommendedProducts) { product in
                NavigationLink {
                  InsuranceDetailView(product: product)
                } label: {
                  InsuranceProductCard(product: product)
                }
                .buttonStyle(.plain)
              }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
          }
        } else if !searchDestination.isEmpty {
          ContentUnavailableView {
            Label("暂无推荐", systemImage: "shield.slash")
          } description: {
            Text("输入目的地和行程天数获取推荐")
          }
        }
      }
      .padding(.vertical, DesignTokens.Spacing.md)
    }
    .background(Color(.systemGroupedBackground))
    .refreshable {
      if !searchDestination.isEmpty {
        await store.getRecommendations(destination: searchDestination, tripDays: tripDays)
      }
    }
  }

  // MARK: - All Products View

  private var allProductsView: some View {
    Group {
      if store.isLoadingProducts {
        ProgressView("加载中...")
      } else if store.products.isEmpty {
        ContentUnavailableView {
          Label("暂无产品", systemImage: "shield.slash")
        } description: {
          Text("下拉刷新获取保险产品")
        }
      } else {
        ScrollView {
          LazyVStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(store.products) { product in
              NavigationLink {
                InsuranceDetailView(product: product)
              } label: {
                InsuranceProductCard(
                  product: product,
                  isSelected: selectedProductsForCompare.contains(product.id),
                  onSelectForCompare: {
                    if selectedProductsForCompare.contains(product.id) {
                      selectedProductsForCompare.remove(product.id)
                    } else if selectedProductsForCompare.count < 3 {
                      selectedProductsForCompare.insert(product.id)
                    }
                  }
                )
              }
              .buttonStyle(.plain)
            }
          }
          .padding(DesignTokens.Spacing.md)
        }
        .background(Color(.systemGroupedBackground))
      }
    }
    .task {
      if store.products.isEmpty {
        await store.fetchProducts()
      }
    }
    .refreshable {
      await store.fetchProducts()
    }
  }

  // MARK: - My Insurance View

  private var myInsuranceView: some View {
    Group {
      if store.isLoadingUserInsurances {
        ProgressView("加载中...")
      } else if store.userInsurances.isEmpty {
        ContentUnavailableView {
          Label("暂无保险", systemImage: "shield")
        } description: {
          Text("您还没有购买任何旅行保险")
        } actions: {
          Button {
            selectedTab = .recommend
          } label: {
            Label("获取推荐", systemImage: "sparkles")
          }
          .buttonStyle(.glassProminent)
        }
      } else {
        ScrollView {
          LazyVStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(store.userInsurances) { insurance in
              UserInsuranceCard(insurance: insurance)
            }
          }
          .padding(DesignTokens.Spacing.md)
        }
        .background(Color(.systemGroupedBackground))
      }
    }
    .task {
      await store.fetchUserInsurances()
    }
    .refreshable {
      await store.fetchUserInsurances()
    }
  }

  // MARK: - Claim Guide View

  private var claimGuideView: some View {
    Group {
      if store.isLoadingClaimGuides {
        ProgressView("加载中...")
      } else if store.claimGuides.isEmpty {
        ContentUnavailableView {
          Label("暂无指南", systemImage: "doc.text")
        } description: {
          Text("理赔指南正在准备中")
        }
      } else {
        ScrollView {
          LazyVStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(store.claimGuides) { guide in
              NavigationLink {
                ClaimGuideDetailView(guide: guide)
              } label: {
                ClaimGuideCard(guide: guide)
              }
              .buttonStyle(.plain)
            }
          }
          .padding(DesignTokens.Spacing.md)
        }
        .background(Color(.systemGroupedBackground))
      }
    }
    .task {
      if store.claimGuides.isEmpty {
        await store.fetchClaimGuides()
      }
    }
    .refreshable {
      await store.fetchClaimGuides()
    }
  }
}

// MARK: - Insurance Product Card

struct InsuranceProductCard: View {
  let product: InsuranceProduct
  var isSelected: Bool = false
  var onSelectForCompare: (() -> Void)?

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack(alignment: .top) {
        // Provider logo or icon
        ZStack {
          RoundedRectangle(cornerRadius: DesignTokens.Radius.sm)
            .fill(
              LinearGradient(
                colors: [.indigo, .purple],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
              )
            )
            .frame(width: 50, height: 50)

          Image(systemName: product.insuranceType?.icon ?? "shield.checkered")
            .font(.title2)
            .foregroundStyle(.white)
        }

        VStack(alignment: .leading, spacing: 4) {
          HStack {
            Text(product.name)
              .font(.headline)
              .lineLimit(1)

            if let rating = product.rating {
              HStack(spacing: 2) {
                Image(systemName: "star.fill")
                  .foregroundStyle(.yellow)
                Text(String(format: "%.1f", rating))
              }
              .font(.caption)
            }
          }

          Text(product.provider)
            .font(.subheadline)
            .foregroundStyle(.secondary)

          HStack(spacing: DesignTokens.Spacing.sm) {
            Label(product.formattedPrice, systemImage: "yensign.circle")
            Label("保额 \(product.formattedCoverage)", systemImage: "shield")
          }
          .font(.caption)
          .foregroundStyle(.secondary)
        }

        Spacer()

        if let onSelect = onSelectForCompare {
          Button {
            onSelect()
          } label: {
            Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
              .foregroundStyle(isSelected ? .green : .secondary)
              .font(.title2)
          }
        } else {
          Image(systemName: "chevron.right")
            .font(.caption)
            .foregroundStyle(.tertiary)
        }
      }

      // Features tags
      ScrollView(.horizontal, showsIndicators: false) {
        HStack(spacing: DesignTokens.Spacing.xs) {
          ForEach(product.features.prefix(4), id: \.self) { feature in
            Text(feature)
              .font(.caption2)
              .padding(.horizontal, 8)
              .padding(.vertical, 4)
              .background(DesignTokens.Colors.accent.opacity(0.1))
              .foregroundStyle(DesignTokens.Colors.accent)
              .clipShape(Capsule())
          }
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(isSelected ? Color.green.opacity(0.05) : Color(.systemBackground))
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .stroke(isSelected ? Color.green : Color.clear, lineWidth: 2)
    )
    .shadow(
      color: DesignTokens.Shadow.sm.color,
      radius: DesignTokens.Shadow.sm.radius,
      y: DesignTokens.Shadow.sm.y
    )
  }
}

// MARK: - Risk Profile Card

struct RiskProfileCard: View {
  let profile: DestinationRiskProfile

  var riskColor: Color {
    switch profile.riskLevelEnum {
    case .low: return .green
    case .medium: return .yellow
    case .high: return .orange
    case .extreme: return .red
    case .none: return .gray
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "exclamationmark.triangle.fill")
          .foregroundStyle(riskColor)
        Text("目的地风险评估")
          .font(.headline)
        Spacer()
        Text(profile.riskLevelEnum?.displayName ?? profile.riskLevel)
          .font(.caption)
          .fontWeight(.semibold)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(riskColor.opacity(0.2))
          .foregroundStyle(riskColor)
          .clipShape(Capsule())
      }

      Divider()

      // Risk factors
      if !profile.riskFactors.isEmpty {
        VStack(alignment: .leading, spacing: 4) {
          Text("风险因素")
            .font(.subheadline)
            .fontWeight(.medium)

          ForEach(profile.riskFactors, id: \.self) { factor in
            HStack(alignment: .top, spacing: 8) {
              Image(systemName: "exclamationmark.circle")
                .foregroundStyle(.orange)
                .font(.caption)
              Text(factor)
                .font(.caption)
                .foregroundStyle(.secondary)
            }
          }
        }
      }

      // Travel advisory
      if let advisory = profile.travelAdvisory {
        VStack(alignment: .leading, spacing: 4) {
          Text("旅行建议")
            .font(.subheadline)
            .fontWeight(.medium)
          Text(advisory)
            .font(.caption)
            .foregroundStyle(.secondary)
        }
      }
    }
    .padding(DesignTokens.Spacing.md)
    .background(riskColor.opacity(0.05))
    .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
    .overlay(
      RoundedRectangle(cornerRadius: DesignTokens.Radius.md)
        .stroke(riskColor.opacity(0.3), lineWidth: 1)
    )
  }
}

// MARK: - User Insurance Card

struct UserInsuranceCard: View {
  let insurance: UserInsurance

  var statusColor: Color {
    switch insurance.status {
    case "active": return .green
    case "pending": return .yellow
    case "expired": return .gray
    case "cancelled": return .red
    case "claimed": return .blue
    default: return .secondary
    }
  }

  var statusText: String {
    switch insurance.status {
    case "active": return "生效中"
    case "pending": return "待生效"
    case "expired": return "已过期"
    case "cancelled": return "已取消"
    case "claimed": return "已理赔"
    default: return insurance.status
    }
  }

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        if let product = insurance.product {
          Text(product.name)
            .font(.headline)
        } else {
          Text("保险保单")
            .font(.headline)
        }

        Spacer()

        Text(statusText)
          .font(.caption)
          .fontWeight(.semibold)
          .padding(.horizontal, 8)
          .padding(.vertical, 4)
          .background(statusColor.opacity(0.2))
          .foregroundStyle(statusColor)
          .clipShape(Capsule())
      }

      if let policyNumber = insurance.policyNumber {
        HStack {
          Text("保单号:")
            .foregroundStyle(.secondary)
          Text(policyNumber)
            .fontWeight(.medium)
        }
        .font(.caption)
      }

      HStack(spacing: DesignTokens.Spacing.md) {
        VStack(alignment: .leading) {
          Text("保障期间")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text("\(insurance.startDate) - \(insurance.endDate)")
            .font(.caption)
        }

        Spacer()

        VStack(alignment: .trailing) {
          Text("保费")
            .font(.caption)
            .foregroundStyle(.secondary)
          Text(insurance.formattedPrice)
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(DesignTokens.Colors.accent)
        }
      }

      // Destinations
      if !insurance.destinations.isEmpty {
        HStack {
          Image(systemName: "mappin")
            .foregroundStyle(.secondary)
          Text(insurance.destinations.joined(separator: ", "))
            .lineLimit(1)
        }
        .font(.caption)
        .foregroundStyle(.secondary)
      }

      // Insured persons count
      HStack {
        Image(systemName: "person.2")
          .foregroundStyle(.secondary)
        Text("被保人: \(insurance.insuredPersons.count)人")
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface()
  }
}

// MARK: - Claim Guide Card

struct ClaimGuideCard: View {
  let guide: ClaimGuide

  var body: some View {
    VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
      HStack {
        Image(systemName: "doc.text")
          .foregroundStyle(DesignTokens.Colors.accent)
        Text(guide.title)
          .font(.headline)
        Spacer()
        Image(systemName: "chevron.right")
          .font(.caption)
          .foregroundStyle(.tertiary)
      }

      Text(guide.content)
        .font(.subheadline)
        .foregroundStyle(.secondary)
        .lineLimit(2)

      HStack(spacing: DesignTokens.Spacing.sm) {
        Label("\(guide.steps.count)步骤", systemImage: "list.number")
        Label("\(guide.requiredDocuments.count)材料", systemImage: "doc.on.doc")
        if let timeLimit = guide.timeLimit {
          Label(timeLimit, systemImage: "clock")
        }
      }
      .font(.caption)
      .foregroundStyle(.secondary)
    }
    .padding(DesignTokens.Spacing.md)
    .cardSurface()
  }
}

// MARK: - Insurance Detail View

struct InsuranceDetailView: View {
  let product: InsuranceProduct
  @Environment(\.openURL) private var openURL

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
        // Header
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          HStack {
            Text(product.name)
              .font(.title2)
              .fontWeight(.bold)

            if let rating = product.rating {
              HStack(spacing: 4) {
                Image(systemName: "star.fill")
                  .foregroundStyle(.yellow)
                Text(String(format: "%.1f", rating))
                Text("(\(product.reviewCount))")
                  .foregroundStyle(.secondary)
              }
              .font(.subheadline)
            }
          }

          Text(product.provider)
            .font(.subheadline)
            .foregroundStyle(.secondary)

          HStack(spacing: DesignTokens.Spacing.lg) {
            VStack(alignment: .leading) {
              Text("保费")
                .font(.caption)
                .foregroundStyle(.secondary)
              Text(product.formattedPrice)
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(DesignTokens.Colors.accent)
            }

            VStack(alignment: .leading) {
              Text("最高保额")
                .font(.caption)
                .foregroundStyle(.secondary)
              Text(product.formattedCoverage)
                .font(.title3)
                .fontWeight(.semibold)
            }

            VStack(alignment: .leading) {
              Text("保障天数")
                .font(.caption)
                .foregroundStyle(.secondary)
              Text("\(product.minDays)-\(product.maxDays)天")
                .font(.title3)
                .fontWeight(.semibold)
            }
          }
        }
        .padding(DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))

        // Coverage Details
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Text("保障内容")
            .font(.headline)
            .padding(.horizontal, DesignTokens.Spacing.md)

          VStack(spacing: 0) {
            ForEach(Array(product.coverageDetails.enumerated()), id: \.offset) { index, detail in
              HStack {
                VStack(alignment: .leading, spacing: 2) {
                  Text(detail.item)
                    .font(.subheadline)
                  if let desc = detail.description {
                    Text(desc)
                      .font(.caption)
                      .foregroundStyle(.secondary)
                  }
                }
                Spacer()
                Text(detail.formattedAmount)
                  .font(.subheadline)
                  .fontWeight(.medium)
                  .foregroundStyle(DesignTokens.Colors.accent)
              }
              .padding(DesignTokens.Spacing.sm)

              if index < product.coverageDetails.count - 1 {
                Divider()
                  .padding(.leading, DesignTokens.Spacing.sm)
              }
            }
          }
          .background(Color(.systemBackground))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
          .padding(.horizontal, DesignTokens.Spacing.md)
        }

        // Features
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Text("产品特点")
            .font(.headline)
            .padding(.horizontal, DesignTokens.Spacing.md)

          VStack(alignment: .leading, spacing: 8) {
            ForEach(product.features, id: \.self) { feature in
              HStack(alignment: .top, spacing: 8) {
                Image(systemName: "checkmark.circle.fill")
                  .foregroundStyle(.green)
                Text(feature)
                  .font(.subheadline)
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Color(.systemBackground))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
          .padding(.horizontal, DesignTokens.Spacing.md)
        }

        // Exclusions
        if let exclusions = product.exclusions, !exclusions.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("不保事项")
              .font(.headline)
              .padding(.horizontal, DesignTokens.Spacing.md)

            VStack(alignment: .leading, spacing: 8) {
              ForEach(exclusions, id: \.self) { exclusion in
                HStack(alignment: .top, spacing: 8) {
                  Image(systemName: "xmark.circle")
                    .foregroundStyle(.red)
                  Text(exclusion)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                }
              }
            }
            .padding(DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .padding(.horizontal, DesignTokens.Spacing.md)
          }
        }

        // Contact Info
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Text("联系方式")
            .font(.headline)
            .padding(.horizontal, DesignTokens.Spacing.md)

          VStack(spacing: 8) {
            if let phone = product.contactPhone {
              HStack {
                Image(systemName: "phone")
                  .foregroundStyle(DesignTokens.Colors.accent)
                Text(phone)
                Spacer()
                Button {
                  if let url = URL(string: "tel:\(phone)") {
                    openURL(url)
                  }
                } label: {
                  Text("拨打")
                    .font(.caption)
                }
                .buttonStyle(.glass)
              }
            }

            if let email = product.contactEmail {
              HStack {
                Image(systemName: "envelope")
                  .foregroundStyle(DesignTokens.Colors.accent)
                Text(email)
                Spacer()
              }
            }
          }
          .font(.subheadline)
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Color(.systemBackground))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
          .padding(.horizontal, DesignTokens.Spacing.md)
        }

        // Purchase Button
        Button {
          if let url = URL(string: product.purchaseUrl) {
            openURL(url)
          }
        } label: {
          HStack {
            Image(systemName: "cart")
            Text("立即投保")
          }
          .frame(maxWidth: .infinity)
          .padding(.vertical, DesignTokens.Spacing.sm)
        }
        .buttonStyle(.glassProminent)
        .padding(.horizontal, DesignTokens.Spacing.md)
      }
      .padding(.vertical, DesignTokens.Spacing.md)
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("保险详情")
    .navigationBarTitleDisplayMode(.inline)
  }
}

// MARK: - Insurance Compare View

struct InsuranceCompareView: View {
  let productIds: [String]
  @Environment(\.dismiss) private var dismiss
  @State private var products: [InsuranceProduct] = []
  @State private var isLoading = true

  private var store: InsuranceStore { InsuranceStore.shared }

  var body: some View {
    NavigationStack {
      Group {
        if isLoading {
          ProgressView("加载中...")
        } else if products.isEmpty {
          ContentUnavailableView("无法加载", systemImage: "xmark.circle")
        } else {
          compareContent
        }
      }
      .navigationTitle("产品比较")
      .navigationBarTitleDisplayMode(.inline)
      .toolbar {
        ToolbarItem(placement: .topBarTrailing) {
          Button("完成") { dismiss() }
        }
      }
    }
    .task {
      products = await store.compareProducts(productIds: productIds)
      isLoading = false
    }
  }

  private var compareContent: some View {
    ScrollView {
      VStack(spacing: 0) {
        // Product headers
        HStack(spacing: 1) {
          Text("对比项")
            .font(.caption)
            .fontWeight(.medium)
            .frame(width: 80)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(Color(.systemGray5))

          ForEach(products) { product in
            VStack(spacing: 4) {
              Text(product.name)
                .font(.caption)
                .fontWeight(.semibold)
                .lineLimit(2)
                .multilineTextAlignment(.center)
              Text(product.provider)
                .font(.caption2)
                .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DesignTokens.Spacing.sm)
            .background(Color(.systemGray5))
          }
        }

        // Compare rows
        compareRow("保费", values: products.map { $0.formattedPrice })
        compareRow("保额", values: products.map { $0.formattedCoverage })
        compareRow("天数范围", values: products.map { "\($0.minDays)-\($0.maxDays)天" })
        compareRow("评分", values: products.map {
          $0.rating != nil ? String(format: "%.1f", $0.rating!) : "-"
        })
        compareRow("评价数", values: products.map { "\($0.reviewCount)" })
      }
      .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
      .padding(DesignTokens.Spacing.md)
    }
    .background(Color(.systemGroupedBackground))
  }

  private func compareRow(_ title: String, values: [String]) -> some View {
    HStack(spacing: 1) {
      Text(title)
        .font(.caption)
        .frame(width: 80)
        .padding(.vertical, DesignTokens.Spacing.xs)
        .background(Color(.systemBackground))

      ForEach(Array(values.enumerated()), id: \.offset) { _, value in
        Text(value)
          .font(.caption)
          .frame(maxWidth: .infinity)
          .padding(.vertical, DesignTokens.Spacing.xs)
          .background(Color(.systemBackground))
      }
    }
  }
}

// MARK: - Claim Guide Detail View

struct ClaimGuideDetailView: View {
  let guide: ClaimGuide
  @Environment(\.openURL) private var openURL

  var body: some View {
    ScrollView {
      VStack(alignment: .leading, spacing: DesignTokens.Spacing.lg) {
        // Header
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Text(guide.title)
            .font(.title2)
            .fontWeight(.bold)

          Text(guide.content)
            .font(.subheadline)
            .foregroundStyle(.secondary)

          if let timeLimit = guide.timeLimit {
            HStack {
              Image(systemName: "clock")
                .foregroundStyle(.orange)
              Text("时限: \(timeLimit)")
            }
            .font(.subheadline)
          }
        }
        .padding(DesignTokens.Spacing.md)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.systemBackground))

        // Required Documents
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Text("所需材料")
            .font(.headline)
            .padding(.horizontal, DesignTokens.Spacing.md)

          VStack(alignment: .leading, spacing: 8) {
            ForEach(guide.requiredDocuments, id: \.self) { doc in
              HStack(alignment: .top, spacing: 8) {
                Image(systemName: "doc.text")
                  .foregroundStyle(DesignTokens.Colors.accent)
                Text(doc)
                  .font(.subheadline)
              }
            }
          }
          .padding(DesignTokens.Spacing.md)
          .frame(maxWidth: .infinity, alignment: .leading)
          .background(Color(.systemBackground))
          .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
          .padding(.horizontal, DesignTokens.Spacing.md)
        }

        // Steps
        VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
          Text("理赔步骤")
            .font(.headline)
            .padding(.horizontal, DesignTokens.Spacing.md)

          VStack(spacing: DesignTokens.Spacing.sm) {
            ForEach(guide.steps, id: \.stepNumber) { step in
              VStack(alignment: .leading, spacing: 8) {
                HStack {
                  ZStack {
                    Circle()
                      .fill(DesignTokens.Colors.accent)
                      .frame(width: 28, height: 28)
                    Text("\(step.stepNumber)")
                      .font(.caption)
                      .fontWeight(.bold)
                      .foregroundStyle(.white)
                  }
                  Text(step.title)
                    .font(.subheadline)
                    .fontWeight(.semibold)
                }

                Text(step.description)
                  .font(.caption)
                  .foregroundStyle(.secondary)
                  .padding(.leading, 36)

                if let tips = step.tips {
                  HStack(alignment: .top, spacing: 4) {
                    Image(systemName: "lightbulb")
                      .foregroundStyle(.yellow)
                    Text(tips)
                  }
                  .font(.caption)
                  .padding(.leading, 36)
                }
              }
              .padding(DesignTokens.Spacing.sm)
              .frame(maxWidth: .infinity, alignment: .leading)
              .background(Color(.systemBackground))
              .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
            }
          }
          .padding(.horizontal, DesignTokens.Spacing.md)
        }

        // FAQs
        if let faqs = guide.faqs, !faqs.isEmpty {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("常见问题")
              .font(.headline)
              .padding(.horizontal, DesignTokens.Spacing.md)

            VStack(spacing: DesignTokens.Spacing.xs) {
              ForEach(faqs, id: \.question) { faq in
                DisclosureGroup {
                  Text(faq.answer)
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
                    .padding(.top, 4)
                } label: {
                  Text(faq.question)
                    .font(.subheadline)
                    .fontWeight(.medium)
                }
                .padding(DesignTokens.Spacing.sm)
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.sm))
              }
            }
            .padding(.horizontal, DesignTokens.Spacing.md)
          }
        }

        // Contact Info
        if let contact = guide.contactInfo {
          VStack(alignment: .leading, spacing: DesignTokens.Spacing.sm) {
            Text("联系方式")
              .font(.headline)
              .padding(.horizontal, DesignTokens.Spacing.md)

            VStack(spacing: 8) {
              if let phone = contact.phone {
                HStack {
                  Image(systemName: "phone")
                    .foregroundStyle(DesignTokens.Colors.accent)
                  Text(phone)
                  Spacer()
                  Button {
                    if let url = URL(string: "tel:\(phone)") {
                      openURL(url)
                    }
                  } label: {
                    Text("拨打")
                      .font(.caption)
                  }
                  .buttonStyle(.glass)
                }
              }

              if let email = contact.email {
                HStack {
                  Image(systemName: "envelope")
                    .foregroundStyle(DesignTokens.Colors.accent)
                  Text(email)
                  Spacer()
                }
              }

              if let website = contact.website {
                HStack {
                  Image(systemName: "globe")
                    .foregroundStyle(DesignTokens.Colors.accent)
                  Text(website)
                    .lineLimit(1)
                  Spacer()
                  Button {
                    if let url = URL(string: website) {
                      openURL(url)
                    }
                  } label: {
                    Text("访问")
                      .font(.caption)
                  }
                  .buttonStyle(.glass)
                }
              }
            }
            .font(.subheadline)
            .padding(DesignTokens.Spacing.md)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(Color(.systemBackground))
            .clipShape(RoundedRectangle(cornerRadius: DesignTokens.Radius.md))
            .padding(.horizontal, DesignTokens.Spacing.md)
          }
        }
      }
      .padding(.vertical, DesignTokens.Spacing.md)
    }
    .background(Color(.systemGroupedBackground))
    .navigationTitle("理赔指南")
    .navigationBarTitleDisplayMode(.inline)
  }
}

// MARK: - Previews

#Preview("Insurance List") {
  InsuranceListView()
}

#Preview("Product Card") {
  InsuranceProductCard(
    product: InsuranceProduct(
      id: "1",
      name: "旅行综合保险",
      nameEn: "Travel Comprehensive",
      provider: "平安保险",
      providerLogo: nil,
      type: "comprehensive",
      coverageAmount: 500000,
      coverageDetails: [
        CoverageDetail(item: "意外身故", amount: 500000, description: nil),
        CoverageDetail(item: "医疗费用", amount: 100000, description: "包含门诊和住院")
      ],
      pricePerDay: 15,
      minDays: 1,
      maxDays: 90,
      applicableRegions: ["全球"],
      domesticOnly: false,
      riskLevelCoverage: ["low", "medium", "high"],
      features: ["24小时全球救援", "医疗费用垫付", "航班延误补偿"],
      exclusions: ["既往疾病", "极限运动"],
      rating: 4.5,
      reviewCount: 1234,
      purchaseUrl: "https://example.com",
      contactPhone: "400-123-4567",
      contactEmail: "service@example.com",
      isActive: true,
      priority: 100,
      createdAt: "2024-01-01",
      updatedAt: "2024-01-01"
    )
  )
  .padding()
}
