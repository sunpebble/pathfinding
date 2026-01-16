/**
 * Astronomy Service
 * Calculates sunrise/sunset times, golden hours, moon phases, and astronomical events
 *
 * Uses astronomical algorithms based on:
 * - NOAA Solar Calculator
 * - Jean Meeus' "Astronomical Algorithms"
 */

import type {
  AstronomicalEvent,
  AstronomicalEventType,
  MoonPhase,
  MoonPhaseName,
  StargazingSpot,
  SunTimes,
  SunTimesRangeRequest,
  SunTimesRequest,
} from '@pathfinding/types';
import { createLogger } from '../lib/logger.js';

const logger = createLogger('Astronomy');

// Constants for calculations
const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

// Sun elevation angles for different events
const SUN_ANGLES = {
  sunrise: -0.833, // Accounting for refraction
  civilTwilight: -6,
  nauticalTwilight: -12,
  astronomicalTwilight: -18,
  goldenHour: 6, // Sun above horizon
  blueHour: -4, // Sun below horizon
};

/**
 * Julian Day Number calculation
 */
function toJulianDay(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day =
    date.getUTCDate() +
    date.getUTCHours() / 24 +
    date.getUTCMinutes() / 1440 +
    date.getUTCSeconds() / 86400;

  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;

  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

/**
 * Julian Century from Julian Day
 */
function toJulianCentury(jd: number): number {
  return (jd - 2451545.0) / 36525.0;
}

/**
 * Calculate solar parameters
 */
function getSolarParams(julianCentury: number) {
  const t = julianCentury;

  // Geometric mean longitude of the sun (degrees)
  const L0 = (280.46646 + t * (36000.76983 + 0.0003032 * t)) % 360;

  // Geometric mean anomaly of the sun (degrees)
  const M = (357.52911 + t * (35999.05029 - 0.0001537 * t)) % 360;

  // Eccentricity of Earth's orbit
  const e = 0.016708634 - t * (0.000042037 + 0.0000001267 * t);

  // Equation of center for the sun (degrees)
  const sinM = Math.sin(M * DEG_TO_RAD);
  const sin2M = Math.sin(2 * M * DEG_TO_RAD);
  const sin3M = Math.sin(3 * M * DEG_TO_RAD);
  const C =
    sinM * (1.914602 - t * (0.004817 + 0.000014 * t)) +
    sin2M * (0.019993 - 0.000101 * t) +
    sin3M * 0.000289;

  // Sun's true longitude (degrees)
  const sunTrueLong = L0 + C;

  // Sun's apparent longitude (degrees)
  const omega = 125.04 - 1934.136 * t;
  const sunApparentLong =
    sunTrueLong - 0.00569 - 0.00478 * Math.sin(omega * DEG_TO_RAD);

  // Mean obliquity of the ecliptic (degrees)
  const meanObliq =
    23 +
    (26 +
      (21.448 -
        t * (46.815 + t * (0.00059 - t * 0.001813))) /
        60) /
      60;

  // Corrected obliquity (degrees)
  const obliqCorr =
    meanObliq + 0.00256 * Math.cos(omega * DEG_TO_RAD);

  // Sun's declination (degrees)
  const sunDeclination =
    Math.asin(
      Math.sin(obliqCorr * DEG_TO_RAD) *
        Math.sin(sunApparentLong * DEG_TO_RAD)
    ) * RAD_TO_DEG;

  // Equation of time (minutes)
  const y = Math.tan((obliqCorr / 2) * DEG_TO_RAD) ** 2;
  const eqTime =
    4 *
    RAD_TO_DEG *
    (y * Math.sin(2 * L0 * DEG_TO_RAD) -
      2 * e * Math.sin(M * DEG_TO_RAD) +
      4 * e * y * Math.sin(M * DEG_TO_RAD) * Math.cos(2 * L0 * DEG_TO_RAD) -
      0.5 * y * y * Math.sin(4 * L0 * DEG_TO_RAD) -
      1.25 * e * e * Math.sin(2 * M * DEG_TO_RAD));

  return { sunDeclination, eqTime };
}

/**
 * Calculate hour angle for a given sun elevation
 */
function getHourAngle(
  lat: number,
  declination: number,
  elevation: number
): number | null {
  const latRad = lat * DEG_TO_RAD;
  const decRad = declination * DEG_TO_RAD;
  const elevRad = elevation * DEG_TO_RAD;

  const cosHA =
    (Math.cos(Math.PI / 2 - elevRad) -
      Math.sin(latRad) * Math.sin(decRad)) /
    (Math.cos(latRad) * Math.cos(decRad));

  // Check if sun never rises or never sets at this latitude
  if (cosHA > 1 || cosHA < -1) {
    return null;
  }

  return Math.acos(cosHA) * RAD_TO_DEG;
}

/**
 * Calculate time for a given sun elevation angle
 */
function getTimeForElevation(
  date: Date,
  lat: number,
  lng: number,
  elevation: number,
  isRising: boolean
): Date | null {
  const jd = toJulianDay(date);
  const jc = toJulianCentury(jd);
  const { sunDeclination, eqTime } = getSolarParams(jc);

  const hourAngle = getHourAngle(lat, sunDeclination, elevation);
  if (hourAngle === null) {
    return null;
  }

  // Solar noon in minutes from midnight UTC
  const solarNoonMinutes = 720 - 4 * lng - eqTime;

  // Time offset from solar noon
  const offset = isRising ? -hourAngle : hourAngle;
  const eventMinutes = solarNoonMinutes + 4 * offset;

  // Create date object
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCMinutes(eventMinutes);

  return result;
}

/**
 * Get solar noon time
 */
function getSolarNoon(date: Date, lng: number): Date {
  const jd = toJulianDay(date);
  const jc = toJulianCentury(jd);
  const { eqTime } = getSolarParams(jc);

  const solarNoonMinutes = 720 - 4 * lng - eqTime;

  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  result.setUTCMinutes(solarNoonMinutes);

  return result;
}

/**
 * Format date to ISO string in specified timezone
 */
function formatInTimezone(date: Date | null, timezone: string): string {
  if (!date) {
    return '';
  }
  return date.toLocaleString('sv-SE', { timeZone: timezone }).replace(' ', 'T');
}

/**
 * Calculate moon phase
 */
function calculateMoonPhase(date: Date): MoonPhase {
  // Known new moon reference: January 6, 2000 at 18:14 UTC
  const knownNewMoon = new Date('2000-01-06T18:14:00Z');
  const lunarCycle = 29.530588853; // Synodic month in days

  const daysSinceKnown =
    (date.getTime() - knownNewMoon.getTime()) / (1000 * 60 * 60 * 24);
  const age = daysSinceKnown % lunarCycle;
  const normalizedAge = age < 0 ? age + lunarCycle : age;

  // Calculate illumination (rough approximation)
  const illumination = (1 - Math.cos((normalizedAge / lunarCycle) * 2 * Math.PI)) / 2 * 100;

  // Determine phase name
  let phase: MoonPhaseName;
  let emoji: string;

  if (normalizedAge < 1.845) {
    phase = 'new_moon';
    emoji = '🌑';
  } else if (normalizedAge < 7.380) {
    phase = 'waxing_crescent';
    emoji = '🌒';
  } else if (normalizedAge < 9.225) {
    phase = 'first_quarter';
    emoji = '🌓';
  } else if (normalizedAge < 14.765) {
    phase = 'waxing_gibbous';
    emoji = '🌔';
  } else if (normalizedAge < 16.61) {
    phase = 'full_moon';
    emoji = '🌕';
  } else if (normalizedAge < 22.15) {
    phase = 'waning_gibbous';
    emoji = '🌖';
  } else if (normalizedAge < 23.995) {
    phase = 'last_quarter';
    emoji = '🌗';
  } else {
    phase = 'waning_crescent';
    emoji = '🌘';
  }

  return {
    date: date.toISOString().split('T')[0],
    phase,
    illumination: Math.round(illumination * 10) / 10,
    age: Math.round(normalizedAge * 10) / 10,
    emoji,
  };
}

/**
 * Astronomy Service class
 */
export class AstronomyService {
  /**
   * Calculate sun times for a specific location and date
   */
  getSunTimes(request: SunTimesRequest): SunTimes {
    const { latitude, longitude, date: dateStr, timezone } = request;

    // Parse date or use today
    const date = dateStr
      ? new Date(dateStr + 'T12:00:00Z')
      : new Date();
    date.setUTCHours(12, 0, 0, 0);

    // Auto-detect timezone based on longitude if not provided
    const tz = timezone || this.guessTimezone(longitude);

    logger.debug('Calculating sun times', { latitude, longitude, date: date.toISOString(), timezone: tz });

    // Calculate all sun events
    const sunrise = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.sunrise, true);
    const sunset = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.sunrise, false);
    const solarNoon = getSolarNoon(date, longitude);

    // Twilight times
    const civilDawn = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.civilTwilight, true);
    const civilDusk = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.civilTwilight, false);
    const nauticalDawn = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.nauticalTwilight, true);
    const nauticalDusk = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.nauticalTwilight, false);
    const astronomicalDawn = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.astronomicalTwilight, true);
    const astronomicalDusk = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.astronomicalTwilight, false);

    // Golden hour (sun between 0 and 6 degrees above horizon)
    const goldenHourMorningEnd = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.goldenHour, true);
    const goldenHourEveningStart = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.goldenHour, false);

    // Blue hour (sun between -4 and -6 degrees below horizon)
    const blueHourMorningEnd = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.blueHour, true);
    const blueHourEveningStart = getTimeForElevation(date, latitude, longitude, SUN_ANGLES.blueHour, false);

    // Calculate day length
    let dayLengthMinutes = 0;
    if (sunrise && sunset) {
      dayLengthMinutes = Math.round((sunset.getTime() - sunrise.getTime()) / (1000 * 60));
    }

    return {
      date: date.toISOString().split('T')[0],
      latitude,
      longitude,
      timezone: tz,

      sunrise: formatInTimezone(sunrise, tz),
      sunset: formatInTimezone(sunset, tz),
      solarNoon: formatInTimezone(solarNoon, tz),

      civilDawn: formatInTimezone(civilDawn, tz),
      civilDusk: formatInTimezone(civilDusk, tz),
      nauticalDawn: formatInTimezone(nauticalDawn, tz),
      nauticalDusk: formatInTimezone(nauticalDusk, tz),
      astronomicalDawn: formatInTimezone(astronomicalDawn, tz),
      astronomicalDusk: formatInTimezone(astronomicalDusk, tz),

      goldenHourMorningStart: formatInTimezone(sunrise, tz),
      goldenHourMorningEnd: formatInTimezone(goldenHourMorningEnd, tz),
      goldenHourEveningStart: formatInTimezone(goldenHourEveningStart, tz),
      goldenHourEveningEnd: formatInTimezone(sunset, tz),

      blueHourMorningStart: formatInTimezone(civilDawn, tz),
      blueHourMorningEnd: formatInTimezone(blueHourMorningEnd, tz),
      blueHourEveningStart: formatInTimezone(blueHourEveningStart, tz),
      blueHourEveningEnd: formatInTimezone(civilDusk, tz),

      dayLengthMinutes,
    };
  }

  /**
   * Get sun times for a date range
   */
  getSunTimesRange(request: SunTimesRangeRequest): SunTimes[] {
    const { latitude, longitude, startDate, endDate, timezone } = request;

    const start = new Date(startDate);
    const end = new Date(endDate);
    const results: SunTimes[] = [];

    const current = new Date(start);
    while (current <= end) {
      results.push(
        this.getSunTimes({
          latitude,
          longitude,
          date: current.toISOString().split('T')[0],
          timezone,
        })
      );
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  /**
   * Get moon phase for a specific date
   */
  getMoonPhase(dateStr?: string): MoonPhase {
    const date = dateStr ? new Date(dateStr) : new Date();
    return calculateMoonPhase(date);
  }

  /**
   * Get moon phases for a date range
   */
  getMoonPhases(startDate: string, endDate: string): MoonPhase[] {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const results: MoonPhase[] = [];

    const current = new Date(start);
    while (current <= end) {
      results.push(calculateMoonPhase(current));
      current.setDate(current.getDate() + 1);
    }

    return results;
  }

  /**
   * Get upcoming astronomical events
   */
  getAstronomicalEvents(
    startDate?: string,
    endDate?: string,
    types?: AstronomicalEventType[]
  ): AstronomicalEvent[] {
    // Predefined astronomical events for 2024-2026
    const events: AstronomicalEvent[] = [
      // 2025 Events
      {
        id: 'lunar-eclipse-2025-03',
        type: 'lunar_eclipse',
        name: 'Total Lunar Eclipse',
        nameZh: '月全食',
        description: 'A total lunar eclipse visible across the Americas, Europe, and Africa.',
        descriptionZh: '一次月全食，在美洲、欧洲和非洲可见。',
        startDate: '2025-03-14',
        peakDate: '2025-03-14',
        visibility: 'regional',
        bestViewingLocations: ['Americas', 'Europe', 'Africa'],
        tips: ['Use binoculars for best viewing', 'No special equipment needed'],
        tipsZh: ['使用双筒望远镜观看效果更佳', '不需要特殊设备'],
      },
      {
        id: 'solar-eclipse-2025-03',
        type: 'solar_eclipse',
        name: 'Partial Solar Eclipse',
        nameZh: '日偏食',
        description: 'A partial solar eclipse visible from Europe and northern Africa.',
        descriptionZh: '一次日偏食，在欧洲和北非可见。',
        startDate: '2025-03-29',
        peakDate: '2025-03-29',
        visibility: 'regional',
        bestViewingLocations: ['Europe', 'North Africa'],
        tips: ['Use certified solar glasses', 'Never look directly at the sun'],
        tipsZh: ['使用认证的日食眼镜', '切勿直视太阳'],
      },
      {
        id: 'eta-aquariids-2025',
        type: 'meteor_shower',
        name: 'Eta Aquariids Meteor Shower',
        nameZh: '宝瓶座流星雨',
        description: 'Peak of the Eta Aquariids meteor shower, debris from Halley\'s Comet.',
        descriptionZh: '宝瓶座流星雨高峰期，来自哈雷彗星的碎片。',
        startDate: '2025-04-19',
        endDate: '2025-05-28',
        peakDate: '2025-05-05',
        visibility: 'global',
        tips: ['Best viewed in the pre-dawn hours', 'Up to 50 meteors per hour at peak'],
        tipsZh: ['黎明前观看效果最佳', '高峰期每小时可达50颗流星'],
      },
      {
        id: 'lunar-eclipse-2025-09',
        type: 'lunar_eclipse',
        name: 'Total Lunar Eclipse',
        nameZh: '月全食',
        description: 'A total lunar eclipse visible across Europe, Africa, Asia, and Australia.',
        descriptionZh: '一次月全食，在欧洲、非洲、亚洲和澳大利亚可见。',
        startDate: '2025-09-07',
        peakDate: '2025-09-07',
        visibility: 'regional',
        bestViewingLocations: ['Europe', 'Africa', 'Asia', 'Australia'],
        tips: ['Total phase lasts about 1 hour', 'Moon turns reddish during totality'],
        tipsZh: ['全食阶段持续约1小时', '全食期间月亮呈红色'],
      },
      {
        id: 'solar-eclipse-2025-09',
        type: 'solar_eclipse',
        name: 'Partial Solar Eclipse',
        nameZh: '日偏食',
        description: 'A partial solar eclipse visible from Australia, Antarctica, and the Pacific.',
        descriptionZh: '一次日偏食，在澳大利亚、南极洲和太平洋可见。',
        startDate: '2025-09-21',
        peakDate: '2025-09-21',
        visibility: 'regional',
        bestViewingLocations: ['Australia', 'Antarctica', 'Pacific'],
        tips: ['Use certified solar glasses', 'Peak coverage varies by location'],
        tipsZh: ['使用认证的日食眼镜', '食分因地点而异'],
      },
      {
        id: 'geminids-2025',
        type: 'meteor_shower',
        name: 'Geminids Meteor Shower',
        nameZh: '双子座流星雨',
        description: 'The best meteor shower of the year, producing up to 150 multicolored meteors per hour.',
        descriptionZh: '年度最佳流星雨，每小时可产生多达150颗多彩流星。',
        startDate: '2025-12-04',
        endDate: '2025-12-17',
        peakDate: '2025-12-14',
        visibility: 'global',
        tips: ['Best viewed after midnight', 'Meteors appear in all parts of the sky'],
        tipsZh: ['午夜后观看效果最佳', '流星出现在天空各处'],
      },
      // 2026 Events
      {
        id: 'solar-eclipse-2026-02',
        type: 'solar_eclipse',
        name: 'Annular Solar Eclipse',
        nameZh: '日环食',
        description: 'An annular solar eclipse visible from Antarctica and southern tip of South America.',
        descriptionZh: '一次日环食，在南极洲和南美洲南端可见。',
        startDate: '2026-02-17',
        peakDate: '2026-02-17',
        visibility: 'regional',
        bestViewingLocations: ['Antarctica', 'Southern South America'],
        tips: ['Use certified solar glasses', 'Ring of fire effect during annularity'],
        tipsZh: ['使用认证的日食眼镜', '环食期间呈现火环效果'],
      },
      {
        id: 'lunar-eclipse-2026-03',
        type: 'lunar_eclipse',
        name: 'Total Lunar Eclipse',
        nameZh: '月全食',
        description: 'A total lunar eclipse visible from the Americas, Europe, and Africa.',
        descriptionZh: '一次月全食，在美洲、欧洲和非洲可见。',
        startDate: '2026-03-03',
        peakDate: '2026-03-03',
        visibility: 'regional',
        bestViewingLocations: ['Americas', 'Europe', 'Africa'],
        tips: ['Total phase lasts about 1 hour', 'Great opportunity for photography'],
        tipsZh: ['全食阶段持续约1小时', '摄影的绝佳机会'],
      },
      {
        id: 'solar-eclipse-2026-08',
        type: 'solar_eclipse',
        name: 'Total Solar Eclipse',
        nameZh: '日全食',
        description: 'A total solar eclipse visible from the Arctic, Greenland, Iceland, and Spain.',
        descriptionZh: '一次日全食，在北极、格陵兰、冰岛和西班牙可见。',
        startDate: '2026-08-12',
        peakDate: '2026-08-12',
        visibility: 'regional',
        bestViewingLocations: ['Arctic', 'Greenland', 'Iceland', 'Spain'],
        tips: ['Path of totality is narrow', 'Plan travel well in advance'],
        tipsZh: ['全食带很窄', '提前做好旅行计划'],
      },
      {
        id: 'perseids-2025',
        type: 'meteor_shower',
        name: 'Perseids Meteor Shower',
        nameZh: '英仙座流星雨',
        description: 'One of the most popular meteor showers, known for bright meteors and fireballs.',
        descriptionZh: '最受欢迎的流星雨之一，以明亮的流星和火流星著称。',
        startDate: '2025-07-17',
        endDate: '2025-08-24',
        peakDate: '2025-08-12',
        visibility: 'northern_hemisphere',
        tips: ['Best viewed from dark locations', 'Up to 100 meteors per hour at peak'],
        tipsZh: ['在黑暗地点观看效果最佳', '高峰期每小时可达100颗流星'],
      },
      // Equinoxes and Solstices
      {
        id: 'spring-equinox-2025',
        type: 'equinox',
        name: 'Spring Equinox',
        nameZh: '春分',
        description: 'The March equinox marks the beginning of spring in the Northern Hemisphere.',
        descriptionZh: '三月分点标志着北半球春季的开始。',
        startDate: '2025-03-20',
        peakDate: '2025-03-20',
        visibility: 'global',
        tips: ['Day and night are approximately equal', 'Great time for landscape photography'],
        tipsZh: ['昼夜长度大致相等', '风景摄影的好时机'],
      },
      {
        id: 'summer-solstice-2025',
        type: 'solstice',
        name: 'Summer Solstice',
        nameZh: '夏至',
        description: 'The June solstice marks the longest day in the Northern Hemisphere.',
        descriptionZh: '六月至日标志着北半球最长的一天。',
        startDate: '2025-06-21',
        peakDate: '2025-06-21',
        visibility: 'global',
        tips: ['Longest daylight of the year', 'Extended golden hour for photography'],
        tipsZh: ['一年中白昼最长', '摄影黄金时段延长'],
      },
      {
        id: 'autumn-equinox-2025',
        type: 'equinox',
        name: 'Autumn Equinox',
        nameZh: '秋分',
        description: 'The September equinox marks the beginning of autumn in the Northern Hemisphere.',
        descriptionZh: '九月分点标志着北半球秋季的开始。',
        startDate: '2025-09-22',
        peakDate: '2025-09-22',
        visibility: 'global',
        tips: ['Day and night are approximately equal', 'Fall foliage begins in many regions'],
        tipsZh: ['昼夜长度大致相等', '许多地区开始出现秋叶'],
      },
      {
        id: 'winter-solstice-2025',
        type: 'solstice',
        name: 'Winter Solstice',
        nameZh: '冬至',
        description: 'The December solstice marks the shortest day in the Northern Hemisphere.',
        descriptionZh: '十二月至日标志着北半球最短的一天。',
        startDate: '2025-12-21',
        peakDate: '2025-12-21',
        visibility: 'global',
        tips: ['Shortest daylight of the year', 'Earliest sunset occurs before this date'],
        tipsZh: ['一年中白昼最短', '最早日落发生在此日期之前'],
      },
    ];

    // Filter by date range
    let filtered = events;
    if (startDate) {
      const start = new Date(startDate);
      filtered = filtered.filter((e) => new Date(e.startDate) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      filtered = filtered.filter((e) => new Date(e.startDate) <= end);
    }

    // Filter by event types
    if (types && types.length > 0) {
      filtered = filtered.filter((e) => types.includes(e.type));
    }

    // Sort by date
    filtered.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

    return filtered;
  }

  /**
   * Get stargazing spots near a location
   */
  getStargazingSpots(
    latitude: number,
    longitude: number,
    radiusKm: number = 100,
    limit: number = 10
  ): StargazingSpot[] {
    // Predefined stargazing spots in China
    const spots: StargazingSpot[] = [
      {
        id: 'ali-dark-sky-park',
        name: 'Ali Dark Sky Park',
        nameZh: '阿里暗夜公园',
        description: 'One of the best stargazing locations in China, with extremely low light pollution.',
        descriptionZh: '中国最佳观星地之一，光污染极低。',
        latitude: 32.5,
        longitude: 80.1,
        address: 'Ngari Prefecture, Tibet',
        lightPollutionLevel: 'excellent',
        bortleScale: 1,
        altitude: 4200,
        bestSeasons: ['spring', 'summer', 'autumn'],
        facilities: ['Observatory', 'Viewing platforms', 'Guided tours'],
        tips: ['High altitude - acclimatize first', 'Very cold at night'],
        tipsZh: ['高海拔地区，需先适应', '夜间非常寒冷'],
      },
      {
        id: 'nalati-grassland',
        name: 'Nalati Grassland',
        nameZh: '那拉提草原',
        description: 'Beautiful grassland in Xinjiang with dark skies and stunning landscape.',
        descriptionZh: '新疆美丽草原，天空黑暗，景色迷人。',
        latitude: 43.3,
        longitude: 84.0,
        address: 'Ili Kazakh Autonomous Prefecture, Xinjiang',
        lightPollutionLevel: 'excellent',
        bortleScale: 2,
        altitude: 1800,
        bestSeasons: ['summer', 'autumn'],
        facilities: ['Yurt accommodations', 'Horse riding'],
        tips: ['Best during meteor showers', 'Combine with grassland activities'],
        tipsZh: ['流星雨期间最佳', '可结合草原活动'],
      },
      {
        id: 'huairou-observatory',
        name: 'Huairou Solar Observatory',
        nameZh: '怀柔太阳观测站',
        description: 'Professional observatory near Beijing with public stargazing events.',
        descriptionZh: '北京附近的专业天文台，举办公众观星活动。',
        latitude: 40.4,
        longitude: 116.6,
        address: 'Huairou District, Beijing',
        lightPollutionLevel: 'moderate',
        bortleScale: 5,
        altitude: 600,
        bestSeasons: ['autumn', 'winter'],
        facilities: ['Telescopes', 'Planetarium', 'Guided tours'],
        tips: ['Book events in advance', 'Good for beginners'],
        tipsZh: ['提前预约活动', '适合初学者'],
      },
      {
        id: 'yanqing-dark-sky',
        name: 'Yanqing Dark Sky Area',
        nameZh: '延庆暗夜观星区',
        description: 'Relatively dark sky area accessible from Beijing.',
        descriptionZh: '北京可达的相对黑暗天空区域。',
        latitude: 40.5,
        longitude: 115.8,
        address: 'Yanqing District, Beijing',
        lightPollutionLevel: 'moderate',
        bortleScale: 5,
        altitude: 800,
        bestSeasons: ['autumn', 'winter'],
        facilities: ['Parking', 'Viewing spots'],
        tips: ['Avoid light from Beijing', 'Best on clear moonless nights'],
        tipsZh: ['避开北京光污染', '晴朗无月夜最佳'],
      },
      {
        id: 'qinghai-lake',
        name: 'Qinghai Lake',
        nameZh: '青海湖',
        description: 'China\'s largest saltwater lake offers stunning starry skies.',
        descriptionZh: '中国最大的咸水湖，星空壮观。',
        latitude: 36.9,
        longitude: 100.2,
        address: 'Qinghai Province',
        lightPollutionLevel: 'good',
        bortleScale: 3,
        altitude: 3200,
        bestSeasons: ['summer', 'autumn'],
        facilities: ['Hotels', 'Camping sites', 'Photography spots'],
        tips: ['High altitude - prepare accordingly', 'Lake reflection photos possible'],
        tipsZh: ['高海拔地区，做好准备', '可拍摄湖面倒影'],
      },
      {
        id: 'tengger-desert',
        name: 'Tengger Desert',
        nameZh: '腾格里沙漠',
        description: 'Remote desert with virtually no light pollution.',
        descriptionZh: '偏远沙漠，几乎没有光污染。',
        latitude: 38.5,
        longitude: 104.5,
        address: 'Ningxia / Inner Mongolia / Gansu',
        lightPollutionLevel: 'excellent',
        bortleScale: 2,
        altitude: 1300,
        bestSeasons: ['spring', 'autumn'],
        facilities: ['Desert camps', 'Camel rides'],
        tips: ['Temperature drops significantly at night', 'Sand can affect equipment'],
        tipsZh: ['夜间温度骤降', '沙子可能影响设备'],
      },
      {
        id: 'shangri-la',
        name: 'Shangri-La',
        nameZh: '香格里拉',
        description: 'High-altitude paradise with pristine night skies.',
        descriptionZh: '高海拔天堂，夜空纯净。',
        latitude: 27.8,
        longitude: 99.7,
        address: 'Diqing Tibetan Autonomous Prefecture, Yunnan',
        lightPollutionLevel: 'good',
        bortleScale: 3,
        altitude: 3300,
        bestSeasons: ['autumn', 'winter'],
        facilities: ['Hotels', 'Mountain lodges'],
        tips: ['Combine with temple visits', 'Watch for altitude sickness'],
        tipsZh: ['可结合寺庙参观', '注意高原反应'],
      },
      {
        id: 'sanya-beach',
        name: 'Sanya Beach Stargazing',
        nameZh: '三亚海滩观星',
        description: 'Tropical beach stargazing with Southern Hemisphere constellations visible.',
        descriptionZh: '热带海滩观星，可见南半球星座。',
        latitude: 18.2,
        longitude: 109.5,
        address: 'Sanya, Hainan',
        lightPollutionLevel: 'moderate',
        bortleScale: 5,
        altitude: 0,
        bestSeasons: ['winter', 'spring'],
        facilities: ['Beach resorts', 'Night cruises'],
        tips: ['Best away from resort areas', 'Southern Cross visible in winter'],
        tipsZh: ['远离度假区效果更好', '冬季可见南十字星'],
      },
    ];

    // Calculate distance and filter by radius
    const spotsWithDistance = spots.map((spot) => ({
      ...spot,
      distance: this.calculateDistance(latitude, longitude, spot.latitude, spot.longitude),
    }));

    const filtered = spotsWithDistance
      .filter((s) => s.distance <= radiusKm)
      .sort((a, b) => a.distance - b.distance)
      .slice(0, limit);

    // Remove distance from returned objects
    return filtered.map(({ distance, ...spot }) => spot);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * DEG_TO_RAD;
    const dLon = (lon2 - lon1) * DEG_TO_RAD;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * DEG_TO_RAD) *
        Math.cos(lat2 * DEG_TO_RAD) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  /**
   * Guess timezone based on longitude
   */
  private guessTimezone(longitude: number): string {
    // Simple approximation: each 15 degrees = 1 hour offset
    const offset = Math.round(longitude / 15);

    // Common China timezone
    if (longitude >= 73 && longitude <= 135) {
      return 'Asia/Shanghai';
    }

    // Use Etc/GMT timezones for simple offset-based zones
    // Note: Etc/GMT zones have inverted signs
    if (offset >= -12 && offset <= 14) {
      return offset >= 0 ? `Etc/GMT-${offset}` : `Etc/GMT+${Math.abs(offset)}`;
    }

    return 'UTC';
  }
}

// Singleton instance
let astronomyServiceInstance: AstronomyService | null = null;

export function getAstronomyService(): AstronomyService {
  if (!astronomyServiceInstance) {
    astronomyServiceInstance = new AstronomyService();
  }
  return astronomyServiceInstance;
}

export default AstronomyService;
