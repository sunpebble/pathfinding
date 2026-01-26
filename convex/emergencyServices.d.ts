/**
 * Emergency Services - Country/city emergency numbers and embassy info
 * Provides destination-specific emergency service information
 */
export declare const getByCountry: import("convex/server").RegisteredQuery<"public", {
    countryCode: string;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyServices">;
    _creationTime: number;
    notes?: string | undefined;
    cityName?: string | undefined;
    countryNameEn?: string | undefined;
    generalEmergencyNumber?: string | undefined;
    embassyPhone?: string | undefined;
    embassyAddress?: string | undefined;
    embassyWebsite?: string | undefined;
    consulateInfo?: {
        address?: string | undefined;
        city: string;
        phone: string;
    }[] | undefined;
    touristPoliceNumber?: string | undefined;
    coastGuardNumber?: string | undefined;
    roadAssistanceNumber?: string | undefined;
    poisonControlNumber?: string | undefined;
    countryCode: string;
    ambulanceNumber: string;
    fireNumber: string;
    lastUpdated: number;
    countryName: string;
    policeNumber: string;
} | null>>;
export declare const getByCountryCity: import("convex/server").RegisteredQuery<"public", {
    cityName?: string | undefined;
    countryCode: string;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyServices">;
    _creationTime: number;
    notes?: string | undefined;
    cityName?: string | undefined;
    countryNameEn?: string | undefined;
    generalEmergencyNumber?: string | undefined;
    embassyPhone?: string | undefined;
    embassyAddress?: string | undefined;
    embassyWebsite?: string | undefined;
    consulateInfo?: {
        address?: string | undefined;
        city: string;
        phone: string;
    }[] | undefined;
    touristPoliceNumber?: string | undefined;
    coastGuardNumber?: string | undefined;
    roadAssistanceNumber?: string | undefined;
    poisonControlNumber?: string | undefined;
    countryCode: string;
    ambulanceNumber: string;
    fireNumber: string;
    lastUpdated: number;
    countryName: string;
    policeNumber: string;
} | null>>;
export declare const listCountries: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    countryCode: string;
    countryName: string;
    countryNameEn: string | undefined;
}[]>>;
export declare const searchByName: import("convex/server").RegisteredQuery<"public", {
    query: string;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyServices">;
    _creationTime: number;
    notes?: string | undefined;
    cityName?: string | undefined;
    countryNameEn?: string | undefined;
    generalEmergencyNumber?: string | undefined;
    embassyPhone?: string | undefined;
    embassyAddress?: string | undefined;
    embassyWebsite?: string | undefined;
    consulateInfo?: {
        address?: string | undefined;
        city: string;
        phone: string;
    }[] | undefined;
    touristPoliceNumber?: string | undefined;
    coastGuardNumber?: string | undefined;
    roadAssistanceNumber?: string | undefined;
    poisonControlNumber?: string | undefined;
    countryCode: string;
    ambulanceNumber: string;
    fireNumber: string;
    lastUpdated: number;
    countryName: string;
    policeNumber: string;
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    cityName?: string | undefined;
    countryNameEn?: string | undefined;
    generalEmergencyNumber?: string | undefined;
    embassyPhone?: string | undefined;
    embassyAddress?: string | undefined;
    embassyWebsite?: string | undefined;
    consulateInfo?: {
        address?: string | undefined;
        city: string;
        phone: string;
    }[] | undefined;
    touristPoliceNumber?: string | undefined;
    coastGuardNumber?: string | undefined;
    roadAssistanceNumber?: string | undefined;
    poisonControlNumber?: string | undefined;
    countryCode: string;
    ambulanceNumber: string;
    fireNumber: string;
    countryName: string;
    policeNumber: string;
}, Promise<import("convex/values").GenericId<"emergencyServices">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    ambulanceNumber?: string | undefined;
    fireNumber?: string | undefined;
    notes?: string | undefined;
    countryName?: string | undefined;
    countryNameEn?: string | undefined;
    policeNumber?: string | undefined;
    generalEmergencyNumber?: string | undefined;
    embassyPhone?: string | undefined;
    embassyAddress?: string | undefined;
    embassyWebsite?: string | undefined;
    consulateInfo?: {
        address?: string | undefined;
        city: string;
        phone: string;
    }[] | undefined;
    touristPoliceNumber?: string | undefined;
    coastGuardNumber?: string | undefined;
    roadAssistanceNumber?: string | undefined;
    poisonControlNumber?: string | undefined;
    id: import("convex/values").GenericId<"emergencyServices">;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyServices">;
    _creationTime: number;
    notes?: string | undefined;
    cityName?: string | undefined;
    countryNameEn?: string | undefined;
    generalEmergencyNumber?: string | undefined;
    embassyPhone?: string | undefined;
    embassyAddress?: string | undefined;
    embassyWebsite?: string | undefined;
    consulateInfo?: {
        address?: string | undefined;
        city: string;
        phone: string;
    }[] | undefined;
    touristPoliceNumber?: string | undefined;
    coastGuardNumber?: string | undefined;
    roadAssistanceNumber?: string | undefined;
    poisonControlNumber?: string | undefined;
    countryCode: string;
    ambulanceNumber: string;
    fireNumber: string;
    lastUpdated: number;
    countryName: string;
    policeNumber: string;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"emergencyServices">;
}, Promise<void>>;
export declare const seedCommonCountries: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    countryCode: string;
    id: import("convex/values").GenericId<"emergencyServices">;
    action: string;
}[]>>;
export declare const getEmergencyGuide: import("convex/server").RegisteredQuery<"public", {
    countryCode?: string | undefined;
    guideType: "general" | "medical" | "accident" | "natural_disaster" | "theft" | "assault" | "lost_passport";
}, Promise<{
    emergencyServices: {
        _id: import("convex/values").GenericId<"emergencyServices">;
        _creationTime: number;
        notes?: string | undefined;
        cityName?: string | undefined;
        countryNameEn?: string | undefined;
        generalEmergencyNumber?: string | undefined;
        embassyPhone?: string | undefined;
        embassyAddress?: string | undefined;
        embassyWebsite?: string | undefined;
        consulateInfo?: {
            address?: string | undefined;
            city: string;
            phone: string;
        }[] | undefined;
        touristPoliceNumber?: string | undefined;
        coastGuardNumber?: string | undefined;
        roadAssistanceNumber?: string | undefined;
        poisonControlNumber?: string | undefined;
        countryCode: string;
        ambulanceNumber: string;
        fireNumber: string;
        lastUpdated: number;
        countryName: string;
        policeNumber: string;
    } | null;
    title: string;
    titleEn: string;
    steps: string[];
    tips: string[];
}>>;
export declare const getComprehensiveEmergencyInfo: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    cityName?: string | undefined;
    countryCode: string;
}, Promise<{
    emergencyServices: {
        _id: import("convex/values").GenericId<"emergencyServices">;
        _creationTime: number;
        notes?: string | undefined;
        cityName?: string | undefined;
        countryNameEn?: string | undefined;
        generalEmergencyNumber?: string | undefined;
        embassyPhone?: string | undefined;
        embassyAddress?: string | undefined;
        embassyWebsite?: string | undefined;
        consulateInfo?: {
            address?: string | undefined;
            city: string;
            phone: string;
        }[] | undefined;
        touristPoliceNumber?: string | undefined;
        coastGuardNumber?: string | undefined;
        roadAssistanceNumber?: string | undefined;
        poisonControlNumber?: string | undefined;
        countryCode: string;
        ambulanceNumber: string;
        fireNumber: string;
        lastUpdated: number;
        countryName: string;
        policeNumber: string;
    } | null;
    emergencyContacts: {
        _id: string;
        name: string;
        phoneNumber: string;
        relationship: string;
        isPrimary: boolean;
    }[];
    activeInsurance: {
        _id: import("convex/values").GenericId<"travelInsurance">;
        _creationTime: number;
        email?: string | undefined;
        notes?: string | undefined;
        coverageAmount?: string | undefined;
        exclusions?: string | undefined;
        website?: string | undefined;
        claimsPhone?: string | undefined;
        medicalCoverage?: string | undefined;
        evacuationCoverage?: string | undefined;
        policyDocumentUrl?: string | undefined;
        insuranceCardUrl?: string | undefined;
        coveredRegions?: string[] | undefined;
        createdAt: number;
        userId: string;
        startDate: string;
        endDate: string;
        updatedAt: number;
        isActive: boolean;
        policyNumber: string;
        providerName: string;
        emergencyHotline: string;
        coverageType: string;
    } | null;
    quickActions: {
        id: string;
        label: string;
        labelEn: string;
        icon: string;
        number: string | null;
        color: string;
    }[];
}>>;
