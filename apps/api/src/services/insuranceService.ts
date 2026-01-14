/**
 * Insurance Service - Convex Implementation
 * Insurance products and user insurance operations
 */

import type { Doc, Id } from '../lib/convex';
import { api, convex } from '../lib/convex';
import { NotFoundError } from '../middleware/errorHandler';

// Local type definitions
export type InsuranceType =
  | 'comprehensive'
  | 'medical'
  | 'accident'
  | 'flight_delay'
  | 'luggage'
  | 'cancellation'
  | 'emergency_evacuation';

export type RiskLevel = 'low' | 'medium' | 'high' | 'extreme';

export type ClaimType =
  | 'medical'
  | 'accident'
  | 'flight_delay'
  | 'luggage_loss'
  | 'trip_cancellation'
  | 'emergency_evacuation'
  | 'other';

export type InsuranceStatus =
  | 'pending'
  | 'active'
  | 'expired'
  | 'cancelled'
  | 'claimed';

export type PaymentStatus = 'pending' | 'paid' | 'refunded' | 'failed';

export interface InsuranceProduct {
  id: string;
  name: string;
  nameEn?: string;
  provider: string;
  providerLogo?: string;
  type: InsuranceType;
  coverageAmount: number;
  coverageDetails: Array<{
    item: string;
    amount: number;
    description?: string;
  }>;
  pricePerDay: number;
  minDays: number;
  maxDays: number;
  applicableRegions: string[];
  domesticOnly: boolean;
  riskLevelCoverage: RiskLevel[];
  features: string[];
  exclusions?: string[];
  rating?: number;
  reviewCount: number;
  purchaseUrl: string;
  contactPhone?: string;
  contactEmail?: string;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserInsurance {
  id: string;
  userId: string;
  productId: string;
  itineraryId?: string;
  startDate: string;
  endDate: string;
  coverageDays: number;
  destinations: string[];
  insuredPersons: Array<{
    name: string;
    idType: 'id_card' | 'passport' | 'other';
    idNumber: string;
    phone?: string;
    relationship: 'self' | 'spouse' | 'child' | 'parent' | 'other';
  }>;
  orderNumber?: string;
  policyNumber?: string;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  status: InsuranceStatus;
  claimHistory?: Array<{
    claimId: string;
    claimDate: number;
    claimType: string;
    claimAmount: number;
    status: 'submitted' | 'processing' | 'approved' | 'rejected' | 'paid';
    notes?: string;
  }>;
  notes?: string;
  purchasedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  product?: InsuranceProduct;
}

export interface DestinationRiskProfile {
  id: string;
  destination: string;
  destinationCode?: string;
  riskLevel: RiskLevel;
  riskFactors: string[];
  recommendedInsuranceTypes: InsuranceType[];
  travelAdvisory?: string;
  lastUpdated: Date;
}

export interface ClaimGuide {
  id: string;
  title: string;
  claimType: ClaimType;
  content: string;
  steps: Array<{
    stepNumber: number;
    title: string;
    description: string;
    requiredDocuments?: string[];
    tips?: string;
  }>;
  requiredDocuments: string[];
  timeLimit?: string;
  contactInfo?: {
    phone?: string;
    email?: string;
    website?: string;
  };
  faqs?: Array<{
    question: string;
    answer: string;
  }>;
  isActive: boolean;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Insurance service for products and user insurance operations
 */
export const InsuranceService = {
  // ============================================
  // Insurance Products
  // ============================================

  /**
   * List insurance products
   */
  async listProducts(
    type?: InsuranceType,
    domesticOnly?: boolean,
    limit?: number
  ): Promise<InsuranceProduct[]> {
    const products = await convex.query(api.insurance.listProducts, {
      type,
      domesticOnly,
      limit,
    });

    return products.map(toInsuranceProduct);
  },

  /**
   * Get insurance product by ID
   */
  async getProductById(productId: string): Promise<InsuranceProduct> {
    const product = await convex.query(api.insurance.getProductById, {
      id: productId as Id<'insuranceProducts'>,
    });

    if (!product) {
      throw new NotFoundError('Insurance product not found');
    }

    return toInsuranceProduct(product);
  },

  /**
   * Get recommended insurance products for a destination
   */
  async getRecommendedProducts(
    destination: string,
    tripDays: number,
    riskLevel?: RiskLevel
  ): Promise<{
    products: InsuranceProduct[];
    riskProfile: DestinationRiskProfile | null;
    effectiveRiskLevel: RiskLevel;
    recommendedTypes: InsuranceType[];
  }> {
    const result = await convex.query(api.insurance.getRecommendedProducts, {
      destination,
      tripDays,
      riskLevel,
    });

    return {
      products: result.products.map(toInsuranceProduct),
      riskProfile: result.riskProfile
        ? toDestinationRiskProfile(result.riskProfile)
        : null,
      effectiveRiskLevel: result.effectiveRiskLevel as RiskLevel,
      recommendedTypes: result.recommendedTypes as InsuranceType[],
    };
  },

  /**
   * Compare insurance products
   */
  async compareProducts(productIds: string[]): Promise<InsuranceProduct[]> {
    const products = await convex.query(api.insurance.compareProducts, {
      productIds: productIds as Id<'insuranceProducts'>[],
    });

    return products.map(toInsuranceProduct);
  },

  // ============================================
  // User Insurance
  // ============================================

  /**
   * List user's insurance policies
   */
  async listUserInsurance(
    userId: string,
    status?: InsuranceStatus
  ): Promise<UserInsurance[]> {
    const insurances = await convex.query(api.insurance.listUserInsurance, {
      userId,
      status,
    });

    return insurances.map(toUserInsurance);
  },

  /**
   * Get user insurance by ID
   */
  async getUserInsuranceById(insuranceId: string): Promise<UserInsurance> {
    const result = await convex.query(api.insurance.getUserInsuranceById, {
      id: insuranceId as Id<'userInsurance'>,
    });

    if (!result) {
      throw new NotFoundError('User insurance not found');
    }

    const insurance = toUserInsurance(result);
    if (result.product) {
      insurance.product = toInsuranceProduct(result.product);
    }

    return insurance;
  },

  /**
   * Get insurance for an itinerary
   */
  async getInsuranceByItinerary(itineraryId: string): Promise<UserInsurance[]> {
    const results = await convex.query(api.insurance.getInsuranceByItinerary, {
      itineraryId: itineraryId as Id<'itineraries'>,
    });

    return results.map((result: Doc<'userInsurance'> & { product?: Doc<'insuranceProducts'> | null }) => {
      const insurance = toUserInsurance(result);
      if (result.product) {
        insurance.product = toInsuranceProduct(result.product);
      }
      return insurance;
    });
  },

  /**
   * Create user insurance record
   */
  async createUserInsurance(data: {
    userId: string;
    productId: string;
    itineraryId?: string;
    startDate: string;
    endDate: string;
    coverageDays: number;
    destinations: string[];
    insuredPersons: Array<{
      name: string;
      idType: 'id_card' | 'passport' | 'other';
      idNumber: string;
      phone?: string;
      relationship: 'self' | 'spouse' | 'child' | 'parent' | 'other';
    }>;
    totalPrice: number;
    notes?: string;
  }): Promise<string> {
    const id = await convex.mutation(api.insurance.createUserInsurance, {
      ...data,
      productId: data.productId as Id<'insuranceProducts'>,
      itineraryId: data.itineraryId
        ? (data.itineraryId as Id<'itineraries'>)
        : undefined,
    });

    return id;
  },

  /**
   * Update user insurance status
   */
  async updateUserInsuranceStatus(
    insuranceId: string,
    data: {
      status: InsuranceStatus;
      paymentStatus?: PaymentStatus;
      orderNumber?: string;
      policyNumber?: string;
    }
  ): Promise<UserInsurance> {
    const result = await convex.mutation(
      api.insurance.updateUserInsuranceStatus,
      {
        id: insuranceId as Id<'userInsurance'>,
        ...data,
      }
    );

    return toUserInsurance(result);
  },

  /**
   * Add claim to user insurance
   */
  async addInsuranceClaim(
    insuranceId: string,
    data: {
      claimType: string;
      claimAmount: number;
      notes?: string;
    }
  ): Promise<{
    claimId: string;
    claimDate: number;
    claimType: string;
    claimAmount: number;
    status: 'submitted';
    notes?: string;
  }> {
    const claim = await convex.mutation(api.insurance.addInsuranceClaim, {
      insuranceId: insuranceId as Id<'userInsurance'>,
      ...data,
    });

    return claim;
  },

  // ============================================
  // Destination Risk Profiles
  // ============================================

  /**
   * Get destination risk profile
   */
  async getDestinationRiskProfile(
    destination?: string,
    destinationCode?: string
  ): Promise<DestinationRiskProfile | null> {
    const profile = await convex.query(
      api.insurance.getDestinationRiskProfile,
      {
        destination,
        destinationCode,
      }
    );

    return profile ? toDestinationRiskProfile(profile) : null;
  },

  /**
   * List destinations by risk level
   */
  async listDestinationsByRiskLevel(
    riskLevel: RiskLevel
  ): Promise<DestinationRiskProfile[]> {
    const profiles = await convex.query(
      api.insurance.listDestinationsByRiskLevel,
      {
        riskLevel,
      }
    );

    return profiles.map(toDestinationRiskProfile);
  },

  // ============================================
  // Insurance Claim Guides
  // ============================================

  /**
   * List claim guides
   */
  async listClaimGuides(claimType?: ClaimType): Promise<ClaimGuide[]> {
    const guides = await convex.query(api.insurance.listClaimGuides, {
      claimType,
    });

    return guides.map(toClaimGuide);
  },

  /**
   * Get claim guide by ID
   */
  async getClaimGuideById(guideId: string): Promise<ClaimGuide> {
    const guide = await convex.query(api.insurance.getClaimGuideById, {
      id: guideId as Id<'insuranceClaimGuides'>,
    });

    if (!guide) {
      throw new NotFoundError('Claim guide not found');
    }

    return toClaimGuide(guide);
  },
};

// Helper functions to convert Convex documents to API responses

function toInsuranceProduct(row: Doc<'insuranceProducts'>): InsuranceProduct {
  return {
    id: row._id,
    name: row.name,
    nameEn: row.nameEn,
    provider: row.provider,
    providerLogo: row.providerLogo,
    type: row.type as InsuranceType,
    coverageAmount: row.coverageAmount,
    coverageDetails: row.coverageDetails,
    pricePerDay: row.pricePerDay,
    minDays: row.minDays,
    maxDays: row.maxDays,
    applicableRegions: row.applicableRegions,
    domesticOnly: row.domesticOnly,
    riskLevelCoverage: row.riskLevelCoverage as RiskLevel[],
    features: row.features,
    exclusions: row.exclusions,
    rating: row.rating,
    reviewCount: row.reviewCount,
    purchaseUrl: row.purchaseUrl,
    contactPhone: row.contactPhone,
    contactEmail: row.contactEmail,
    isActive: row.isActive,
    priority: row.priority,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toUserInsurance(row: Doc<'userInsurance'>): UserInsurance {
  return {
    id: row._id,
    userId: row.userId,
    productId: row.productId,
    itineraryId: row.itineraryId,
    startDate: row.startDate,
    endDate: row.endDate,
    coverageDays: row.coverageDays,
    destinations: row.destinations,
    insuredPersons: row.insuredPersons as UserInsurance['insuredPersons'],
    orderNumber: row.orderNumber,
    policyNumber: row.policyNumber,
    totalPrice: row.totalPrice,
    paymentStatus: row.paymentStatus as PaymentStatus,
    status: row.status as InsuranceStatus,
    claimHistory: row.claimHistory as UserInsurance['claimHistory'],
    notes: row.notes,
    purchasedAt: new Date(row.purchasedAt),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}

function toDestinationRiskProfile(
  row: Doc<'destinationRiskProfiles'>
): DestinationRiskProfile {
  return {
    id: row._id,
    destination: row.destination,
    destinationCode: row.destinationCode,
    riskLevel: row.riskLevel as RiskLevel,
    riskFactors: row.riskFactors,
    recommendedInsuranceTypes: row.recommendedInsuranceTypes as InsuranceType[],
    travelAdvisory: row.travelAdvisory,
    lastUpdated: new Date(row.lastUpdated),
  };
}

function toClaimGuide(row: Doc<'insuranceClaimGuides'>): ClaimGuide {
  return {
    id: row._id,
    title: row.title,
    claimType: row.claimType as ClaimType,
    content: row.content,
    steps: row.steps,
    requiredDocuments: row.requiredDocuments,
    timeLimit: row.timeLimit,
    contactInfo: row.contactInfo,
    faqs: row.faqs,
    isActive: row.isActive,
    priority: row.priority,
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  };
}
