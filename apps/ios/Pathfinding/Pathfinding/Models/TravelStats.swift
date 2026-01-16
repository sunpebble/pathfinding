import Foundation

// MARK: - Travel Statistics

/// Aggregated travel statistics for a user
struct TravelStats: Codable, Identifiable {
  var id: String { "stats-\(userId)" }
  let userId: String

  // Aggregate statistics
  let totalTrips: Int
  let totalDays: Int
  let totalDistance: Double
  let totalCities: Int
  let totalCountries: Int
  let totalPois: Int

  // Time-based stats
  let longestTrip: TripInfo?
  let shortestTrip: TripInfo?

  // Expense statistics
  let totalExpenses: Double
  let expensesByCategory: [ExpenseCategoryBreakdown]
  let averageExpensePerDay: Double
  let averageExpensePerTrip: Double

  // Popular destinations
  let topDestinations: [DestinationStat]

  // Travel patterns
  let preferredTransportModes: [TransportModeStat]
  let preferredPoiCategories: [PoiCategoryStat]

  // Monthly distribution
  let monthlyTripCounts: [MonthlyTripCount]

  // Timestamps
  let lastCalculatedAt: TimeInterval

  enum CodingKeys: String, CodingKey {
    case userId = "user_id"
    case totalTrips = "total_trips"
    case totalDays = "total_days"
    case totalDistance = "total_distance"
    case totalCities = "total_cities"
    case totalCountries = "total_countries"
    case totalPois = "total_pois"
    case longestTrip = "longest_trip"
    case shortestTrip = "shortest_trip"
    case totalExpenses = "total_expenses"
    case expensesByCategory = "expenses_by_category"
    case averageExpensePerDay = "average_expense_per_day"
    case averageExpensePerTrip = "average_expense_per_trip"
    case topDestinations = "top_destinations"
    case preferredTransportModes = "preferred_transport_modes"
    case preferredPoiCategories = "preferred_poi_categories"
    case monthlyTripCounts = "monthly_trip_counts"
    case lastCalculatedAt = "last_calculated_at"
  }
}

// MARK: - Supporting Types

struct TripInfo: Codable, Hashable {
  let itineraryId: String
  let title: String
  let days: Int
  let startDate: String
  let endDate: String

  enum CodingKeys: String, CodingKey {
    case itineraryId = "itinerary_id"
    case title, days
    case startDate = "start_date"
    case endDate = "end_date"
  }
}

struct ExpenseCategoryBreakdown: Codable, Identifiable, Hashable {
  var id: String { categoryId }
  let categoryId: String
  let categoryName: String
  let amount: Double
  let percentage: Double

  enum CodingKeys: String, CodingKey {
    case categoryId = "category_id"
    case categoryName = "category_name"
    case amount, percentage
  }
}

struct DestinationStat: Codable, Identifiable, Hashable {
  var id: String { cityId }
  let cityId: String
  let cityName: String
  let visitCount: Int
  let totalDays: Int

  enum CodingKeys: String, CodingKey {
    case cityId = "city_id"
    case cityName = "city_name"
    case visitCount = "visit_count"
    case totalDays = "total_days"
  }
}

struct TransportModeStat: Codable, Identifiable, Hashable {
  var id: String { mode }
  let mode: String
  let count: Int
  let percentage: Double
}

struct PoiCategoryStat: Codable, Identifiable, Hashable {
  var id: String { category }
  let category: String
  let count: Int
  let percentage: Double
}

struct MonthlyTripCount: Codable, Identifiable, Hashable {
  var id: Int { month }
  let month: Int
  let count: Int
}

// MARK: - Quick Stats (Lightweight)

struct QuickStats: Codable {
  let totalTrips: Int
  let totalDays: Int
  let totalCities: Int
  let totalExpenses: Double

  enum CodingKeys: String, CodingKey {
    case totalTrips = "total_trips"
    case totalDays = "total_days"
    case totalCities = "total_cities"
    case totalExpenses = "total_expenses"
  }
}

// MARK: - Yearly Review

/// Annual travel summary and review
struct YearlyReview: Codable, Identifiable {
  var id: String { "\(userId)-\(year)" }
  let userId: String
  let year: Int

  // Summary statistics
  let tripsCount: Int
  let daysCount: Int
  let citiesCount: Int
  let countriesCount: Int
  let poisCount: Int
  let totalDistance: Double

  // Financial summary
  let totalExpenses: Double
  let expenseBreakdown: [ExpenseBreakdownItem]
  let averagePerTrip: Double
  let averagePerDay: Double
  let mostExpensiveTrip: MostExpensiveTripInfo?

  // Highlights
  let firstTripOfYear: TripHighlight?
  let lastTripOfYear: TripHighlight?
  let longestTrip: LongestTripInfo?

  // Top destinations
  let topCities: [TopCity]

  // Monthly activity
  let monthlyActivity: [MonthlyActivity]

  // Achievements
  let achievements: [Achievement]

  // Year over year comparison
  let yearOverYear: YearOverYearComparison?

  // Memories
  let memories: [TravelMemory]?

  // Status
  let status: ReviewStatus
  let generatedAt: TimeInterval?
  let error: String?

  enum CodingKeys: String, CodingKey {
    case userId = "user_id"
    case year
    case tripsCount = "trips_count"
    case daysCount = "days_count"
    case citiesCount = "cities_count"
    case countriesCount = "countries_count"
    case poisCount = "pois_count"
    case totalDistance = "total_distance"
    case totalExpenses = "total_expenses"
    case expenseBreakdown = "expense_breakdown"
    case averagePerTrip = "average_per_trip"
    case averagePerDay = "average_per_day"
    case mostExpensiveTrip = "most_expensive_trip"
    case firstTripOfYear = "first_trip_of_year"
    case lastTripOfYear = "last_trip_of_year"
    case longestTrip = "longest_trip"
    case topCities = "top_cities"
    case monthlyActivity = "monthly_activity"
    case achievements
    case yearOverYear = "year_over_year"
    case memories
    case status
    case generatedAt = "generated_at"
    case error
  }

  enum ReviewStatus: String, Codable {
    case generating
    case ready
    case error
  }
}

// MARK: - Yearly Review Supporting Types

struct ExpenseBreakdownItem: Codable, Identifiable, Hashable {
  var id: String { categoryId }
  let categoryId: String
  let categoryName: String
  let icon: String?
  let amount: Double
  let percentage: Double

  enum CodingKeys: String, CodingKey {
    case categoryId = "category_id"
    case categoryName = "category_name"
    case icon, amount, percentage
  }
}

struct MostExpensiveTripInfo: Codable, Hashable {
  let itineraryId: String
  let title: String
  let amount: Double

  enum CodingKeys: String, CodingKey {
    case itineraryId = "itinerary_id"
    case title, amount
  }
}

struct TripHighlight: Codable, Hashable {
  let itineraryId: String
  let title: String
  let cityName: String
  let startDate: String

  enum CodingKeys: String, CodingKey {
    case itineraryId = "itinerary_id"
    case title
    case cityName = "city_name"
    case startDate = "start_date"
  }
}

struct LongestTripInfo: Codable, Hashable {
  let itineraryId: String
  let title: String
  let cityName: String
  let days: Int

  enum CodingKeys: String, CodingKey {
    case itineraryId = "itinerary_id"
    case title
    case cityName = "city_name"
    case days
  }
}

struct TopCity: Codable, Identifiable, Hashable {
  var id: String { cityId }
  let cityId: String
  let cityName: String
  let visitCount: Int
  let totalDays: Int
  let imageUrl: String?

  enum CodingKeys: String, CodingKey {
    case cityId = "city_id"
    case cityName = "city_name"
    case visitCount = "visit_count"
    case totalDays = "total_days"
    case imageUrl = "image_url"
  }
}

struct MonthlyActivity: Codable, Identifiable, Hashable {
  var id: Int { month }
  let month: Int
  let tripsCount: Int
  let daysCount: Int
  let expenses: Double

  enum CodingKeys: String, CodingKey {
    case month
    case tripsCount = "trips_count"
    case daysCount = "days_count"
    case expenses
  }
}

struct Achievement: Codable, Identifiable, Hashable {
  let id: String
  let title: String
  let description: String
  let icon: String
  let earnedAt: TimeInterval?

  enum CodingKeys: String, CodingKey {
    case id, title, description, icon
    case earnedAt = "earned_at"
  }
}

struct YearOverYearComparison: Codable, Hashable {
  let tripsChange: Double
  let expensesChange: Double
  let distanceChange: Double
  let citiesChange: Double

  enum CodingKeys: String, CodingKey {
    case tripsChange = "trips_change"
    case expensesChange = "expenses_change"
    case distanceChange = "distance_change"
    case citiesChange = "cities_change"
  }
}

struct TravelMemory: Codable, Identifiable, Hashable {
  var id: String { "\(createdAt)" }
  let text: String
  let itineraryId: String?
  let imageUrl: String?
  let createdAt: TimeInterval

  enum CodingKeys: String, CodingKey {
    case text
    case itineraryId = "itinerary_id"
    case imageUrl = "image_url"
    case createdAt = "created_at"
  }
}

// MARK: - API Response Wrappers

struct TravelStatsResponse: Codable {
  let success: Bool
  let data: TravelStats?
}

struct QuickStatsResponse: Codable {
  let success: Bool
  let data: QuickStats
}

struct YearlyReviewResponse: Codable {
  let success: Bool
  let data: YearlyReview?
}

struct YearlyReviewsListResponse: Codable {
  let success: Bool
  let data: [YearlyReview]
}

struct AvailableYearsResponse: Codable {
  let success: Bool
  let data: [Int]
}
