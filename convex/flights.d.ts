/**
 * Get flight by flight number and date
 */
export declare const getByFlightNumber: import("convex/server").RegisteredQuery<"public", {
    date: string;
    flightNumber: string;
}, Promise<{
    _id: import("convex/values").GenericId<"flights">;
    _creationTime: number;
    duration?: number | undefined;
    distance?: number | undefined;
    departureAirportName?: string | undefined;
    departureCity?: string | undefined;
    departureTerminal?: string | undefined;
    departureGate?: string | undefined;
    arrivalAirportName?: string | undefined;
    arrivalCity?: string | undefined;
    arrivalTerminal?: string | undefined;
    arrivalGate?: string | undefined;
    estimatedDeparture?: number | undefined;
    estimatedArrival?: number | undefined;
    actualDeparture?: number | undefined;
    actualArrival?: number | undefined;
    aircraftType?: string | undefined;
    codeshares?: string[] | undefined;
    delayReason?: string | undefined;
    status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
    lastUpdated: number;
    flightNumber: string;
    airline: string;
    airlineCode: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    scheduledDeparture: number;
    scheduledArrival: number;
} | null>>;
/**
 * Get flight by ID
 */
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"flights">;
}, Promise<{
    _id: import("convex/values").GenericId<"flights">;
    _creationTime: number;
    duration?: number | undefined;
    distance?: number | undefined;
    departureAirportName?: string | undefined;
    departureCity?: string | undefined;
    departureTerminal?: string | undefined;
    departureGate?: string | undefined;
    arrivalAirportName?: string | undefined;
    arrivalCity?: string | undefined;
    arrivalTerminal?: string | undefined;
    arrivalGate?: string | undefined;
    estimatedDeparture?: number | undefined;
    estimatedArrival?: number | undefined;
    actualDeparture?: number | undefined;
    actualArrival?: number | undefined;
    aircraftType?: string | undefined;
    codeshares?: string[] | undefined;
    delayReason?: string | undefined;
    status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
    lastUpdated: number;
    flightNumber: string;
    airline: string;
    airlineCode: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    scheduledDeparture: number;
    scheduledArrival: number;
} | null>>;
/**
 * Search flights by route
 */
export declare const searchByRoute: import("convex/server").RegisteredQuery<"public", {
    date?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    departureAirport: string;
    arrivalAirport: string;
}, Promise<{
    data: {
        _id: import("convex/values").GenericId<"flights">;
        _creationTime: number;
        duration?: number | undefined;
        distance?: number | undefined;
        departureAirportName?: string | undefined;
        departureCity?: string | undefined;
        departureTerminal?: string | undefined;
        departureGate?: string | undefined;
        arrivalAirportName?: string | undefined;
        arrivalCity?: string | undefined;
        arrivalTerminal?: string | undefined;
        arrivalGate?: string | undefined;
        estimatedDeparture?: number | undefined;
        estimatedArrival?: number | undefined;
        actualDeparture?: number | undefined;
        actualArrival?: number | undefined;
        aircraftType?: string | undefined;
        codeshares?: string[] | undefined;
        delayReason?: string | undefined;
        status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
        lastUpdated: number;
        flightNumber: string;
        airline: string;
        airlineCode: string;
        departureAirport: string;
        arrivalAirport: string;
        departureDate: string;
        scheduledDeparture: number;
        scheduledArrival: number;
    }[];
    total: number;
}>>;
/**
 * Create or update flight information
 */
export declare const upsert: import("convex/server").RegisteredMutation<"public", {
    duration?: number | undefined;
    distance?: number | undefined;
    departureAirportName?: string | undefined;
    departureCity?: string | undefined;
    departureTerminal?: string | undefined;
    departureGate?: string | undefined;
    arrivalAirportName?: string | undefined;
    arrivalCity?: string | undefined;
    arrivalTerminal?: string | undefined;
    arrivalGate?: string | undefined;
    estimatedDeparture?: number | undefined;
    estimatedArrival?: number | undefined;
    actualDeparture?: number | undefined;
    actualArrival?: number | undefined;
    aircraftType?: string | undefined;
    codeshares?: string[] | undefined;
    status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
    lastUpdated: number;
    flightNumber: string;
    airline: string;
    airlineCode: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    scheduledDeparture: number;
    scheduledArrival: number;
}, Promise<import("convex/values").GenericId<"flights">>>;
/**
 * Update flight status
 */
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    departureGate?: string | undefined;
    arrivalGate?: string | undefined;
    estimatedDeparture?: number | undefined;
    estimatedArrival?: number | undefined;
    actualDeparture?: number | undefined;
    actualArrival?: number | undefined;
    delayReason?: string | undefined;
    status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
    id: import("convex/values").GenericId<"flights">;
}, Promise<{
    _id: import("convex/values").GenericId<"flights">;
    _creationTime: number;
    duration?: number | undefined;
    distance?: number | undefined;
    departureAirportName?: string | undefined;
    departureCity?: string | undefined;
    departureTerminal?: string | undefined;
    departureGate?: string | undefined;
    arrivalAirportName?: string | undefined;
    arrivalCity?: string | undefined;
    arrivalTerminal?: string | undefined;
    arrivalGate?: string | undefined;
    estimatedDeparture?: number | undefined;
    estimatedArrival?: number | undefined;
    actualDeparture?: number | undefined;
    actualArrival?: number | undefined;
    aircraftType?: string | undefined;
    codeshares?: string[] | undefined;
    delayReason?: string | undefined;
    status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
    lastUpdated: number;
    flightNumber: string;
    airline: string;
    airlineCode: string;
    departureAirport: string;
    arrivalAirport: string;
    departureDate: string;
    scheduledDeparture: number;
    scheduledArrival: number;
} | null>>;
/**
 * List bookings for a user
 */
export declare const listBookings: import("convex/server").RegisteredQuery<"public", {
    status?: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded" | undefined;
    upcoming?: boolean | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        flight: {
            _id: import("convex/values").GenericId<"flights">;
            _creationTime: number;
            duration?: number | undefined;
            distance?: number | undefined;
            departureAirportName?: string | undefined;
            departureCity?: string | undefined;
            departureTerminal?: string | undefined;
            departureGate?: string | undefined;
            arrivalAirportName?: string | undefined;
            arrivalCity?: string | undefined;
            arrivalTerminal?: string | undefined;
            arrivalGate?: string | undefined;
            estimatedDeparture?: number | undefined;
            estimatedArrival?: number | undefined;
            actualDeparture?: number | undefined;
            actualArrival?: number | undefined;
            aircraftType?: string | undefined;
            codeshares?: string[] | undefined;
            delayReason?: string | undefined;
            status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
            lastUpdated: number;
            flightNumber: string;
            airline: string;
            airlineCode: string;
            departureAirport: string;
            arrivalAirport: string;
            departureDate: string;
            scheduledDeparture: number;
            scheduledArrival: number;
        } | null;
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
        status: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded";
        userId: string;
        createdAt: number;
        updatedAt: number;
        flightId: import("convex/values").GenericId<"flights">;
        confirmationCode: string;
        passengerName: string;
        cabinClass: "business" | "economy" | "premium_economy" | "first";
        departureTime: number;
        arrivalTime: number;
    }[];
    total: number;
}>>;
/**
 * Get booking by ID
 */
export declare const getBookingById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"flightBookings">;
}, Promise<{
    flight: {
        _id: import("convex/values").GenericId<"flights">;
        _creationTime: number;
        duration?: number | undefined;
        distance?: number | undefined;
        departureAirportName?: string | undefined;
        departureCity?: string | undefined;
        departureTerminal?: string | undefined;
        departureGate?: string | undefined;
        arrivalAirportName?: string | undefined;
        arrivalCity?: string | undefined;
        arrivalTerminal?: string | undefined;
        arrivalGate?: string | undefined;
        estimatedDeparture?: number | undefined;
        estimatedArrival?: number | undefined;
        actualDeparture?: number | undefined;
        actualArrival?: number | undefined;
        aircraftType?: string | undefined;
        codeshares?: string[] | undefined;
        delayReason?: string | undefined;
        status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
        lastUpdated: number;
        flightNumber: string;
        airline: string;
        airlineCode: string;
        departureAirport: string;
        arrivalAirport: string;
        departureDate: string;
        scheduledDeparture: number;
        scheduledArrival: number;
    } | null;
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
    status: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded";
    userId: string;
    createdAt: number;
    updatedAt: number;
    flightId: import("convex/values").GenericId<"flights">;
    confirmationCode: string;
    passengerName: string;
    cabinClass: "business" | "economy" | "premium_economy" | "first";
    departureTime: number;
    arrivalTime: number;
} | null>>;
/**
 * Get booking by confirmation code
 */
export declare const getBookingByConfirmation: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    confirmationCode: string;
}, Promise<{
    flight: {
        _id: import("convex/values").GenericId<"flights">;
        _creationTime: number;
        duration?: number | undefined;
        distance?: number | undefined;
        departureAirportName?: string | undefined;
        departureCity?: string | undefined;
        departureTerminal?: string | undefined;
        departureGate?: string | undefined;
        arrivalAirportName?: string | undefined;
        arrivalCity?: string | undefined;
        arrivalTerminal?: string | undefined;
        arrivalGate?: string | undefined;
        estimatedDeparture?: number | undefined;
        estimatedArrival?: number | undefined;
        actualDeparture?: number | undefined;
        actualArrival?: number | undefined;
        aircraftType?: string | undefined;
        codeshares?: string[] | undefined;
        delayReason?: string | undefined;
        status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
        lastUpdated: number;
        flightNumber: string;
        airline: string;
        airlineCode: string;
        departureAirport: string;
        arrivalAirport: string;
        departureDate: string;
        scheduledDeparture: number;
        scheduledArrival: number;
    } | null;
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
    status: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded";
    userId: string;
    createdAt: number;
    updatedAt: number;
    flightId: import("convex/values").GenericId<"flights">;
    confirmationCode: string;
    passengerName: string;
    cabinClass: "business" | "economy" | "premium_economy" | "first";
    departureTime: number;
    arrivalTime: number;
} | null>>;
/**
 * Get bookings linked to an itinerary
 */
export declare const getBookingsByItinerary: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    flight: {
        _id: import("convex/values").GenericId<"flights">;
        _creationTime: number;
        duration?: number | undefined;
        distance?: number | undefined;
        departureAirportName?: string | undefined;
        departureCity?: string | undefined;
        departureTerminal?: string | undefined;
        departureGate?: string | undefined;
        arrivalAirportName?: string | undefined;
        arrivalCity?: string | undefined;
        arrivalTerminal?: string | undefined;
        arrivalGate?: string | undefined;
        estimatedDeparture?: number | undefined;
        estimatedArrival?: number | undefined;
        actualDeparture?: number | undefined;
        actualArrival?: number | undefined;
        aircraftType?: string | undefined;
        codeshares?: string[] | undefined;
        delayReason?: string | undefined;
        status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
        lastUpdated: number;
        flightNumber: string;
        airline: string;
        airlineCode: string;
        departureAirport: string;
        arrivalAirport: string;
        departureDate: string;
        scheduledDeparture: number;
        scheduledArrival: number;
    } | null;
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
    status: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded";
    userId: string;
    createdAt: number;
    updatedAt: number;
    flightId: import("convex/values").GenericId<"flights">;
    confirmationCode: string;
    passengerName: string;
    cabinClass: "business" | "economy" | "premium_economy" | "first";
    departureTime: number;
    arrivalTime: number;
}[]>>;
/**
 * Create a new flight booking
 */
export declare const createBooking: import("convex/server").RegisteredMutation<"public", {
    status?: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded" | undefined;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
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
    userId: string;
    flightId: import("convex/values").GenericId<"flights">;
    confirmationCode: string;
    passengerName: string;
    cabinClass: "business" | "economy" | "premium_economy" | "first";
    departureTime: number;
    arrivalTime: number;
}, Promise<import("convex/values").GenericId<"flightBookings">>>;
/**
 * Update a flight booking
 */
export declare const updateBooking: import("convex/server").RegisteredMutation<"public", {
    status?: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded" | undefined;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    seatNumber?: string | undefined;
    cabinClass?: "business" | "economy" | "premium_economy" | "first" | undefined;
    mealPreference?: string | undefined;
    specialRequests?: string | undefined;
    frequentFlyerNumber?: string | undefined;
    id: import("convex/values").GenericId<"flightBookings">;
    userId: string;
}, Promise<{
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
    status: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded";
    userId: string;
    createdAt: number;
    updatedAt: number;
    flightId: import("convex/values").GenericId<"flights">;
    confirmationCode: string;
    passengerName: string;
    cabinClass: "business" | "economy" | "premium_economy" | "first";
    departureTime: number;
    arrivalTime: number;
} | null>>;
/**
 * Link booking to itinerary
 */
export declare const linkToItinerary: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    bookingId: import("convex/values").GenericId<"flightBookings">;
}, Promise<{
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
    status: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded";
    userId: string;
    createdAt: number;
    updatedAt: number;
    flightId: import("convex/values").GenericId<"flights">;
    confirmationCode: string;
    passengerName: string;
    cabinClass: "business" | "economy" | "premium_economy" | "first";
    departureTime: number;
    arrivalTime: number;
} | null>>;
/**
 * Unlink booking from itinerary
 */
export declare const unlinkFromItinerary: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    bookingId: import("convex/values").GenericId<"flightBookings">;
}, Promise<{
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
    status: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded";
    userId: string;
    createdAt: number;
    updatedAt: number;
    flightId: import("convex/values").GenericId<"flights">;
    confirmationCode: string;
    passengerName: string;
    cabinClass: "business" | "economy" | "premium_economy" | "first";
    departureTime: number;
    arrivalTime: number;
} | null>>;
/**
 * Delete a flight booking
 */
export declare const deleteBooking: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"flightBookings">;
    userId: string;
}, Promise<void>>;
/**
 * Update check-in status
 */
export declare const checkIn: import("convex/server").RegisteredMutation<"public", {
    seatNumber?: string | undefined;
    boardingGroup?: string | undefined;
    boardingPosition?: number | undefined;
    userId: string;
    bookingId: import("convex/values").GenericId<"flightBookings">;
}, Promise<{
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
    status: "cancelled" | "completed" | "pending" | "confirmed" | "checked_in" | "boarded";
    userId: string;
    createdAt: number;
    updatedAt: number;
    flightId: import("convex/values").GenericId<"flights">;
    confirmationCode: string;
    passengerName: string;
    cabinClass: "business" | "economy" | "premium_economy" | "first";
    departureTime: number;
    arrivalTime: number;
} | null>>;
