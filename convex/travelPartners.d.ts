/**
 * Get user's travel preferences
 */
export declare const getTravelPreferences: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"userTravelPreferences">;
    _creationTime: number;
    bio?: string | undefined;
    ageRange?: "18-25" | "26-35" | "36-45" | "46-55" | "55+" | undefined;
    languages?: string[] | undefined;
    travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
    preferredPace?: "moderate" | "slow" | "fast" | undefined;
    gender?: "other" | "male" | "female" | undefined;
    preferredPartnerGender?: "any" | "other" | "male" | "female" | undefined;
    interests?: string[] | undefined;
    smokingPreference?: "smoker" | "non_smoker" | "no_preference" | undefined;
    accommodationPreference?: "luxury" | "no_preference" | "hostel" | "budget_hotel" | "mid_range" | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
} | null>>;
/**
 * Update or create user's travel preferences
 */
export declare const upsertTravelPreferences: import("convex/server").RegisteredMutation<"public", {
    bio?: string | undefined;
    ageRange?: "18-25" | "26-35" | "36-45" | "46-55" | "55+" | undefined;
    languages?: string[] | undefined;
    travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
    preferredPace?: "moderate" | "slow" | "fast" | undefined;
    gender?: "other" | "male" | "female" | undefined;
    preferredPartnerGender?: "any" | "other" | "male" | "female" | undefined;
    interests?: string[] | undefined;
    smokingPreference?: "smoker" | "non_smoker" | "no_preference" | undefined;
    accommodationPreference?: "luxury" | "no_preference" | "hostel" | "budget_hotel" | "mid_range" | undefined;
    userId: string;
}, Promise<import("convex/values").GenericId<"userTravelPreferences">>>;
/**
 * List active partner requests with optional filters
 */
export declare const listRequests: import("convex/server").RegisteredQuery<"public", {
    destination?: string | undefined;
    cityId?: import("convex/values").GenericId<"cities"> | undefined;
    travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
    budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    startDateFrom?: string | undefined;
    startDateTo?: string | undefined;
}, Promise<{
    data: {
        cityName: string | undefined;
        user: {
            displayName: string | undefined;
            avatarUrl: string | undefined;
            trustScore: number;
            badges: ("verified_identity" | "trusted_traveler" | "super_host" | "responsive" | "experienced" | "top_rated")[];
            verifiedCount: number;
        } | null;
        _id: import("convex/values").GenericId<"travelPartnerRequests">;
        _creationTime: number;
        imageUrls?: string[] | undefined;
        coverImageUrl?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        expiresAt?: number | undefined;
        estimatedBudget?: number | undefined;
        travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
        destinationCityId?: import("convex/values").GenericId<"cities"> | undefined;
        preferredGender?: "any" | "other" | "male" | "female" | undefined;
        preferredAgeRange?: ("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined;
        budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
        status: "cancelled" | "active" | "expired" | "paused" | "fulfilled";
        title: string;
        description: string;
        destination: string;
        userId: string;
        startDate: string;
        endDate: string;
        createdAt: number;
        updatedAt: number;
        viewCount: number;
        isFlexibleDates: boolean;
        currentGroupSize: number;
        maxGroupSize: number;
        applicationCount: number;
    }[];
    total: number;
}>>;
/**
 * Get a single partner request by ID
 */
export declare const getRequestById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"travelPartnerRequests">;
}, Promise<{
    cityName: string | undefined;
    user: {
        id: string;
        displayName: string | undefined;
        avatarUrl: string | undefined;
        bio: string | undefined;
        trustScore: number;
        badges: ("verified_identity" | "trusted_traveler" | "super_host" | "responsive" | "experienced" | "top_rated")[];
        verifications: {
            _id: import("convex/values").GenericId<"userVerifications">;
            _creationTime: number;
            reviewedBy?: string | undefined;
            verifiedAt?: number | undefined;
            expiresAt?: number | undefined;
            verificationData?: string | undefined;
            verificationMethod?: string | undefined;
            socialPlatform?: string | undefined;
            socialId?: string | undefined;
            referenceUserId?: string | undefined;
            referenceNote?: string | undefined;
            adminNotes?: string | undefined;
            status: "rejected" | "pending" | "expired" | "verified";
            userId: string;
            createdAt: number;
            updatedAt: number;
            verificationType: "email" | "phone" | "identity" | "social" | "travel_history" | "reference";
        }[];
    } | null;
    applicationsCount: number;
    pendingApplicationsCount: number;
    itinerary: {
        id: import("convex/values").GenericId<"itineraries">;
        title: string;
        startDate: string;
        endDate: string;
    } | null;
    _id: import("convex/values").GenericId<"travelPartnerRequests">;
    _creationTime: number;
    imageUrls?: string[] | undefined;
    coverImageUrl?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    expiresAt?: number | undefined;
    estimatedBudget?: number | undefined;
    travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
    destinationCityId?: import("convex/values").GenericId<"cities"> | undefined;
    preferredGender?: "any" | "other" | "male" | "female" | undefined;
    preferredAgeRange?: ("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined;
    budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
    status: "cancelled" | "active" | "expired" | "paused" | "fulfilled";
    title: string;
    description: string;
    destination: string;
    userId: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    viewCount: number;
    isFlexibleDates: boolean;
    currentGroupSize: number;
    maxGroupSize: number;
    applicationCount: number;
} | null>>;
/**
 * List user's own partner requests
 */
export declare const listMyRequests: import("convex/server").RegisteredQuery<"public", {
    status?: "cancelled" | "active" | "expired" | "paused" | "fulfilled" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        cityName: string | undefined;
        applicationsCount: number;
        pendingApplicationsCount: number;
        _id: import("convex/values").GenericId<"travelPartnerRequests">;
        _creationTime: number;
        imageUrls?: string[] | undefined;
        coverImageUrl?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        expiresAt?: number | undefined;
        estimatedBudget?: number | undefined;
        travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
        destinationCityId?: import("convex/values").GenericId<"cities"> | undefined;
        preferredGender?: "any" | "other" | "male" | "female" | undefined;
        preferredAgeRange?: ("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined;
        budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
        status: "cancelled" | "active" | "expired" | "paused" | "fulfilled";
        title: string;
        description: string;
        destination: string;
        userId: string;
        startDate: string;
        endDate: string;
        createdAt: number;
        updatedAt: number;
        viewCount: number;
        isFlexibleDates: boolean;
        currentGroupSize: number;
        maxGroupSize: number;
        applicationCount: number;
    }[];
    total: number;
}>>;
/**
 * Create a new partner request
 */
export declare const createRequest: import("convex/server").RegisteredMutation<"public", {
    imageUrls?: string[] | undefined;
    coverImageUrl?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    estimatedBudget?: number | undefined;
    travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
    destinationCityId?: import("convex/values").GenericId<"cities"> | undefined;
    isFlexibleDates?: boolean | undefined;
    currentGroupSize?: number | undefined;
    preferredGender?: "any" | "other" | "male" | "female" | undefined;
    preferredAgeRange?: ("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined;
    budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
    title: string;
    description: string;
    destination: string;
    userId: string;
    startDate: string;
    endDate: string;
    maxGroupSize: number;
}, Promise<import("convex/values").GenericId<"travelPartnerRequests">>>;
/**
 * Update a partner request
 */
export declare const updateRequest: import("convex/server").RegisteredMutation<"public", {
    status?: "cancelled" | "active" | "expired" | "paused" | "fulfilled" | undefined;
    title?: string | undefined;
    description?: string | undefined;
    destination?: string | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    imageUrls?: string[] | undefined;
    coverImageUrl?: string | undefined;
    estimatedBudget?: number | undefined;
    travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
    destinationCityId?: import("convex/values").GenericId<"cities"> | undefined;
    isFlexibleDates?: boolean | undefined;
    maxGroupSize?: number | undefined;
    preferredGender?: "any" | "other" | "male" | "female" | undefined;
    preferredAgeRange?: ("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined;
    budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
    id: import("convex/values").GenericId<"travelPartnerRequests">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"travelPartnerRequests">;
    _creationTime: number;
    imageUrls?: string[] | undefined;
    coverImageUrl?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    expiresAt?: number | undefined;
    estimatedBudget?: number | undefined;
    travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
    destinationCityId?: import("convex/values").GenericId<"cities"> | undefined;
    preferredGender?: "any" | "other" | "male" | "female" | undefined;
    preferredAgeRange?: ("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined;
    budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
    status: "cancelled" | "active" | "expired" | "paused" | "fulfilled";
    title: string;
    description: string;
    destination: string;
    userId: string;
    startDate: string;
    endDate: string;
    createdAt: number;
    updatedAt: number;
    viewCount: number;
    isFlexibleDates: boolean;
    currentGroupSize: number;
    maxGroupSize: number;
    applicationCount: number;
} | null>>;
/**
 * Delete a partner request
 */
export declare const deleteRequest: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"travelPartnerRequests">;
    userId: string;
}, Promise<void>>;
/**
 * Increment view count for a request
 */
export declare const incrementViewCount: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"travelPartnerRequests">;
}, Promise<void>>;
/**
 * Apply to a partner request
 */
export declare const applyToRequest: import("convex/server").RegisteredMutation<"public", {
    message: string;
    requestId: import("convex/values").GenericId<"travelPartnerRequests">;
    applicantId: string;
}, Promise<import("convex/values").GenericId<"partnerMatchApplications">>>;
/**
 * List applications for a request (for request owner)
 */
export declare const listApplications: import("convex/server").RegisteredQuery<"public", {
    status?: "rejected" | "pending" | "expired" | "accepted" | "withdrawn" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
    requestId: import("convex/values").GenericId<"travelPartnerRequests">;
}, Promise<{
    data: {
        applicant: {
            id: string;
            displayName: string | undefined;
            avatarUrl: string | undefined;
            bio: string | undefined;
            trustScore: number;
            badges: ("verified_identity" | "trusted_traveler" | "super_host" | "responsive" | "experienced" | "top_rated")[];
            verifications: {
                _id: import("convex/values").GenericId<"userVerifications">;
                _creationTime: number;
                reviewedBy?: string | undefined;
                verifiedAt?: number | undefined;
                expiresAt?: number | undefined;
                verificationData?: string | undefined;
                verificationMethod?: string | undefined;
                socialPlatform?: string | undefined;
                socialId?: string | undefined;
                referenceUserId?: string | undefined;
                referenceNote?: string | undefined;
                adminNotes?: string | undefined;
                status: "rejected" | "pending" | "expired" | "verified";
                userId: string;
                createdAt: number;
                updatedAt: number;
                verificationType: "email" | "phone" | "identity" | "social" | "travel_history" | "reference";
            }[];
            preferences: {
                _id: import("convex/values").GenericId<"userTravelPreferences">;
                _creationTime: number;
                bio?: string | undefined;
                ageRange?: "18-25" | "26-35" | "36-45" | "46-55" | "55+" | undefined;
                languages?: string[] | undefined;
                travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
                preferredPace?: "moderate" | "slow" | "fast" | undefined;
                gender?: "other" | "male" | "female" | undefined;
                preferredPartnerGender?: "any" | "other" | "male" | "female" | undefined;
                interests?: string[] | undefined;
                smokingPreference?: "smoker" | "non_smoker" | "no_preference" | undefined;
                accommodationPreference?: "luxury" | "no_preference" | "hostel" | "budget_hotel" | "mid_range" | undefined;
                userId: string;
                createdAt: number;
                updatedAt: number;
            } | null;
        } | null;
        _id: import("convex/values").GenericId<"partnerMatchApplications">;
        _creationTime: number;
        matchScore?: number | undefined;
        matchFactors?: {
            styleMatch?: number | undefined;
            ageMatch?: number | undefined;
            budgetMatch?: number | undefined;
            languageMatch?: number | undefined;
            interestMatch?: number | undefined;
        } | undefined;
        responseMessage?: string | undefined;
        respondedAt?: number | undefined;
        message: string;
        status: "rejected" | "pending" | "expired" | "accepted" | "withdrawn";
        createdAt: number;
        updatedAt: number;
        requestId: import("convex/values").GenericId<"travelPartnerRequests">;
        applicantId: string;
        requestOwnerId: string;
    }[];
    total: number;
}>>;
/**
 * List user's own applications
 */
export declare const listMyApplications: import("convex/server").RegisteredQuery<"public", {
    status?: "rejected" | "pending" | "expired" | "accepted" | "withdrawn" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        request: {
            id: import("convex/values").GenericId<"travelPartnerRequests">;
            title: string;
            destination: string;
            cityName: string | undefined;
            startDate: string;
            endDate: string;
            status: "cancelled" | "active" | "expired" | "paused" | "fulfilled";
        } | null;
        _id: import("convex/values").GenericId<"partnerMatchApplications">;
        _creationTime: number;
        matchScore?: number | undefined;
        matchFactors?: {
            styleMatch?: number | undefined;
            ageMatch?: number | undefined;
            budgetMatch?: number | undefined;
            languageMatch?: number | undefined;
            interestMatch?: number | undefined;
        } | undefined;
        responseMessage?: string | undefined;
        respondedAt?: number | undefined;
        message: string;
        status: "rejected" | "pending" | "expired" | "accepted" | "withdrawn";
        createdAt: number;
        updatedAt: number;
        requestId: import("convex/values").GenericId<"travelPartnerRequests">;
        applicantId: string;
        requestOwnerId: string;
    }[];
    total: number;
}>>;
/**
 * Accept an application
 */
export declare const acceptApplication: import("convex/server").RegisteredMutation<"public", {
    responseMessage?: string | undefined;
    userId: string;
    applicationId: import("convex/values").GenericId<"partnerMatchApplications">;
}, Promise<import("convex/values").GenericId<"partnerMatches">>>;
/**
 * Reject an application
 */
export declare const rejectApplication: import("convex/server").RegisteredMutation<"public", {
    responseMessage?: string | undefined;
    userId: string;
    applicationId: import("convex/values").GenericId<"partnerMatchApplications">;
}, Promise<void>>;
/**
 * Withdraw an application
 */
export declare const withdrawApplication: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    applicationId: import("convex/values").GenericId<"partnerMatchApplications">;
}, Promise<void>>;
/**
 * List user's matches (as owner or partner)
 */
export declare const listMatches: import("convex/server").RegisteredQuery<"public", {
    status?: "cancelled" | "completed" | "active" | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: ({
        otherUser: {
            id: string;
            displayName: string | undefined;
            avatarUrl: string | undefined;
        } | null;
        request: {
            title: string;
            coverImageUrl: string | undefined;
        } | null;
        userRole: "owner";
        _id: import("convex/values").GenericId<"partnerMatches">;
        _creationTime: number;
        conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
        ownerFeedback?: {
            review?: string | undefined;
            createdAt: number;
            rating: number;
            wouldTravelAgain: boolean;
        } | undefined;
        partnerFeedback?: {
            review?: string | undefined;
            createdAt: number;
            rating: number;
            wouldTravelAgain: boolean;
        } | undefined;
        status: "cancelled" | "completed" | "active";
        destination: string;
        startDate: string;
        endDate: string;
        createdAt: number;
        updatedAt: number;
        requestId: import("convex/values").GenericId<"travelPartnerRequests">;
        requestOwnerId: string;
        matchScore: number;
        applicationId: import("convex/values").GenericId<"partnerMatchApplications">;
        partnerId: string;
        matchedAt: number;
    } | {
        otherUser: {
            id: string;
            displayName: string | undefined;
            avatarUrl: string | undefined;
        } | null;
        request: {
            title: string;
            coverImageUrl: string | undefined;
        } | null;
        userRole: "partner";
        _id: import("convex/values").GenericId<"partnerMatches">;
        _creationTime: number;
        conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
        ownerFeedback?: {
            review?: string | undefined;
            createdAt: number;
            rating: number;
            wouldTravelAgain: boolean;
        } | undefined;
        partnerFeedback?: {
            review?: string | undefined;
            createdAt: number;
            rating: number;
            wouldTravelAgain: boolean;
        } | undefined;
        status: "cancelled" | "completed" | "active";
        destination: string;
        startDate: string;
        endDate: string;
        createdAt: number;
        updatedAt: number;
        requestId: import("convex/values").GenericId<"travelPartnerRequests">;
        requestOwnerId: string;
        matchScore: number;
        applicationId: import("convex/values").GenericId<"partnerMatchApplications">;
        partnerId: string;
        matchedAt: number;
    })[];
    total: number;
}>>;
/**
 * Submit feedback for a match
 */
export declare const submitMatchFeedback: import("convex/server").RegisteredMutation<"public", {
    review?: string | undefined;
    userId: string;
    rating: number;
    wouldTravelAgain: boolean;
    matchId: import("convex/values").GenericId<"partnerMatches">;
}, Promise<void>>;
/**
 * Save/unsave a partner request
 */
export declare const toggleSaveRequest: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    requestId: import("convex/values").GenericId<"travelPartnerRequests">;
}, Promise<{
    saved: boolean;
}>>;
/**
 * List user's saved requests
 */
export declare const listSavedRequests: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        request: {
            cityName: string | undefined;
            user: {
                displayName: string | undefined;
                avatarUrl: string | undefined;
            } | null;
            _id: import("convex/values").GenericId<"travelPartnerRequests">;
            _creationTime: number;
            imageUrls?: string[] | undefined;
            coverImageUrl?: string | undefined;
            itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
            expiresAt?: number | undefined;
            estimatedBudget?: number | undefined;
            travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
            destinationCityId?: import("convex/values").GenericId<"cities"> | undefined;
            preferredGender?: "any" | "other" | "male" | "female" | undefined;
            preferredAgeRange?: ("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined;
            budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
            status: "cancelled" | "active" | "expired" | "paused" | "fulfilled";
            title: string;
            description: string;
            destination: string;
            userId: string;
            startDate: string;
            endDate: string;
            createdAt: number;
            updatedAt: number;
            viewCount: number;
            isFlexibleDates: boolean;
            currentGroupSize: number;
            maxGroupSize: number;
            applicationCount: number;
        };
        _id: import("convex/values").GenericId<"partnerRequestSaves">;
        _creationTime: number;
        userId: string;
        createdAt: number;
        requestId: import("convex/values").GenericId<"travelPartnerRequests">;
    }[];
    total: number;
}>>;
/**
 * Check if a request is saved by user
 */
export declare const isRequestSaved: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    requestId: import("convex/values").GenericId<"travelPartnerRequests">;
}, Promise<boolean>>;
/**
 * Get user's verifications
 */
export declare const getUserVerifications: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"userVerifications">;
    _creationTime: number;
    reviewedBy?: string | undefined;
    verifiedAt?: number | undefined;
    expiresAt?: number | undefined;
    verificationData?: string | undefined;
    verificationMethod?: string | undefined;
    socialPlatform?: string | undefined;
    socialId?: string | undefined;
    referenceUserId?: string | undefined;
    referenceNote?: string | undefined;
    adminNotes?: string | undefined;
    status: "rejected" | "pending" | "expired" | "verified";
    userId: string;
    createdAt: number;
    updatedAt: number;
    verificationType: "email" | "phone" | "identity" | "social" | "travel_history" | "reference";
}[]>>;
/**
 * Submit a verification request
 */
export declare const submitVerification: import("convex/server").RegisteredMutation<"public", {
    verificationData?: string | undefined;
    verificationMethod?: string | undefined;
    socialPlatform?: string | undefined;
    socialId?: string | undefined;
    referenceUserId?: string | undefined;
    referenceNote?: string | undefined;
    userId: string;
    verificationType: "email" | "phone" | "identity" | "social" | "travel_history" | "reference";
}, Promise<import("convex/values").GenericId<"userVerifications">>>;
/**
 * Get user's trust score
 */
export declare const getUserTrustScore: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"userTrustScores">;
    _creationTime: number;
    averageRating?: number | undefined;
    badges?: ("verified_identity" | "trusted_traveler" | "super_host" | "responsive" | "experienced" | "top_rated")[] | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    totalTrips: number;
    lastCalculatedAt: number;
    overallScore: number;
    verificationScore: number;
    activityScore: number;
    feedbackScore: number;
    responseScore: number;
    successfulMatches: number;
    cancelledMatches: number;
    totalRatings: number;
} | null>>;
