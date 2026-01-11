import Foundation

/// Travel guide blog post model
struct BlogPost: Codable, Identifiable {
    let id: String
    let title: String
    let author: String?
    let content: String?
    let summary: String?
    let coverImage: String?
    let platform: String
    let qualityScore: Int?
    let viewCount: Int?
    let likeCount: Int?
    let createdAt: String?
    
    // AI-enhanced fields
    let aiSummary: String?
    let aiTips: [String]?
    let aiBestTime: String?
    let aiDuration: String?
    let aiBudget: String?
    let aiDays: [AiDay]?
    let aiProcessedAt: String?
    
    enum CodingKeys: String, CodingKey {
        case id = "_id"
        case title, author, content, summary
        case coverImage = "cover_image"
        case platform
        case qualityScore = "quality_score"
        case viewCount = "view_count"
        case likeCount = "like_count"
        case createdAt = "created_at"
        case aiSummary = "ai_summary"
        case aiTips = "ai_tips"
        case aiBestTime = "ai_best_time"
        case aiDuration = "ai_duration"
        case aiBudget = "ai_budget"
        case aiDays = "ai_days"
        case aiProcessedAt = "ai_processed_at"
    }
}

/// AI-extracted day structure
struct AiDay: Codable, Identifiable {
    var id: Int { dayNumber }
    let dayNumber: Int
    let theme: String?
    let pois: [AiPoi]
    
    enum CodingKeys: String, CodingKey {
        case dayNumber = "day_number"
        case theme, pois
    }
}

/// AI-extracted point of interest
struct AiPoi: Codable, Identifiable {
    var id: String { name }
    let name: String
    let type: String?
    let description: String?
    let latitude: Double?
    let longitude: Double?
    let address: String?
}

/// API response wrapper
struct BlogListResponse: Codable {
    let data: [BlogPost]
    let pagination: Pagination?
}

struct Pagination: Codable {
    let total: Int
    let limit: Int
    let offset: Int
}
