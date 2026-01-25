import { v } from 'convex/values';
import { mutation, query } from './_generated/server';
/**
 * Hotel Bookings - Queries and Mutations
 */
const statusValidator = v.optional(v.union(v.literal('confirmed'), v.literal('pending'), v.literal('cancelled'), v.literal('completed')));
const importSourceValidator = v.optional(v.union(v.literal('manual'), v.literal('email'), v.literal('import')));
// List hotel bookings for a user
export const listByUser = query({
    args: {
        userId: v.string(),
        page: v.optional(v.number()),
        pageSize: v.optional(v.number()),
        status: statusValidator,
    },
    handler: async (ctx, args) => {
        const page = args.page ?? 1;
        const pageSize = args.pageSize ?? 20;
        const offset = (page - 1) * pageSize;
        const bookingsQuery = ctx.db
            .query('hotelBookings')
            .withIndex('by_user', (q) => q.eq('userId', args.userId));
        const allBookings = await bookingsQuery.order('desc').collect();
        // Filter by status if provided
        const filtered = args.status
            ? allBookings.filter((b) => b.status === args.status)
            : allBookings;
        const total = filtered.length;
        const data = filtered.slice(offset, offset + pageSize);
        return { data, total };
    },
});
// List hotel bookings for an itinerary
export const listByItinerary = query({
    args: {
        itineraryId: v.id('itineraries'),
    },
    handler: async (ctx, args) => {
        const bookings = await ctx.db
            .query('hotelBookings')
            .withIndex('by_itinerary', (q) => q.eq('itineraryId', args.itineraryId))
            .order('asc')
            .collect();
        // Sort by check-in date
        bookings.sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime());
        return bookings;
    },
});
// Get hotel booking by ID
export const getById = query({
    args: { id: v.id('hotelBookings') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});
// Get upcoming bookings for a user
export const getUpcoming = query({
    args: {
        userId: v.string(),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const today = new Date().toISOString().split('T')[0];
        const limit = args.limit ?? 5;
        const allBookings = await ctx.db
            .query('hotelBookings')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .collect();
        // Filter upcoming (check-in date >= today) and not cancelled
        const upcoming = allBookings
            .filter((b) => b.checkInDate >= today && b.status !== 'cancelled')
            .sort((a, b) => new Date(a.checkInDate).getTime() - new Date(b.checkInDate).getTime())
            .slice(0, limit);
        return upcoming;
    },
});
// Create a new hotel booking
export const create = mutation({
    args: {
        userId: v.string(),
        itineraryId: v.optional(v.id('itineraries')),
        hotelName: v.string(),
        address: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        checkInDate: v.string(),
        checkOutDate: v.string(),
        checkInTime: v.optional(v.string()),
        checkOutTime: v.optional(v.string()),
        roomType: v.optional(v.string()),
        roomCount: v.number(),
        guestCount: v.optional(v.number()),
        totalPrice: v.optional(v.number()),
        currency: v.optional(v.string()),
        pricePerNight: v.optional(v.number()),
        confirmationNumber: v.optional(v.string()),
        bookingPlatform: v.optional(v.string()),
        bookingUrl: v.optional(v.string()),
        hotelPhone: v.optional(v.string()),
        hotelEmail: v.optional(v.string()),
        notes: v.optional(v.string()),
        amenities: v.optional(v.array(v.string())),
        images: v.optional(v.array(v.string())),
        importSource: importSourceValidator,
        rawEmailContent: v.optional(v.string()),
        status: statusValidator,
    },
    handler: async (ctx, args) => {
        const bookingId = await ctx.db.insert('hotelBookings', {
            userId: args.userId,
            itineraryId: args.itineraryId,
            hotelName: args.hotelName,
            address: args.address,
            latitude: args.latitude,
            longitude: args.longitude,
            checkInDate: args.checkInDate,
            checkOutDate: args.checkOutDate,
            checkInTime: args.checkInTime,
            checkOutTime: args.checkOutTime,
            roomType: args.roomType,
            roomCount: args.roomCount,
            guestCount: args.guestCount,
            totalPrice: args.totalPrice,
            currency: args.currency,
            pricePerNight: args.pricePerNight,
            confirmationNumber: args.confirmationNumber,
            bookingPlatform: args.bookingPlatform,
            bookingUrl: args.bookingUrl,
            hotelPhone: args.hotelPhone,
            hotelEmail: args.hotelEmail,
            notes: args.notes,
            amenities: args.amenities,
            images: args.images,
            importSource: args.importSource ?? 'manual',
            rawEmailContent: args.rawEmailContent,
            status: args.status ?? 'confirmed',
        });
        return bookingId;
    },
});
// Update a hotel booking
export const update = mutation({
    args: {
        id: v.id('hotelBookings'),
        userId: v.string(),
        itineraryId: v.optional(v.id('itineraries')),
        hotelName: v.optional(v.string()),
        address: v.optional(v.string()),
        latitude: v.optional(v.number()),
        longitude: v.optional(v.number()),
        checkInDate: v.optional(v.string()),
        checkOutDate: v.optional(v.string()),
        checkInTime: v.optional(v.string()),
        checkOutTime: v.optional(v.string()),
        roomType: v.optional(v.string()),
        roomCount: v.optional(v.number()),
        guestCount: v.optional(v.number()),
        totalPrice: v.optional(v.number()),
        currency: v.optional(v.string()),
        pricePerNight: v.optional(v.number()),
        confirmationNumber: v.optional(v.string()),
        bookingPlatform: v.optional(v.string()),
        bookingUrl: v.optional(v.string()),
        hotelPhone: v.optional(v.string()),
        hotelEmail: v.optional(v.string()),
        notes: v.optional(v.string()),
        amenities: v.optional(v.array(v.string())),
        images: v.optional(v.array(v.string())),
        status: statusValidator,
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        // Check ownership
        if (booking.userId !== args.userId) {
            throw new Error('You do not have permission to update this booking');
        }
        const { id, userId, ...updates } = args;
        const filteredUpdates = Object.fromEntries(Object.entries(updates).filter(([, v]) => v !== undefined));
        await ctx.db.patch(id, filteredUpdates);
        return await ctx.db.get(id);
    },
});
// Delete a hotel booking
export const remove = mutation({
    args: {
        id: v.id('hotelBookings'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        // Check ownership
        if (booking.userId !== args.userId) {
            throw new Error('You do not have permission to delete this booking');
        }
        await ctx.db.delete(args.id);
    },
});
// Link booking to itinerary
export const linkToItinerary = mutation({
    args: {
        id: v.id('hotelBookings'),
        userId: v.string(),
        itineraryId: v.id('itineraries'),
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        if (booking.userId !== args.userId) {
            throw new Error('You do not have permission to update this booking');
        }
        // Verify itinerary exists and belongs to user
        const itinerary = await ctx.db.get(args.itineraryId);
        if (!itinerary || itinerary.userId !== args.userId) {
            throw new Error('Itinerary not found');
        }
        await ctx.db.patch(args.id, { itineraryId: args.itineraryId });
        return await ctx.db.get(args.id);
    },
});
// Unlink booking from itinerary
export const unlinkFromItinerary = mutation({
    args: {
        id: v.id('hotelBookings'),
        userId: v.string(),
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        if (booking.userId !== args.userId) {
            throw new Error('You do not have permission to update this booking');
        }
        await ctx.db.patch(args.id, { itineraryId: undefined });
        return await ctx.db.get(args.id);
    },
});
// Update booking status
export const updateStatus = mutation({
    args: {
        id: v.id('hotelBookings'),
        userId: v.string(),
        status: v.union(v.literal('confirmed'), v.literal('pending'), v.literal('cancelled'), v.literal('completed')),
    },
    handler: async (ctx, args) => {
        const booking = await ctx.db.get(args.id);
        if (!booking) {
            throw new Error('Booking not found');
        }
        if (booking.userId !== args.userId) {
            throw new Error('You do not have permission to update this booking');
        }
        await ctx.db.patch(args.id, { status: args.status });
        return await ctx.db.get(args.id);
    },
});
// Parse email content (placeholder for AI parsing)
export const parseEmailContent = mutation({
    args: {
        userId: v.string(),
        emailContent: v.string(),
    },
    handler: async (ctx, args) => {
        // This is a placeholder for email parsing logic
        // In a real implementation, this would use AI to extract booking details
        // For now, we'll create a basic structure that can be filled in manually
        const bookingId = await ctx.db.insert('hotelBookings', {
            userId: args.userId,
            hotelName: '待填写 - 从邮件导入',
            checkInDate: new Date().toISOString().split('T')[0],
            checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
            roomCount: 1,
            importSource: 'email',
            rawEmailContent: args.emailContent,
            status: 'pending',
        });
        return {
            bookingId,
            needsManualReview: true,
            message: '邮件已导入，请手动填写预订详情',
        };
    },
});
// Calculate nights between check-in and check-out
export const calculateNights = query({
    args: {
        checkInDate: v.string(),
        checkOutDate: v.string(),
    },
    handler: async (_ctx, args) => {
        const checkIn = new Date(args.checkInDate);
        const checkOut = new Date(args.checkOutDate);
        const diffTime = checkOut.getTime() - checkIn.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return Math.max(1, diffDays);
    },
});
