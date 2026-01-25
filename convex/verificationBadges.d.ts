export declare const getUserBadges: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"verificationBadges">;
    _creationTime: number;
    metadata?: {
        travelExpertLevel?: number | undefined;
        specialties?: string[] | undefined;
        totalGuides?: number | undefined;
        totalLikes?: number | undefined;
        localCity?: string | undefined;
        localCityId?: import("convex/values").GenericId<"cities"> | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
    } | undefined;
    description?: string | undefined;
    color?: string | undefined;
    verifiedBy?: string | undefined;
    iconUrl?: string | undefined;
    expiresAt?: number | undefined;
    revokedAt?: number | undefined;
    revokedReason?: string | undefined;
    userId: string;
    displayName: string;
    createdAt: number;
    updatedAt: number;
    isActive: boolean;
    verifiedAt: number;
    badgeType: "travel_expert" | "local_guide" | "official_account";
}[]>>;
export declare const getBadgeById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"verificationBadges">;
}, Promise<{
    _id: import("convex/values").GenericId<"verificationBadges">;
    _creationTime: number;
    metadata?: {
        travelExpertLevel?: number | undefined;
        specialties?: string[] | undefined;
        totalGuides?: number | undefined;
        totalLikes?: number | undefined;
        localCity?: string | undefined;
        localCityId?: import("convex/values").GenericId<"cities"> | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
    } | undefined;
    description?: string | undefined;
    color?: string | undefined;
    verifiedBy?: string | undefined;
    iconUrl?: string | undefined;
    expiresAt?: number | undefined;
    revokedAt?: number | undefined;
    revokedReason?: string | undefined;
    userId: string;
    displayName: string;
    createdAt: number;
    updatedAt: number;
    isActive: boolean;
    verifiedAt: number;
    badgeType: "travel_expert" | "local_guide" | "official_account";
} | null>>;
export declare const hasBadge: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    badgeType: "travel_expert" | "local_guide" | "official_account";
}, Promise<boolean>>;
export declare const listBadgesByType: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    badgeType: "travel_expert" | "local_guide" | "official_account";
}, Promise<{
    _id: import("convex/values").GenericId<"verificationBadges">;
    _creationTime: number;
    metadata?: {
        travelExpertLevel?: number | undefined;
        specialties?: string[] | undefined;
        totalGuides?: number | undefined;
        totalLikes?: number | undefined;
        localCity?: string | undefined;
        localCityId?: import("convex/values").GenericId<"cities"> | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
    } | undefined;
    description?: string | undefined;
    color?: string | undefined;
    verifiedBy?: string | undefined;
    iconUrl?: string | undefined;
    expiresAt?: number | undefined;
    revokedAt?: number | undefined;
    revokedReason?: string | undefined;
    userId: string;
    displayName: string;
    createdAt: number;
    updatedAt: number;
    isActive: boolean;
    verifiedAt: number;
    badgeType: "travel_expert" | "local_guide" | "official_account";
}[]>>;
export declare const createBadge: import("convex/server").RegisteredMutation<"public", {
    metadata?: {
        travelExpertLevel?: number | undefined;
        specialties?: string[] | undefined;
        totalGuides?: number | undefined;
        totalLikes?: number | undefined;
        localCity?: string | undefined;
        localCityId?: import("convex/values").GenericId<"cities"> | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
    } | undefined;
    description?: string | undefined;
    verifiedBy?: string | undefined;
    iconUrl?: string | undefined;
    expiresAt?: number | undefined;
    userId: string;
    badgeType: "travel_expert" | "local_guide" | "official_account";
}, Promise<import("convex/values").GenericId<"verificationBadges">>>;
export declare const revokeBadge: import("convex/server").RegisteredMutation<"public", {
    revokedBy?: string | undefined;
    reason: string;
    badgeId: import("convex/values").GenericId<"verificationBadges">;
}, Promise<void>>;
export declare const reactivateBadge: import("convex/server").RegisteredMutation<"public", {
    newExpiresAt?: number | undefined;
    badgeId: import("convex/values").GenericId<"verificationBadges">;
}, Promise<void>>;
export declare const updateBadgeMetadata: import("convex/server").RegisteredMutation<"public", {
    metadata: {
        travelExpertLevel?: number | undefined;
        specialties?: string[] | undefined;
        totalGuides?: number | undefined;
        totalLikes?: number | undefined;
        localCity?: string | undefined;
        localCityId?: import("convex/values").GenericId<"cities"> | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
    };
    badgeId: import("convex/values").GenericId<"verificationBadges">;
}, Promise<void>>;
export declare const getUserApplications: import("convex/server").RegisteredQuery<"public", {
    status?: "approved" | "rejected" | "cancelled" | "pending" | "under_review" | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"verificationApplications">;
    _creationTime: number;
    email?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    supportingMaterials?: {
        description?: string | undefined;
        url: string;
        type: "other" | "id_photo" | "work_proof" | "portfolio" | "certificate";
    }[] | undefined;
    applicationData?: {
        localCity?: string | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
        travelExperience?: string | undefined;
        socialMediaLinks?: string[] | undefined;
        publishedGuideIds?: string[] | undefined;
        residenceProof?: string | undefined;
        localKnowledge?: string | undefined;
        businessLicenseUrl?: string | undefined;
        authorizationLetterUrl?: string | undefined;
    } | undefined;
    reviewNotes?: string | undefined;
    rejectionReason?: string | undefined;
    badgeId?: import("convex/values").GenericId<"verificationBadges"> | undefined;
    status: "approved" | "rejected" | "cancelled" | "pending" | "under_review";
    userId: string;
    phone: string;
    createdAt: number;
    updatedAt: number;
    idType: "id_card" | "passport" | "business_license";
    idNumber: string;
    badgeType: "travel_expert" | "local_guide" | "official_account";
    realName: string;
    applicationReason: string;
}[]>>;
export declare const getApplicationById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"verificationApplications">;
}, Promise<{
    _id: import("convex/values").GenericId<"verificationApplications">;
    _creationTime: number;
    email?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    supportingMaterials?: {
        description?: string | undefined;
        url: string;
        type: "other" | "id_photo" | "work_proof" | "portfolio" | "certificate";
    }[] | undefined;
    applicationData?: {
        localCity?: string | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
        travelExperience?: string | undefined;
        socialMediaLinks?: string[] | undefined;
        publishedGuideIds?: string[] | undefined;
        residenceProof?: string | undefined;
        localKnowledge?: string | undefined;
        businessLicenseUrl?: string | undefined;
        authorizationLetterUrl?: string | undefined;
    } | undefined;
    reviewNotes?: string | undefined;
    rejectionReason?: string | undefined;
    badgeId?: import("convex/values").GenericId<"verificationBadges"> | undefined;
    status: "approved" | "rejected" | "cancelled" | "pending" | "under_review";
    userId: string;
    phone: string;
    createdAt: number;
    updatedAt: number;
    idType: "id_card" | "passport" | "business_license";
    idNumber: string;
    badgeType: "travel_expert" | "local_guide" | "official_account";
    realName: string;
    applicationReason: string;
} | null>>;
export declare const listPendingApplications: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    badgeType?: "travel_expert" | "local_guide" | "official_account" | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"verificationApplications">;
    _creationTime: number;
    email?: string | undefined;
    reviewedBy?: string | undefined;
    reviewedAt?: number | undefined;
    supportingMaterials?: {
        description?: string | undefined;
        url: string;
        type: "other" | "id_photo" | "work_proof" | "portfolio" | "certificate";
    }[] | undefined;
    applicationData?: {
        localCity?: string | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
        travelExperience?: string | undefined;
        socialMediaLinks?: string[] | undefined;
        publishedGuideIds?: string[] | undefined;
        residenceProof?: string | undefined;
        localKnowledge?: string | undefined;
        businessLicenseUrl?: string | undefined;
        authorizationLetterUrl?: string | undefined;
    } | undefined;
    reviewNotes?: string | undefined;
    rejectionReason?: string | undefined;
    badgeId?: import("convex/values").GenericId<"verificationBadges"> | undefined;
    status: "approved" | "rejected" | "cancelled" | "pending" | "under_review";
    userId: string;
    phone: string;
    createdAt: number;
    updatedAt: number;
    idType: "id_card" | "passport" | "business_license";
    idNumber: string;
    badgeType: "travel_expert" | "local_guide" | "official_account";
    realName: string;
    applicationReason: string;
}[]>>;
export declare const submitApplication: import("convex/server").RegisteredMutation<"public", {
    email?: string | undefined;
    supportingMaterials?: {
        description?: string | undefined;
        url: string;
        type: "other" | "id_photo" | "work_proof" | "portfolio" | "certificate";
    }[] | undefined;
    applicationData?: {
        localCity?: string | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
        travelExperience?: string | undefined;
        socialMediaLinks?: string[] | undefined;
        publishedGuideIds?: string[] | undefined;
        residenceProof?: string | undefined;
        localKnowledge?: string | undefined;
        businessLicenseUrl?: string | undefined;
        authorizationLetterUrl?: string | undefined;
    } | undefined;
    userId: string;
    phone: string;
    idType: "id_card" | "passport" | "business_license";
    idNumber: string;
    badgeType: "travel_expert" | "local_guide" | "official_account";
    realName: string;
    applicationReason: string;
}, Promise<import("convex/values").GenericId<"verificationApplications">>>;
export declare const cancelApplication: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    applicationId: import("convex/values").GenericId<"verificationApplications">;
}, Promise<void>>;
export declare const startReview: import("convex/server").RegisteredMutation<"public", {
    applicationId: import("convex/values").GenericId<"verificationApplications">;
    reviewerId: string;
}, Promise<void>>;
export declare const approveApplication: import("convex/server").RegisteredMutation<"public", {
    metadata?: {
        travelExpertLevel?: number | undefined;
        specialties?: string[] | undefined;
        totalGuides?: number | undefined;
        totalLikes?: number | undefined;
        localCity?: string | undefined;
        localCityId?: import("convex/values").GenericId<"cities"> | undefined;
        yearsOfResidence?: number | undefined;
        languages?: string[] | undefined;
        organizationName?: string | undefined;
        organizationType?: string | undefined;
        officialWebsite?: string | undefined;
    } | undefined;
    reviewNotes?: string | undefined;
    expiresInDays?: number | undefined;
    applicationId: import("convex/values").GenericId<"verificationApplications">;
    reviewerId: string;
}, Promise<import("convex/values").GenericId<"verificationBadges">>>;
export declare const rejectApplication: import("convex/server").RegisteredMutation<"public", {
    reviewNotes?: string | undefined;
    rejectionReason: string;
    applicationId: import("convex/values").GenericId<"verificationApplications">;
    reviewerId: string;
}, Promise<void>>;
export declare const getBadgeStatistics: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    total: number;
    active: number;
    expired: number;
    revoked: number;
    byType: {
        travel_expert: number;
        local_guide: number;
        official_account: number;
    };
}>>;
export declare const getApplicationStatistics: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    total: number;
    pending: number;
    under_review: number;
    approved: number;
    rejected: number;
    cancelled: number;
    byType: {
        travel_expert: number;
        local_guide: number;
        official_account: number;
    };
}>>;
