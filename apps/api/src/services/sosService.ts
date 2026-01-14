/**
 * SOS Service - Emergency Alert Management
 * Handles SOS alerts, emergency contacts, and emergency services
 */

import type { Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Type definitions
export type SOSAlertType = 'emergency' | 'medical' | 'safety' | 'other';
export type SOSAlertStatus = 'sent' | 'received' | 'resolved' | 'cancelled';

export type SOSAlert = {
  id: string;
  userId: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  accuracy?: number;
  alertType: SOSAlertType;
  message?: string;
  status: SOSAlertStatus;
  notifiedContacts: string[];
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
};

export type EmergencyContact = {
  id: string;
  userId: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  isPrimary: boolean;
  notifyOnSos: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
};

export type EmergencyServices = {
  id: string;
  countryCode: string;
  countryName: string;
  countryNameEn?: string;
  cityName?: string;
  policeNumber: string;
  ambulanceNumber: string;
  fireNumber: string;
  generalEmergencyNumber?: string;
  embassyPhone?: string;
  embassyAddress?: string;
  embassyWebsite?: string;
  consulateInfo?: Array<{
    city: string;
    phone: string;
    address?: string;
  }>;
  touristPoliceNumber?: string;
  coastGuardNumber?: string;
  roadAssistanceNumber?: string;
  poisonControlNumber?: string;
  notes?: string;
  lastUpdated: number;
};

export type EmergencyGuide = {
  title: string;
  titleEn: string;
  steps: string[];
  tips: string[];
  emergencyServices?: EmergencyServices;
};

export type ComprehensiveEmergencyInfo = {
  emergencyServices: EmergencyServices | null;
  emergencyContacts: Array<{
    _id: string;
    name: string;
    phoneNumber: string;
    relationship: string;
    isPrimary: boolean;
  }>;
  activeInsurance: unknown;
  quickActions: Array<{
    id: string;
    label: string;
    labelEn: string;
    icon: string;
    number: string | null;
    color: string;
  }>;
};

export type SOSAlertWithContacts = SOSAlert & {
  contactDetails: Array<{
    id: string;
    name: string;
    phoneNumber: string;
    relationship: string;
    email?: string;
  }>;
};

export type SOSAlertWithEmergencyInfo = SOSAlertWithContacts & {
  emergencyServices: EmergencyServices | null;
};

/**
 * SOS Service for emergency alert management
 */
export const SOSService = {
  // ============================================
  // SOS Alerts
  // ============================================

  /**
   * Create a new SOS alert
   */
  async createAlert(
    data: {
      userId: string;
      latitude: number;
      longitude: number;
      locationName?: string;
      accuracy?: number;
      alertType: SOSAlertType;
      message?: string;
    },
    _accessToken: string
  ): Promise<SOSAlert> {
    const alert = await convex.mutation(api.sosAlerts.create, {
      userId: data.userId,
      latitude: data.latitude,
      longitude: data.longitude,
      locationName: data.locationName,
      accuracy: data.accuracy,
      alertType: data.alertType,
      message: data.message,
    });

    if (!alert) {
      throw new Error('Failed to create SOS alert');
    }

    return toSOSAlert(alert);
  },

  /**
   * Get SOS alert by ID
   */
  async getAlertById(
    alertId: string,
    _accessToken: string
  ): Promise<SOSAlert> {
    const alert = await convex.query(api.sosAlerts.getById, {
      id: alertId as Id<'sosAlerts'>,
    });

    if (!alert) {
      throw new NotFoundError('SOS alert not found');
    }

    return toSOSAlert(alert);
  },

  /**
   * Get SOS alert with contact details
   */
  async getAlertWithContacts(
    alertId: string,
    _accessToken: string
  ): Promise<SOSAlertWithContacts | null> {
    const result = await convex.query(api.sosAlerts.getWithContacts, {
      id: alertId as Id<'sosAlerts'>,
    });

    if (!result) {
      return null;
    }

    return {
      ...toSOSAlert(result),
      contactDetails: result.contactDetails.map((c: { id: string; name: string; phoneNumber: string; relationship: string; email?: string }) => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        relationship: c.relationship,
        email: c.email,
      })),
    };
  },

  /**
   * Get SOS alert with full emergency info
   */
  async getAlertWithEmergencyInfo(
    alertId: string,
    countryCode: string | undefined,
    _accessToken: string
  ): Promise<SOSAlertWithEmergencyInfo | null> {
    const result = await convex.query(api.sosAlerts.getWithEmergencyInfo, {
      id: alertId as Id<'sosAlerts'>,
      countryCode,
    });

    if (!result) {
      return null;
    }

    return {
      ...toSOSAlert(result),
      contactDetails: result.contactDetails.map((c: { id: string; name: string; phoneNumber: string; relationship: string; email?: string }) => ({
        id: c.id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        relationship: c.relationship,
        email: c.email,
      })),
      emergencyServices: result.emergencyServices
        ? toEmergencyServices(result.emergencyServices)
        : null,
    };
  },

  /**
   * List SOS alerts for a user
   */
  async listUserAlerts(
    userId: string,
    _accessToken: string
  ): Promise<SOSAlert[]> {
    const alerts = await convex.query(api.sosAlerts.listByUser, {
      userId,
    });

    return alerts.map(toSOSAlert);
  },

  /**
   * Get active (unresolved) SOS alerts for a user
   */
  async getActiveAlerts(
    userId: string,
    _accessToken: string
  ): Promise<SOSAlert[]> {
    const alerts = await convex.query(api.sosAlerts.getActiveAlerts, {
      userId,
    });

    return alerts.map(toSOSAlert);
  },

  /**
   * Update SOS alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: SOSAlertStatus,
    _accessToken: string
  ): Promise<SOSAlert> {
    const alert = await convex.mutation(api.sosAlerts.updateStatus, {
      id: alertId as Id<'sosAlerts'>,
      status,
    });

    if (!alert) {
      throw new NotFoundError('SOS alert not found');
    }

    return toSOSAlert(alert);
  },

  /**
   * Resolve an SOS alert
   */
  async resolveAlert(
    alertId: string,
    resolvedBy: string | undefined,
    _accessToken: string
  ): Promise<SOSAlert> {
    const alert = await convex.mutation(api.sosAlerts.resolve, {
      id: alertId as Id<'sosAlerts'>,
      resolvedBy,
    });

    if (!alert) {
      throw new NotFoundError('SOS alert not found');
    }

    return toSOSAlert(alert);
  },

  /**
   * Cancel an SOS alert
   */
  async cancelAlert(
    alertId: string,
    _accessToken: string
  ): Promise<SOSAlert> {
    const alert = await convex.mutation(api.sosAlerts.cancel, {
      id: alertId as Id<'sosAlerts'>,
    });

    if (!alert) {
      throw new NotFoundError('SOS alert not found');
    }

    return toSOSAlert(alert);
  },

  /**
   * Update SOS alert location (for continuous tracking)
   */
  async updateAlertLocation(
    alertId: string,
    data: {
      latitude: number;
      longitude: number;
      accuracy?: number;
      locationName?: string;
    },
    _accessToken: string
  ): Promise<SOSAlert> {
    const alert = await convex.mutation(api.sosAlerts.updateLocation, {
      id: alertId as Id<'sosAlerts'>,
      latitude: data.latitude,
      longitude: data.longitude,
      accuracy: data.accuracy,
      locationName: data.locationName,
    });

    if (!alert) {
      throw new NotFoundError('SOS alert not found');
    }

    return toSOSAlert(alert);
  },

  /**
   * Add message to SOS alert
   */
  async addAlertMessage(
    alertId: string,
    message: string,
    _accessToken: string
  ): Promise<SOSAlert> {
    const alert = await convex.mutation(api.sosAlerts.addMessage, {
      id: alertId as Id<'sosAlerts'>,
      message,
    });

    if (!alert) {
      throw new NotFoundError('SOS alert not found');
    }

    return toSOSAlert(alert);
  },

  // ============================================
  // Emergency Contacts
  // ============================================

  /**
   * List emergency contacts for a user
   */
  async listContacts(
    userId: string,
    _accessToken: string
  ): Promise<EmergencyContact[]> {
    const contacts = await convex.query(api.emergencyContacts.listByUser, {
      userId,
    });

    return contacts.map(toEmergencyContact);
  },

  /**
   * Get emergency contact by ID
   */
  async getContactById(
    contactId: string,
    _accessToken: string
  ): Promise<EmergencyContact> {
    const contact = await convex.query(api.emergencyContacts.getById, {
      id: contactId as Id<'emergencyContacts'>,
    });

    if (!contact) {
      throw new NotFoundError('Emergency contact not found');
    }

    return toEmergencyContact(contact);
  },

  /**
   * Get primary emergency contact for a user
   */
  async getPrimaryContact(
    userId: string,
    _accessToken: string
  ): Promise<EmergencyContact | null> {
    const contact = await convex.query(api.emergencyContacts.getPrimary, {
      userId,
    });

    return contact ? toEmergencyContact(contact) : null;
  },

  /**
   * Get contacts that should be notified on SOS
   */
  async getSosContacts(
    userId: string,
    _accessToken: string
  ): Promise<EmergencyContact[]> {
    const contacts = await convex.query(api.emergencyContacts.getSosContacts, {
      userId,
    });

    return contacts.map(toEmergencyContact);
  },

  /**
   * Create emergency contact
   */
  async createContact(
    data: {
      userId: string;
      name: string;
      relationship: string;
      phoneNumber: string;
      email?: string;
      isPrimary: boolean;
      notifyOnSos: boolean;
      notes?: string;
    },
    _accessToken: string
  ): Promise<string> {
    const id = await convex.mutation(api.emergencyContacts.create, data);
    return id;
  },

  /**
   * Update emergency contact
   */
  async updateContact(
    contactId: string,
    data: {
      name?: string;
      relationship?: string;
      phoneNumber?: string;
      email?: string;
      isPrimary?: boolean;
      notifyOnSos?: boolean;
      notes?: string;
    },
    _accessToken: string
  ): Promise<EmergencyContact> {
    const contact = await convex.mutation(api.emergencyContacts.update, {
      id: contactId as Id<'emergencyContacts'>,
      ...data,
    });

    if (!contact) {
      throw new NotFoundError('Emergency contact not found');
    }

    return toEmergencyContact(contact);
  },

  /**
   * Delete emergency contact
   */
  async deleteContact(
    contactId: string,
    _accessToken: string
  ): Promise<void> {
    await convex.mutation(api.emergencyContacts.remove, {
      id: contactId as Id<'emergencyContacts'>,
    });
  },

  /**
   * Set a contact as primary
   */
  async setPrimaryContact(
    contactId: string,
    userId: string,
    _accessToken: string
  ): Promise<EmergencyContact> {
    const contact = await convex.mutation(api.emergencyContacts.setPrimary, {
      id: contactId as Id<'emergencyContacts'>,
      userId,
    });

    if (!contact) {
      throw new NotFoundError('Emergency contact not found');
    }

    return toEmergencyContact(contact);
  },

  // ============================================
  // Emergency Services
  // ============================================

  /**
   * Get emergency services by country code
   */
  async getServicesByCountry(
    countryCode: string,
    _accessToken: string
  ): Promise<EmergencyServices | null> {
    const services = await convex.query(api.emergencyServices.getByCountry, {
      countryCode,
    });

    return services ? toEmergencyServices(services) : null;
  },

  /**
   * Get emergency services by country and city
   */
  async getServicesByCountryCity(
    countryCode: string,
    cityName: string | undefined,
    _accessToken: string
  ): Promise<EmergencyServices | null> {
    const services = await convex.query(api.emergencyServices.getByCountryCity, {
      countryCode,
      cityName,
    });

    return services ? toEmergencyServices(services) : null;
  },

  /**
   * List all countries with emergency services
   */
  async listCountries(
    _accessToken: string
  ): Promise<Array<{ countryCode: string; countryName: string; countryNameEn?: string }>> {
    const countries = await convex.query(api.emergencyServices.listCountries, {});
    return countries;
  },

  /**
   * Search emergency services by country name
   */
  async searchByName(
    query: string,
    _accessToken: string
  ): Promise<EmergencyServices[]> {
    const services = await convex.query(api.emergencyServices.searchByName, {
      query,
    });

    return services.map(toEmergencyServices);
  },

  /**
   * Get emergency guide for a specific situation
   */
  async getEmergencyGuide(
    guideType: 'medical' | 'theft' | 'lost_passport' | 'natural_disaster' | 'accident' | 'assault' | 'general',
    countryCode: string | undefined,
    _accessToken: string
  ): Promise<EmergencyGuide> {
    const guide = await convex.query(api.emergencyServices.getEmergencyGuide, {
      guideType,
      countryCode,
    });

    return {
      title: guide.title,
      titleEn: guide.titleEn,
      steps: guide.steps,
      tips: guide.tips,
      emergencyServices: guide.emergencyServices
        ? toEmergencyServices(guide.emergencyServices)
        : undefined,
    };
  },

  /**
   * Get comprehensive emergency info for a location
   */
  async getComprehensiveEmergencyInfo(
    countryCode: string,
    cityName: string | undefined,
    userId: string | undefined,
    _accessToken: string
  ): Promise<ComprehensiveEmergencyInfo> {
    const info = await convex.query(api.emergencyServices.getComprehensiveEmergencyInfo, {
      countryCode,
      cityName,
      userId,
    });

    return {
      emergencyServices: info.emergencyServices
        ? toEmergencyServices(info.emergencyServices)
        : null,
      emergencyContacts: info.emergencyContacts,
      activeInsurance: info.activeInsurance,
      quickActions: info.quickActions,
    };
  },

  /**
   * Seed common emergency services data
   */
  async seedCommonCountries(
    _accessToken: string
  ): Promise<Array<{ countryCode: string; id: string; action: string }>> {
    const results = await convex.mutation(api.emergencyServices.seedCommonCountries, {});
    return results;
  },
};

// Helper functions to convert Convex documents to API response types
function toSOSAlert(doc: {
  _id: string;
  userId: string;
  latitude: number;
  longitude: number;
  locationName?: string;
  accuracy?: number;
  alertType: SOSAlertType;
  message?: string;
  status: SOSAlertStatus;
  notifiedContacts: string[];
  createdAt: number;
  resolvedAt?: number;
  resolvedBy?: string;
}): SOSAlert {
  return {
    id: doc._id,
    userId: doc.userId,
    latitude: doc.latitude,
    longitude: doc.longitude,
    locationName: doc.locationName,
    accuracy: doc.accuracy,
    alertType: doc.alertType,
    message: doc.message,
    status: doc.status,
    notifiedContacts: doc.notifiedContacts,
    createdAt: doc.createdAt,
    resolvedAt: doc.resolvedAt,
    resolvedBy: doc.resolvedBy,
  };
}

function toEmergencyContact(doc: {
  _id: string;
  userId: string;
  name: string;
  relationship: string;
  phoneNumber: string;
  email?: string;
  isPrimary: boolean;
  notifyOnSos: boolean;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}): EmergencyContact {
  return {
    id: doc._id,
    userId: doc.userId,
    name: doc.name,
    relationship: doc.relationship,
    phoneNumber: doc.phoneNumber,
    email: doc.email,
    isPrimary: doc.isPrimary,
    notifyOnSos: doc.notifyOnSos,
    notes: doc.notes,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

function toEmergencyServices(doc: {
  _id: string;
  countryCode: string;
  countryName: string;
  countryNameEn?: string;
  cityName?: string;
  policeNumber: string;
  ambulanceNumber: string;
  fireNumber: string;
  generalEmergencyNumber?: string;
  embassyPhone?: string;
  embassyAddress?: string;
  embassyWebsite?: string;
  consulateInfo?: Array<{
    city: string;
    phone: string;
    address?: string;
  }>;
  touristPoliceNumber?: string;
  coastGuardNumber?: string;
  roadAssistanceNumber?: string;
  poisonControlNumber?: string;
  notes?: string;
  lastUpdated: number;
}): EmergencyServices {
  return {
    id: doc._id,
    countryCode: doc.countryCode,
    countryName: doc.countryName,
    countryNameEn: doc.countryNameEn,
    cityName: doc.cityName,
    policeNumber: doc.policeNumber,
    ambulanceNumber: doc.ambulanceNumber,
    fireNumber: doc.fireNumber,
    generalEmergencyNumber: doc.generalEmergencyNumber,
    embassyPhone: doc.embassyPhone,
    embassyAddress: doc.embassyAddress,
    embassyWebsite: doc.embassyWebsite,
    consulateInfo: doc.consulateInfo,
    touristPoliceNumber: doc.touristPoliceNumber,
    coastGuardNumber: doc.coastGuardNumber,
    roadAssistanceNumber: doc.roadAssistanceNumber,
    poisonControlNumber: doc.poisonControlNumber,
    notes: doc.notes,
    lastUpdated: doc.lastUpdated,
  };
}
