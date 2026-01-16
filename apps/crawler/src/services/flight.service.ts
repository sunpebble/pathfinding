/**
 * Flight Service
 * Provides flight information lookup, email parsing, and status tracking
 */

import { api, convex } from '../lib/convex.js';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('Flight');

// Flight status types
export type FlightStatus =
  | 'scheduled'
  | 'delayed'
  | 'boarding'
  | 'departed'
  | 'in_air'
  | 'landed'
  | 'arrived'
  | 'cancelled'
  | 'diverted';

export type BookingStatus =
  | 'confirmed'
  | 'pending'
  | 'cancelled'
  | 'checked_in'
  | 'boarded'
  | 'completed';

export type CabinClass = 'economy' | 'premium_economy' | 'business' | 'first';

// Flight information interface
export interface FlightInfo {
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

// Parsed booking from email
export interface ParsedBooking {
  flightNumber: string;
  confirmationCode: string;
  passengerName: string;
  passengerEmail?: string;
  departureDate: string;
  departureTime?: string;
  arrivalTime?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  seatNumber?: string;
  cabinClass?: CabinClass;
  ticketNumber?: string;
  baggageAllowance?: string;
}

// Airline codes mapping (common Chinese airlines)
const AIRLINE_CODES: Record<string, string> = {
  CA: '中国国航',
  MU: '东方航空',
  CZ: '南方航空',
  HU: '海南航空',
  ZH: '深圳航空',
  MF: '厦门航空',
  FM: '上海航空',
  '3U': '四川航空',
  SC: '山东航空',
  GS: '天津航空',
  '9C': '春秋航空',
  G5: '华夏航空',
  PN: '西部航空',
  EU: '成都航空',
  KN: '联合航空',
  // International
  AA: 'American Airlines',
  UA: 'United Airlines',
  DL: 'Delta Air Lines',
  BA: 'British Airways',
  AF: 'Air France',
  LH: 'Lufthansa',
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
};

// Airport codes mapping (major Chinese airports)
const AIRPORT_CODES: Record<string, { name: string; city: string }> = {
  PEK: { name: '北京首都国际机场', city: '北京' },
  PKX: { name: '北京大兴国际机场', city: '北京' },
  SHA: { name: '上海虹桥国际机场', city: '上海' },
  PVG: { name: '上海浦东国际机场', city: '上海' },
  CAN: { name: '广州白云国际机场', city: '广州' },
  SZX: { name: '深圳宝安国际机场', city: '深圳' },
  CTU: { name: '成都双流国际机场', city: '成都' },
  TFU: { name: '成都天府国际机场', city: '成都' },
  KMG: { name: '昆明长水国际机场', city: '昆明' },
  XIY: { name: '西安咸阳国际机场', city: '西安' },
  CKG: { name: '重庆江北国际机场', city: '重庆' },
  HGH: { name: '杭州萧山国际机场', city: '杭州' },
  NKG: { name: '南京禄口国际机场', city: '南京' },
  WUH: { name: '武汉天河国际机场', city: '武汉' },
  CSX: { name: '长沙黄花国际机场', city: '长沙' },
  XMN: { name: '厦门高崎国际机场', city: '厦门' },
  TAO: { name: '青岛胶东国际机场', city: '青岛' },
  DLC: { name: '大连周水子国际机场', city: '大连' },
  SYX: { name: '三亚凤凰国际机场', city: '三亚' },
  HAK: { name: '海口美兰国际机场', city: '海口' },
  HRB: { name: '哈尔滨太平国际机场', city: '哈尔滨' },
  SHE: { name: '沈阳桃仙国际机场', city: '沈阳' },
  TSN: { name: '天津滨海国际机场', city: '天津' },
  CGO: { name: '郑州新郑国际机场', city: '郑州' },
  NNG: { name: '南宁吴圩国际机场', city: '南宁' },
  FOC: { name: '福州长乐国际机场', city: '福州' },
  URC: { name: '乌鲁木齐地窝堡国际机场', city: '乌鲁木齐' },
  LHW: { name: '兰州中川国际机场', city: '兰州' },
  // International
  HKG: { name: '香港国际机场', city: '香港' },
  TPE: { name: '台湾桃园国际机场', city: '台北' },
  NRT: { name: '成田国际机场', city: '东京' },
  HND: { name: '羽田机场', city: '东京' },
  ICN: { name: '仁川国际机场', city: '首尔' },
  SIN: { name: '樟宜机场', city: '新加坡' },
  BKK: { name: '素万那普机场', city: '曼谷' },
  KUL: { name: '吉隆坡国际机场', city: '吉隆坡' },
};

/**
 * Extract airline code from flight number
 */
function extractAirlineCode(flightNumber: string): string {
  const match = flightNumber.match(/^([A-Z]{2}|\d[A-Z]|[A-Z]\d)/i);
  return match ? match[1].toUpperCase() : '';
}

/**
 * Get airline name from code
 */
function getAirlineName(code: string): string {
  return AIRLINE_CODES[code] || code;
}

/**
 * Get airport info from code
 */
function getAirportInfo(code: string): { name: string; city: string } | null {
  return AIRPORT_CODES[code.toUpperCase()] || null;
}

/**
 * Parse flight number to extract components
 */
function parseFlightNumber(flightNumber: string): {
  airlineCode: string;
  flightNum: string;
} {
  const normalized = flightNumber.toUpperCase().replace(/\s+/g, '');
  const match = normalized.match(/^([A-Z]{2}|\d[A-Z]|[A-Z]\d)(\d+)$/);
  if (match) {
    return { airlineCode: match[1], flightNum: match[2] };
  }
  return { airlineCode: '', flightNum: normalized };
}

/**
 * Email parsing patterns for different airlines
 */
const EMAIL_PATTERNS = {
  // Generic patterns
  flightNumber: [
    /航班[号]?\s*[:：]?\s*([A-Z]{2}\d{3,4})/i,
    /Flight\s*(?:Number|No\.?)?\s*[:：]?\s*([A-Z]{2}\d{3,4})/i,
    /([A-Z]{2}\d{3,4})\s*航班/i,
  ],
  confirmationCode: [
    /确认[号码]?\s*[:：]?\s*([A-Z0-9]{6})/i,
    /Confirmation\s*(?:Code|Number)?\s*[:：]?\s*([A-Z0-9]{6})/i,
    /PNR\s*[:：]?\s*([A-Z0-9]{6})/i,
    /预订[号码]?\s*[:：]?\s*([A-Z0-9]{6})/i,
    /Booking\s*(?:Reference|Code)?\s*[:：]?\s*([A-Z0-9]{6})/i,
  ],
  passengerName: [
    /乘客[姓名]?\s*[:：]?\s*([^\n\r,]+)/i,
    /Passenger\s*(?:Name)?\s*[:：]?\s*([^\n\r,]+)/i,
    /旅客\s*[:：]?\s*([^\n\r,]+)/i,
  ],
  departureDate: [
    /出发日期\s*[:：]?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
    /Departure\s*(?:Date)?\s*[:：]?\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/i,
    /(\d{4}[-/]\d{1,2}[-/]\d{1,2})\s*出发/i,
  ],
  departureTime: [
    /出发时间\s*[:：]?\s*(\d{1,2}[:：]\d{2})/i,
    /Departure\s*(?:Time)?\s*[:：]?\s*(\d{1,2}[:：]\d{2})/i,
    /起飞\s*[:：]?\s*(\d{1,2}[:：]\d{2})/i,
  ],
  arrivalTime: [
    /到达时间\s*[:：]?\s*(\d{1,2}[:：]\d{2})/i,
    /Arrival\s*(?:Time)?\s*[:：]?\s*(\d{1,2}[:：]\d{2})/i,
    /降落\s*[:：]?\s*(\d{1,2}[:：]\d{2})/i,
  ],
  seatNumber: [
    /座位[号]?\s*[:：]?\s*(\d{1,2}[A-Z])/i,
    /Seat\s*(?:Number|No\.?)?\s*[:：]?\s*(\d{1,2}[A-Z])/i,
  ],
  airports: [
    /([A-Z]{3})\s*[-→到至]\s*([A-Z]{3})/i,
    /从\s*([A-Z]{3})\s*到\s*([A-Z]{3})/i,
  ],
  ticketNumber: [
    /票号\s*[:：]?\s*(\d{13})/i,
    /Ticket\s*(?:Number|No\.?)?\s*[:：]?\s*(\d{13})/i,
    /E-Ticket\s*[:：]?\s*(\d{13})/i,
  ],
};

/**
 * Flight Service class
 */
export class FlightService {
  private memoryCache = new Map<
    string,
    { data: FlightInfo; timestamp: number }
  >();
  private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes for flight data

  /**
   * Generate cache key for flight
   */
  private getCacheKey(flightNumber: string, date: string): string {
    return `${flightNumber.toUpperCase()}_${date}`;
  }

  /**
   * Check memory cache
   */
  private getFromMemoryCache(key: string): FlightInfo | null {
    const cached = this.memoryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
      return cached.data;
    }
    return null;
  }

  /**
   * Set memory cache
   */
  private setMemoryCache(key: string, data: FlightInfo): void {
    this.memoryCache.set(key, { data, timestamp: Date.now() });
  }

  /**
   * Look up flight information by flight number and date
   * This is a mock implementation - in production, integrate with a flight API
   */
  async lookupFlight(
    flightNumber: string,
    date: string
  ): Promise<FlightInfo | null> {
    const normalizedFlight = flightNumber.toUpperCase().replace(/\s+/g, '');
    const cacheKey = this.getCacheKey(normalizedFlight, date);

    // Check memory cache
    const cached = this.getFromMemoryCache(cacheKey);
    if (cached) {
      logger.debug('Flight info from cache', { flightNumber, date });
      return cached;
    }

    // Check database cache
    try {
      const dbFlight = await convex.query(api.flights.getByFlightNumber, {
        flightNumber: normalizedFlight,
        date,
      });

      if (dbFlight) {
        const flightInfo: FlightInfo = {
          flightNumber: dbFlight.flightNumber,
          airline: dbFlight.airline,
          airlineCode: dbFlight.airlineCode,
          departureAirport: dbFlight.departureAirport,
          departureAirportName: dbFlight.departureAirportName,
          departureCity: dbFlight.departureCity,
          departureTerminal: dbFlight.departureTerminal,
          departureGate: dbFlight.departureGate,
          arrivalAirport: dbFlight.arrivalAirport,
          arrivalAirportName: dbFlight.arrivalAirportName,
          arrivalCity: dbFlight.arrivalCity,
          arrivalTerminal: dbFlight.arrivalTerminal,
          arrivalGate: dbFlight.arrivalGate,
          departureDate: dbFlight.departureDate,
          scheduledDeparture: dbFlight.scheduledDeparture,
          scheduledArrival: dbFlight.scheduledArrival,
          estimatedDeparture: dbFlight.estimatedDeparture,
          estimatedArrival: dbFlight.estimatedArrival,
          actualDeparture: dbFlight.actualDeparture,
          actualArrival: dbFlight.actualArrival,
          status: dbFlight.status as FlightStatus,
          aircraftType: dbFlight.aircraftType,
          duration: dbFlight.duration,
          distance: dbFlight.distance,
          codeshares: dbFlight.codeshares,
          delayReason: dbFlight.delayReason,
          lastUpdated: dbFlight.lastUpdated,
        };
        this.setMemoryCache(cacheKey, flightInfo);
        return flightInfo;
      }
    } catch (error) {
      logger.warn('Failed to query flight from database', { error });
    }

    // Generate mock flight data for demonstration
    // In production, this would call a real flight API (e.g., FlightAware, AeroDataBox)
    const mockFlight = this.generateMockFlightInfo(normalizedFlight, date);
    if (mockFlight) {
      this.setMemoryCache(cacheKey, mockFlight);

      // Save to database
      try {
        await convex.mutation(api.flights.upsert, mockFlight);
      } catch (error) {
        logger.warn('Failed to save flight to database', { error });
      }
    }

    return mockFlight;
  }

  /**
   * Generate mock flight information for demonstration
   * In production, replace with actual API integration
   */
  private generateMockFlightInfo(
    flightNumber: string,
    date: string
  ): FlightInfo | null {
    const { airlineCode } = parseFlightNumber(flightNumber);
    if (!airlineCode) return null;

    const airline = getAirlineName(airlineCode);

    // Generate random but realistic flight times
    const departureHour = 6 + Math.floor(Math.random() * 14); // 6:00 - 20:00
    const durationMinutes = 60 + Math.floor(Math.random() * 180); // 1-4 hours

    const departureDate = new Date(`${date}T${departureHour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`);
    const arrivalDate = new Date(departureDate.getTime() + durationMinutes * 60 * 1000);

    // Pick random airports
    const airportCodes = Object.keys(AIRPORT_CODES);
    const depIndex = Math.floor(Math.random() * airportCodes.length);
    let arrIndex = Math.floor(Math.random() * airportCodes.length);
    while (arrIndex === depIndex) {
      arrIndex = Math.floor(Math.random() * airportCodes.length);
    }

    const depAirport = airportCodes[depIndex];
    const arrAirport = airportCodes[arrIndex];
    const depInfo = getAirportInfo(depAirport);
    const arrInfo = getAirportInfo(arrAirport);

    return {
      flightNumber,
      airline,
      airlineCode,
      departureAirport: depAirport,
      departureAirportName: depInfo?.name,
      departureCity: depInfo?.city,
      departureTerminal: `T${Math.floor(Math.random() * 3) + 1}`,
      arrivalAirport: arrAirport,
      arrivalAirportName: arrInfo?.name,
      arrivalCity: arrInfo?.city,
      arrivalTerminal: `T${Math.floor(Math.random() * 3) + 1}`,
      departureDate: date,
      scheduledDeparture: departureDate.getTime(),
      scheduledArrival: arrivalDate.getTime(),
      status: 'scheduled',
      aircraftType: ['Boeing 737-800', 'Airbus A320', 'Boeing 787-9', 'Airbus A350'][Math.floor(Math.random() * 4)],
      duration: durationMinutes,
      distance: Math.floor(500 + Math.random() * 2000),
      lastUpdated: Date.now(),
    };
  }

  /**
   * Parse flight booking information from email content
   */
  parseBookingEmail(emailContent: string): ParsedBooking | null {
    const result: Partial<ParsedBooking> = {};

    // Extract flight number
    for (const pattern of EMAIL_PATTERNS.flightNumber) {
      const match = emailContent.match(pattern);
      if (match) {
        result.flightNumber = match[1].toUpperCase();
        break;
      }
    }

    if (!result.flightNumber) {
      logger.warn('Could not extract flight number from email');
      return null;
    }

    // Extract confirmation code
    for (const pattern of EMAIL_PATTERNS.confirmationCode) {
      const match = emailContent.match(pattern);
      if (match) {
        result.confirmationCode = match[1].toUpperCase();
        break;
      }
    }

    if (!result.confirmationCode) {
      logger.warn('Could not extract confirmation code from email');
      return null;
    }

    // Extract passenger name
    for (const pattern of EMAIL_PATTERNS.passengerName) {
      const match = emailContent.match(pattern);
      if (match) {
        result.passengerName = match[1].trim();
        break;
      }
    }

    // Extract departure date
    for (const pattern of EMAIL_PATTERNS.departureDate) {
      const match = emailContent.match(pattern);
      if (match) {
        result.departureDate = match[1].replace(/\//g, '-');
        break;
      }
    }

    // Extract departure time
    for (const pattern of EMAIL_PATTERNS.departureTime) {
      const match = emailContent.match(pattern);
      if (match) {
        result.departureTime = match[1].replace('：', ':');
        break;
      }
    }

    // Extract arrival time
    for (const pattern of EMAIL_PATTERNS.arrivalTime) {
      const match = emailContent.match(pattern);
      if (match) {
        result.arrivalTime = match[1].replace('：', ':');
        break;
      }
    }

    // Extract seat number
    for (const pattern of EMAIL_PATTERNS.seatNumber) {
      const match = emailContent.match(pattern);
      if (match) {
        result.seatNumber = match[1].toUpperCase();
        break;
      }
    }

    // Extract airports
    for (const pattern of EMAIL_PATTERNS.airports) {
      const match = emailContent.match(pattern);
      if (match) {
        result.departureAirport = match[1].toUpperCase();
        result.arrivalAirport = match[2].toUpperCase();
        break;
      }
    }

    // Extract ticket number
    for (const pattern of EMAIL_PATTERNS.ticketNumber) {
      const match = emailContent.match(pattern);
      if (match) {
        result.ticketNumber = match[1];
        break;
      }
    }

    // Determine cabin class from keywords
    const lowerContent = emailContent.toLowerCase();
    if (lowerContent.includes('first') || lowerContent.includes('头等')) {
      result.cabinClass = 'first';
    } else if (lowerContent.includes('business') || lowerContent.includes('商务')) {
      result.cabinClass = 'business';
    } else if (lowerContent.includes('premium') || lowerContent.includes('超级经济')) {
      result.cabinClass = 'premium_economy';
    } else {
      result.cabinClass = 'economy';
    }

    logger.info('Parsed booking from email', {
      flightNumber: result.flightNumber,
      confirmationCode: result.confirmationCode,
    });

    return result as ParsedBooking;
  }

  /**
   * Create a booking from parsed email data
   */
  async createBookingFromEmail(
    userId: string,
    emailContent: string
  ): Promise<{ bookingId: string; flightInfo: FlightInfo } | null> {
    const parsed = this.parseBookingEmail(emailContent);
    if (!parsed) {
      return null;
    }

    // Look up flight information
    const flightInfo = await this.lookupFlight(
      parsed.flightNumber,
      parsed.departureDate || new Date().toISOString().split('T')[0]
    );

    if (!flightInfo) {
      logger.error('Could not find flight information', {
        flightNumber: parsed.flightNumber,
      });
      return null;
    }

    // Create booking in database
    try {
      // First ensure flight exists in database
      const flightId = await convex.mutation(api.flights.upsert, flightInfo);

      // Create booking
      const bookingId = await convex.mutation(api.flights.createBooking, {
        userId,
        flightId,
        confirmationCode: parsed.confirmationCode,
        passengerName: parsed.passengerName || 'Unknown',
        passengerEmail: parsed.passengerEmail,
        seatNumber: parsed.seatNumber,
        cabinClass: parsed.cabinClass || 'economy',
        departureTime: flightInfo.scheduledDeparture,
        arrivalTime: flightInfo.scheduledArrival,
        ticketNumber: parsed.ticketNumber,
        importedFrom: 'email',
        rawEmailContent: emailContent,
      });

      logger.info('Created booking from email', {
        bookingId,
        flightNumber: parsed.flightNumber,
      });

      return { bookingId: bookingId.toString(), flightInfo };
    } catch (error) {
      logger.error('Failed to create booking', { error });
      return null;
    }
  }

  /**
   * Create a manual booking
   */
  async createManualBooking(
    userId: string,
    flightNumber: string,
    date: string,
    confirmationCode: string,
    passengerName: string,
    options?: {
      cabinClass?: CabinClass;
      seatNumber?: string;
      passengerEmail?: string;
      passengerPhone?: string;
      itineraryId?: string;
      notes?: string;
    }
  ): Promise<{ bookingId: string; flightInfo: FlightInfo } | null> {
    // Look up flight information
    const flightInfo = await this.lookupFlight(flightNumber, date);

    if (!flightInfo) {
      logger.error('Could not find flight information', { flightNumber, date });
      return null;
    }

    try {
      // Ensure flight exists in database
      const flightId = await convex.mutation(api.flights.upsert, flightInfo);

      // Create booking
      const bookingId = await convex.mutation(api.flights.createBooking, {
        userId,
        flightId,
        confirmationCode: confirmationCode.toUpperCase(),
        passengerName,
        passengerEmail: options?.passengerEmail,
        passengerPhone: options?.passengerPhone,
        seatNumber: options?.seatNumber,
        cabinClass: options?.cabinClass || 'economy',
        departureTime: flightInfo.scheduledDeparture,
        arrivalTime: flightInfo.scheduledArrival,
        itineraryId: options?.itineraryId as any,
        notes: options?.notes,
        importedFrom: 'manual',
      });

      logger.info('Created manual booking', {
        bookingId,
        flightNumber,
      });

      return { bookingId: bookingId.toString(), flightInfo };
    } catch (error) {
      logger.error('Failed to create manual booking', { error });
      return null;
    }
  }

  /**
   * Get flight status update
   */
  async getFlightStatus(
    flightNumber: string,
    date: string
  ): Promise<{
    status: FlightStatus;
    estimatedDeparture?: number;
    estimatedArrival?: number;
    gate?: string;
    delayReason?: string;
  } | null> {
    const flightInfo = await this.lookupFlight(flightNumber, date);
    if (!flightInfo) return null;

    return {
      status: flightInfo.status,
      estimatedDeparture: flightInfo.estimatedDeparture,
      estimatedArrival: flightInfo.estimatedArrival,
      gate: flightInfo.departureGate,
      delayReason: flightInfo.delayReason,
    };
  }

  /**
   * Get user's bookings
   */
  async getUserBookings(
    userId: string,
    options?: {
      upcoming?: boolean;
      status?: BookingStatus;
      page?: number;
      pageSize?: number;
    }
  ) {
    try {
      const result = await convex.query(api.flights.listBookings, {
        userId,
        upcoming: options?.upcoming,
        status: options?.status,
        page: options?.page,
        pageSize: options?.pageSize,
      });
      return result;
    } catch (error) {
      logger.error('Failed to get user bookings', { error });
      return { data: [], total: 0 };
    }
  }

  /**
   * Link booking to itinerary
   */
  async linkBookingToItinerary(
    bookingId: string,
    itineraryId: string,
    userId: string
  ): Promise<boolean> {
    try {
      await convex.mutation(api.flights.linkToItinerary, {
        bookingId: bookingId as any,
        itineraryId: itineraryId as any,
        userId,
      });
      return true;
    } catch (error) {
      logger.error('Failed to link booking to itinerary', { error });
      return false;
    }
  }

  /**
   * Clear memory cache
   */
  clearCache(): void {
    this.memoryCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { memoryCacheSize: number } {
    return {
      memoryCacheSize: this.memoryCache.size,
    };
  }
}

// Singleton instance
let flightServiceInstance: FlightService | null = null;

export function getFlightService(): FlightService {
  if (!flightServiceInstance) {
    flightServiceInstance = new FlightService();
  }
  return flightServiceInstance;
}

export default FlightService;
