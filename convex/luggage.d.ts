/**
 * List luggage for a user with pagination
 */
export declare const list: import("convex/server").RegisteredQuery<"public", {
    status?: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged" | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        _id: import("convex/values").GenericId<"luggage">;
        _creationTime: number;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        color?: string | undefined;
        reminderTime?: number | undefined;
        features?: string[] | undefined;
        airlineCode?: string | undefined;
        flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
        tagNumber?: string | undefined;
        brand?: string | undefined;
        size?: "medium" | "cabin" | "large" | "oversized" | undefined;
        weight?: number | undefined;
        dimensions?: string | undefined;
        tagPhotoUrl?: string | undefined;
        luggagePhotoUrls?: string[] | undefined;
        lastKnownLocation?: string | undefined;
        lossReportFiled?: boolean | undefined;
        lossReportNumber?: string | undefined;
        lossReportDate?: number | undefined;
        lossReportNotes?: string | undefined;
        airlineName?: string | undefined;
        airlineTrackingUrl?: string | undefined;
        airlineContactPhone?: string | undefined;
        airlineContactEmail?: string | undefined;
        reminderEnabled?: boolean | undefined;
        status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
        createdAt: number;
        description: string;
        userId: string;
        updatedAt: number;
    }[];
    total: number;
}>>;
/**
 * Get luggage by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"luggage">;
}, Promise<{
    flightBooking: {
        _id: import("convex/values").GenericId<"flightBookings">;
        _creationTime: number;
        notes?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        checkInTime?: number | undefined;
        rawEmailContent?: string | undefined;
        passengerEmail?: string | undefined;
        passengerPhone?: string | undefined;
        seatNumber?: string | undefined;
        ticketNumber?: string | undefined;
        mealPreference?: string | undefined;
        specialRequests?: string | undefined;
        baggageAllowance?: string | undefined;
        frequentFlyerNumber?: string | undefined;
        importedFrom?: string | undefined;
        status: "completed" | "cancelled" | "pending" | "confirmed" | "checked_in" | "boarded";
        createdAt: number;
        userId: string;
        updatedAt: number;
        flightId: import("convex/values").GenericId<"flights">;
        confirmationCode: string;
        passengerName: string;
        cabinClass: "business" | "economy" | "premium_economy" | "first";
        departureTime: number;
        arrivalTime: number;
    } | null;
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Get luggage by tag number
 */
export declare const getByTagNumber: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    tagNumber: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Get luggage by flight booking
 */
export declare const getByFlightBooking: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    flightBookingId: import("convex/values").GenericId<"flightBookings">;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
}[]>>;
/**
 * Get luggage by itinerary
 */
export declare const getByItinerary: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
}[]>>;
/**
 * Get luggage with active status (not claimed)
 */
export declare const getActive: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
}[]>>;
/**
 * Get luggage statistics for a user
 */
export declare const getStats: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    total: number;
    checkedIn: number;
    inTransit: number;
    arrived: number;
    claimed: number;
    delayed: number;
    lost: number;
    found: number;
    damaged: number;
}>>;
/**
 * Create a new luggage entry
 */
export declare const create: import("convex/server").RegisteredMutation<"public", {
    status?: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged" | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    description: string;
    userId: string;
}, Promise<import("convex/values").GenericId<"luggage">>>;
/**
 * Update a luggage entry
 */
export declare const update: import("convex/server").RegisteredMutation<"public", {
    status?: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged" | undefined;
    description?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Update luggage status
 */
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    lastKnownLocation?: string | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * File a loss report
 */
export declare const fileLossReport: import("convex/server").RegisteredMutation<"public", {
    lossReportNumber?: string | undefined;
    lossReportNotes?: string | undefined;
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Mark luggage as found
 */
export declare const markAsFound: import("convex/server").RegisteredMutation<"public", {
    lastKnownLocation?: string | undefined;
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Mark luggage as claimed
 */
export declare const markAsClaimed: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Link luggage to a flight booking
 */
export declare const linkToFlightBooking: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
    flightBookingId: import("convex/values").GenericId<"flightBookings">;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Unlink luggage from flight booking
 */
export declare const unlinkFromFlightBooking: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Link luggage to itinerary
 */
export declare const linkToItinerary: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Unlink luggage from itinerary
 */
export declare const unlinkFromItinerary: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Delete a luggage entry
 */
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
}, Promise<void>>;
/**
 * Add photos to luggage
 */
export declare const addPhotos: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
    photoUrls: string[];
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Set tag photo
 */
export declare const setTagPhoto: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"luggage">;
    userId: string;
    tagPhotoUrl: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggage">;
    _creationTime: number;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    color?: string | undefined;
    reminderTime?: number | undefined;
    features?: string[] | undefined;
    airlineCode?: string | undefined;
    flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
    tagNumber?: string | undefined;
    brand?: string | undefined;
    size?: "medium" | "cabin" | "large" | "oversized" | undefined;
    weight?: number | undefined;
    dimensions?: string | undefined;
    tagPhotoUrl?: string | undefined;
    luggagePhotoUrls?: string[] | undefined;
    lastKnownLocation?: string | undefined;
    lossReportFiled?: boolean | undefined;
    lossReportNumber?: string | undefined;
    lossReportDate?: number | undefined;
    lossReportNotes?: string | undefined;
    airlineName?: string | undefined;
    airlineTrackingUrl?: string | undefined;
    airlineContactPhone?: string | undefined;
    airlineContactEmail?: string | undefined;
    reminderEnabled?: boolean | undefined;
    status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
    createdAt: number;
    description: string;
    userId: string;
    updatedAt: number;
} | null>>;
/**
 * Get loss report template by airline code
 */
export declare const getLossReportTemplate: import("convex/server").RegisteredQuery<"public", {
    airlineCode: string;
}, Promise<{
    _id: import("convex/values").GenericId<"luggageLossReportTemplates">;
    _creationTime: number;
    requiredDocuments?: string[] | undefined;
    airlineNameEn?: string | undefined;
    baggageServicePhone?: string | undefined;
    baggageServiceEmail?: string | undefined;
    baggageServiceUrl?: string | undefined;
    trackingUrl?: string | undefined;
    reportInstructions?: string | undefined;
    reportInstructionsEn?: string | undefined;
    compensationPolicy?: string | undefined;
    compensationPolicyEn?: string | undefined;
    maxCompensationAmount?: number | undefined;
    claimDeadlineDays?: number | undefined;
    createdAt: number;
    updatedAt: number;
    airlineCode: string;
    airlineName: string;
} | null>>;
/**
 * List all loss report templates
 */
export declare const listLossReportTemplates: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"luggageLossReportTemplates">;
    _creationTime: number;
    requiredDocuments?: string[] | undefined;
    airlineNameEn?: string | undefined;
    baggageServicePhone?: string | undefined;
    baggageServiceEmail?: string | undefined;
    baggageServiceUrl?: string | undefined;
    trackingUrl?: string | undefined;
    reportInstructions?: string | undefined;
    reportInstructionsEn?: string | undefined;
    compensationPolicy?: string | undefined;
    compensationPolicyEn?: string | undefined;
    maxCompensationAmount?: number | undefined;
    claimDeadlineDays?: number | undefined;
    createdAt: number;
    updatedAt: number;
    airlineCode: string;
    airlineName: string;
}[]>>;
/**
 * Create or update loss report template
 */
export declare const upsertLossReportTemplate: import("convex/server").RegisteredMutation<"public", {
    requiredDocuments?: string[] | undefined;
    airlineNameEn?: string | undefined;
    baggageServicePhone?: string | undefined;
    baggageServiceEmail?: string | undefined;
    baggageServiceUrl?: string | undefined;
    trackingUrl?: string | undefined;
    reportInstructions?: string | undefined;
    reportInstructionsEn?: string | undefined;
    compensationPolicy?: string | undefined;
    compensationPolicyEn?: string | undefined;
    maxCompensationAmount?: number | undefined;
    claimDeadlineDays?: number | undefined;
    airlineCode: string;
    airlineName: string;
}, Promise<import("convex/values").GenericId<"luggageLossReportTemplates">>>;
