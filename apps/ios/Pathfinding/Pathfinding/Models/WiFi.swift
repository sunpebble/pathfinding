import Foundation

// MARK: - WiFi Spot

/// Public WiFi hotspot information
struct WiFiSpot: Codable, Identifiable, Hashable {
    let id: String
    let name: String
    let nameEn: String?
    let type: WiFiSpotType
    let cityId: String
    let address: String?
    let latitude: Double
    let longitude: Double
    let ssid: String?
    let requiresPassword: Bool
    let isFree: Bool
    let speedMbps: Double?
    let openingHours: String?
    let averageRating: Double
    let ratingCount: Int
    let description: String?
    let imageUrls: [String]?
    let poiId: String?
    let isVerified: Bool
    let submittedBy: String
    let createdAt: String
    let updatedAt: String
    let distance: Double? // For nearby queries

    enum CodingKeys: String, CodingKey {
        case id
        case name
        case nameEn = "name_en"
        case type
        case cityId = "city_id"
        case address
        case latitude
        case longitude
        case ssid
        case requiresPassword = "requires_password"
        case isFree = "is_free"
        case speedMbps = "speed_mbps"
        case openingHours = "opening_hours"
        case averageRating = "average_rating"
        case ratingCount = "rating_count"
        case description
        case imageUrls = "image_urls"
        case poiId = "poi_id"
        case isVerified = "is_verified"
        case submittedBy = "submitted_by"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
        case distance
    }

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: WiFiSpot, rhs: WiFiSpot) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - WiFi Spot Type

enum WiFiSpotType: String, Codable, CaseIterable {
    case hotel
    case restaurant
    case cafe
    case airport
    case trainStation = "train_station"
    case shoppingMall = "shopping_mall"
    case library
    case coworking
    case `public`
    case other

    var displayName: String {
        switch self {
        case .hotel: return "Hotel"
        case .restaurant: return "Restaurant"
        case .cafe: return "Cafe"
        case .airport: return "Airport"
        case .trainStation: return "Train Station"
        case .shoppingMall: return "Shopping Mall"
        case .library: return "Library"
        case .coworking: return "Coworking"
        case .public: return "Public"
        case .other: return "Other"
        }
    }

    var displayNameChinese: String {
        switch self {
        case .hotel: return "酒店"
        case .restaurant: return "餐厅"
        case .cafe: return "咖啡厅"
        case .airport: return "机场"
        case .trainStation: return "火车站"
        case .shoppingMall: return "购物中心"
        case .library: return "图书馆"
        case .coworking: return "共享办公"
        case .public: return "公共"
        case .other: return "其他"
        }
    }

    var icon: String {
        switch self {
        case .hotel: return "bed.double.fill"
        case .restaurant: return "fork.knife"
        case .cafe: return "cup.and.saucer.fill"
        case .airport: return "airplane"
        case .trainStation: return "tram.fill"
        case .shoppingMall: return "bag.fill"
        case .library: return "books.vertical.fill"
        case .coworking: return "desktopcomputer"
        case .public: return "wifi"
        case .other: return "mappin.circle.fill"
        }
    }
}

// MARK: - WiFi Credential

/// User-saved WiFi password
struct WiFiCredential: Codable, Identifiable, Hashable {
    let id: String
    let userId: String
    let wifiSpotId: String?
    let name: String
    let ssid: String
    let password: String
    let securityType: SecurityType?
    let locationName: String?
    let latitude: Double?
    let longitude: Double?
    let notes: String?
    let isShared: Bool
    let lastUsedAt: String?
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case wifiSpotId = "wifi_spot_id"
        case name
        case ssid
        case password
        case securityType = "security_type"
        case locationName = "location_name"
        case latitude
        case longitude
        case notes
        case isShared = "is_shared"
        case lastUsedAt = "last_used_at"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: WiFiCredential, rhs: WiFiCredential) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - Security Type

enum SecurityType: String, Codable, CaseIterable {
    case open
    case wep
    case wpa
    case wpa2
    case wpa3
    case unknown

    var displayName: String {
        switch self {
        case .open: return "Open"
        case .wep: return "WEP"
        case .wpa: return "WPA"
        case .wpa2: return "WPA2"
        case .wpa3: return "WPA3"
        case .unknown: return "Unknown"
        }
    }
}

// MARK: - WiFi Review

/// User quality rating for a WiFi spot
struct WiFiReview: Codable, Identifiable, Hashable {
    let id: String
    let userId: String
    let wifiSpotId: String
    let speedRating: Int
    let stabilityRating: Int
    let easeOfAccessRating: Int
    let overallRating: Int
    let comment: String?
    let speedTestResult: Double?
    let connectionTime: String?
    let deviceType: String?
    let visitDate: String?
    let helpfulCount: Int
    let createdAt: String
    let updatedAt: String

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case wifiSpotId = "wifi_spot_id"
        case speedRating = "speed_rating"
        case stabilityRating = "stability_rating"
        case easeOfAccessRating = "ease_of_access_rating"
        case overallRating = "overall_rating"
        case comment
        case speedTestResult = "speed_test_result"
        case connectionTime = "connection_time"
        case deviceType = "device_type"
        case visitDate = "visit_date"
        case helpfulCount = "helpful_count"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }

    // MARK: - Hashable

    func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }

    static func == (lhs: WiFiReview, rhs: WiFiReview) -> Bool {
        lhs.id == rhs.id
    }
}

// MARK: - API Response Wrappers

struct WiFiSpotListResponse: Codable {
    let data: [WiFiSpot]
}

struct WiFiSpotResponse: Codable {
    let data: WiFiSpot
}

struct WiFiCredentialListResponse: Codable {
    let data: [WiFiCredential]
}

struct WiFiCredentialResponse: Codable {
    let data: WiFiCredential
}

struct WiFiReviewListResponse: Codable {
    let data: [WiFiReview]
}

struct WiFiReviewResponse: Codable {
    let data: WiFiReview
}

struct WiFiCreateResponse: Codable {
    let data: WiFiCreateData
}

struct WiFiCreateData: Codable {
    let id: String
}

// MARK: - Request Bodies

struct CreateWiFiSpotRequest: Codable {
    let name: String
    let nameEn: String?
    let type: String
    let cityId: String
    let address: String?
    let latitude: Double
    let longitude: Double
    let ssid: String?
    let requiresPassword: Bool
    let isFree: Bool
    let speedMbps: Double?
    let openingHours: String?
    let description: String?
    let imageUrls: [String]?
    let poiId: String?

    enum CodingKeys: String, CodingKey {
        case name
        case nameEn = "name_en"
        case type
        case cityId = "city_id"
        case address
        case latitude
        case longitude
        case ssid
        case requiresPassword = "requires_password"
        case isFree = "is_free"
        case speedMbps = "speed_mbps"
        case openingHours = "opening_hours"
        case description
        case imageUrls = "image_urls"
        case poiId = "poi_id"
    }
}

struct CreateWiFiCredentialRequest: Codable {
    let wifiSpotId: String?
    let name: String
    let ssid: String
    let password: String
    let securityType: String?
    let locationName: String?
    let latitude: Double?
    let longitude: Double?
    let notes: String?
    let isShared: Bool?

    enum CodingKeys: String, CodingKey {
        case wifiSpotId = "wifi_spot_id"
        case name
        case ssid
        case password
        case securityType = "security_type"
        case locationName = "location_name"
        case latitude
        case longitude
        case notes
        case isShared = "is_shared"
    }
}

struct CreateWiFiReviewRequest: Codable {
    let wifiSpotId: String
    let speedRating: Int
    let stabilityRating: Int
    let easeOfAccessRating: Int
    let overallRating: Int
    let comment: String?
    let speedTestResult: Double?
    let connectionTime: String?
    let deviceType: String?
    let visitDate: String?

    enum CodingKeys: String, CodingKey {
        case wifiSpotId = "wifi_spot_id"
        case speedRating = "speed_rating"
        case stabilityRating = "stability_rating"
        case easeOfAccessRating = "ease_of_access_rating"
        case overallRating = "overall_rating"
        case comment
        case speedTestResult = "speed_test_result"
        case connectionTime = "connection_time"
        case deviceType = "device_type"
        case visitDate = "visit_date"
    }
}
