/**
 * Flight Service - Convex Implementation
 * CRUD operations for flights and flight bookings
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';
import type {
  CreateFlightBooking,
  UpdateFlightBooking,
  FlightBookingsListQuery,
  CheckIn,
  CreateFlightInfo,
  FlightStatus,
  BookingStatus,
  CabinClass,
} from '../models/flight';

// Types
export interface FlightInfo {
  id: string;
  flightNumber: string;
  airline: string;
  airlineCode: string;
  departureAirport: string;
  departureAirportName?: string;
  departureCity?: string;
  departureTerminal?: string;
  departureGate?: string;
  arrivalAirport: string;
  arrivalAirportName?: string;
  arrivalCity?: string;
  arrivalTerminal?: string;
  arrivalGate?: string;
  departureDate: string;
  scheduledDeparture: number;
  scheduledArrival: number;
  estimatedDeparture?: number;
  estimatedArrival?: number;
  actualDeparture?: number;
  actualArrival?: number;
  status: FlightStatus;
  aircraftType?: string;
  duration?: number;
  distance?: number;
  codeshares?: string[];
  delayReason?: string;
  lastUpdated: number;
}

export interface FlightBookingWithFlight {
  id: string;
  userId: string;
  flightId: string;
  confirmationCode: string;
  passengerName: string;
  passengerEmail?: string;
  passengerPhone?: string;
  seatNumber?: string;
  cabinClass: CabinClass;
  status: BookingStatus;
  departureTime: number;
  arrivalTime: number;
  ticketNumber?: string;
  mealPreference?: string;
  specialRequests?: string;
  baggageAllowance?: string;
  frequentFlyerNumber?: string;
  itineraryId?: string;
  notes?: string;
  importedFrom?: string;
  checkInTime?: number;
  createdAt: number;
  updatedAt: number;
  flight?: FlightInfo;
}

/**
 * Flight service for CRUD operations
 */
export const FlightService = {
  /**
   * Lookup flight by flight number and date
   */
  async lookupFlight(
    flightNumber: string,
    date: string,
  ): Promise<FlightInfo | null> {
    const flight = await convex.query(api.flights.getByFlightNumber, {
      flightNumber: flightNumber.toUpperCase(),
      date,
    });

    if (!flight) {
      return null;
    }

    return {
      id: flight._id,
      flightNumber: flight.flightNumber,
      airline: flight.airline,
      airlineCode: flight.airlineCode,
      departureAirport: flight.departureAirport,
      departureAirportName: flight.departureAirportName,
      departureCity: flight.departureCity,
      departureTerminal: flight.departureTerminal,
      departureGate: flight.departureGate,
      arrivalAirport: flight.arrivalAirport,
      arrivalAirportName: flight.arrivalAirportName,
      arrivalCity: flight.arrivalCity,
      arrivalTerminal: flight.arrivalTerminal,
      arrivalGate: flight.arrivalGate,
      departureDate: flight.departureDate,
      scheduledDeparture: flight.scheduledDeparture,
      scheduledArrival: flight.scheduledArrival,
      estimatedDeparture: flight.estimatedDeparture,
      estimatedArrival: flight.estimatedArrival,
      actualDeparture: flight.actualDeparture,
      actualArrival: flight.actualArrival,
      status: flight.status as FlightStatus,
      aircraftType: flight.aircraftType,
      duration: flight.duration,
      distance: flight.distance,
      codeshares: flight.codeshares,
      delayReason: flight.delayReason,
      lastUpdated: flight.lastUpdated,
    };
  },

  /**
   * Search flights by route
   */
  async searchByRoute(
    departureAirport: string,
    arrivalAirport: string,
    date?: string,
    page: number = 1,
    pageSize: number = 20,
  ): Promise<{ data: FlightInfo[]; total: number }> {
    const result = await convex.query(api.flights.searchByRoute, {
      departureAirport: departureAirport.toUpperCase(),
      arrivalAirport: arrivalAirport.toUpperCase(),
      date,
      page,
      pageSize,
    });

    return {
      data: result.data.map((f: any) => ({
        id: f._id,
        flightNumber: f.flightNumber,
        airline: f.airline,
        airlineCode: f.airlineCode,
        departureAirport: f.departureAirport,
        departureAirportName: f.departureAirportName,
        departureCity: f.departureCity,
        departureTerminal: f.departureTerminal,
        departureGate: f.departureGate,
        arrivalAirport: f.arrivalAirport,
        arrivalAirportName: f.arrivalAirportName,
        arrivalCity: f.arrivalCity,
        arrivalTerminal: f.arrivalTerminal,
        arrivalGate: f.arrivalGate,
        departureDate: f.departureDate,
        scheduledDeparture: f.scheduledDeparture,
        scheduledArrival: f.scheduledArrival,
        estimatedDeparture: f.estimatedDeparture,
        estimatedArrival: f.estimatedArrival,
        actualDeparture: f.actualDeparture,
        actualArrival: f.actualArrival,
        status: f.status,
        aircraftType: f.aircraftType,
        duration: f.duration,
        distance: f.distance,
        codeshares: f.codeshares,
        delayReason: f.delayReason,
        lastUpdated: f.lastUpdated,
      })),
      total: result.total,
    };
  },

  /**
   * Create or update flight info
   */
  async upsertFlight(input: CreateFlightInfo): Promise<string> {
    const flightId = await convex.mutation(api.flights.upsert, {
      flightNumber: input.flightNumber,
      airline: input.airline,
      airlineCode: input.airlineCode,
      departureAirport: input.departureAirport,
      departureAirportName: input.departureAirportName,
      departureCity: input.departureCity,
      departureTerminal: input.departureTerminal,
      departureGate: input.departureGate,
      arrivalAirport: input.arrivalAirport,
      arrivalAirportName: input.arrivalAirportName,
      arrivalCity: input.arrivalCity,
      arrivalTerminal: input.arrivalTerminal,
      arrivalGate: input.arrivalGate,
      departureDate: input.departureDate,
      scheduledDeparture: input.scheduledDeparture,
      scheduledArrival: input.scheduledArrival,
      estimatedDeparture: input.estimatedDeparture,
      estimatedArrival: input.estimatedArrival,
      status: input.status || 'scheduled',
      aircraftType: input.aircraftType,
      duration: input.duration,
      distance: input.distance,
      codeshares: input.codeshares,
      lastUpdated: Date.now(),
    });

    return flightId;
  },

  /**
   * List flight bookings for a user
   */
  async listBookings(
    userId: string,
    query: FlightBookingsListQuery,
  ): Promise<{ data: FlightBookingWithFlight[]; total: number }> {
    const result = await convex.query(api.flights.listBookings, {
      userId,
      status: query.status,
      upcoming: query.upcoming,
      page: query.page,
      pageSize: query.pageSize,
    });

    return {
      data: result.data.map((b: any) => ({
        id: b._id,
        userId: b.userId,
        flightId: b.flightId,
        confirmationCode: b.confirmationCode,
        passengerName: b.passengerName,
        passengerEmail: b.passengerEmail,
        passengerPhone: b.passengerPhone,
        seatNumber: b.seatNumber,
        cabinClass: b.cabinClass,
        status: b.status,
        departureTime: b.departureTime,
        arrivalTime: b.arrivalTime,
        ticketNumber: b.ticketNumber,
        mealPreference: b.mealPreference,
        specialRequests: b.specialRequests,
        baggageAllowance: b.baggageAllowance,
        frequentFlyerNumber: b.frequentFlyerNumber,
        itineraryId: b.itineraryId,
        notes: b.notes,
        importedFrom: b.importedFrom,
        checkInTime: b.checkInTime,
        createdAt: b.createdAt,
        updatedAt: b.updatedAt,
        flight: b.flight ? {
          id: b.flight._id,
          flightNumber: b.flight.flightNumber,
          airline: b.flight.airline,
          airlineCode: b.flight.airlineCode,
          departureAirport: b.flight.departureAirport,
          departureAirportName: b.flight.departureAirportName,
          departureCity: b.flight.departureCity,
          departureTerminal: b.flight.departureTerminal,
          departureGate: b.flight.departureGate,
          arrivalAirport: b.flight.arrivalAirport,
          arrivalAirportName: b.flight.arrivalAirportName,
          arrivalCity: b.flight.arrivalCity,
          arrivalTerminal: b.flight.arrivalTerminal,
          arrivalGate: b.flight.arrivalGate,
          departureDate: b.flight.departureDate,
          scheduledDeparture: b.flight.scheduledDeparture,
          scheduledArrival: b.flight.scheduledArrival,
          estimatedDeparture: b.flight.estimatedDeparture,
          estimatedArrival: b.flight.estimatedArrival,
          actualDeparture: b.flight.actualDeparture,
          actualArrival: b.flight.actualArrival,
          status: b.flight.status,
          aircraftType: b.flight.aircraftType,
          duration: b.flight.duration,
          distance: b.flight.distance,
          codeshares: b.flight.codeshares,
          delayReason: b.flight.delayReason,
          lastUpdated: b.flight.lastUpdated,
        } : undefined,
      })),
      total: result.total,
    };
  },

  /**
   * Get booking by ID
   */
  async getBookingById(
    bookingId: string,
    userId: string,
  ): Promise<FlightBookingWithFlight> {
    const booking = await convex.query(api.flights.getBookingById, {
      id: bookingId as Id<'flightBookings'>,
    });

    if (!booking || booking.userId !== userId) {
      throw new NotFoundError('Booking not found');
    }

    return {
      id: booking._id,
      userId: booking.userId,
      flightId: booking.flightId,
      confirmationCode: booking.confirmationCode,
      passengerName: booking.passengerName,
      passengerEmail: booking.passengerEmail,
      passengerPhone: booking.passengerPhone,
      seatNumber: booking.seatNumber,
      cabinClass: booking.cabinClass as CabinClass,
      status: booking.status as BookingStatus,
      departureTime: booking.departureTime,
      arrivalTime: booking.arrivalTime,
      ticketNumber: booking.ticketNumber,
      mealPreference: booking.mealPreference,
      specialRequests: booking.specialRequests,
      baggageAllowance: booking.baggageAllowance,
      frequentFlyerNumber: booking.frequentFlyerNumber,
      itineraryId: booking.itineraryId,
      notes: booking.notes,
      importedFrom: booking.importedFrom,
      checkInTime: booking.checkInTime,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      flight: booking.flight ? {
        id: booking.flight._id,
        flightNumber: booking.flight.flightNumber,
        airline: booking.flight.airline,
        airlineCode: booking.flight.airlineCode,
        departureAirport: booking.flight.departureAirport,
        departureAirportName: booking.flight.departureAirportName,
        departureCity: booking.flight.departureCity,
        departureTerminal: booking.flight.departureTerminal,
        departureGate: booking.flight.departureGate,
        arrivalAirport: booking.flight.arrivalAirport,
        arrivalAirportName: booking.flight.arrivalAirportName,
        arrivalCity: booking.flight.arrivalCity,
        arrivalTerminal: booking.flight.arrivalTerminal,
        arrivalGate: booking.flight.arrivalGate,
        departureDate: booking.flight.departureDate,
        scheduledDeparture: booking.flight.scheduledDeparture,
        scheduledArrival: booking.flight.scheduledArrival,
        estimatedDeparture: booking.flight.estimatedDeparture,
        estimatedArrival: booking.flight.estimatedArrival,
        actualDeparture: booking.flight.actualDeparture,
        actualArrival: booking.flight.actualArrival,
        status: booking.flight.status as FlightStatus,
        aircraftType: booking.flight.aircraftType,
        duration: booking.flight.duration,
        distance: booking.flight.distance,
        codeshares: booking.flight.codeshares,
        delayReason: booking.flight.delayReason,
        lastUpdated: booking.flight.lastUpdated,
      } : undefined,
    };
  },

  /**
   * Get bookings by itinerary
   */
  async getBookingsByItinerary(
    itineraryId: string,
    userId: string,
  ): Promise<FlightBookingWithFlight[]> {
    const bookings = await convex.query(api.flights.getBookingsByItinerary, {
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
    });

    return bookings.map((b: any) => ({
      id: b._id,
      userId: b.userId,
      flightId: b.flightId,
      confirmationCode: b.confirmationCode,
      passengerName: b.passengerName,
      passengerEmail: b.passengerEmail,
      passengerPhone: b.passengerPhone,
      seatNumber: b.seatNumber,
      cabinClass: b.cabinClass,
      status: b.status,
      departureTime: b.departureTime,
      arrivalTime: b.arrivalTime,
      ticketNumber: b.ticketNumber,
      mealPreference: b.mealPreference,
      specialRequests: b.specialRequests,
      baggageAllowance: b.baggageAllowance,
      frequentFlyerNumber: b.frequentFlyerNumber,
      itineraryId: b.itineraryId,
      notes: b.notes,
      importedFrom: b.importedFrom,
      checkInTime: b.checkInTime,
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      flight: b.flight ? {
        id: b.flight._id,
        flightNumber: b.flight.flightNumber,
        airline: b.flight.airline,
        airlineCode: b.flight.airlineCode,
        departureAirport: b.flight.departureAirport,
        departureAirportName: b.flight.departureAirportName,
        departureCity: b.flight.departureCity,
        departureTerminal: b.flight.departureTerminal,
        departureGate: b.flight.departureGate,
        arrivalAirport: b.flight.arrivalAirport,
        arrivalAirportName: b.flight.arrivalAirportName,
        arrivalCity: b.flight.arrivalCity,
        arrivalTerminal: b.flight.arrivalTerminal,
        arrivalGate: b.flight.arrivalGate,
        departureDate: b.flight.departureDate,
        scheduledDeparture: b.flight.scheduledDeparture,
        scheduledArrival: b.flight.scheduledArrival,
        estimatedDeparture: b.flight.estimatedDeparture,
        estimatedArrival: b.flight.estimatedArrival,
        actualDeparture: b.flight.actualDeparture,
        actualArrival: b.flight.actualArrival,
        status: b.flight.status,
        aircraftType: b.flight.aircraftType,
        duration: b.flight.duration,
        distance: b.flight.distance,
        codeshares: b.flight.codeshares,
        delayReason: b.flight.delayReason,
        lastUpdated: b.flight.lastUpdated,
      } : undefined,
    }));
  },

  /**
   * Create a new flight booking
   */
  async createBooking(
    userId: string,
    input: CreateFlightBooking,
  ): Promise<{ bookingId: string; flightInfo: FlightInfo }> {
    // First, check if flight exists or create it
    let flight = await this.lookupFlight(input.flightNumber, input.departureDate);

    if (!flight) {
      // Create a basic flight record - in production, this would call an external API
      // to get real flight data
      const flightId = await this.upsertFlight({
        flightNumber: input.flightNumber,
        airline: this.getAirlineFromCode(input.flightNumber.substring(0, 2)),
        airlineCode: input.flightNumber.substring(0, 2),
        departureAirport: 'TBD',
        arrivalAirport: 'TBD',
        departureDate: input.departureDate,
        scheduledDeparture: new Date(input.departureDate).getTime(),
        scheduledArrival: new Date(input.departureDate).getTime() + 3600000, // +1 hour default
        status: 'scheduled',
      });

      flight = await convex.query(api.flights.getById, {
        id: flightId as Id<'flights'>,
      });

      if (!flight) {
        throw new Error('Failed to create flight record');
      }

      flight = {
        id: flight._id,
        flightNumber: flight.flightNumber,
        airline: flight.airline,
        airlineCode: flight.airlineCode,
        departureAirport: flight.departureAirport,
        departureAirportName: flight.departureAirportName,
        departureCity: flight.departureCity,
        departureTerminal: flight.departureTerminal,
        departureGate: flight.departureGate,
        arrivalAirport: flight.arrivalAirport,
        arrivalAirportName: flight.arrivalAirportName,
        arrivalCity: flight.arrivalCity,
        arrivalTerminal: flight.arrivalTerminal,
        arrivalGate: flight.arrivalGate,
        departureDate: flight.departureDate,
        scheduledDeparture: flight.scheduledDeparture,
        scheduledArrival: flight.scheduledArrival,
        estimatedDeparture: flight.estimatedDeparture,
        estimatedArrival: flight.estimatedArrival,
        actualDeparture: flight.actualDeparture,
        actualArrival: flight.actualArrival,
        status: flight.status as FlightStatus,
        aircraftType: flight.aircraftType,
        duration: flight.duration,
        distance: flight.distance,
        codeshares: flight.codeshares,
        delayReason: flight.delayReason,
        lastUpdated: flight.lastUpdated,
      };
    }

    // Create the booking
    const bookingId = await convex.mutation(api.flights.createBooking, {
      userId,
      flightId: flight.id as Id<'flights'>,
      confirmationCode: input.confirmationCode,
      passengerName: input.passengerName,
      passengerEmail: input.passengerEmail,
      passengerPhone: input.passengerPhone,
      seatNumber: input.seatNumber,
      cabinClass: input.cabinClass,
      departureTime: flight.scheduledDeparture,
      arrivalTime: flight.scheduledArrival,
      ticketNumber: input.ticketNumber,
      mealPreference: input.mealPreference,
      specialRequests: input.specialRequests,
      baggageAllowance: input.baggageAllowance,
      frequentFlyerNumber: input.frequentFlyerNumber,
      itineraryId: input.itineraryId as Id<'itineraries'> | undefined,
      notes: input.notes,
      importedFrom: 'manual',
    });

    return {
      bookingId,
      flightInfo: flight,
    };
  },

  /**
   * Update a flight booking
   */
  async updateBooking(
    bookingId: string,
    userId: string,
    input: UpdateFlightBooking,
  ): Promise<FlightBookingWithFlight> {
    await convex.mutation(api.flights.updateBooking, {
      id: bookingId as Id<'flightBookings'>,
      userId,
      seatNumber: input.seatNumber,
      cabinClass: input.cabinClass,
      status: input.status,
      mealPreference: input.mealPreference,
      specialRequests: input.specialRequests,
      frequentFlyerNumber: input.frequentFlyerNumber,
      itineraryId: input.itineraryId === null
        ? undefined
        : (input.itineraryId as Id<'itineraries'> | undefined),
      notes: input.notes,
    });

    return this.getBookingById(bookingId, userId);
  },

  /**
   * Delete a flight booking
   */
  async deleteBooking(bookingId: string, userId: string): Promise<void> {
    await convex.mutation(api.flights.deleteBooking, {
      id: bookingId as Id<'flightBookings'>,
      userId,
    });
  },

  /**
   * Link booking to itinerary
   */
  async linkToItinerary(
    bookingId: string,
    itineraryId: string,
    userId: string,
  ): Promise<FlightBookingWithFlight> {
    await convex.mutation(api.flights.linkToItinerary, {
      bookingId: bookingId as Id<'flightBookings'>,
      itineraryId: itineraryId as Id<'itineraries'>,
      userId,
    });

    return this.getBookingById(bookingId, userId);
  },

  /**
   * Unlink booking from itinerary
   */
  async unlinkFromItinerary(
    bookingId: string,
    userId: string,
  ): Promise<FlightBookingWithFlight> {
    await convex.mutation(api.flights.unlinkFromItinerary, {
      bookingId: bookingId as Id<'flightBookings'>,
      userId,
    });

    return this.getBookingById(bookingId, userId);
  },

  /**
   * Check in for a flight
   */
  async checkIn(
    bookingId: string,
    userId: string,
    input: CheckIn,
  ): Promise<FlightBookingWithFlight> {
    await convex.mutation(api.flights.checkIn, {
      bookingId: bookingId as Id<'flightBookings'>,
      userId,
      seatNumber: input.seatNumber,
      boardingGroup: input.boardingGroup,
      boardingPosition: input.boardingPosition,
    });

    return this.getBookingById(bookingId, userId);
  },

  /**
   * Get airline name from code
   */
  getAirlineFromCode(code: string): string {
    const airlines: Record<string, string> = {
      CA: '中国国际航空',
      MU: '中国东方航空',
      CZ: '中国南方航空',
      HU: '海南航空',
      ZH: '深圳航空',
      FM: '上海航空',
      MF: '厦门航空',
      SC: '山东航空',
      '3U': '四川航空',
      '9C': '春秋航空',
      KN: '中国联合航空',
      GJ: '首都航空',
      TV: '西藏航空',
      GY: '多彩贵州航空',
      JD: '首都航空',
      KY: '昆明航空',
      PN: '西部航空',
      DR: '瑞丽航空',
      EU: '成都航空',
      NS: '河北航空',
      BK: '奥凯航空',
      G5: '华夏航空',
      Y8: '扬子江航空',
      HO: '吉祥航空',
      QW: '青岛航空',
      GS: '天津航空',
      A6: '北部湾航空',
      // International
      AA: 'American Airlines',
      UA: 'United Airlines',
      DL: 'Delta Air Lines',
      BA: 'British Airways',
      LH: 'Lufthansa',
      AF: 'Air France',
      KL: 'KLM',
      SQ: 'Singapore Airlines',
      CX: 'Cathay Pacific',
      JL: 'Japan Airlines',
      NH: 'All Nippon Airways',
      KE: 'Korean Air',
      OZ: 'Asiana Airlines',
      TG: 'Thai Airways',
      EK: 'Emirates',
      QR: 'Qatar Airways',
      EY: 'Etihad Airways',
      SU: 'Aeroflot',
      TK: 'Turkish Airlines',
      LX: 'Swiss International',
      OS: 'Austrian Airlines',
      AY: 'Finnair',
      SK: 'SAS',
      IB: 'Iberia',
      QF: 'Qantas',
      NZ: 'Air New Zealand',
      AC: 'Air Canada',
    };

    return airlines[code.toUpperCase()] || `${code} Airlines`;
  },
};
