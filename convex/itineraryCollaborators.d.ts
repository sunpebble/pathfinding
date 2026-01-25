export declare const listCollaborators: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryCollaborators">;
    _creationTime: number;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    role: "owner" | "editor" | "viewer";
}[]>>;
export declare const getCollaborator: import("convex/server").RegisteredQuery<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryCollaborators">;
    _creationTime: number;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    role: "owner" | "editor" | "viewer";
} | null>>;
export declare const listByUser: import("convex/server").RegisteredQuery<"public", {
    userId: string;
}, Promise<{
    itinerary: {
        cityName: string | undefined;
        _id: import("convex/values").GenericId<"itineraries">;
        _creationTime: number;
        coverImageUrl?: string | undefined;
        copiedFromId?: import("convex/values").GenericId<"itineraries"> | undefined;
        title: string;
        userId: string;
        startDate: string;
        endDate: string;
        visibility: "public" | "private" | "team";
        cityId: import("convex/values").GenericId<"cities">;
    };
    _id: import("convex/values").GenericId<"itineraryCollaborators">;
    _creationTime: number;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    role: "owner" | "editor" | "viewer";
}[]>>;
export declare const inviteCollaborator: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    role: "owner" | "editor" | "viewer";
    invitedBy: string;
}, Promise<import("convex/values").GenericId<"itineraryCollaborators">>>;
export declare const acceptInvite: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<import("convex/values").GenericId<"itineraryCollaborators">>>;
export declare const rejectInvite: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    success: boolean;
}>>;
export declare const removeCollaborator: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    removedBy: string;
}, Promise<{
    success: boolean;
}>>;
export declare const updateRole: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    newRole: "owner" | "editor" | "viewer";
    updatedBy: string;
}, Promise<{
    success: boolean;
}>>;
