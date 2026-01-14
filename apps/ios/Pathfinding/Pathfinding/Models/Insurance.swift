import Foundation

// MARK: - Insurance Type

enum InsuranceType: String, Codable, CaseIterable {
  case comprehensive = "comprehensive"
  case medical = "medical"
  case accident = "accident"
  case flightDelay = "flight_delay"
  case luggage = "luggage"
  case cancellation = "cancellation"
  case emergencyEvacuation = "emergency_evacuation"

  var displayName: String {
    switch self {
    case .comprehensive: return "综合保险"
    case .medical: return "医疗保险"
    case .accident: return "意外保险"
    case .flightDelay: return "航班延误"
    case .luggage: return "行李保险"
    case .cancellation: return "取消保险"
    case .emergencyEvacuation: return "紧急救援"
    }
  }

  var icon: String {
    switch self {
    case .comprehensive: return "shield.checkered"
    case .medical: return "cross.case"
    case .accident: return "bandage"
    case .flightDelay: return "airplane"
    case .luggage: return "suitcase"
    case .cancellation: return "xmark.circle"
    case .emergencyEvacuation: return "helicopter"
    }
  }
}

// MARK: - Risk Level

enum RiskLevel: String, Codable, CaseIterable {
  case low = "low"
  case medium = "medium"
  case high = "high"
  case extreme = "extreme"

  var displayName: String {
    switch self {
    case .low: return "低风险"
    case .medium: return "中等风险"
    case .high: return "高风险"
    case .extreme: return "极高风险"
    }
  }

  var color: String {
    switch self {
    case .low: return "green"
    case .medium: return "yellow"
    case .high: return "orange"
    case .extreme: return "red"
    }
  }
}

// MARK: - Claim Type

enum ClaimType: String, Codable, CaseIterable {
  case medical = "medical"
  case accident = "accident"
  case flightDelay = "flight_delay"
  case luggageLoss = "luggage_loss"
  case tripCancellation = "trip_cancellation"
  case emergencyEvacuation = "emergency_evacuation"
  case other = "other"

  var displayName: String {
    switch self {
    case .medical: return "医疗理赔"
    case .accident: return "意外理赔"
    case .flightDelay: return "航班延误理赔"
    case .luggageLoss: return "行李丢失理赔"
    case .tripCancellation: return "行程取消理赔"
    case .emergencyEvacuation: return "紧急救援理赔"
    case .other: return "其他理赔"
    }
  }
}

// MARK: - Insurance Product

struct InsuranceProduct: Codable, Identifiable, Hashable {
  let id: String
  let name: String
  let nameEn: String?
  let provider: String
  let providerLogo: String?
  let type: String
  let coverageAmount: Double
  let coverageDetails: [CoverageDetail]
  let pricePerDay: Double
  let minDays: Int
  let maxDays: Int
  let applicableRegions: [String]
  let domesticOnly: Bool
  let riskLevelCoverage: [String]
  let features: [String]
  let exclusions: [String]?
  let rating: Double?
  let reviewCount: Int
  let purchaseUrl: String
  let contactPhone: String?
  let contactEmail: String?
  let isActive: Bool
  let priority: Int
  let createdAt: String
  let updatedAt: String

  enum CodingKeys: String, CodingKey {
    case id, name, provider, type, features, exclusions, rating, priority
    case nameEn = "name_en"
    case providerLogo = "provider_logo"
    case coverageAmount = "coverage_amount"
    case coverageDetails = "coverage_details"
    case pricePerDay = "price_per_day"
    case minDays = "min_days"
    case maxDays = "max_days"
    case applicableRegions = "applicable_regions"
    case domesticOnly = "domestic_only"
    case riskLevelCoverage = "risk_level_coverage"
    case reviewCount = "review_count"
    case purchaseUrl = "purchase_url"
    case contactPhone = "contact_phone"
    case contactEmail = "contact_email"
    case isActive = "is_active"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  // Computed properties
  var insuranceType: InsuranceType? {
    InsuranceType(rawValue: type)
  }

  var formattedPrice: String {
    String(format: "¥%.0f/天", pricePerDay)
  }

  var formattedCoverage: String {
    if coverageAmount >= 10000 {
      return String(format: "¥%.0f万", coverageAmount / 10000)
    }
    return String(format: "¥%.0f", coverageAmount)
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: InsuranceProduct, rhs: InsuranceProduct) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Coverage Detail

struct CoverageDetail: Codable, Hashable {
  let item: String
  let amount: Double
  let description: String?

  var formattedAmount: String {
    if amount >= 10000 {
      return String(format: "¥%.0f万", amount / 10000)
    }
    return String(format: "¥%.0f", amount)
  }
}

// MARK: - User Insurance

struct UserInsurance: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let productId: String
  let itineraryId: String?
  let startDate: String
  let endDate: String
  let coverageDays: Int
  let destinations: [String]
  let insuredPersons: [InsuredPerson]
  let orderNumber: String?
  let policyNumber: String?
  let totalPrice: Double
  let paymentStatus: String
  let status: String
  let claimHistory: [InsuranceClaim]?
  let notes: String?
  let purchasedAt: String
  let createdAt: String
  let updatedAt: String
  let product: InsuranceProduct?

  enum CodingKeys: String, CodingKey {
    case id, destinations, notes, status, product
    case userId = "user_id"
    case productId = "product_id"
    case itineraryId = "itinerary_id"
    case startDate = "start_date"
    case endDate = "end_date"
    case coverageDays = "coverage_days"
    case insuredPersons = "insured_persons"
    case orderNumber = "order_number"
    case policyNumber = "policy_number"
    case totalPrice = "total_price"
    case paymentStatus = "payment_status"
    case claimHistory = "claim_history"
    case purchasedAt = "purchased_at"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  var formattedPrice: String {
    String(format: "¥%.2f", totalPrice)
  }

  var isActive: Bool {
    status == "active"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: UserInsurance, rhs: UserInsurance) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Insured Person

struct InsuredPerson: Codable, Hashable {
  let name: String
  let idType: String
  let idNumber: String
  let phone: String?
  let relationship: String

  enum CodingKeys: String, CodingKey {
    case name, phone, relationship
    case idType = "id_type"
    case idNumber = "id_number"
  }

  var relationshipDisplay: String {
    switch relationship {
    case "self": return "本人"
    case "spouse": return "配偶"
    case "child": return "子女"
    case "parent": return "父母"
    default: return "其他"
    }
  }
}

// MARK: - Insurance Claim

struct InsuranceClaim: Codable, Hashable {
  let claimId: String
  let claimDate: Int
  let claimType: String
  let claimAmount: Double
  let status: String
  let notes: String?

  enum CodingKeys: String, CodingKey {
    case notes, status
    case claimId = "claim_id"
    case claimDate = "claim_date"
    case claimType = "claim_type"
    case claimAmount = "claim_amount"
  }

  var statusDisplay: String {
    switch status {
    case "submitted": return "已提交"
    case "processing": return "处理中"
    case "approved": return "已批准"
    case "rejected": return "已拒绝"
    case "paid": return "已赔付"
    default: return status
    }
  }

  var formattedAmount: String {
    String(format: "¥%.2f", claimAmount)
  }
}

// MARK: - Destination Risk Profile

struct DestinationRiskProfile: Codable, Identifiable, Hashable {
  let id: String
  let destination: String
  let destinationCode: String?
  let riskLevel: String
  let riskFactors: [String]
  let recommendedInsuranceTypes: [String]
  let travelAdvisory: String?
  let lastUpdated: String

  enum CodingKeys: String, CodingKey {
    case id, destination, riskFactors
    case destinationCode = "destination_code"
    case riskLevel = "risk_level"
    case recommendedInsuranceTypes = "recommended_insurance_types"
    case travelAdvisory = "travel_advisory"
    case lastUpdated = "last_updated"
  }

  var riskLevelEnum: RiskLevel? {
    RiskLevel(rawValue: riskLevel)
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: DestinationRiskProfile, rhs: DestinationRiskProfile) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Claim Guide

struct ClaimGuide: Codable, Identifiable, Hashable {
  let id: String
  let title: String
  let claimType: String
  let content: String
  let steps: [ClaimStep]
  let requiredDocuments: [String]
  let timeLimit: String?
  let contactInfo: ContactInfo?
  let faqs: [FAQ]?
  let isActive: Bool
  let priority: Int
  let createdAt: String
  let updatedAt: String

  enum CodingKeys: String, CodingKey {
    case id, title, content, steps, faqs, priority
    case claimType = "claim_type"
    case requiredDocuments = "required_documents"
    case timeLimit = "time_limit"
    case contactInfo = "contact_info"
    case isActive = "is_active"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }

  func hash(into hasher: inout Hasher) {
    hasher.combine(id)
  }

  static func == (lhs: ClaimGuide, rhs: ClaimGuide) -> Bool {
    lhs.id == rhs.id
  }
}

// MARK: - Claim Step

struct ClaimStep: Codable, Hashable {
  let stepNumber: Int
  let title: String
  let description: String
  let requiredDocuments: [String]?
  let tips: String?

  enum CodingKeys: String, CodingKey {
    case title, description, tips
    case stepNumber = "step_number"
    case requiredDocuments = "required_documents"
  }
}

// MARK: - Contact Info

struct ContactInfo: Codable, Hashable {
  let phone: String?
  let email: String?
  let website: String?
}

// MARK: - FAQ

struct FAQ: Codable, Hashable {
  let question: String
  let answer: String
}

// MARK: - API Response Types

struct InsuranceProductListResponse: Codable {
  let data: [InsuranceProduct]
}

struct InsuranceRecommendationResponse: Codable {
  let data: InsuranceRecommendation
}

struct InsuranceRecommendation: Codable {
  let products: [InsuranceProduct]
  let riskProfile: DestinationRiskProfile?
  let effectiveRiskLevel: String
  let recommendedTypes: [String]

  enum CodingKeys: String, CodingKey {
    case products
    case riskProfile = "risk_profile"
    case effectiveRiskLevel = "effective_risk_level"
    case recommendedTypes = "recommended_types"
  }
}

struct UserInsuranceListResponse: Codable {
  let data: [UserInsurance]
}

struct UserInsuranceResponse: Codable {
  let data: UserInsurance
}

struct ClaimGuideListResponse: Codable {
  let data: [ClaimGuide]
}

struct ClaimGuideResponse: Codable {
  let data: ClaimGuide
}

struct DestinationRiskResponse: Codable {
  let data: DestinationRiskProfile
}
