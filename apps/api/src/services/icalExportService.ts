/**
 * iCal Export Service
 * Generates iCal (.ics) files for itineraries with navigation links
 * Supports Apple Calendar, Google Calendar, and standard iCal format
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';

// Types for itinerary data
interface ItineraryPoi {
  name: string;
  type?: string;
  description?: string;
  latitude?: number;
  longitude?: number;
  address?: string;
  time?: string;
  duration?: string;
  priceInfo?: string;
  openingHours?: string;
  tips?: string;
}

interface ItineraryDay {
  dayNumber: number;
  theme?: string;
  pois: ItineraryPoi[];
}

interface Itinerary {
  _id: string;
  title: string;
  days?: ItineraryDay[];
  destination?: string;
}

export interface ICalExportOptions {
  startDate?: Date;
  enableReminders?: boolean;
  reminderMinutes?: number;
  timezone?: string;
  includeNavigationLinks?: boolean;
}

export interface ICalExportResult {
  data: string;
  filename: string;
  contentType: string;
}

export interface CalendarUrls {
  icalDownloadUrl: string;
  icalSubscriptionUrl: string;
  googleCalendarUrl: string;
  appleCalendarUrl: string;
}

export class ICalExportService {
  private static readonly BASE_URL =
    process.env.API_BASE_URL || 'https://api.pathfinding.org';

  /**
   * Generate navigation URLs for a POI
   */
  static generateNavigationUrls(poi: ItineraryPoi): {
    appleMapsUrl: string;
    googleMapsUrl: string;
  } {
    const { latitude, longitude, name, address } = poi;

    // Apple Maps URL
    let appleMapsUrl = 'https://maps.apple.com/?';
    if (latitude && longitude && latitude !== 0 && longitude !== 0) {
      appleMapsUrl += `ll=${latitude},${longitude}&q=${encodeURIComponent(name)}`;
    } else if (address) {
      appleMapsUrl += `address=${encodeURIComponent(address)}&q=${encodeURIComponent(name)}`;
    } else {
      appleMapsUrl += `q=${encodeURIComponent(name)}`;
    }

    // Google Maps URL
    let googleMapsUrl = 'https://www.google.com/maps/search/?api=1&';
    if (latitude && longitude && latitude !== 0 && longitude !== 0) {
      googleMapsUrl += `query=${latitude},${longitude}&query_place_id=${encodeURIComponent(name)}`;
    } else if (address) {
      googleMapsUrl += `query=${encodeURIComponent(`${name}, ${address}`)}`;
    } else {
      googleMapsUrl += `query=${encodeURIComponent(name)}`;
    }

    return { appleMapsUrl, googleMapsUrl };
  }

  /**
   * Generate calendar integration URLs for an itinerary
   */
  static generateCalendarUrls(
    itineraryId: string,
    options: ICalExportOptions = {}
  ): CalendarUrls {
    const baseUrl = this.BASE_URL;
    const queryParams = new URLSearchParams();

    if (options.startDate) {
      queryParams.set('start_date', options.startDate.toISOString());
    }
    if (options.enableReminders !== undefined) {
      queryParams.set('enable_reminders', String(options.enableReminders));
    }
    if (options.reminderMinutes) {
      queryParams.set('reminder_minutes', String(options.reminderMinutes));
    }
    if (options.timezone) {
      queryParams.set('timezone', options.timezone);
    }

    const queryString = queryParams.toString();
    const icalPath = `/v1/ical/itineraries/${itineraryId}`;
    const icalUrl = `${baseUrl}${icalPath}${queryString ? `?${queryString}` : ''}`;

    // Subscription URL (webcal:// protocol for auto-sync)
    const subscriptionUrl = icalUrl.replace(/^https?:/, 'webcal:');

    // Google Calendar add URL
    const googleCalendarUrl = `https://www.google.com/calendar/render?cid=${encodeURIComponent(icalUrl)}`;

    // Apple Calendar URL (webcal protocol)
    const appleCalendarUrl = subscriptionUrl;

    return {
      icalDownloadUrl: icalUrl,
      icalSubscriptionUrl: subscriptionUrl,
      googleCalendarUrl,
      appleCalendarUrl,
    };
  }

  /**
   * Generate iCal data for an itinerary
   */
  static async generateICal(
    itineraryId: string,
    userId: string,
    options: ICalExportOptions = {},
    _accessToken: string
  ): Promise<ICalExportResult> {
    // Fetch itinerary from Convex
    const itinerary = (await convex.query(api.itineraries.getById, {
      id: itineraryId as Id<'itineraries'>,
    })) as Itinerary | null;

    if (!itinerary) {
      throw new Error('Itinerary not found');
    }

    // Check ownership (basic check - could be enhanced)
    // For now, we trust the auth middleware has validated the user

    const {
      startDate = new Date(),
      enableReminders = true,
      reminderMinutes = 30,
      timezone = 'Asia/Shanghai',
      includeNavigationLinks = true,
    } = options;

    const icalData = this.generateICalString(itinerary, {
      startDate,
      enableReminders,
      reminderMinutes,
      timezone,
      includeNavigationLinks,
    });

    const filename = `${itinerary.title.replace(/[^a-z0-9\u4E00-\u9FA5]/gi, '_')}.ics`;

    return {
      data: icalData,
      filename,
      contentType: 'text/calendar; charset=utf-8',
    };
  }

  /**
   * Generate iCal string from itinerary data
   */
  private static generateICalString(
    itinerary: Itinerary,
    options: Required<ICalExportOptions>
  ): string {
    const {
      startDate,
      enableReminders,
      reminderMinutes,
      timezone,
      includeNavigationLinks,
    } = options;
    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Pathfinding//Travel Itinerary//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${this.escapeICalText(itinerary.title)}`,
      `X-WR-TIMEZONE:${timezone}`,
    ];

    const uid = this.generateUID();
    const days = itinerary.days || [];

    for (const day of days) {
      const dayDate = new Date(startDate);
      dayDate.setDate(dayDate.getDate() + day.dayNumber - 1);

      for (let poiIndex = 0; poiIndex < day.pois.length; poiIndex++) {
        const poi = day.pois[poiIndex];
        const { startTime, endTime } = this.calculateEventTimes(
          poi,
          dayDate,
          poiIndex,
          day.pois.length
        );

        const eventUid = `${uid}-day${day.dayNumber}-poi${poiIndex}@pathfinding.org`;
        const dayPrefix = `Day ${day.dayNumber}`;
        const title = day.theme
          ? `[${dayPrefix}: ${day.theme}] ${poi.name}`
          : `[${dayPrefix}] ${poi.name}`;

        lines.push('BEGIN:VEVENT');
        lines.push(`UID:${eventUid}`);
        lines.push(`DTSTAMP:${this.formatICalDate(new Date())}`);
        lines.push(`DTSTART:${this.formatICalDate(startTime)}`);
        lines.push(`DTEND:${this.formatICalDate(endTime)}`);
        lines.push(`SUMMARY:${this.escapeICalText(title)}`);

        if (poi.address) {
          lines.push(`LOCATION:${this.escapeICalText(poi.address)}`);
        }

        if (
          poi.latitude &&
          poi.longitude &&
          poi.latitude !== 0 &&
          poi.longitude !== 0
        ) {
          lines.push(`GEO:${poi.latitude};${poi.longitude}`);
        }

        // Build description with navigation links
        const descParts: string[] = [];
        if (poi.description) descParts.push(poi.description);
        if (poi.type) descParts.push(`Type: ${poi.type}`);
        if (poi.duration) descParts.push(`Duration: ${poi.duration}`);
        if (poi.priceInfo) descParts.push(`Price: ${poi.priceInfo}`);
        if (poi.openingHours) descParts.push(`Hours: ${poi.openingHours}`);
        if (poi.tips) descParts.push(`Tips: ${poi.tips}`);

        // Add navigation links if enabled (default: true)
        if (includeNavigationLinks !== false) {
          const navUrls = this.generateNavigationUrls(poi);
          descParts.push('');
          descParts.push('--- Navigation ---');
          descParts.push(`Apple Maps: ${navUrls.appleMapsUrl}`);
          descParts.push(`Google Maps: ${navUrls.googleMapsUrl}`);
        }

        if (descParts.length > 0) {
          lines.push(
            `DESCRIPTION:${this.escapeICalText(descParts.join('\\n'))}`
          );
        }

        // Add reminder/alarm
        if (enableReminders) {
          lines.push('BEGIN:VALARM');
          lines.push(`TRIGGER:-PT${reminderMinutes}M`);
          lines.push('ACTION:DISPLAY');
          lines.push('DESCRIPTION:Reminder');
          lines.push('END:VALARM');
        }

        lines.push('END:VEVENT');
      }
    }

    lines.push('END:VCALENDAR');
    return lines.join('\r\n');
  }

  /**
   * Calculate start and end times for a POI event
   */
  private static calculateEventTimes(
    poi: ItineraryPoi,
    dayDate: Date,
    poiIndex: number,
    totalPois: number
  ): { startTime: Date; endTime: Date } {
    // Try to parse time from POI if available
    if (poi.time) {
      const timeMatch = poi.time.match(/^(\d{1,2}):(\d{2})$/);
      if (timeMatch) {
        const hour = Number.parseInt(timeMatch[1], 10);
        const minute = Number.parseInt(timeMatch[2], 10);
        const start = new Date(dayDate);
        start.setHours(hour, minute, 0, 0);
        const end = new Date(start);
        end.setHours(end.getHours() + 1); // Default 1 hour duration
        return { startTime: start, endTime: end };
      }
    }

    // Default scheduling: distribute POIs throughout the day (9 AM - 6 PM)
    const startHour = 9;
    const endHour = 18;
    const totalMinutes = (endHour - startHour) * 60;
    const minutesPerPoi =
      totalPois > 1 ? Math.floor(totalMinutes / totalPois) : 60;

    const poiStartMinutes = poiIndex * minutesPerPoi;
    const startMinute = poiStartMinutes % 60;
    const startHourOffset = Math.floor(poiStartMinutes / 60);

    const start = new Date(dayDate);
    start.setHours(startHour + startHourOffset, startMinute, 0, 0);

    const end = new Date(start);
    end.setMinutes(end.getMinutes() + minutesPerPoi);

    return { startTime: start, endTime: end };
  }

  /**
   * Format date for iCal (UTC format)
   */
  private static formatICalDate(date: Date): string {
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    const hours = String(date.getUTCHours()).padStart(2, '0');
    const minutes = String(date.getUTCMinutes()).padStart(2, '0');
    const seconds = String(date.getUTCSeconds()).padStart(2, '0');
    return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
  }

  /**
   * Escape text for iCal format
   */
  private static escapeICalText(text: string): string {
    return text
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');
  }

  /**
   * Generate a unique identifier
   */
  private static generateUID(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }
}
