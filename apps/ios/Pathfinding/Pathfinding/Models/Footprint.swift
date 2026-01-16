import Foundation
import CoreLocation

// MARK: - Visited City

/// A city that the user has visited
struct VisitedCity: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let cityName: String
  let cityNameEn: String?
  let countryCode: String
  let countryName: String
  let countryNameEn: String?
  let latitude: Double
  let longitude: Double
  let visitedAt: TimeInterval
  let firstVisitedAt: TimeInterval?
  let lastVisitedAt: TimeInterval?
  let visitCount: Int?
  let notes: String?
  let photos: [String]?
  let rating: Int?
  let travelGuideId: String?
  let itineraryId: String?
  let createdAt: TimeInterval?

  var coordinate: CLLocationCoordinate2D {
    CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
  }

  var displayName: String {
    cityName
  }

  var displayNameEn: String {
    cityNameEn ?? cityName
  }

  var visits: Int {
    visitCount ?? 1
  }

  var lastVisit: Date {
    Date(timeIntervalSince1970: (lastVisitedAt ?? visitedAt) / 1000)
  }

  var firstVisit: Date {
    Date(timeIntervalSince1970: (firstVisitedAt ?? visitedAt) / 1000)
  }

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case cityName = "city_name"
    case cityNameEn = "city_name_en"
    case countryCode = "country_code"
    case countryName = "country_name"
    case countryNameEn = "country_name_en"
    case latitude, longitude
    case visitedAt = "visited_at"
    case firstVisitedAt = "first_visited_at"
    case lastVisitedAt = "last_visited_at"
    case visitCount = "visit_count"
    case notes, photos, rating
    case travelGuideId = "travel_guide_id"
    case itineraryId = "itinerary_id"
    case createdAt = "created_at"
  }
}

// MARK: - Visited Country

/// A country that the user has visited
struct VisitedCountry: Codable, Identifiable, Hashable {
  let id: String
  let userId: String
  let countryCode: String
  let countryName: String
  let countryNameEn: String?
  let citiesCount: Int
  let firstVisitedAt: TimeInterval
  let lastVisitedAt: TimeInterval
  let createdAt: TimeInterval?

  var displayName: String {
    countryName
  }

  var displayNameEn: String {
    countryNameEn ?? countryName
  }

  var cities: Int {
    citiesCount
  }

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case userId = "user_id"
    case countryCode = "country_code"
    case countryName = "country_name"
    case countryNameEn = "country_name_en"
    case citiesCount = "cities_count"
    case firstVisitedAt = "first_visited_at"
    case lastVisitedAt = "last_visited_at"
    case createdAt = "created_at"
  }
}

// MARK: - Footprint Stats

/// User's travel footprint statistics
struct FootprintStats: Codable {
  let userId: String
  let totalCities: Int
  let totalCountries: Int
  let totalTrips: Int
  let totalDistance: Double
  let mostVisitedCity: MostVisitedItem?
  let mostVisitedCountry: MostVisitedItem?
  let firstTripDate: TimeInterval?
  let lastTripDate: TimeInterval?
  let goalCities: Int?
  let goalCountries: Int?
  let nextGoalCity: NextGoalCity?
  let yearlyStats: [String: YearlyFootprintStats]?
  let createdAt: TimeInterval?
  let updatedAt: TimeInterval?

  var cityProgress: Double {
    guard let goal = goalCities, goal > 0 else { return 0 }
    return min(Double(totalCities) / Double(goal), 1.0)
  }

  var countryProgress: Double {
    guard let goal = goalCountries, goal > 0 else { return 0 }
    return min(Double(totalCountries) / Double(goal), 1.0)
  }

  enum CodingKeys: String, CodingKey {
    case userId = "user_id"
    case totalCities = "total_cities"
    case totalCountries = "total_countries"
    case totalTrips = "total_trips"
    case totalDistance = "total_distance"
    case mostVisitedCity = "most_visited_city"
    case mostVisitedCountry = "most_visited_country"
    case firstTripDate = "first_trip_date"
    case lastTripDate = "last_trip_date"
    case goalCities = "goal_cities"
    case goalCountries = "goal_countries"
    case nextGoalCity = "next_goal_city"
    case yearlyStats = "yearly_stats"
    case createdAt = "created_at"
    case updatedAt = "updated_at"
  }
}

struct MostVisitedItem: Codable, Hashable {
  let name: String
  let count: Int
}

struct NextGoalCity: Codable, Hashable {
  let cityName: String
  let countryCode: String
  let countryName: String
  let latitude: Double
  let longitude: Double
  let plannedDate: TimeInterval?
  let notes: String?

  enum CodingKeys: String, CodingKey {
    case cityName = "city_name"
    case countryCode = "country_code"
    case countryName = "country_name"
    case latitude, longitude
    case plannedDate = "planned_date"
    case notes
  }
}

struct YearlyFootprintStats: Codable, Hashable {
  let cities: Int
  let countries: Int
}

// MARK: - Map Data (GeoJSON)

/// GeoJSON response for map rendering
struct FootprintMapData: Codable {
  let type: String
  let features: [FootprintFeature]
  let visitedCountries: [String]
  let summary: FootprintSummary

  enum CodingKeys: String, CodingKey {
    case type, features
    case visitedCountries = "visited_countries"
    case summary
  }
}

struct FootprintFeature: Codable, Identifiable {
  let type: String
  let properties: FootprintFeatureProperties
  let geometry: FootprintGeometry

  var id: String { properties.id }
}

struct FootprintFeatureProperties: Codable {
  let id: String
  let name: String
  let nameEn: String?
  let countryCode: String
  let countryName: String
  let visitCount: Int
  let rating: Int?
  let firstVisited: TimeInterval
  let lastVisited: TimeInterval
  let type: String

  enum CodingKeys: String, CodingKey {
    case id, name
    case nameEn = "name_en"
    case countryCode = "country_code"
    case countryName = "country_name"
    case visitCount = "visit_count"
    case rating
    case firstVisited = "first_visited"
    case lastVisited = "last_visited"
    case type
  }
}

struct FootprintGeometry: Codable {
  let type: String
  let coordinates: [Double] // [longitude, latitude]

  var coordinate: CLLocationCoordinate2D {
    CLLocationCoordinate2D(
      latitude: coordinates.count > 1 ? coordinates[1] : 0,
      longitude: coordinates.count > 0 ? coordinates[0] : 0
    )
  }
}

struct FootprintSummary: Codable {
  let totalCities: Int
  let totalCountries: Int

  enum CodingKeys: String, CodingKey {
    case totalCities = "total_cities"
    case totalCountries = "total_countries"
  }
}

// MARK: - Timeline Item

struct FootprintTimelineItem: Codable, Identifiable {
  let id: String
  let cityName: String
  let cityNameEn: String?
  let countryCode: String
  let countryName: String
  let latitude: Double
  let longitude: Double
  let visitedAt: TimeInterval
  let lastVisitedAt: TimeInterval?
  let visitCount: Int?
  let notes: String?
  let photos: [String]?
  let rating: Int?

  var displayName: String { cityName }
  var visits: Int { visitCount ?? 1 }
  var visitDate: Date {
    Date(timeIntervalSince1970: (lastVisitedAt ?? visitedAt) / 1000)
  }

  enum CodingKeys: String, CodingKey {
    case id = "_id"
    case cityName = "city_name"
    case cityNameEn = "city_name_en"
    case countryCode = "country_code"
    case countryName = "country_name"
    case latitude, longitude
    case visitedAt = "visited_at"
    case lastVisitedAt = "last_visited_at"
    case visitCount = "visit_count"
    case notes, photos, rating
  }
}

// MARK: - Input Types

struct AddVisitedCityInput: Codable {
  let cityName: String
  let cityNameEn: String?
  let countryCode: String
  let countryName: String
  let countryNameEn: String?
  let latitude: Double
  let longitude: Double
  let visitedAt: TimeInterval
  let notes: String?
  let photos: [String]?
  let rating: Int?
  let travelGuideId: String?
  let itineraryId: String?

  enum CodingKeys: String, CodingKey {
    case cityName = "city_name"
    case cityNameEn = "city_name_en"
    case countryCode = "country_code"
    case countryName = "country_name"
    case countryNameEn = "country_name_en"
    case latitude, longitude
    case visitedAt = "visited_at"
    case notes, photos, rating
    case travelGuideId = "travel_guide_id"
    case itineraryId = "itinerary_id"
  }
}

struct UpdateVisitedCityInput: Codable {
  let notes: String?
  let photos: [String]?
  let rating: Int?
}

struct SetTravelGoalsInput: Codable {
  let goalCities: Int?
  let goalCountries: Int?
  let nextGoalCity: NextGoalCity?

  enum CodingKeys: String, CodingKey {
    case goalCities = "goal_cities"
    case goalCountries = "goal_countries"
    case nextGoalCity = "next_goal_city"
  }
}

// MARK: - API Response Wrappers

struct VisitedCitiesResponse: Codable {
  let success: Bool
  let data: [VisitedCity]
}

struct VisitedCountriesResponse: Codable {
  let success: Bool
  let data: [VisitedCountry]
}

struct FootprintStatsResponse: Codable {
  let success: Bool
  let data: FootprintStats
}

struct FootprintMapResponse: Codable {
  let success: Bool
  let data: FootprintMapData
}

struct FootprintTimelineResponse: Codable {
  let success: Bool
  let data: [FootprintTimelineItem]
  let meta: FootprintTimelineMeta
}

struct FootprintTimelineMeta: Codable {
  let total: Int
  let limit: Int
  let offset: Int
  let hasMore: Bool

  enum CodingKeys: String, CodingKey {
    case total, limit, offset
    case hasMore = "has_more"
  }
}

struct AddCityResponse: Codable {
  let success: Bool
  let data: AddCityData
}

struct AddCityData: Codable {
  let id: String
}
