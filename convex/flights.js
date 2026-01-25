import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Flights - Flight Information and Booking Management
 */
// Flight status enum
const flightStatusValidator = v.union(v.literal('scheduled'), v.literal('delayed'), v.literal('boarding'), v.literal('departed'), v.literal('in_air'), v.literal('landed'), v.literal('arrived'), v.literal('cancelled'), v.literal('diverted'));
// Booking status enum
const bookingStatusValidator = v.union(v.literal('confirmed'), v.literal('pending'), v.literal('cancelled'), v.literal('checked_in'), v.literal('boarded'), v.literal('completed'));
// Cabin class enum
const cabinClassValidator = v.union(v.literal('economy'), v.literal('premium_economy'), v.literal('business'), v.literal('first'));
/**
 * Permission checking helpers
 */
async function checkBookingOwnership(ctx, bookingId, userId) {
    const booking = await ctx.db.get(bookingId);
    if (!booking) {
        throw new Error('Booking not found');
    }
    if (booking.userId !== userId) {
        throw new Error('You do not have access to this booking');
    }
    return true;
}
// ============================================
// Flight Queries
// ============================================
/**
 * Get flight by flight number and date
 */
export const getByFlightNumber = query({
    args: {
        flightNumber: v.string(),
        date: v.string(), // YYYY-MM-DD format
    },
    handler: async (ctx, args) => {
        const flight = await ctx.db
            .query('flights')
            .withIndex('by_flight_number_date', (q) => q
            .eq('flightNumber', args.flightNumber.toUpperCase())
            .eq('departureDate', args.date))
            .first();
        return flight;
    },
});
/**
 * Get flight by ID
 */
export const getById = query({
    args: { id: v.id('flights') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
/**
 * Search flights by route
 */
export const searchByRoute = query({
    args: {
        departureAirport: v.string(),
        arrivalAirport: v.string(),
        date: v.optional(v.string()),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const page = args.page ?? 1;
        const pageSize = args.pageSize ?? 20;
        const offset = (page - 1) * pageSize;
        let flights = await ctx.db
            .query('flights')
            .withIndex('by_route', (q) => q
            .eq('departureAirport', args.departureAirport.toUpperCase())
            .eq('arrivalAirport', args.arrivalAirport.toUpperCase()))
            .collect();
        if (args.date) {
            flights = flights.filter((f) => f.departureDate === args.date);
        }
        const total = flights.length;
        const data = flights.slice(offset, offset + pageSize);
        return { data, total };
    },
});
// ============================================
// Flight Mutations
// ============================================
/**
 * Create or update flight information
 */
export const upsert = mutation({
    args: {
        flightNumber: v.string(),
        airline: v.string(),
        airlineCode: v.string(),
        departureAirport: v.string(),
        departureAirportName: v.optional(v.string()),
        departureCity: v.optional(v.string()),
        departureTerminal: v.optional(v.string()),
        departureGate: v.optional(v.string()),
        arrivalAirport: v.string(),
        arrivalAirportName: v.optional(v.string()),
        arrivalCity: v.optional(v.string()),
        arrivalTerminal: v.optional(v.string()),
        arrivalGate: v.optional(v.string()),
        departureDate: v.string(), // YYYY-MM-DD
        scheduledDeparture: v.number(), // Unix timestamp
        scheduledArrival: v.number(), // Unix timestamp
        estimatedDeparture: v.optional(v.number()),
        estimatedArrival: v.optional(v.number()),
        actualDeparture: v.optional(v.number()),
        actualArrival: v.optional(v.number()),
        status: flightStatusValidator,
        aircraftType: v.optional(v.string()),
        duration: v.optional(v.number()), // Duration in minutes
        distance: v.optional(v.number()), // Distance in km
        codeshares: v.optional(v.array(v.string())),
        lastUpdated: v.number(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('flights')
            .withIndex('by_flight_number_date', (q) => q
            .eq('flightNumber', args.flightNumber.toUpperCase())
            .eq('departureDate', args.departureDate))
            .first();
        const flightData = {
            ...args,
            flightNumber: args.flightNumber.toUpperCase(),
            departureAirport: args.departureAirport.toUpperCase(),
            arrivalAirport: args.arrivalAirport.toUpperCase(),
        };
        if (existing) {
            await ctx.db.patch(existing._id, flightData);
            return existing._id;
        }
        return await ctx.db.insert('flights', flightData);
    },
});
/**
 * Update flight status
 */
export const updateStatus = mutation({
    args: {
        id: v.id('flights'),
        status: flightStatusValidator,
        estimatedDeparture: v.optional(v.number()),
        estimatedArrival: v.optional(v.number()),
        actualDeparture: v.optional(v.number()),
        actualArrival: v.optional(v.number()),
        departureGate: v.optional(v.string()),
        arrivalGate: v.optional(v.string()),
        delayReason: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, {
            ...filteredUpdates,
            lastUpdated: Date.now(),
        });
        return await ctx.db.get(id);
    },
});
// ============================================
// Flight Booking Queries
// ============================================
/**
 * List bookings for a user
 */
export const listBookings = query({
    args: {
        userId: v.string(),
        status: v.optional(bookingStatusValidator),
        upcoming: v.optional(v.boolean()),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const page = args.page ?? 1;
        const pageSize = args.pageSize ?? 20;
        const offset = (page - 1) * pageSize;
        let bookings = await ctx.db
            .query('flightBookings')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .order('desc')
            .collect();
        if (args.status) {
            bookings = bookings.filter((b) => b.status === args.status);
        }
        if (args.upcoming) {
            const now = Date.now();
            bookings = bookings.filter((b) => b.departureTime > now);
        }
        const total = bookings.length;
        const data = bookings.slice(offset, offset + pageSize);
        // Enrich with flight data
        const enriched = await Promise.all(data.map(async (booking) => {
            const flight = await ctx.db.get(booking.flightId);
            return {
                ...booking,
                flight,
            };
        }));
        return { data: enriched, total };
    },
});
/**
 * Get booking by ID
 */
export const getBookingById = query({
    args: { id: v.id('flightBookings') },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.id);
        if (!booking)
            return null;
        const flight = await ctx.db.get(booking.flightId);
        return {
            ...booking,
            flight,
        };
    },
});
/**
 * Get booking by confirmation code
 */
export const getBookingByConfirmation = query({
    args: {
        confirmationCode: v.string(),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db
            .query('flightBookings')
            .withIndex('by_confirmation', (q) => q.eq('confirmationCode', args.confirmationCode.toUpperCase()))
            .first();
        if (!booking || booking.userId !== args.userId) {
            return null;
        }
        const flight = await ctx.db.get(booking.flightId);
        return {
            ...booking,
            flight,
        };
    },
});
/**
 * Get bookings linked to an itinerary
 */
export const getBookingsByItinerary = query({
    args: {
        itineraryId: v.id('itineraries'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query('flightBookings')
            .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
            .collect();
        // Filter by user and enrich with flight data
        const userBookings = bookings.filter((b) => b.userId === args.userId);
        const enriched = await Promise.all(userBookings.map(async (booking) => {
            const flight = await ctx.db.get(booking.flightId);
            return {
                ...booking,
                flight,
            };
        }));
        return enriched;
    },
});
// ============================================
// Flight Booking Mutations
// ============================================
/**
 * Create a new flight booking
 */
export const createBooking = mutation({
    args: {
        userId: v.string(),
        flightId: v.id('flights'),
        confirmationCode: v.string(),
        passengerName: v.string(),
        passengerEmail: v.optional(v.string()),
        passengerPhone: v.optional(v.string()),
        seatNumber: v.optional(v.string()),
        cabinClass: cabinClassValidator,
        status: v.optional(bookingStatusValidator),
        departureTime: v.number(), // Unix timestamp
        arrivalTime: v.number(), // Unix timestamp
        ticketNumber: v.optional(v.string()),
        mealPreference: v.optional(v.string()),
        specialRequests: v.optional(v.string()),
        baggageAllowance: v.optional(v.string()),
        frequentFlyerNumber: v.optional(v.string()),
        itineraryId: v.optional(v.id('itineraries')),
        notes: v.optional(v.string()),
        importedFrom: v.optional(v.string()), // 'manual', 'email', 'api'
        rawEmailContent: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const bookingId = await ctx.db.insert('flightBookings', {
            userId: args.userId,
            flightId: args.flightId,
            confirmationCode: args.confirmationCode.toUpperCase(),
            passengerName: args.passengerName,
            passengerEmail: args.passengerEmail,
            passengerPhone: args.passengerPhone,
            seatNumber: args.seatNumber,
            cabinClass: args.cabinClass,
            status: args.status ?? 'confirmed',
            departureTime: args.departureTime,
            arrivalTime: args.arrivalTime,
            ticketNumber: args.ticketNumber,
            mealPreference: args.mealPreference,
            specialRequests: args.specialRequests,
            baggageAllowance: args.baggageAllowance,
            frequentFlyerNumber: args.frequentFlyerNumber,
            itineraryId: args.itineraryId,
            notes: args.notes,
            importedFrom: args.importedFrom ?? 'manual',
            rawEmailContent: args.rawEmailContent,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return bookingId;
    },
});
/**
 * Update a flight booking
 */
export const updateBooking = mutation({
    args: {
        id: v.id('flightBookings'),
        userId: v.string(),
        seatNumber: v.optional(v.string()),
        cabinClass: v.optional(cabinClassValidator),
        status: v.optional(bookingStatusValidator),
        mealPreference: v.optional(v.string()),
        specialRequests: v.optional(v.string()),
        frequentFlyerNumber: v.optional(v.string()),
        itineraryId: v.optional(v.id('itineraries')),
        notes: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await checkBookingOwnership(ctx, args.id, args.userId);
        const { id, userId, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, {
            ...filteredUpdates,
            updatedAt: Date.now(),
        });
        return await ctx.db.get(id);
    },
});
/**
 * Link booking to itinerary
 */
export const linkToItinerary = mutation({
    args: {
        bookingId: v.id('flightBookings'),
        itineraryId: v.id('itineraries'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        await checkBookingOwnership(ctx, args.bookingId, args.userId);
        await ctx.db.patch(args.bookingId, {
            itineraryId: args.itineraryId,
            updatedAt: Date.now(),
        });
        return await ctx.db.get(args.bookingId);
    },
});
/**
 * Unlink booking from itinerary
 */
export const unlinkFromItinerary = mutation({
    args: {
        bookingId: v.id('flightBookings'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        await checkBookingOwnership(ctx, args.bookingId, args.userId);
        await ctx.db.patch(args.bookingId, {
            itineraryId: undefined,
            updatedAt: Date.now(),
        });
        return await ctx.db.get(args.bookingId);
    },
});
/**
 * Delete a flight booking
 */
export const deleteBooking = mutation({
    args: {
        id: v.id('flightBookings'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        await checkBookingOwnership(ctx, args.id, args.userId);
        await ctx.db.delete(args.id);
    },
});
/**
 * Update check-in status
 */
export const checkIn = mutation({
    args: {
        bookingId: v.id('flightBookings'),
        userId: v.string(),
        seatNumber: v.optional(v.string()),
        boardingGroup: v.optional(v.string()),
        boardingPosition: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await checkBookingOwnership(ctx, args.bookingId, args.userId);
        await ctx.db.patch(args.bookingId, {
            status: 'checked_in',
            seatNumber: args.seatNumber,
            checkInTime: Date.now(),
            updatedAt: Date.now(),
        });
        return await ctx.db.get(args.bookingId);
    },
});
