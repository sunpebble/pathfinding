import type { Id } from './_generated/dataModel';
/**
 * List charging stations with optional filters
 */
export declare const list: import("convex/server").RegisteredQuery<"public", {
    status?: "operational" | "maintenance" | "offline" | "coming_soon" | undefined;
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    offset?: number | undefined;
    stationType?: "destination" | "public" | "private" | "highway" | undefined;
}, Promise<{
    data: {
        _id: import("convex/values").GenericId<"chargingStations">;
        _creationTime: number;
        sourceUrl?: string | undefined;
        imageUrls?: string[] | undefined;
        phone?: string | undefined;
        updatedAt?: number | undefined;
        nameEn?: string | undefined;
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        externalId?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
        reviewCount?: number | undefined;
        website?: string | undefined;
        operatorName?: string | undefined;
        operatorId?: string | undefined;
        pricingInfo?: {
            electricityPrice?: number | undefined;
            serviceFee?: number | undefined;
            parkingFee?: number | undefined;
            peakPrice?: number | undefined;
            valleyPrice?: number | undefined;
            flatPrice?: number | undefined;
            pricingNotes?: string | undefined;
        } | undefined;
        operatingHours?: string | undefined;
        lastStatusUpdate?: number | undefined;
        paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
        supportedBrands?: string[] | undefined;
        status: "operational" | "maintenance" | "offline" | "coming_soon";
        name: string;
        latitude: number;
        longitude: number;
        address: string;
        source: string;
        crawledAt: number;
        stationType: "destination" | "public" | "private" | "highway";
        totalPorts: number;
        availablePorts: number;
        chargerTypes: {
            connectorType?: string | undefined;
            type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
            count: number;
            powerKw: number;
            available: number;
        }[];
        is24Hours: boolean;
    }[];
    total: number;
    limit: number;
    offset: number;
}>>;
/**
 * Get a charging station by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"chargingStations">;
}, Promise<{
    _id: import("convex/values").GenericId<"chargingStations">;
    _creationTime: number;
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    reviewCount?: number | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    lastStatusUpdate?: number | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status: "operational" | "maintenance" | "offline" | "coming_soon";
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    source: string;
    crawledAt: number;
    stationType: "destination" | "public" | "private" | "highway";
    totalPorts: number;
    availablePorts: number;
    chargerTypes: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[];
    is24Hours: boolean;
} | null>>;
/**
 * Get nearby charging stations
 */
export declare const getNearby: import("convex/server").RegisteredQuery<"public", {
    status?: "operational" | "maintenance" | "offline" | "coming_soon" | undefined;
    limit?: number | undefined;
    stationType?: "destination" | "public" | "private" | "highway" | undefined;
    chargerType?: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast" | undefined;
    hasAvailablePorts?: boolean | undefined;
    latitude: number;
    longitude: number;
    radiusKm: number;
}, Promise<{
    distance: number;
    _id: import("convex/values").GenericId<"chargingStations">;
    _creationTime: number;
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    reviewCount?: number | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    lastStatusUpdate?: number | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status: "operational" | "maintenance" | "offline" | "coming_soon";
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    source: string;
    crawledAt: number;
    stationType: "destination" | "public" | "private" | "highway";
    totalPorts: number;
    availablePorts: number;
    chargerTypes: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[];
    is24Hours: boolean;
}[]>>;
/**
 * Search charging stations by name or operator
 */
export declare const search: import("convex/server").RegisteredQuery<"public", {
    status?: "operational" | "maintenance" | "offline" | "coming_soon" | undefined;
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    stationType?: "destination" | "public" | "private" | "highway" | undefined;
    query: string;
}, Promise<{
    _id: import("convex/values").GenericId<"chargingStations">;
    _creationTime: number;
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    reviewCount?: number | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    lastStatusUpdate?: number | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status: "operational" | "maintenance" | "offline" | "coming_soon";
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    source: string;
    crawledAt: number;
    stationType: "destination" | "public" | "private" | "highway";
    totalPorts: number;
    availablePorts: number;
    chargerTypes: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[];
    is24Hours: boolean;
}[]>>;
/**
 * Get charging stations by operator
 */
export declare const getByOperator: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    operatorName: string;
}, Promise<{
    _id: import("convex/values").GenericId<"chargingStations">;
    _creationTime: number;
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    reviewCount?: number | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    lastStatusUpdate?: number | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status: "operational" | "maintenance" | "offline" | "coming_soon";
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    source: string;
    crawledAt: number;
    stationType: "destination" | "public" | "private" | "highway";
    totalPorts: number;
    availablePorts: number;
    chargerTypes: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[];
    is24Hours: boolean;
}[]>>;
/**
 * Get station statistics (for dashboard)
 */
export declare const getStats: import("convex/server").RegisteredQuery<"public", {
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
}, Promise<{
    total: number;
    byStatus: {
        operational: number;
        maintenance: number;
        offline: number;
    };
    byType: {
        public: number;
        private: number;
        destination: number;
        highway: number;
    };
    byChargerType: {
        ac_slow: number;
        ac_fast: number;
        dc_fast: number;
        dc_superfast: number;
    };
    totalPorts: number;
    availablePorts: number;
    utilizationRate: number;
    topOperators: {
        name: string;
        count: number;
    }[];
}>>;
/**
 * Create a new charging station
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    externalId?: string | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status: "operational" | "maintenance" | "offline" | "coming_soon";
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    source: string;
    stationType: "destination" | "public" | "private" | "highway";
    totalPorts: number;
    availablePorts: number;
    chargerTypes: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[];
    is24Hours: boolean;
}, Promise<import("convex/values").GenericId<"chargingStations">>>;
/**
 * Update a charging station
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    status?: "operational" | "maintenance" | "offline" | "coming_soon" | undefined;
    name?: string | undefined;
    imageUrls?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    phone?: string | undefined;
    nameEn?: string | undefined;
    address?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    stationType?: "destination" | "public" | "private" | "highway" | undefined;
    totalPorts?: number | undefined;
    availablePorts?: number | undefined;
    chargerTypes?: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[] | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    is24Hours?: boolean | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    id: import("convex/values").GenericId<"chargingStations">;
}, Promise<{
    _id: import("convex/values").GenericId<"chargingStations">;
    _creationTime: number;
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    reviewCount?: number | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    lastStatusUpdate?: number | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status: "operational" | "maintenance" | "offline" | "coming_soon";
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    source: string;
    crawledAt: number;
    stationType: "destination" | "public" | "private" | "highway";
    totalPorts: number;
    availablePorts: number;
    chargerTypes: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[];
    is24Hours: boolean;
} | null>>;
/**
 * Update station availability (real-time status update)
 */
export declare const updateAvailability: import("convex/server").RegisteredMutation<"public", {
    status?: "operational" | "maintenance" | "offline" | "coming_soon" | undefined;
    chargerTypes?: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[] | undefined;
    id: import("convex/values").GenericId<"chargingStations">;
    availablePorts: number;
}, Promise<{
    _id: import("convex/values").GenericId<"chargingStations">;
    _creationTime: number;
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    reviewCount?: number | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    lastStatusUpdate?: number | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status: "operational" | "maintenance" | "offline" | "coming_soon";
    name: string;
    latitude: number;
    longitude: number;
    address: string;
    source: string;
    crawledAt: number;
    stationType: "destination" | "public" | "private" | "highway";
    totalPorts: number;
    availablePorts: number;
    chargerTypes: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[];
    is24Hours: boolean;
} | null>>;
/**
 * Delete a charging station
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"chargingStations">;
}, Promise<void>>;
/**
 * Upsert a charging station (for crawler)
 */
export declare const upsert: import("convex/server").RegisteredMutation<"public", {
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status: "operational" | "maintenance" | "offline" | "coming_soon";
    name: string;
    latitude: number;
    longitude: number;
    externalId: string;
    address: string;
    source: string;
    stationType: "destination" | "public" | "private" | "highway";
    totalPorts: number;
    availablePorts: number;
    chargerTypes: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[];
    is24Hours: boolean;
}, Promise<import("convex/values").GenericId<"chargingStations">>>;
/**
 * Bulk insert charging stations
 */
export declare const bulkInsert: import("convex/server").RegisteredMutation<"public", {
    stations: {
        sourceUrl?: string | undefined;
        imageUrls?: string[] | undefined;
        phone?: string | undefined;
        nameEn?: string | undefined;
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        externalId?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
        website?: string | undefined;
        operatorName?: string | undefined;
        operatorId?: string | undefined;
        pricingInfo?: {
            electricityPrice?: number | undefined;
            serviceFee?: number | undefined;
            parkingFee?: number | undefined;
            peakPrice?: number | undefined;
            valleyPrice?: number | undefined;
            flatPrice?: number | undefined;
            pricingNotes?: string | undefined;
        } | undefined;
        operatingHours?: string | undefined;
        paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
        supportedBrands?: string[] | undefined;
        status: "operational" | "maintenance" | "offline" | "coming_soon";
        name: string;
        latitude: number;
        longitude: number;
        address: string;
        source: string;
        stationType: "destination" | "public" | "private" | "highway";
        totalPorts: number;
        availablePorts: number;
        chargerTypes: {
            connectorType?: string | undefined;
            type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
            count: number;
            powerKw: number;
            available: number;
        }[];
        is24Hours: boolean;
    }[];
}, Promise<Id<"chargingStations">[]>>;
/**
 * Get reviews for a charging station
 */
export declare const getReviews: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    offset?: number | undefined;
    stationId: import("convex/values").GenericId<"chargingStations">;
}, Promise<{
    data: {
        _id: import("convex/values").GenericId<"chargingStationReviews">;
        _creationTime: number;
        authorName?: string | undefined;
        imageUrls?: string[] | undefined;
        userId?: string | undefined;
        visitDate?: string | undefined;
        chargerType?: string | undefined;
        chargingDuration?: number | undefined;
        energyCharged?: number | undefined;
        totalCost?: number | undefined;
        vehicleModel?: string | undefined;
        pros?: string[] | undefined;
        cons?: string[] | undefined;
        content: string;
        createdAt: number;
        rating: number;
        isVerified: boolean;
        stationId: import("convex/values").GenericId<"chargingStations">;
    }[];
    total: number;
    limit: number;
    offset: number;
}>>;
/**
 * Add a review
 */
export declare const addReview: import("convex/server").RegisteredMutation<"public", {
    authorName?: string | undefined;
    imageUrls?: string[] | undefined;
    userId?: string | undefined;
    visitDate?: string | undefined;
    chargerType?: string | undefined;
    chargingDuration?: number | undefined;
    energyCharged?: number | undefined;
    totalCost?: number | undefined;
    vehicleModel?: string | undefined;
    pros?: string[] | undefined;
    cons?: string[] | undefined;
    content: string;
    rating: number;
    stationId: import("convex/values").GenericId<"chargingStations">;
}, Promise<import("convex/values").GenericId<"chargingStationReviews">>>;
/**
 * Get user's favorite charging stations
 */
export declare const getUserFavorites: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    favoriteId: import("convex/values").GenericId<"favoriteChargingStations">;
    notes: string | undefined;
    addedAt: number;
    _id?: import("convex/values").GenericId<"chargingStations"> | undefined;
    _creationTime?: number | undefined;
    sourceUrl?: string | undefined;
    imageUrls?: string[] | undefined;
    phone?: string | undefined;
    updatedAt?: number | undefined;
    nameEn?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
    reviewCount?: number | undefined;
    website?: string | undefined;
    operatorName?: string | undefined;
    operatorId?: string | undefined;
    pricingInfo?: {
        electricityPrice?: number | undefined;
        serviceFee?: number | undefined;
        parkingFee?: number | undefined;
        peakPrice?: number | undefined;
        valleyPrice?: number | undefined;
        flatPrice?: number | undefined;
        pricingNotes?: string | undefined;
    } | undefined;
    operatingHours?: string | undefined;
    lastStatusUpdate?: number | undefined;
    paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
    supportedBrands?: string[] | undefined;
    status?: "operational" | "maintenance" | "offline" | "coming_soon" | undefined;
    name?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    address?: string | undefined;
    source?: string | undefined;
    crawledAt?: number | undefined;
    stationType?: "destination" | "public" | "private" | "highway" | undefined;
    totalPorts?: number | undefined;
    availablePorts?: number | undefined;
    chargerTypes?: {
        connectorType?: string | undefined;
        type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
        count: number;
        powerKw: number;
        available: number;
    }[] | undefined;
    is24Hours?: boolean | undefined;
}[]>>;
/**
 * Add station to favorites
 */
export declare const addToFavorites: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    userId: string;
    stationId: import("convex/values").GenericId<"chargingStations">;
}, Promise<import("convex/values").GenericId<"favoriteChargingStations">>>;
/**
 * Remove station from favorites
 */
export declare const removeFromFavorites: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    stationId: import("convex/values").GenericId<"chargingStations">;
}, Promise<void>>;
/**
 * Check if station is in favorites
 */
export declare const isFavorite: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    stationId: import("convex/values").GenericId<"chargingStations">;
}, Promise<boolean>>;
