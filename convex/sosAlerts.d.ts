/**
 * SOS Alerts - Emergency alert management
 * Handles SOS alerts sent by users during emergencies
 */
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"sosAlerts">;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
export declare const getActiveAlerts: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    message?: string | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    latitude: number;
    longitude: number;
    userId: string;
    alertType: "other" | "medical" | "emergency" | "safety";
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    status: "received" | "cancelled" | "resolved" | "sent";
    id: import("convex/values").GenericId<"sosAlerts">;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
export declare const resolve: import("convex/server").RegisteredMutation<"public", {
    resolvedBy?: string | undefined;
    id: import("convex/values").GenericId<"sosAlerts">;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
export declare const cancel: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"sosAlerts">;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
export declare const getWithContacts: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"sosAlerts">;
}, Promise<{
    contactDetails: ({
        id: import("convex/values").GenericId<"emergencyContacts">;
        name: string;
        phoneNumber: string;
        relationship: string;
    } | null)[];
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
export declare const getWithEmergencyInfo: import("convex/server").RegisteredQuery<"public", {
    countryCode?: string | undefined;
    id: import("convex/values").GenericId<"sosAlerts">;
}, Promise<{
    contactDetails: ({
        id: import("convex/values").GenericId<"emergencyContacts">;
        name: string;
        phoneNumber: string;
        email: string | undefined;
        relationship: string;
    } | null)[];
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
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
export declare const updateLocation: import("convex/server").RegisteredMutation<"public", {
    locationName?: string | undefined;
    accuracy?: number | undefined;
    id: import("convex/values").GenericId<"sosAlerts">;
    latitude: number;
    longitude: number;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
export declare const getRecentAlerts: import("convex/server").RegisteredQuery<"public", {
    status?: "received" | "cancelled" | "resolved" | "sent" | undefined;
    limit?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
}[]>>;
export declare const addMessage: import("convex/server").RegisteredMutation<"public", {
    message: string;
    id: import("convex/values").GenericId<"sosAlerts">;
}, Promise<{
    _id: import("convex/values").GenericId<"sosAlerts">;
    _creationTime: number;
    message?: string | undefined;
    resolvedBy?: string | undefined;
    resolvedAt?: number | undefined;
    locationName?: string | undefined;
    accuracy?: number | undefined;
    status: "received" | "cancelled" | "resolved" | "sent";
    latitude: number;
    longitude: number;
    userId: string;
    createdAt: number;
    alertType: "other" | "medical" | "emergency" | "safety";
    notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
} | null>>;
