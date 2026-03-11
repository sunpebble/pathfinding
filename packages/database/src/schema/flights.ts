/**
 * Flights schema - flights, flight bookings, hotel bookings.
 */
import {
  double,
  index,
  int,
  json,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from 'drizzle-orm/mysql-core';
import { createdAt, fk, id, updatedAt } from './columns';

// ── Flights ────────────────────────────────────────────
export const flights = mysqlTable(
  'flights',
  {
    id: id(),
    flightNumber: varchar('flight_number', { length: 20 }).notNull(),
    airline: varchar('airline', { length: 100 }),
    departureAirport: varchar('departure_airport', { length: 10 }).notNull(),
    arrivalAirport: varchar('arrival_airport', { length: 10 }).notNull(),
    departureTime: timestamp('departure_time', { mode: 'date' }),
    arrivalTime: timestamp('arrival_time', { mode: 'date' }),
    departureDate: varchar('departure_date', { length: 10 }),
    status: varchar('status', { length: 20 }),
    gate: varchar('gate', { length: 20 }),
    terminal: varchar('terminal', { length: 20 }),
    aircraft: varchar('aircraft', { length: 100 }),
    duration: int('duration'),
    metadata: json('metadata'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('flights_number_idx').on(t.flightNumber),
    index('flights_number_date_idx').on(t.flightNumber, t.departureDate),
    index('flights_route_idx').on(t.departureAirport, t.arrivalAirport),
    index('flights_departure_date_idx').on(t.departureDate),
    index('flights_status_idx').on(t.status),
  ],
);

// ── Flight Bookings ────────────────────────────────────
export const flightBookings = mysqlTable(
  'flight_bookings',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    flightId: fk('flight_id'),
    itineraryId: fk('itinerary_id'),
    confirmationCode: varchar('confirmation_code', { length: 50 }),
    airline: varchar('airline', { length: 100 }),
    flightNumber: varchar('flight_number', { length: 20 }),
    departureAirport: varchar('departure_airport', { length: 10 }),
    arrivalAirport: varchar('arrival_airport', { length: 10 }),
    departureTime: timestamp('departure_time', { mode: 'date' }),
    arrivalTime: timestamp('arrival_time', { mode: 'date' }),
    seatInfo: varchar('seat_info', { length: 20 }),
    bookingClass: varchar('booking_class', { length: 20 }),
    status: varchar('status', { length: 20 }).notNull().default('confirmed'),
    passengerName: varchar('passenger_name', { length: 255 }),
    metadata: json('metadata'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('flight_bookings_user_idx').on(t.userId),
    index('flight_bookings_user_dep_idx').on(t.userId, t.departureTime),
    index('flight_bookings_confirm_idx').on(t.confirmationCode),
    index('flight_bookings_flight_idx').on(t.flightId),
    index('flight_bookings_itinerary_idx').on(t.itineraryId),
    index('flight_bookings_status_idx').on(t.status),
  ],
);

// ── Hotel Bookings ─────────────────────────────────────
export const hotelBookings = mysqlTable(
  'hotel_bookings',
  {
    id: id(),
    userId: fk('user_id').notNull(),
    itineraryId: fk('itinerary_id'),
    hotelName: varchar('hotel_name', { length: 500 }).notNull(),
    address: text('address'),
    latitude: double('latitude'),
    longitude: double('longitude'),
    checkInDate: varchar('check_in_date', { length: 10 }).notNull(),
    checkOutDate: varchar('check_out_date', { length: 10 }).notNull(),
    confirmationCode: varchar('confirmation_code', { length: 50 }),
    roomType: varchar('room_type', { length: 100 }),
    totalPrice: double('total_price'),
    currency: varchar('currency', { length: 10 }),
    status: varchar('status', { length: 20 }).notNull().default('confirmed'),
    metadata: json('metadata'),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
  },
  t => [
    index('hotel_bookings_user_idx').on(t.userId),
    index('hotel_bookings_itinerary_idx').on(t.itineraryId),
    index('hotel_bookings_user_dates_idx').on(t.userId, t.checkInDate),
    index('hotel_bookings_status_idx').on(t.status),
  ],
);
