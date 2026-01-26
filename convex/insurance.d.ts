export declare const listProducts: import("convex/server").RegisteredQuery<"public", {
    type?: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation" | undefined;
    limit?: number | undefined;
    domesticOnly?: boolean | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"insuranceProducts">;
    _creationTime: number;
    nameEn?: string | undefined;
    rating?: number | undefined;
    providerLogo?: string | undefined;
    exclusions?: string[] | undefined;
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
    createdAt: number;
    name: string;
    type: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation";
    priority: number;
    provider: string;
    updatedAt: number;
    purchaseUrl: string;
    isActive: boolean;
    coverageAmount: number;
    coverageDetails: {
        description?: string | undefined;
        item: string;
        amount: number;
    }[];
    pricePerDay: number;
    minDays: number;
    maxDays: number;
    applicableRegions: string[];
    domesticOnly: boolean;
    riskLevelCoverage: ("low" | "medium" | "high" | "extreme")[];
    features: string[];
    reviewCount: number;
}[]>>;
export declare const getProductById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"insuranceProducts">;
}, Promise<{
    _id: import("convex/values").GenericId<"insuranceProducts">;
    _creationTime: number;
    nameEn?: string | undefined;
    rating?: number | undefined;
    providerLogo?: string | undefined;
    exclusions?: string[] | undefined;
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
    createdAt: number;
    name: string;
    type: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation";
    priority: number;
    provider: string;
    updatedAt: number;
    purchaseUrl: string;
    isActive: boolean;
    coverageAmount: number;
    coverageDetails: {
        description?: string | undefined;
        item: string;
        amount: number;
    }[];
    pricePerDay: number;
    minDays: number;
    maxDays: number;
    applicableRegions: string[];
    domesticOnly: boolean;
    riskLevelCoverage: ("low" | "medium" | "high" | "extreme")[];
    features: string[];
    reviewCount: number;
} | null>>;
export declare const getRecommendedProducts: import("convex/server").RegisteredQuery<"public", {
    riskLevel?: "low" | "medium" | "high" | "extreme" | undefined;
    destination: string;
    tripDays: number;
}, Promise<{
    products: {
        _id: import("convex/values").GenericId<"insuranceProducts">;
        _creationTime: number;
        nameEn?: string | undefined;
        rating?: number | undefined;
        providerLogo?: string | undefined;
        exclusions?: string[] | undefined;
        contactPhone?: string | undefined;
        contactEmail?: string | undefined;
        createdAt: number;
        name: string;
        type: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation";
        priority: number;
        provider: string;
        updatedAt: number;
        purchaseUrl: string;
        isActive: boolean;
        coverageAmount: number;
        coverageDetails: {
            description?: string | undefined;
            item: string;
            amount: number;
        }[];
        pricePerDay: number;
        minDays: number;
        maxDays: number;
        applicableRegions: string[];
        domesticOnly: boolean;
        riskLevelCoverage: ("low" | "medium" | "high" | "extreme")[];
        features: string[];
        reviewCount: number;
    }[];
    riskProfile: {
        _id: import("convex/values").GenericId<"destinationRiskProfiles">;
        _creationTime: number;
        destinationCode?: string | undefined;
        travelAdvisory?: string | undefined;
        destination: string;
        lastUpdated: number;
        riskLevel: "low" | "medium" | "high" | "extreme";
        riskFactors: string[];
        recommendedInsuranceTypes: ("comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation")[];
    } | null;
    effectiveRiskLevel: "low" | "medium" | "high" | "extreme";
    recommendedTypes: ("comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation")[];
}>>;
export declare const compareProducts: import("convex/server").RegisteredQuery<"public", {
    productIds: import("convex/values").GenericId<"insuranceProducts">[];
}, Promise<{
    _id: import("convex/values").GenericId<"insuranceProducts">;
    _creationTime: number;
    nameEn?: string | undefined;
    rating?: number | undefined;
    providerLogo?: string | undefined;
    exclusions?: string[] | undefined;
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
    createdAt: number;
    name: string;
    type: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation";
    priority: number;
    provider: string;
    updatedAt: number;
    purchaseUrl: string;
    isActive: boolean;
    coverageAmount: number;
    coverageDetails: {
        description?: string | undefined;
        item: string;
        amount: number;
    }[];
    pricePerDay: number;
    minDays: number;
    maxDays: number;
    applicableRegions: string[];
    domesticOnly: boolean;
    riskLevelCoverage: ("low" | "medium" | "high" | "extreme")[];
    features: string[];
    reviewCount: number;
}[]>>;
export declare const listUserInsurance: import("convex/server").RegisteredQuery<"public", {
    status?: "cancelled" | "pending" | "active" | "expired" | "claimed" | undefined;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"userInsurance">;
    _creationTime: number;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    orderNumber?: string | undefined;
    policyNumber?: string | undefined;
    claimHistory?: {
        notes?: string | undefined;
        status: "approved" | "rejected" | "processing" | "paid" | "submitted";
        claimId: string;
        claimDate: number;
        claimType: string;
        claimAmount: number;
    }[] | undefined;
    status: "cancelled" | "pending" | "active" | "expired" | "claimed";
    createdAt: number;
    destinations: string[];
    userId: string;
    startDate: string;
    endDate: string;
    updatedAt: number;
    totalPrice: number;
    productId: import("convex/values").GenericId<"insuranceProducts">;
    coverageDays: number;
    insuredPersons: {
        phone?: string | undefined;
        name: string;
        idType: "other" | "id_card" | "passport";
        idNumber: string;
        relationship: "other" | "child" | "self" | "spouse" | "parent";
    }[];
    paymentStatus: "failed" | "pending" | "paid" | "refunded";
    purchasedAt: number;
}[]>>;
export declare const getUserInsuranceById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"userInsurance">;
}, Promise<{
    product: {
        _id: import("convex/values").GenericId<"insuranceProducts">;
        _creationTime: number;
        nameEn?: string | undefined;
        rating?: number | undefined;
        providerLogo?: string | undefined;
        exclusions?: string[] | undefined;
        contactPhone?: string | undefined;
        contactEmail?: string | undefined;
        createdAt: number;
        name: string;
        type: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation";
        priority: number;
        provider: string;
        updatedAt: number;
        purchaseUrl: string;
        isActive: boolean;
        coverageAmount: number;
        coverageDetails: {
            description?: string | undefined;
            item: string;
            amount: number;
        }[];
        pricePerDay: number;
        minDays: number;
        maxDays: number;
        applicableRegions: string[];
        domesticOnly: boolean;
        riskLevelCoverage: ("low" | "medium" | "high" | "extreme")[];
        features: string[];
        reviewCount: number;
    } | null;
    _id: import("convex/values").GenericId<"userInsurance">;
    _creationTime: number;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    orderNumber?: string | undefined;
    policyNumber?: string | undefined;
    claimHistory?: {
        notes?: string | undefined;
        status: "approved" | "rejected" | "processing" | "paid" | "submitted";
        claimId: string;
        claimDate: number;
        claimType: string;
        claimAmount: number;
    }[] | undefined;
    status: "cancelled" | "pending" | "active" | "expired" | "claimed";
    createdAt: number;
    destinations: string[];
    userId: string;
    startDate: string;
    endDate: string;
    updatedAt: number;
    totalPrice: number;
    productId: import("convex/values").GenericId<"insuranceProducts">;
    coverageDays: number;
    insuredPersons: {
        phone?: string | undefined;
        name: string;
        idType: "other" | "id_card" | "passport";
        idNumber: string;
        relationship: "other" | "child" | "self" | "spouse" | "parent";
    }[];
    paymentStatus: "failed" | "pending" | "paid" | "refunded";
    purchasedAt: number;
} | null>>;
export declare const getInsuranceByItinerary: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    product: {
        _id: import("convex/values").GenericId<"insuranceProducts">;
        _creationTime: number;
        nameEn?: string | undefined;
        rating?: number | undefined;
        providerLogo?: string | undefined;
        exclusions?: string[] | undefined;
        contactPhone?: string | undefined;
        contactEmail?: string | undefined;
        createdAt: number;
        name: string;
        type: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation";
        priority: number;
        provider: string;
        updatedAt: number;
        purchaseUrl: string;
        isActive: boolean;
        coverageAmount: number;
        coverageDetails: {
            description?: string | undefined;
            item: string;
            amount: number;
        }[];
        pricePerDay: number;
        minDays: number;
        maxDays: number;
        applicableRegions: string[];
        domesticOnly: boolean;
        riskLevelCoverage: ("low" | "medium" | "high" | "extreme")[];
        features: string[];
        reviewCount: number;
    } | null;
    _id: import("convex/values").GenericId<"userInsurance">;
    _creationTime: number;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    orderNumber?: string | undefined;
    policyNumber?: string | undefined;
    claimHistory?: {
        notes?: string | undefined;
        status: "approved" | "rejected" | "processing" | "paid" | "submitted";
        claimId: string;
        claimDate: number;
        claimType: string;
        claimAmount: number;
    }[] | undefined;
    status: "cancelled" | "pending" | "active" | "expired" | "claimed";
    createdAt: number;
    destinations: string[];
    userId: string;
    startDate: string;
    endDate: string;
    updatedAt: number;
    totalPrice: number;
    productId: import("convex/values").GenericId<"insuranceProducts">;
    coverageDays: number;
    insuredPersons: {
        phone?: string | undefined;
        name: string;
        idType: "other" | "id_card" | "passport";
        idNumber: string;
        relationship: "other" | "child" | "self" | "spouse" | "parent";
    }[];
    paymentStatus: "failed" | "pending" | "paid" | "refunded";
    purchasedAt: number;
}[]>>;
export declare const createUserInsurance: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    destinations: string[];
    userId: string;
    startDate: string;
    endDate: string;
    totalPrice: number;
    productId: import("convex/values").GenericId<"insuranceProducts">;
    coverageDays: number;
    insuredPersons: {
        phone?: string | undefined;
        name: string;
        idType: "other" | "id_card" | "passport";
        idNumber: string;
        relationship: "other" | "child" | "self" | "spouse" | "parent";
    }[];
}, Promise<import("convex/values").GenericId<"userInsurance">>>;
export declare const updateUserInsuranceStatus: import("convex/server").RegisteredMutation<"public", {
    orderNumber?: string | undefined;
    policyNumber?: string | undefined;
    paymentStatus?: "failed" | "pending" | "paid" | "refunded" | undefined;
    status: "cancelled" | "pending" | "active" | "expired" | "claimed";
    id: import("convex/values").GenericId<"userInsurance">;
}, Promise<{
    _id: import("convex/values").GenericId<"userInsurance">;
    _creationTime: number;
    notes?: string | undefined;
    itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
    orderNumber?: string | undefined;
    policyNumber?: string | undefined;
    claimHistory?: {
        notes?: string | undefined;
        status: "approved" | "rejected" | "processing" | "paid" | "submitted";
        claimId: string;
        claimDate: number;
        claimType: string;
        claimAmount: number;
    }[] | undefined;
    status: "cancelled" | "pending" | "active" | "expired" | "claimed";
    createdAt: number;
    destinations: string[];
    userId: string;
    startDate: string;
    endDate: string;
    updatedAt: number;
    totalPrice: number;
    productId: import("convex/values").GenericId<"insuranceProducts">;
    coverageDays: number;
    insuredPersons: {
        phone?: string | undefined;
        name: string;
        idType: "other" | "id_card" | "passport";
        idNumber: string;
        relationship: "other" | "child" | "self" | "spouse" | "parent";
    }[];
    paymentStatus: "failed" | "pending" | "paid" | "refunded";
    purchasedAt: number;
} | null>>;
export declare const addInsuranceClaim: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    claimType: string;
    claimAmount: number;
    insuranceId: import("convex/values").GenericId<"userInsurance">;
}, Promise<{
    claimId: string;
    claimDate: number;
    claimType: string;
    claimAmount: number;
    status: "submitted";
    notes: string | undefined;
}>>;
export declare const getDestinationRiskProfile: import("convex/server").RegisteredQuery<"public", {
    destination?: string | undefined;
    destinationCode?: string | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"destinationRiskProfiles">;
    _creationTime: number;
    destinationCode?: string | undefined;
    travelAdvisory?: string | undefined;
    destination: string;
    lastUpdated: number;
    riskLevel: "low" | "medium" | "high" | "extreme";
    riskFactors: string[];
    recommendedInsuranceTypes: ("comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation")[];
} | null>>;
export declare const listDestinationsByRiskLevel: import("convex/server").RegisteredQuery<"public", {
    riskLevel: "low" | "medium" | "high" | "extreme";
}, Promise<{
    _id: import("convex/values").GenericId<"destinationRiskProfiles">;
    _creationTime: number;
    destinationCode?: string | undefined;
    travelAdvisory?: string | undefined;
    destination: string;
    lastUpdated: number;
    riskLevel: "low" | "medium" | "high" | "extreme";
    riskFactors: string[];
    recommendedInsuranceTypes: ("comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation")[];
}[]>>;
export declare const listClaimGuides: import("convex/server").RegisteredQuery<"public", {
    claimType?: "other" | "medical" | "accident" | "flight_delay" | "emergency_evacuation" | "luggage_loss" | "trip_cancellation" | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"insuranceClaimGuides">;
    _creationTime: number;
    timeLimit?: string | undefined;
    contactInfo?: {
        email?: string | undefined;
        phone?: string | undefined;
        website?: string | undefined;
    } | undefined;
    faqs?: {
        question: string;
        answer: string;
    }[] | undefined;
    content: string;
    createdAt: number;
    title: string;
    priority: number;
    steps: {
        tips?: string | undefined;
        requiredDocuments?: string[] | undefined;
        description: string;
        title: string;
        stepNumber: number;
    }[];
    updatedAt: number;
    isActive: boolean;
    claimType: "other" | "medical" | "accident" | "flight_delay" | "emergency_evacuation" | "luggage_loss" | "trip_cancellation";
    requiredDocuments: string[];
}[]>>;
export declare const getClaimGuideById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"insuranceClaimGuides">;
}, Promise<{
    _id: import("convex/values").GenericId<"insuranceClaimGuides">;
    _creationTime: number;
    timeLimit?: string | undefined;
    contactInfo?: {
        email?: string | undefined;
        phone?: string | undefined;
        website?: string | undefined;
    } | undefined;
    faqs?: {
        question: string;
        answer: string;
    }[] | undefined;
    content: string;
    createdAt: number;
    title: string;
    priority: number;
    steps: {
        tips?: string | undefined;
        requiredDocuments?: string[] | undefined;
        description: string;
        title: string;
        stepNumber: number;
    }[];
    updatedAt: number;
    isActive: boolean;
    claimType: "other" | "medical" | "accident" | "flight_delay" | "emergency_evacuation" | "luggage_loss" | "trip_cancellation";
    requiredDocuments: string[];
} | null>>;
export declare const createProduct: import("convex/server").RegisteredMutation<"public", {
    nameEn?: string | undefined;
    rating?: number | undefined;
    providerLogo?: string | undefined;
    exclusions?: string[] | undefined;
    contactPhone?: string | undefined;
    contactEmail?: string | undefined;
    name: string;
    type: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation";
    priority: number;
    provider: string;
    purchaseUrl: string;
    isActive: boolean;
    coverageAmount: number;
    coverageDetails: {
        description?: string | undefined;
        item: string;
        amount: number;
    }[];
    pricePerDay: number;
    minDays: number;
    maxDays: number;
    applicableRegions: string[];
    domesticOnly: boolean;
    riskLevelCoverage: ("low" | "medium" | "high" | "extreme")[];
    features: string[];
    reviewCount: number;
}, Promise<import("convex/values").GenericId<"insuranceProducts">>>;
export declare const createDestinationRiskProfile: import("convex/server").RegisteredMutation<"public", {
    destinationCode?: string | undefined;
    travelAdvisory?: string | undefined;
    destination: string;
    riskLevel: "low" | "medium" | "high" | "extreme";
    riskFactors: string[];
    recommendedInsuranceTypes: ("comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation")[];
}, Promise<import("convex/values").GenericId<"destinationRiskProfiles">>>;
export declare const createClaimGuide: import("convex/server").RegisteredMutation<"public", {
    timeLimit?: string | undefined;
    contactInfo?: {
        email?: string | undefined;
        phone?: string | undefined;
        website?: string | undefined;
    } | undefined;
    faqs?: {
        question: string;
        answer: string;
    }[] | undefined;
    content: string;
    title: string;
    priority: number;
    steps: {
        tips?: string | undefined;
        requiredDocuments?: string[] | undefined;
        description: string;
        title: string;
        stepNumber: number;
    }[];
    isActive: boolean;
    claimType: "other" | "medical" | "accident" | "flight_delay" | "emergency_evacuation" | "luggage_loss" | "trip_cancellation";
    requiredDocuments: string[];
}, Promise<import("convex/values").GenericId<"insuranceClaimGuides">>>;
