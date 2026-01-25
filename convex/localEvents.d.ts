/**
 * List events for a city with optional filters
 */
export declare const listByCity: import("convex/server").RegisteredQuery<"public", {
    status?: "cancelled" | "upcoming" | "ongoing" | "ended" | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    eventType?: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
    data: {
        _id: import("convex/values").GenericId<"localEvents">;
        _creationTime: number;
        tags?: string[] | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        tips?: string[] | undefined;
        nameEn?: string | undefined;
        descriptionEn?: string | undefined;
        currency?: string | undefined;
        externalId?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        imageUrls?: string[] | undefined;
        source?: string | undefined;
        coverImageUrl?: string | undefined;
        startTime?: string | undefined;
        endTime?: string | undefined;
        sourceUrl?: string | undefined;
        highlights?: string[] | undefined;
        officialWebsite?: string | undefined;
        isFeatured?: boolean | undefined;
        venue?: string | undefined;
        venueAddress?: string | undefined;
        recurrencePattern?: {
            day?: number | undefined;
            month?: number | undefined;
            isLunarCalendar?: boolean | undefined;
            lunarMonth?: number | undefined;
            lunarDay?: number | undefined;
            weekOfMonth?: number | undefined;
            dayOfWeek?: number | undefined;
            type: "yearly" | "monthly" | "weekly";
        } | undefined;
        ticketPrice?: number | undefined;
        ticketPriceMax?: number | undefined;
        ticketUrl?: string | undefined;
        requiresBooking?: boolean | undefined;
        organizerName?: string | undefined;
        organizerPhone?: string | undefined;
        organizerEmail?: string | undefined;
        status: "cancelled" | "upcoming" | "ongoing" | "ended";
        name: string;
        description: string;
        startDate: string;
        endDate: string;
        createdAt: number;
        updatedAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        viewCount: number;
        isRecurring: boolean;
        isVerified: boolean;
        isFree: boolean;
        saveCount: number;
        eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
        isAllDay: boolean;
    }[];
    total: number;
}>>;
/**
 * List upcoming events for a city
 */
export declare const listUpcoming: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
    _id: import("convex/values").GenericId<"localEvents">;
    _creationTime: number;
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: {
        day?: number | undefined;
        month?: number | undefined;
        isLunarCalendar?: boolean | undefined;
        lunarMonth?: number | undefined;
        lunarDay?: number | undefined;
        weekOfMonth?: number | undefined;
        dayOfWeek?: number | undefined;
        type: "yearly" | "monthly" | "weekly";
    } | undefined;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    status: "cancelled" | "upcoming" | "ongoing" | "ended";
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    viewCount: number;
    isRecurring: boolean;
    isVerified: boolean;
    isFree: boolean;
    saveCount: number;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
}[]>>;
/**
 * List ongoing events for a city
 */
export declare const listOngoing: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
    _id: import("convex/values").GenericId<"localEvents">;
    _creationTime: number;
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: {
        day?: number | undefined;
        month?: number | undefined;
        isLunarCalendar?: boolean | undefined;
        lunarMonth?: number | undefined;
        lunarDay?: number | undefined;
        weekOfMonth?: number | undefined;
        dayOfWeek?: number | undefined;
        type: "yearly" | "monthly" | "weekly";
    } | undefined;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    status: "cancelled" | "upcoming" | "ongoing" | "ended";
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    viewCount: number;
    isRecurring: boolean;
    isVerified: boolean;
    isFree: boolean;
    saveCount: number;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
}[]>>;
/**
 * List featured events for a city
 */
export declare const listFeatured: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
    _id: import("convex/values").GenericId<"localEvents">;
    _creationTime: number;
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: {
        day?: number | undefined;
        month?: number | undefined;
        isLunarCalendar?: boolean | undefined;
        lunarMonth?: number | undefined;
        lunarDay?: number | undefined;
        weekOfMonth?: number | undefined;
        dayOfWeek?: number | undefined;
        type: "yearly" | "monthly" | "weekly";
    } | undefined;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    status: "cancelled" | "upcoming" | "ongoing" | "ended";
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    viewCount: number;
    isRecurring: boolean;
    isVerified: boolean;
    isFree: boolean;
    saveCount: number;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
}[]>>;
/**
 * Get events for a specific date range (calendar view)
 */
export declare const listByDateRange: import("convex/server").RegisteredQuery<"public", {
    startDate: string;
    endDate: string;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
    _id: import("convex/values").GenericId<"localEvents">;
    _creationTime: number;
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: {
        day?: number | undefined;
        month?: number | undefined;
        isLunarCalendar?: boolean | undefined;
        lunarMonth?: number | undefined;
        lunarDay?: number | undefined;
        weekOfMonth?: number | undefined;
        dayOfWeek?: number | undefined;
        type: "yearly" | "monthly" | "weekly";
    } | undefined;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    status: "cancelled" | "upcoming" | "ongoing" | "ended";
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    viewCount: number;
    isRecurring: boolean;
    isVerified: boolean;
    isFree: boolean;
    saveCount: number;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
}[]>>;
/**
 * Get event by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"localEvents">;
}, Promise<{
    city: {
        _id: import("convex/values").GenericId<"cities">;
        _creationTime: number;
        nameEn?: string | undefined;
        utcOffset?: number | undefined;
        dstOffset?: number | undefined;
        observesDst?: boolean | undefined;
        name: string;
        latitude: number;
        longitude: number;
        timezone: string;
        countryCode: string;
    } | null;
    _id: import("convex/values").GenericId<"localEvents">;
    _creationTime: number;
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: {
        day?: number | undefined;
        month?: number | undefined;
        isLunarCalendar?: boolean | undefined;
        lunarMonth?: number | undefined;
        lunarDay?: number | undefined;
        weekOfMonth?: number | undefined;
        dayOfWeek?: number | undefined;
        type: "yearly" | "monthly" | "weekly";
    } | undefined;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    status: "cancelled" | "upcoming" | "ongoing" | "ended";
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    viewCount: number;
    isRecurring: boolean;
    isVerified: boolean;
    isFree: boolean;
    saveCount: number;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
} | null>>;
/**
 * Search events by name or description
 */
export declare const search: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    query: string;
}, Promise<{
    _id: import("convex/values").GenericId<"localEvents">;
    _creationTime: number;
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: {
        day?: number | undefined;
        month?: number | undefined;
        isLunarCalendar?: boolean | undefined;
        lunarMonth?: number | undefined;
        lunarDay?: number | undefined;
        weekOfMonth?: number | undefined;
        dayOfWeek?: number | undefined;
        type: "yearly" | "monthly" | "weekly";
    } | undefined;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    status: "cancelled" | "upcoming" | "ongoing" | "ended";
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    viewCount: number;
    isRecurring: boolean;
    isVerified: boolean;
    isFree: boolean;
    saveCount: number;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
}[]>>;
/**
 * Get recurring events (annual festivals)
 */
export declare const listRecurring: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
    _id: import("convex/values").GenericId<"localEvents">;
    _creationTime: number;
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: {
        day?: number | undefined;
        month?: number | undefined;
        isLunarCalendar?: boolean | undefined;
        lunarMonth?: number | undefined;
        lunarDay?: number | undefined;
        weekOfMonth?: number | undefined;
        dayOfWeek?: number | undefined;
        type: "yearly" | "monthly" | "weekly";
    } | undefined;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    status: "cancelled" | "upcoming" | "ongoing" | "ended";
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    viewCount: number;
    isRecurring: boolean;
    isVerified: boolean;
    isFree: boolean;
    saveCount: number;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
}[]>>;
/**
 * Create a new event
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: any;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    cityId: import("convex/values").GenericId<"cities">;
    isRecurring: boolean;
    isFree: boolean;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
}, Promise<import("convex/values").GenericId<"localEvents">>>;
/**
 * Update an event
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    tags?: string[] | undefined;
    status?: "cancelled" | "upcoming" | "ongoing" | "ended" | undefined;
    name?: string | undefined;
    description?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    imageUrls?: string[] | undefined;
    isRecurring?: boolean | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    highlights?: string[] | undefined;
    isVerified?: boolean | undefined;
    isFree?: boolean | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    eventType?: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom" | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    isAllDay?: boolean | undefined;
    recurrencePattern?: any;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    id: import("convex/values").GenericId<"localEvents">;
}, Promise<{
    _id: import("convex/values").GenericId<"localEvents">;
    _creationTime: number;
    tags?: string[] | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    tips?: string[] | undefined;
    nameEn?: string | undefined;
    descriptionEn?: string | undefined;
    currency?: string | undefined;
    externalId?: string | undefined;
    rating?: number | undefined;
    ratingCount?: number | undefined;
    imageUrls?: string[] | undefined;
    source?: string | undefined;
    coverImageUrl?: string | undefined;
    startTime?: string | undefined;
    endTime?: string | undefined;
    sourceUrl?: string | undefined;
    highlights?: string[] | undefined;
    officialWebsite?: string | undefined;
    isFeatured?: boolean | undefined;
    venue?: string | undefined;
    venueAddress?: string | undefined;
    recurrencePattern?: {
        day?: number | undefined;
        month?: number | undefined;
        isLunarCalendar?: boolean | undefined;
        lunarMonth?: number | undefined;
        lunarDay?: number | undefined;
        weekOfMonth?: number | undefined;
        dayOfWeek?: number | undefined;
        type: "yearly" | "monthly" | "weekly";
    } | undefined;
    ticketPrice?: number | undefined;
    ticketPriceMax?: number | undefined;
    ticketUrl?: string | undefined;
    requiresBooking?: boolean | undefined;
    organizerName?: string | undefined;
    organizerPhone?: string | undefined;
    organizerEmail?: string | undefined;
    status: "cancelled" | "upcoming" | "ongoing" | "ended";
    name: string;
    description: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    viewCount: number;
    isRecurring: boolean;
    isVerified: boolean;
    isFree: boolean;
    saveCount: number;
    eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
    isAllDay: boolean;
} | null>>;
/**
 * Delete an event
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"localEvents">;
}, Promise<void>>;
/**
 * Increment view count
 */
export declare const incrementViewCount: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"localEvents">;
}, Promise<void>>;
/**
 * Update event status based on dates
 */
export declare const updateEventStatuses: import("convex/server").RegisteredMutation<"public", {}, Promise<void>>;
/**
 * Add event to favorites
 */
export declare const addFavorite: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    userId: string;
    eventId: import("convex/values").GenericId<"localEvents">;
}, Promise<import("convex/values").GenericId<"eventFavorites">>>;
/**
 * Remove event from favorites
 */
export declare const removeFavorite: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    eventId: import("convex/values").GenericId<"localEvents">;
}, Promise<void>>;
/**
 * Check if event is favorited by user
 */
export declare const isFavorited: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    eventId: import("convex/values").GenericId<"localEvents">;
}, Promise<boolean>>;
/**
 * List user's favorite events
 */
export declare const listFavorites: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: ({
        favoriteNotes: string | undefined;
        favoritedAt: number;
        _id: import("convex/values").GenericId<"localEvents">;
        _creationTime: number;
        tags?: string[] | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        tips?: string[] | undefined;
        nameEn?: string | undefined;
        descriptionEn?: string | undefined;
        currency?: string | undefined;
        externalId?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        imageUrls?: string[] | undefined;
        source?: string | undefined;
        coverImageUrl?: string | undefined;
        startTime?: string | undefined;
        endTime?: string | undefined;
        sourceUrl?: string | undefined;
        highlights?: string[] | undefined;
        officialWebsite?: string | undefined;
        isFeatured?: boolean | undefined;
        venue?: string | undefined;
        venueAddress?: string | undefined;
        recurrencePattern?: {
            day?: number | undefined;
            month?: number | undefined;
            isLunarCalendar?: boolean | undefined;
            lunarMonth?: number | undefined;
            lunarDay?: number | undefined;
            weekOfMonth?: number | undefined;
            dayOfWeek?: number | undefined;
            type: "yearly" | "monthly" | "weekly";
        } | undefined;
        ticketPrice?: number | undefined;
        ticketPriceMax?: number | undefined;
        ticketUrl?: string | undefined;
        requiresBooking?: boolean | undefined;
        organizerName?: string | undefined;
        organizerPhone?: string | undefined;
        organizerEmail?: string | undefined;
        status: "cancelled" | "upcoming" | "ongoing" | "ended";
        name: string;
        description: string;
        startDate: string;
        endDate: string;
        createdAt: number;
        updatedAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        viewCount: number;
        isRecurring: boolean;
        isVerified: boolean;
        isFree: boolean;
        saveCount: number;
        eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
        isAllDay: boolean;
    } | null)[];
    total: number;
}>>;
/**
 * Create event reminder
 */
export declare const createReminder: import("convex/server").RegisteredMutation<"public", {
    message?: string | undefined;
    minutesBefore?: number | undefined;
    userId: string;
    reminderType: "custom" | "event_start" | "booking_open";
    reminderTime: number;
    eventId: import("convex/values").GenericId<"localEvents">;
}, Promise<import("convex/values").GenericId<"eventReminders">>>;
/**
 * Delete event reminder
 */
export declare const deleteReminder: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"eventReminders">;
}, Promise<void>>;
/**
 * List user's event reminders
 */
export declare const listReminders: import("convex/server").RegisteredQuery<"public", {
    includeTriggered?: boolean | undefined;
    userId: string;
}, Promise<{
    event: {
        _id: import("convex/values").GenericId<"localEvents">;
        _creationTime: number;
        tags?: string[] | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        tips?: string[] | undefined;
        nameEn?: string | undefined;
        descriptionEn?: string | undefined;
        currency?: string | undefined;
        externalId?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        imageUrls?: string[] | undefined;
        source?: string | undefined;
        coverImageUrl?: string | undefined;
        startTime?: string | undefined;
        endTime?: string | undefined;
        sourceUrl?: string | undefined;
        highlights?: string[] | undefined;
        officialWebsite?: string | undefined;
        isFeatured?: boolean | undefined;
        venue?: string | undefined;
        venueAddress?: string | undefined;
        recurrencePattern?: {
            day?: number | undefined;
            month?: number | undefined;
            isLunarCalendar?: boolean | undefined;
            lunarMonth?: number | undefined;
            lunarDay?: number | undefined;
            weekOfMonth?: number | undefined;
            dayOfWeek?: number | undefined;
            type: "yearly" | "monthly" | "weekly";
        } | undefined;
        ticketPrice?: number | undefined;
        ticketPriceMax?: number | undefined;
        ticketUrl?: string | undefined;
        requiresBooking?: boolean | undefined;
        organizerName?: string | undefined;
        organizerPhone?: string | undefined;
        organizerEmail?: string | undefined;
        status: "cancelled" | "upcoming" | "ongoing" | "ended";
        name: string;
        description: string;
        startDate: string;
        endDate: string;
        createdAt: number;
        updatedAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        viewCount: number;
        isRecurring: boolean;
        isVerified: boolean;
        isFree: boolean;
        saveCount: number;
        eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
        isAllDay: boolean;
    } | null;
    _id: import("convex/values").GenericId<"eventReminders">;
    _creationTime: number;
    message?: string | undefined;
    minutesBefore?: number | undefined;
    triggeredAt?: number | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    reminderType: "custom" | "event_start" | "booking_open";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
    eventId: import("convex/values").GenericId<"localEvents">;
}[]>>;
/**
 * Get pending reminders that should be triggered
 */
export declare const getPendingReminders: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    event: {
        _id: import("convex/values").GenericId<"localEvents">;
        _creationTime: number;
        tags?: string[] | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        tips?: string[] | undefined;
        nameEn?: string | undefined;
        descriptionEn?: string | undefined;
        currency?: string | undefined;
        externalId?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        imageUrls?: string[] | undefined;
        source?: string | undefined;
        coverImageUrl?: string | undefined;
        startTime?: string | undefined;
        endTime?: string | undefined;
        sourceUrl?: string | undefined;
        highlights?: string[] | undefined;
        officialWebsite?: string | undefined;
        isFeatured?: boolean | undefined;
        venue?: string | undefined;
        venueAddress?: string | undefined;
        recurrencePattern?: {
            day?: number | undefined;
            month?: number | undefined;
            isLunarCalendar?: boolean | undefined;
            lunarMonth?: number | undefined;
            lunarDay?: number | undefined;
            weekOfMonth?: number | undefined;
            dayOfWeek?: number | undefined;
            type: "yearly" | "monthly" | "weekly";
        } | undefined;
        ticketPrice?: number | undefined;
        ticketPriceMax?: number | undefined;
        ticketUrl?: string | undefined;
        requiresBooking?: boolean | undefined;
        organizerName?: string | undefined;
        organizerPhone?: string | undefined;
        organizerEmail?: string | undefined;
        status: "cancelled" | "upcoming" | "ongoing" | "ended";
        name: string;
        description: string;
        startDate: string;
        endDate: string;
        createdAt: number;
        updatedAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        viewCount: number;
        isRecurring: boolean;
        isVerified: boolean;
        isFree: boolean;
        saveCount: number;
        eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
        isAllDay: boolean;
    } | null;
    _id: import("convex/values").GenericId<"eventReminders">;
    _creationTime: number;
    message?: string | undefined;
    minutesBefore?: number | undefined;
    triggeredAt?: number | undefined;
    readAt?: number | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    reminderType: "custom" | "event_start" | "booking_open";
    isTriggered: boolean;
    reminderTime: number;
    isRead: boolean;
    eventId: import("convex/values").GenericId<"localEvents">;
}[]>>;
/**
 * Mark reminder as triggered
 */
export declare const markReminderTriggered: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"eventReminders">;
}, Promise<void>>;
/**
 * Mark reminder as read
 */
export declare const markReminderRead: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"eventReminders">;
}, Promise<void>>;
