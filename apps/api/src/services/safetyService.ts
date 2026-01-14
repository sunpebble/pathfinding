/**
 * Safety Service - Convex Implementation
 * Safety ratings, alerts, danger zones, and incident reports
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Type definitions
export type SafetyRating = {
  id: string;
  destinationName: string;
  destinationNameEn?: string;
  countryCode: string;
  cityId?: string;
  overallRating: number;
  crimeRating: number;
  healthRating: number;
  naturalDisasterRating: number;
  transportRating: number;
  womenSafetyRating?: number;
  lgbtqSafetyRating?: number;
  summary: string;
  summaryEn?: string;
  generalTips: string[];
  emergencyNumbers?: {
    police?: string;
    ambulance?: string;
    fire?: string;
    touristHotline?: string;
  };
  source: string;
  sourceUrl?: string;
  lastVerifiedAt: number;
  createdAt: number;
  updatedAt: number;
};

export type AlertType =
  | 'travel_advisory'
  | 'health_warning'
  | 'natural_disaster'
  | 'civil_unrest'
  | 'terrorism'
  | 'crime_spike'
  | 'scam_warning'
  | 'other';

export type AlertSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type SafetyAlert = {
  id: string;
  destinationName: string;
  countryCode: string;
  cityId?: string;
  affectedAreas?: string[];
  alertType: AlertType;
  severity: AlertSeverity;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  recommendations: string[];
  avoidAreas?: string[];
  startDate: number;
  endDate?: number;
  isActive: boolean;
  source: string;
  sourceUrl?: string;
  officialAdvisoryLevel?: string;
  createdAt: number;
  updatedAt: number;
};

export type DangerLevel =
  | 'caution'
  | 'avoid_night'
  | 'avoid_alone'
  | 'high_risk'
  | 'no_go';

export type DangerType =
  | 'crime'
  | 'scam'
  | 'traffic'
  | 'natural_hazard'
  | 'political'
  | 'health'
  | 'other';

export type DangerZone = {
  id: string;
  destinationName: string;
  countryCode: string;
  cityId?: string;
  zoneName: string;
  zoneNameEn?: string;
  latitude: number;
  longitude: number;
  radiusMeters?: number;
  polygon?: Array<{ lat: number; lng: number }>;
  dangerLevel: DangerLevel;
  dangerTypes: DangerType[];
  description: string;
  descriptionEn?: string;
  precautions: string[];
  dangerousTimes?: {
    allDay: boolean;
    nightOnly?: boolean;
    specificHours?: string;
    specificDays?: string[];
  };
  source: string;
  reportCount: number;
  isVerified: boolean;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
};

export type IncidentType =
  | 'theft'
  | 'assault'
  | 'scam'
  | 'harassment'
  | 'traffic_accident'
  | 'natural_disaster'
  | 'health_issue'
  | 'police_issue'
  | 'other';

export type IncidentSeverity = 'minor' | 'moderate' | 'severe' | 'critical';

export type IncidentStatus = 'pending' | 'verified' | 'rejected' | 'resolved';

export type SafetyIncidentReport = {
  id: string;
  userId: string;
  isAnonymous: boolean;
  destinationName: string;
  countryCode: string;
  cityId?: string;
  specificLocation?: string;
  latitude?: number;
  longitude?: number;
  incidentType: IncidentType;
  severity: IncidentSeverity;
  title: string;
  description: string;
  incidentDate: number;
  wasPoliceInvolved?: boolean;
  wasResolved?: boolean;
  resolutionNotes?: string;
  status: IncidentStatus;
  helpfulCount: number;
  createdAt: number;
  updatedAt: number;
};

export type DestinationSafetyInfo = {
  rating: SafetyRating | null;
  alerts: SafetyAlert[];
  dangerZones: DangerZone[];
  recentIncidents: SafetyIncidentReport[];
  hasActiveAlerts: boolean;
  hasCriticalAlerts: boolean;
  dangerZoneCount: number;
};

/**
 * Safety service for destination safety information
 */
export const SafetyService = {
  // ============================================
  // Safety Ratings
  // ============================================

  /**
   * Get safety rating for a destination
   */
  async getSafetyRating(
    params: {
      destinationName?: string;
      countryCode?: string;
      cityId?: string;
    },
    _accessToken: string
  ): Promise<SafetyRating | null> {
    const rating = await convex.query(api.safety.getSafetyRating, {
      destinationName: params.destinationName,
      countryCode: params.countryCode,
      cityId: params.cityId as Id<'cities'> | undefined,
    });

    return rating ? toSafetyRating(rating) : null;
  },

  /**
   * List safety ratings by country
   */
  async listSafetyRatingsByCountry(
    countryCode: string,
    limit: number | undefined,
    _accessToken: string
  ): Promise<SafetyRating[]> {
    const ratings = await convex.query(api.safety.listSafetyRatingsByCountry, {
      countryCode,
      limit,
    });

    return ratings.map(toSafetyRating);
  },

  /**
   * List safest destinations
   */
  async listSafestDestinations(
    minRating: number | undefined,
    limit: number | undefined,
    _accessToken: string
  ): Promise<SafetyRating[]> {
    const ratings = await convex.query(api.safety.listSafestDestinations, {
      minRating,
      limit,
    });

    return ratings.map(toSafetyRating);
  },

  // ============================================
  // Safety Alerts
  // ============================================

  /**
   * Get active alerts for a destination
   */
  async getActiveAlerts(
    params: {
      destinationName?: string;
      countryCode?: string;
      cityId?: string;
      alertType?: AlertType;
      severity?: AlertSeverity;
    },
    _accessToken: string
  ): Promise<SafetyAlert[]> {
    const alerts = await convex.query(api.safety.getActiveAlerts, {
      destinationName: params.destinationName,
      countryCode: params.countryCode,
      cityId: params.cityId as Id<'cities'> | undefined,
      alertType: params.alertType,
      severity: params.severity,
    });

    return alerts.map(toSafetyAlert);
  },

  /**
   * Get alert by ID
   */
  async getAlertById(
    alertId: string,
    _accessToken: string
  ): Promise<SafetyAlert> {
    const alert = await convex.query(api.safety.getAlertById, {
      id: alertId as Id<'safetyAlerts'>,
    });

    if (!alert) {
      throw new NotFoundError('Safety alert not found');
    }

    return toSafetyAlert(alert);
  },

  /**
   * Create safety alert
   */
  async createAlert(
    data: {
      destinationName: string;
      countryCode: string;
      cityId?: string;
      affectedAreas?: string[];
      alertType: AlertType;
      severity: AlertSeverity;
      title: string;
      titleEn?: string;
      description: string;
      descriptionEn?: string;
      recommendations: string[];
      avoidAreas?: string[];
      startDate: number;
      endDate?: number;
      source: string;
      sourceUrl?: string;
      officialAdvisoryLevel?: string;
      createdBy?: string;
    },
    _accessToken: string
  ): Promise<string> {
    const id = await convex.mutation(api.safety.createAlert, {
      ...data,
      cityId: data.cityId as Id<'cities'> | undefined,
    });

    return id;
  },

  /**
   * Update safety alert
   */
  async updateAlert(
    alertId: string,
    data: {
      title?: string;
      titleEn?: string;
      description?: string;
      descriptionEn?: string;
      severity?: AlertSeverity;
      recommendations?: string[];
      avoidAreas?: string[];
      endDate?: number;
      isActive?: boolean;
    },
    _accessToken: string
  ): Promise<SafetyAlert> {
    const alert = await convex.mutation(api.safety.updateAlert, {
      id: alertId as Id<'safetyAlerts'>,
      ...data,
    });

    if (!alert) {
      throw new NotFoundError('Safety alert not found');
    }

    return toSafetyAlert(alert);
  },

  /**
   * Deactivate alert
   */
  async deactivateAlert(alertId: string, _accessToken: string): Promise<void> {
    await convex.mutation(api.safety.deactivateAlert, {
      id: alertId as Id<'safetyAlerts'>,
    });
  },

  // ============================================
  // Danger Zones
  // ============================================

  /**
   * Get danger zones for a destination
   */
  async getDangerZones(
    params: {
      destinationName?: string;
      countryCode?: string;
      cityId?: string;
      dangerLevel?: DangerLevel;
      activeOnly?: boolean;
    },
    _accessToken: string
  ): Promise<DangerZone[]> {
    const zones = await convex.query(api.safety.getDangerZones, {
      destinationName: params.destinationName,
      countryCode: params.countryCode,
      cityId: params.cityId as Id<'cities'> | undefined,
      dangerLevel: params.dangerLevel,
      activeOnly: params.activeOnly,
    });

    return zones.map(toDangerZone);
  },

  /**
   * Get nearby danger zones
   */
  async getNearbyDangerZones(
    latitude: number,
    longitude: number,
    radiusKm: number,
    activeOnly: boolean | undefined,
    _accessToken: string
  ): Promise<Array<DangerZone & { distance: number }>> {
    const zones = await convex.query(api.safety.getNearbyDangerZones, {
      latitude,
      longitude,
      radiusKm,
      activeOnly,
    });

    return zones.map((z) => ({
      ...toDangerZone(z),
      distance: z.distance,
    }));
  },

  /**
   * Create danger zone
   */
  async createDangerZone(
    data: {
      destinationName: string;
      countryCode: string;
      cityId?: string;
      zoneName: string;
      zoneNameEn?: string;
      latitude: number;
      longitude: number;
      radiusMeters?: number;
      polygon?: Array<{ lat: number; lng: number }>;
      dangerLevel: DangerLevel;
      dangerTypes: DangerType[];
      description: string;
      descriptionEn?: string;
      precautions: string[];
      dangerousTimes?: {
        allDay: boolean;
        nightOnly?: boolean;
        specificHours?: string;
        specificDays?: string[];
      };
      source: string;
    },
    _accessToken: string
  ): Promise<string> {
    const id = await convex.mutation(api.safety.createDangerZone, {
      ...data,
      cityId: data.cityId as Id<'cities'> | undefined,
    });

    return id;
  },

  // ============================================
  // Incident Reports
  // ============================================

  /**
   * Get incident reports for a destination
   */
  async getIncidentReports(
    params: {
      destinationName?: string;
      countryCode?: string;
      cityId?: string;
      incidentType?: IncidentType;
      status?: IncidentStatus;
      limit?: number;
    },
    _accessToken: string
  ): Promise<SafetyIncidentReport[]> {
    const reports = await convex.query(api.safety.getIncidentReports, {
      destinationName: params.destinationName,
      countryCode: params.countryCode,
      cityId: params.cityId as Id<'cities'> | undefined,
      incidentType: params.incidentType,
      status: params.status,
      limit: params.limit,
    });

    return reports.map(toIncidentReport);
  },

  /**
   * Get user's incident reports
   */
  async getUserIncidentReports(
    userId: string,
    limit: number | undefined,
    _accessToken: string
  ): Promise<SafetyIncidentReport[]> {
    const reports = await convex.query(api.safety.getUserIncidentReports, {
      userId,
      limit,
    });

    return reports.map(toIncidentReport);
  },

  /**
   * Create incident report
   */
  async createIncidentReport(
    data: {
      userId: string;
      isAnonymous: boolean;
      destinationName: string;
      countryCode: string;
      cityId?: string;
      specificLocation?: string;
      latitude?: number;
      longitude?: number;
      incidentType: IncidentType;
      severity: IncidentSeverity;
      title: string;
      description: string;
      incidentDate: number;
      wasPoliceInvolved?: boolean;
      wasResolved?: boolean;
      resolutionNotes?: string;
    },
    _accessToken: string
  ): Promise<string> {
    const id = await convex.mutation(api.safety.createIncidentReport, {
      ...data,
      cityId: data.cityId as Id<'cities'> | undefined,
    });

    return id;
  },

  /**
   * Mark incident report as helpful
   */
  async markReportHelpful(
    reportId: string,
    _accessToken: string
  ): Promise<void> {
    await convex.mutation(api.safety.markReportHelpful, {
      id: reportId as Id<'safetyIncidentReports'>,
    });
  },

  // ============================================
  // Comprehensive Safety Info
  // ============================================

  /**
   * Get complete safety information for a destination
   */
  async getDestinationSafetyInfo(
    destinationName: string,
    countryCode: string | undefined,
    _accessToken: string
  ): Promise<DestinationSafetyInfo> {
    const info = await convex.query(api.safety.getDestinationSafetyInfo, {
      destinationName,
      countryCode,
    });

    return {
      rating: info.rating ? toSafetyRating(info.rating) : null,
      alerts: info.alerts.map(toSafetyAlert),
      dangerZones: info.dangerZones.map(toDangerZone),
      recentIncidents: info.recentIncidents.map(toIncidentReport),
      hasActiveAlerts: info.hasActiveAlerts,
      hasCriticalAlerts: info.hasCriticalAlerts,
      dangerZoneCount: info.dangerZoneCount,
    };
  },
};

// Helper functions to convert Convex documents to API response types
function toSafetyRating(doc: Doc<'safetyRatings'>): SafetyRating {
  return {
    id: doc._id,
    destinationName: doc.destinationName,
    destinationNameEn: doc.destinationNameEn,
    countryCode: doc.countryCode,
    cityId: doc.cityId,
    overallRating: doc.overallRating,
    crimeRating: doc.crimeRating,
    healthRating: doc.healthRating,
    naturalDisasterRating: doc.naturalDisasterRating,
    transportRating: doc.transportRating,
    womenSafetyRating: doc.womenSafetyRating,
    lgbtqSafetyRating: doc.lgbtqSafetyRating,
    summary: doc.summary,
    summaryEn: doc.summaryEn,
    generalTips: doc.generalTips,
    emergencyNumbers: doc.emergencyNumbers,
    source: doc.source,
    sourceUrl: doc.sourceUrl,
    lastVerifiedAt: doc.lastVerifiedAt,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toSafetyAlert(doc: Doc<'safetyAlerts'>): SafetyAlert {
  return {
    id: doc._id,
    destinationName: doc.destinationName,
    countryCode: doc.countryCode,
    cityId: doc.cityId,
    affectedAreas: doc.affectedAreas,
    alertType: doc.alertType,
    severity: doc.severity,
    title: doc.title,
    titleEn: doc.titleEn,
    description: doc.description,
    descriptionEn: doc.descriptionEn,
    recommendations: doc.recommendations,
    avoidAreas: doc.avoidAreas,
    startDate: doc.startDate,
    endDate: doc.endDate,
    isActive: doc.isActive,
    source: doc.source,
    sourceUrl: doc.sourceUrl,
    officialAdvisoryLevel: doc.officialAdvisoryLevel,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toDangerZone(doc: Doc<'dangerZones'>): DangerZone {
  return {
    id: doc._id,
    destinationName: doc.destinationName,
    countryCode: doc.countryCode,
    cityId: doc.cityId,
    zoneName: doc.zoneName,
    zoneNameEn: doc.zoneNameEn,
    latitude: doc.latitude,
    longitude: doc.longitude,
    radiusMeters: doc.radiusMeters,
    polygon: doc.polygon,
    dangerLevel: doc.dangerLevel,
    dangerTypes: doc.dangerTypes,
    description: doc.description,
    descriptionEn: doc.descriptionEn,
    precautions: doc.precautions,
    dangerousTimes: doc.dangerousTimes,
    source: doc.source,
    reportCount: doc.reportCount,
    isVerified: doc.isVerified,
    isActive: doc.isActive,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toIncidentReport(
  doc: Doc<'safetyIncidentReports'>
): SafetyIncidentReport {
  return {
    id: doc._id,
    userId: doc.isAnonymous ? 'anonymous' : doc.userId,
    isAnonymous: doc.isAnonymous,
    destinationName: doc.destinationName,
    countryCode: doc.countryCode,
    cityId: doc.cityId,
    specificLocation: doc.specificLocation,
    latitude: doc.latitude,
    longitude: doc.longitude,
    incidentType: doc.incidentType,
    severity: doc.severity,
    title: doc.title,
    description: doc.description,
    incidentDate: doc.incidentDate,
    wasPoliceInvolved: doc.wasPoliceInvolved,
    wasResolved: doc.wasResolved,
    resolutionNotes: doc.resolutionNotes,
    status: doc.status,
    helpfulCount: doc.helpfulCount,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}
