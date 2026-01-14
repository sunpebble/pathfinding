import Foundation

// MARK: - SIM Card Type

enum SimCardType: String, Codable, CaseIterable {
  case physical = "physical"
  case esim = "esim"
  case wifiDevice = "wifi_device"

  var displayName: String {
    switch self {
    case .physical: return "实体SIM卡"
    case .esim: return "eSIM"
    case .wifiDevice: return "随身WiFi"
    }
  }

  var icon: String {
    switch self {
    case .physical: return "simcard"
    case .esim: return "qrcode"
    case .wifiDevice: return "wifi"
    }
  }
}

// MARK: - Coverage Type

enum SimCardCoverageType: String, Codable, CaseIterable {
  case singleCountry = "single_country"
  case regional = "regional"
  case global = "global"

  var displayName: String {
    switch self {
    case .singleCountry: return "单国"
    case .regional: return "区域"
    case .global: return "全球"
    }
  }
}

// MARK: - Signal Quality

enum SignalQuality: String, Codable, CaseIterable {
  case excellent = "excellent"
  case good = "good"
  case average = "average"
  case poor = "poor"
  case veryPoor = "very_poor"

  var displayName: String {
    switch self {
    case .excellent: return "非常好"
    case .good: return "好"
    case .average: return "一般"
    case .poor: return "差"
    case .veryPoor: return "很差"
    }
  }

  var color: String {
    switch self {
    case .excellent: return "green"
    case .good: return "blue"
    case .average: return "yellow"
    case .poor: return "orange"
    case .veryPoor: return "red"
    }
  }

  var bars: Int {
    switch self {
    case .excellent: return 5
    case .good: return 4
    case .average: return 3
    case .poor: return 2
    case .veryPoor: return 1
    }
  }
}

// MARK: - Review Status

enum SimCardReviewStatus: String, Codable, CaseIterable {
  case pending = "pending"
  case approved = "approved"
  case rejected = "rejected"

  var displayName: String {
    switch self {
    case .pending: return "待审核"
    case .approved: return "已通过"
    case .rejected: return "已拒绝"
    }
  }
}

// MARK: - Review Vote Type

enum SimCardReviewVoteType: String, Codable {
  case helpful = "helpful"
  case notHelpful = "not_helpful"
}

// MARK: - Data Plan

struct SimCardDataPlan: Codable, Hashable {
  let dataAmount: String
  let dataAmountBytes: Int?
  let isUnlimited: Bool
  let throttledSpeedAfterLimit: String?
  let validityDays: Int
  let price: Double
  let originalPrice: Double?
  let currency: String
  let pricePerDay: Double?
  let pricePerGB: Double?

  enum CodingKeys: String, CodingKey {
    case dataAmount = "data_amount"
    case dataAmountBytes = "data_amount_bytes"
    case isUnlimited = "is_unlimited"
    case throttledSpeedAfterLimit = "throttled_speed_after_limit"
    case validityDays = "validity_days"
    case price, currency
    case originalPrice = "original_price"
    case pricePerDay = "price_per_day"
    case pricePerGB = "price_per_gb"
  }

  var formattedPrice: String {
    String(format: "%@%.0f", currencySymbol, price)
  }

  var formattedPricePerDay: String? {
    guard let ppd = pricePerDay else { return nil }
    return String(format: "%@%.1f/天", currencySymbol, ppd)
  }

  var currencySymbol: String {
    switch currency.uppercased() {
    case "CNY", "RMB": return "¥"
    case "USD": return "$"
    case "EUR": return "€"
    case "JPY": return "¥"
    default: return currency
    }
  }

  var hasDiscount: Bool {
    guard let original = originalPrice else { return false }
    return original > price
  }

  var discountPercent: Int? {
    guard let original = originalPrice, original > 0 else { return nil }
    return Int((1 - price / original) * 100)
  }
}

// MARK: - eSIM Info

struct EsimInfo: Codable, Hashable {
  let supportsQrActivation: Bool
  let supportsAppActivation: Bool
  let activationInstructions: String?
  let compatibleDevices: [String]?
  let requiresUnlockedPhone: Bool

  enum CodingKeys: String, CodingKey {
    case supportsQrActivation = "supports_qr_activation"
    case supportsAppActivation = "supports_app_activation"
    case activationInstructions = "activation_instructions"
    case compatibleDevices = "compatible_devices"
    case requiresUnlockedPhone = "requires_unlocked_phone"
  }
}

// MARK: - Delivery Option

struct DeliveryOption: Codable, Hashable {
  let method: String
  let estimatedDays: Int?
  let fee: Double?
  let description: String?

  enum CodingKeys: String, CodingKey {
    case method, fee, description
    case estimatedDays = "estimated_days"
  }

  var formattedFee: String {
    guard let fee = fee else { return "免费" }
    if fee == 0 { return "免费" }
    return String(format: "¥%.0f", fee)
  }
}

// MARK: - Physical SIM Info

struct PhysicalSimInfo: Codable, Hashable {
  let simSize: [String]
  let deliveryOptions: [DeliveryOption]?
  let pickupLocations: [String]?

  enum CodingKeys: String, CodingKey {
    case simSize = "sim_size"
    case deliveryOptions = "delivery_options"
    case pickupLocations = "pickup_locations"
  }
}

// MARK: - SIM Card Product

struct SimCard: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let nameEn: String?
  let provider: String
  let providerLogo: String?
  let cardType: String
  let destinations: [String]
  let destinationNames: [String]?
  let coverageType: String
  let regionName: String?
  let dataPlans: [SimCardDataPlan]
  let networkType: [String]
  let supportedCarriers: [String]?
  let esimInfo: EsimInfo?
  let physicalSimInfo: PhysicalSimInfo?
  let includesVoice: Bool
  let voiceMinutes: Int?
  let includesSms: Bool
  let smsCount: Int?
  let localNumber: Bool?
  let features: [String]
  let hotspotSupported: Bool
  let maxDevices: Int?
  let purchaseUrl: String
  let purchasePlatforms: [String]?
  let affiliateUrl: String?
  let rating: Double?
  let reviewCount: Int
  let salesCount: Int?
  let isActive: Bool
  let isPromoted: Bool?
  let priority: Int
  let createdAt: Int
  let updatedAt: Int

  enum CodingKeys: String, CodingKey {
    case id, name, provider, destinations, features, rating, priority
    case nameEn = "name_en"
    case providerLogo = "provider_logo"
    case cardType = "card_type"
    case destinationNames = "destination_names"
    case coverageType = "coverage_type"
    case regionName = "region_name"
    case dataPlans = "data_plans"
    case networkType = "network_type"
    case supportedCarriers = "supported_carriers"
    case esimInfo = "esim_info"
    case physicalSimInfo = "physical_sim_info"
    case includesVoice = "includes_voice"
    case voiceMinutes = "voice_minutes"
    case includesSms = "includes_sms"
    case smsCount = "sms_count"
    case localNumber = "local_number"
    case hotspotSupported = "hotspot_supported"
    case maxDevices = "max_devices"
    case purchaseUrl = "purchase_url"
    case purchasePlatforms = "purchase_platforms"
    case affiliateUrl = "affiliate_url"
    case reviewCount = "review_count"
    case salesCount = "sales_count"
    case isActive = "is_active"
    case isPromoted = "is_promoted"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  // Computed properties
  var simCardType: SimCardType? {
    SimCardType(rawValue: cardType)
  }

  var simCardCoverageType: SimCardCoverageType? {
    SimCardCoverageType(rawValue: coverageType)
  }

  var cheapestPlan: SimCardDataPlan? {
    dataPlans.min(by: { $0.price < $1.price })
  }

  var formattedStartingPrice: String {
    guard let plan = cheapestPlan else { return "价格待定" }
    return String(format: "%@%.0f起", plan.currencySymbol, plan.price)
  }

  var formattedRating: String {
    guard let r = rating else { return "暂无评分" }
    return String(format: "%.1f分", r)
  }

  var networkTypeDisplay: String {
    networkType.joined(separator: "/")
  }

  var destinationDisplay: String {
    if let names = destinationNames, !names.isEmpty {
      if names.count > 3 {
        return names.prefix(3).joined(separator: "、") + "等\(names.count)国"
      }
      return names.joined(separator: "、")
    }
    return destinations.prefix(3).joined(separator: "、")
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: SimCard, rhs: SimCard) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - SIM Card Review

struct SimCardReview: Codable, Identifiable, Hashable {
  let id: String
  let simCardId: String
  let userId: String?
  let authorName: String?
  let overallRating: Double
  let signalRating: Double?
  let speedRating: Double?
  let valueRating: Double?
  let serviceRating: Double?
  let title: String?
  let content: String
  let destination: String?
  let usageDuration: Int?
  let actualDataUsed: String?
  let deviceUsed: String?
  let pros: [String]?
  let cons: [String]?
  let activationExperience: String?
  let signalQuality: String?
  let speedTestResult: String?
  let wouldRecommend: Bool
  let imageUrls: [String]?
  let helpfulCount: Int
  let reportCount: Int
  let isVerified: Bool
  let purchaseVerified: Bool
  let status: String
  let createdAt: Int
  let updatedAt: Int?

  enum CodingKeys: String, CodingKey {
    case id, content, destination, pros, cons, status
    case simCardId = "sim_card_id"
    case userId = "user_id"
    case authorName = "author_name"
    case overallRating = "overall_rating"
    case signalRating = "signal_rating"
    case speedRating = "speed_rating"
    case valueRating = "value_rating"
    case serviceRating = "service_rating"
    case title
    case usageDuration = "usage_duration"
    case actualDataUsed = "actual_data_used"
    case deviceUsed = "device_used"
    case activationExperience = "activation_experience"
    case signalQuality = "signal_quality"
    case speedTestResult = "speed_test_result"
    case wouldRecommend = "would_recommend"
    case imageUrls = "image_urls"
    case helpfulCount = "helpful_count"
    case reportCount = "report_count"
    case isVerified = "is_verified"
    case purchaseVerified = "purchase_verified"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  var signalQualityEnum: SignalQuality? {
    guard let sq = signalQuality else { return nil }
    return SignalQuality(rawValue: sq)
  }

  var reviewStatus: SimCardReviewStatus? {
    SimCardReviewStatus(rawValue: status)
  }

  var displayName: String {
    authorName ?? "匿名用户"
  }

  var formattedRating: String {
    String(format: "%.1f", overallRating)
  }

  var formattedDate: String {
    let date = Date(timeIntervalSince1970: TimeInterval(createdAt) / 1000)
    let formatter = DateFormatter()
    formatter.dateFormat = "yyyy-MM-dd"
    return formatter.string(from: date)
  }

  var usageDurationDisplay: String? {
    guard let days = usageDuration else { return nil }
    return "\(days)天使用体验"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: SimCardReview, rhs: SimCardReview) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Review Vote

struct SimCardReviewVote: Codable, Identifiable, Hashable {
  let id: String
  let reviewId: String
  let userId: String
  let voteType: String
  let createdAt: Int

  enum CodingKeys: String, CodingKey {
    case id
    case reviewId = "review_id"
    case userId = "user_id"
    case voteType = "vote_type"
    case createdAt = "created_at"
  }

  var voteTypeEnum: SimCardReviewVoteType? {
    SimCardReviewVoteType(rawValue: voteType)
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: SimCardReviewVote, rhs: SimCardReviewVote) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Favorite SIM Card

struct FavoriteSimCard: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let simCardId: String
  let notes: String?
  let createdAt: Int
  let simCard: SimCard?

  enum CodingKeys: String, CodingKey {
    case id, notes
    case userId = "user_id"
    case simCardId = "sim_card_id"
    case createdAt = "created_at"
    case simCard = "sim_card"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: FavoriteSimCard, rhs: FavoriteSimCard) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - API Response Types

struct SimCardListResponse: Codable {
  let data: [SimCard]
}

struct SimCardResponse: Codable {
  let data: SimCard
}

struct SimCardReviewListResponse: Codable {
  let data: [SimCardReview]
}

struct SimCardReviewResponse: Codable {
  let data: SimCardReview
}

struct FavoriteSimCardListResponse: Codable {
  let data: [FavoriteSimCard]
}

struct SimCardFavoriteStatusResponse: Codable {
  let data: FavoriteStatus

  struct FavoriteStatus: Codable {
    let isFavorited: Bool

    enum CodingKeys: String, CodingKey {
      case isFavorited = "is_favorited"
    }
  }
}

struct SimCardFavoriteCountResponse: Codable {
  let data: FavoriteCount

  struct FavoriteCount: Codable {
    let count: Int
  }
}

struct SimCardToggleFavoriteResponse: Codable {
  let data: ToggleResult

  struct ToggleResult: Codable {
    let isFavorited: Bool

    enum CodingKeys: String, CodingKey {
      case isFavorited = "is_favorited"
    }
  }
}

struct SimCardCreateResponse: Codable {
  let data: CreateResult

  struct CreateResult: Codable {
    let id: String
  }
}

struct SimCardVoteResponse: Codable {
  let data: SimCardReviewVote?
}

// MARK: - Create Review Request

struct CreateSimCardReviewRequest: Encodable {
  let authorName: String?
  let overallRating: Double
  let signalRating: Double?
  let speedRating: Double?
  let valueRating: Double?
  let serviceRating: Double?
  let title: String?
  let content: String
  let destination: String?
  let usageDuration: Int?
  let actualDataUsed: String?
  let deviceUsed: String?
  let pros: [String]?
  let cons: [String]?
  let activationExperience: String?
  let signalQuality: String?
  let speedTestResult: String?
  let wouldRecommend: Bool
  let imageUrls: [String]?

  enum CodingKeys: String, CodingKey {
    case content, destination, pros, cons, title
    case authorName = "author_name"
    case overallRating = "overall_rating"
    case signalRating = "signal_rating"
    case speedRating = "speed_rating"
    case valueRating = "value_rating"
    case serviceRating = "service_rating"
    case usageDuration = "usage_duration"
    case actualDataUsed = "actual_data_used"
    case deviceUsed = "device_used"
    case activationExperience = "activation_experience"
    case signalQuality = "signal_quality"
    case speedTestResult = "speed_test_result"
    case wouldRecommend = "would_recommend"
    case imageUrls = "image_urls"
  }
}

// MARK: - Vote Request

struct SimCardVoteRequest: Encodable {
  let voteType: String

  enum CodingKeys: String, CodingKey {
    case voteType = "vote_type"
  }
}

// MARK: - Add to Favorites Request

struct AddSimCardToFavoritesRequest: Encodable {
  let notes: String?
}

// MARK: - Preview Helpers

extension SimCard {
  static var preview: SimCard {
    SimCard(
      id: "preview-1",
      name: "日本7天无限流量卡",
      nameEn: "Japan 7-Day Unlimited Data",
      provider: "CMLink",
      providerLogo: nil,
      cardType: "esim",
      destinations: ["JP"],
      destinationNames: ["日本"],
      coverageType: "single_country",
      regionName: nil,
      dataPlans: [
        SimCardDataPlan(
          dataAmount: "无限流量",
          dataAmountBytes: nil,
          isUnlimited: true,
          throttledSpeedAfterLimit: "128kbps",
          validityDays: 7,
          price: 68,
          originalPrice: 88,
          currency: "CNY",
          pricePerDay: 9.71,
          pricePerGB: nil
        )
      ],
      networkType: ["4G", "5G"],
      supportedCarriers: ["Docomo", "Softbank"],
      esimInfo: EsimInfo(
        supportsQrActivation: true,
        supportsAppActivation: true,
        activationInstructions: "扫描二维码激活",
        compatibleDevices: ["iPhone XS及以上", "Pixel 3及以上"],
        requiresUnlockedPhone: true
      ),
      physicalSimInfo: nil,
      includesVoice: false,
      voiceMinutes: nil,
      includesSms: false,
      smsCount: nil,
      localNumber: false,
      features: ["无限流量", "即买即用", "支持热点"],
      hotspotSupported: true,
      maxDevices: 5,
      purchaseUrl: "https://example.com/buy",
      purchasePlatforms: ["官网", "淘宝"],
      affiliateUrl: nil,
      rating: 4.5,
      reviewCount: 128,
      salesCount: 5000,
      isActive: true,
      isPromoted: true,
      priority: 10,
      createdAt: 1704067200000,
      updatedAt: 1704153600000
    )
  }
}

extension SimCardReview {
  static var preview: SimCardReview {
    SimCardReview(
      id: "review-1",
      simCardId: "preview-1",
      userId: "user-1",
      authorName: "旅行者小明",
      overallRating: 4.5,
      signalRating: 4.0,
      speedRating: 5.0,
      valueRating: 4.5,
      serviceRating: 4.0,
      title: "非常好用的日本流量卡",
      content: "在东京和大阪使用了一周，信号稳定，速度很快。地铁里也有信号，推荐购买！",
      destination: "日本",
      usageDuration: 7,
      actualDataUsed: "15GB",
      deviceUsed: "iPhone 15 Pro",
      pros: ["速度快", "信号稳定", "激活方便"],
      cons: ["偶尔需要重启"],
      activationExperience: "扫码即可激活，很方便",
      signalQuality: "good",
      speedTestResult: "下载50Mbps",
      wouldRecommend: true,
      imageUrls: nil,
      helpfulCount: 25,
      reportCount: 0,
      isVerified: true,
      purchaseVerified: true,
      status: "approved",
      createdAt: 1704067200000,
      updatedAt: nil
    )
  }
}
