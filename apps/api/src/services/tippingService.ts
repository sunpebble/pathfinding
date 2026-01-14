/**
 * Tipping Service - Convex Implementation
 * Operations for tipping guides and tip calculations
 */

import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Types
export type TippingCulture =
  | 'expected'
  | 'appreciated'
  | 'optional'
  | 'not_expected'
  | 'offensive';

export type ScenarioType =
  | 'restaurant'
  | 'hotel'
  | 'taxi'
  | 'bar'
  | 'spa'
  | 'tour'
  | 'delivery'
  | 'hairdresser'
  | 'other';

export type ServiceQuality = 'poor' | 'average' | 'good' | 'excellent';

export interface TippingScenario {
  type: ScenarioType;
  typeName: string;
  minPercentage: number;
  maxPercentage: number;
  suggestedPercentage: number;
  fixedAmount?: number;
  notes?: string;
}

export interface TippingGuide {
  id: string;
  countryCode: string;
  countryName: string;
  countryNameEn?: string;
  currency: string;
  currencySymbol: string;
  tippingCulture: TippingCulture;
  cultureSummary: string;
  scenarios: TippingScenario[];
  tips?: string[];
  lastUpdated: number;
}

export interface CalculateTipRequest {
  billAmount: number;
  countryCode: string;
  scenarioType: ScenarioType;
  serviceQuality?: ServiceQuality;
  splitCount?: number;
  customPercentage?: number;
}

export interface TipCalculationResult {
  billAmount: number;
  tipPercentage: number;
  tipAmount: number;
  totalAmount: number;
  perPersonAmount: number;
  perPersonTip: number;
  splitCount: number;
  currency: string;
  currencySymbol: string;
  scenarioNotes?: string;
  cultureSummary: string;
  tippingCulture: TippingCulture;
}

// Service quality multipliers
const SERVICE_QUALITY_MULTIPLIERS: Record<ServiceQuality, number> = {
  poor: 0.5,
  average: 0.75,
  good: 1.0,
  excellent: 1.25,
};

/**
 * Tipping service for guide retrieval and tip calculations
 */
export const TippingService = {
  /**
   * List all tipping guides
   */
  async list(_accessToken: string): Promise<TippingGuide[]> {
    const guides = await convex.query(api.tippingGuides.list, {});
    return guides.map(toTippingGuide);
  },

  /**
   * Get tipping guide by country code
   */
  async getByCountryCode(
    countryCode: string,
    _accessToken: string
  ): Promise<TippingGuide> {
    const guide = await convex.query(api.tippingGuides.getByCountryCode, {
      countryCode,
    });

    if (!guide) {
      throw new NotFoundError(`Tipping guide not found for country: ${countryCode}`);
    }

    return toTippingGuide(guide);
  },

  /**
   * Search tipping guides by name
   */
  async searchByName(
    name: string,
    _accessToken: string
  ): Promise<TippingGuide[]> {
    const guides = await convex.query(api.tippingGuides.searchByName, { name });
    return guides.map(toTippingGuide);
  },

  /**
   * Get tipping guides by culture type
   */
  async getByTippingCulture(
    culture: TippingCulture,
    _accessToken: string
  ): Promise<TippingGuide[]> {
    const guides = await convex.query(api.tippingGuides.getByTippingCulture, {
      culture,
    });
    return guides.map(toTippingGuide);
  },

  /**
   * Get scenario info for a specific country and scenario type
   */
  async getScenario(
    countryCode: string,
    scenarioType: ScenarioType,
    _accessToken: string
  ): Promise<TippingScenario & { countryName: string; currency: string; currencySymbol: string; tippingCulture: TippingCulture } | null> {
    const scenario = await convex.query(api.tippingGuides.getScenario, {
      countryCode,
      scenarioType,
    });
    return scenario;
  },

  /**
   * Calculate tip amount based on bill and parameters
   */
  async calculateTip(
    request: CalculateTipRequest,
    _accessToken: string
  ): Promise<TipCalculationResult> {
    const {
      billAmount,
      countryCode,
      scenarioType,
      serviceQuality = 'good',
      splitCount = 1,
      customPercentage,
    } = request;

    // Get the tipping guide for the country
    const guide = await convex.query(api.tippingGuides.getByCountryCode, {
      countryCode,
    });

    if (!guide) {
      throw new NotFoundError(`Tipping guide not found for country: ${countryCode}`);
    }

    // Find the scenario
    const scenario = guide.scenarios.find((s) => s.type === scenarioType);

    // Calculate tip percentage
    let tipPercentage: number;
    let scenarioNotes: string | undefined;

    if (customPercentage !== undefined) {
      // Use custom percentage if provided
      tipPercentage = customPercentage;
    } else if (scenario) {
      // Calculate based on service quality
      const basePercentage = scenario.suggestedPercentage;
      const multiplier = SERVICE_QUALITY_MULTIPLIERS[serviceQuality];

      // Adjust percentage based on service quality
      const range = scenario.maxPercentage - scenario.minPercentage;
      tipPercentage = scenario.minPercentage + range * multiplier;

      // Ensure within bounds
      tipPercentage = Math.max(
        scenario.minPercentage,
        Math.min(scenario.maxPercentage, tipPercentage)
      );

      scenarioNotes = scenario.notes;

      // If there's a fixed amount and percentage is 0, use fixed amount
      if (scenario.fixedAmount && scenario.suggestedPercentage === 0) {
        const tipAmount = scenario.fixedAmount;
        const totalAmount = billAmount + tipAmount;
        const perPersonAmount = totalAmount / splitCount;
        const perPersonTip = tipAmount / splitCount;

        return {
          billAmount,
          tipPercentage: 0,
          tipAmount,
          totalAmount,
          perPersonAmount,
          perPersonTip,
          splitCount,
          currency: guide.currency,
          currencySymbol: guide.currencySymbol,
          scenarioNotes,
          cultureSummary: guide.cultureSummary,
          tippingCulture: guide.tippingCulture,
        };
      }
    } else {
      // Default to 0 if no scenario found
      tipPercentage = 0;
    }

    // Calculate amounts
    const tipAmount = billAmount * (tipPercentage / 100);
    const totalAmount = billAmount + tipAmount;
    const perPersonAmount = totalAmount / splitCount;
    const perPersonTip = tipAmount / splitCount;

    return {
      billAmount,
      tipPercentage,
      tipAmount: Math.round(tipAmount * 100) / 100,
      totalAmount: Math.round(totalAmount * 100) / 100,
      perPersonAmount: Math.round(perPersonAmount * 100) / 100,
      perPersonTip: Math.round(perPersonTip * 100) / 100,
      splitCount,
      currency: guide.currency,
      currencySymbol: guide.currencySymbol,
      scenarioNotes,
      cultureSummary: guide.cultureSummary,
      tippingCulture: guide.tippingCulture,
    };
  },

  /**
   * Seed initial tipping data
   */
  async seedInitialData(_accessToken: string): Promise<{ message: string; count: number }> {
    const result = await convex.mutation(api.tippingGuides.seedInitialData, {});
    return result;
  },
};

// Helper function to convert Convex document to API response
function toTippingGuide(doc: any): TippingGuide {
  return {
    id: doc._id,
    countryCode: doc.countryCode,
    countryName: doc.countryName,
    countryNameEn: doc.countryNameEn,
    currency: doc.currency,
    currencySymbol: doc.currencySymbol,
    tippingCulture: doc.tippingCulture,
    cultureSummary: doc.cultureSummary,
    scenarios: doc.scenarios,
    tips: doc.tips,
    lastUpdated: doc.lastUpdated,
  };
}
