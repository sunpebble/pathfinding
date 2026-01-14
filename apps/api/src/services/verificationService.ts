import { ConvexHttpClient } from 'convex/browser';
import { api } from '../lib/convex';

/**
 * Verification Badge Service
 * Handles user verification badge operations
 */

// Type definitions
interface BadgeMetadata {
  travelExpertLevel?: number;
  specialties?: string[];
  totalGuides?: number;
  totalLikes?: number;
  localCity?: string;
  localCityId?: string;
  yearsOfResidence?: number;
  languages?: string[];
  organizationName?: string;
  organizationType?: string;
  officialWebsite?: string;
}

interface SupportingMaterial {
  type: 'id_photo' | 'work_proof' | 'portfolio' | 'certificate' | 'other';
  url: string;
  description?: string;
}

interface ApplicationData {
  travelExperience?: string;
  socialMediaLinks?: string[];
  publishedGuideIds?: string[];
  localCity?: string;
  residenceProof?: string;
  yearsOfResidence?: number;
  localKnowledge?: string;
  languages?: string[];
  organizationName?: string;
  organizationType?: string;
  businessLicenseUrl?: string;
  authorizationLetterUrl?: string;
  officialWebsite?: string;
}

export type BadgeType = 'travel_expert' | 'local_guide' | 'official_account';
export type ApplicationStatus =
  | 'pending'
  | 'under_review'
  | 'approved'
  | 'rejected'
  | 'cancelled';
export type IdType = 'id_card' | 'passport' | 'business_license';

function getClient(token?: string): ConvexHttpClient {
  const convexUrl = process.env.CONVEX_URL;
  if (!convexUrl) {
    throw new Error('CONVEX_URL environment variable not set');
  }
  const client = new ConvexHttpClient(convexUrl);
  if (token) {
    client.setAuth(token);
  }
  return client;
}

export class VerificationService {
  // ============================================
  // Badge Operations
  // ============================================

  /**
   * Get all active badges for a user
   */
  static async getUserBadges(userId: string, token?: string) {
    const client = getClient(token);
    return await client.query(api.verificationBadges.getUserBadges, { userId });
  }

  /**
   * Get a specific badge by ID
   */
  static async getBadgeById(badgeId: string, token?: string) {
    const client = getClient(token);
    return await client.query(api.verificationBadges.getBadgeById, {
      id: badgeId as any,
    });
  }

  /**
   * Check if user has a specific badge type
   */
  static async hasBadge(userId: string, badgeType: BadgeType, token?: string) {
    const client = getClient(token);
    return await client.query(api.verificationBadges.hasBadge, {
      userId,
      badgeType,
    });
  }

  /**
   * List badges by type (admin)
   */
  static async listBadgesByType(
    badgeType: BadgeType,
    limit?: number,
    token?: string
  ) {
    const client = getClient(token);
    return await client.query(api.verificationBadges.listBadgesByType, {
      badgeType,
      limit,
    });
  }

  /**
   * Revoke a badge (admin)
   */
  static async revokeBadge(
    badgeId: string,
    reason: string,
    revokedBy?: string,
    token?: string
  ) {
    const client = getClient(token);
    return await client.mutation(api.verificationBadges.revokeBadge, {
      badgeId: badgeId as any,
      reason,
      revokedBy,
    });
  }

  /**
   * Reactivate a revoked badge (admin)
   */
  static async reactivateBadge(
    badgeId: string,
    newExpiresAt?: number,
    token?: string
  ) {
    const client = getClient(token);
    return await client.mutation(api.verificationBadges.reactivateBadge, {
      badgeId: badgeId as any,
      newExpiresAt,
    });
  }

  /**
   * Update badge metadata (admin)
   */
  static async updateBadgeMetadata(
    badgeId: string,
    metadata: BadgeMetadata,
    token?: string
  ) {
    const client = getClient(token);
    return await client.mutation(api.verificationBadges.updateBadgeMetadata, {
      badgeId: badgeId as any,
      metadata: metadata as any,
    });
  }

  // ============================================
  // Application Operations
  // ============================================

  /**
   * Get user's applications
   */
  static async getUserApplications(
    userId: string,
    status?: ApplicationStatus,
    token?: string
  ) {
    const client = getClient(token);
    return await client.query(api.verificationBadges.getUserApplications, {
      userId,
      status,
    });
  }

  /**
   * Get application by ID
   */
  static async getApplicationById(applicationId: string, token?: string) {
    const client = getClient(token);
    return await client.query(api.verificationBadges.getApplicationById, {
      id: applicationId as any,
    });
  }

  /**
   * List pending applications (admin)
   */
  static async listPendingApplications(
    badgeType?: BadgeType,
    limit?: number,
    token?: string
  ) {
    const client = getClient(token);
    return await client.query(api.verificationBadges.listPendingApplications, {
      badgeType,
      limit,
    });
  }

  /**
   * Submit a new application
   */
  static async submitApplication(
    userId: string,
    data: {
      badgeType: BadgeType;
      realName: string;
      idType: IdType;
      idNumber: string;
      phone: string;
      email?: string;
      applicationReason: string;
      supportingMaterials?: SupportingMaterial[];
      applicationData?: ApplicationData;
    },
    token?: string
  ) {
    const client = getClient(token);
    return await client.mutation(api.verificationBadges.submitApplication, {
      userId,
      ...data,
    } as any);
  }

  /**
   * Cancel an application
   */
  static async cancelApplication(
    applicationId: string,
    userId: string,
    token?: string
  ) {
    const client = getClient(token);
    return await client.mutation(api.verificationBadges.cancelApplication, {
      applicationId: applicationId as any,
      userId,
    });
  }

  /**
   * Start reviewing an application (admin)
   */
  static async startReview(
    applicationId: string,
    reviewerId: string,
    token?: string
  ) {
    const client = getClient(token);
    return await client.mutation(api.verificationBadges.startReview, {
      applicationId: applicationId as any,
      reviewerId,
    });
  }

  /**
   * Approve an application (admin)
   */
  static async approveApplication(
    applicationId: string,
    reviewerId: string,
    options?: {
      reviewNotes?: string;
      expiresInDays?: number;
      metadata?: BadgeMetadata;
    },
    token?: string
  ) {
    const client = getClient(token);
    return await client.mutation(api.verificationBadges.approveApplication, {
      applicationId: applicationId as any,
      reviewerId,
      reviewNotes: options?.reviewNotes,
      expiresInDays: options?.expiresInDays,
      metadata: options?.metadata as any,
    });
  }

  /**
   * Reject an application (admin)
   */
  static async rejectApplication(
    applicationId: string,
    reviewerId: string,
    rejectionReason: string,
    reviewNotes?: string,
    token?: string
  ) {
    const client = getClient(token);
    return await client.mutation(api.verificationBadges.rejectApplication, {
      applicationId: applicationId as any,
      reviewerId,
      rejectionReason,
      reviewNotes,
    });
  }

  // ============================================
  // Statistics
  // ============================================

  /**
   * Get badge statistics (admin)
   */
  static async getBadgeStatistics(token?: string) {
    const client = getClient(token);
    return await client.query(api.verificationBadges.getBadgeStatistics, {});
  }

  /**
   * Get application statistics (admin)
   */
  static async getApplicationStatistics(token?: string) {
    const client = getClient(token);
    return await client.query(
      api.verificationBadges.getApplicationStatistics,
      {}
    );
  }
}
