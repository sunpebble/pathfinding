/**
 * Emergency Contacts - Personal emergency contact management
 * Allows users to store and manage their emergency contacts
 */
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyContacts">;
    _creationTime: number;
    email?: string | undefined;
    notes?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    relationship: string;
    phoneNumber: string;
    isPrimary: boolean;
    notifyOnSos: boolean;
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"emergencyContacts">;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyContacts">;
    _creationTime: number;
    email?: string | undefined;
    notes?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    relationship: string;
    phoneNumber: string;
    isPrimary: boolean;
    notifyOnSos: boolean;
} | null>>;
export declare const getPrimary: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyContacts">;
    _creationTime: number;
    email?: string | undefined;
    notes?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    relationship: string;
    phoneNumber: string;
    isPrimary: boolean;
    notifyOnSos: boolean;
} | null>>;
export declare const getSosContacts: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyContacts">;
    _creationTime: number;
    email?: string | undefined;
    notes?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    relationship: string;
    phoneNumber: string;
    isPrimary: boolean;
    notifyOnSos: boolean;
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    email?: string | undefined;
    notes?: string | undefined;
    name: string;
    userId: string;
    relationship: string;
    phoneNumber: string;
    isPrimary: boolean;
    notifyOnSos: boolean;
}, Promise<import("convex/values").GenericId<"emergencyContacts">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    email?: string | undefined;
    name?: string | undefined;
    notes?: string | undefined;
    relationship?: string | undefined;
    phoneNumber?: string | undefined;
    isPrimary?: boolean | undefined;
    notifyOnSos?: boolean | undefined;
    id: import("convex/values").GenericId<"emergencyContacts">;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyContacts">;
    _creationTime: number;
    email?: string | undefined;
    notes?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    relationship: string;
    phoneNumber: string;
    isPrimary: boolean;
    notifyOnSos: boolean;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"emergencyContacts">;
}, Promise<void>>;
export declare const setPrimary: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"emergencyContacts">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"emergencyContacts">;
    _creationTime: number;
    email?: string | undefined;
    notes?: string | undefined;
    name: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    relationship: string;
    phoneNumber: string;
    isPrimary: boolean;
    notifyOnSos: boolean;
} | null>>;
