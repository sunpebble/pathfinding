export declare const listMembers: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"tripMembers">;
    _creationTime: number;
    email?: string | undefined;
    userId?: string | undefined;
    avatarUrl?: string | undefined;
    createdAt: number;
    name: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    isOwner: boolean;
}[]>>;
export declare const addMember: import("convex/server").RegisteredMutation<"public", {
    email?: string | undefined;
    avatarUrl?: string | undefined;
    memberUserId?: string | undefined;
    name: string;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<import("convex/values").GenericId<"tripMembers">>>;
export declare const addOwnerAsMember: import("convex/server").RegisteredMutation<"public", {
    avatarUrl?: string | undefined;
    name: string;
    userId: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<import("convex/values").GenericId<"tripMembers">>>;
export declare const updateMember: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    email?: string | undefined;
    avatarUrl?: string | undefined;
    userId: string;
    memberId: import("convex/values").GenericId<"tripMembers">;
}, Promise<{
    _id: import("convex/values").GenericId<"tripMembers">;
    _creationTime: number;
    email?: string | undefined;
    userId?: string | undefined;
    avatarUrl?: string | undefined;
    createdAt: number;
    name: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    isOwner: boolean;
} | null>>;
export declare const removeMember: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    memberId: import("convex/values").GenericId<"tripMembers">;
}, Promise<void>>;
export declare const listExpenses: import("convex/server").RegisteredQuery<"public", {
    category?: "shopping" | "other" | "food" | "transport" | "accommodation" | "tickets" | undefined;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    payerName: string;
    participants: {
        memberName: string;
        _id: import("convex/values").GenericId<"expenseParticipants">;
        _creationTime: number;
        expenseId: import("convex/values").GenericId<"sharedExpenses">;
        memberId: import("convex/values").GenericId<"tripMembers">;
        splitValue: number;
        amountOwed: number;
    }[];
    _id: import("convex/values").GenericId<"sharedExpenses">;
    _creationTime: number;
    notes?: string | undefined;
    receiptImageUrl?: string | undefined;
    createdAt: number;
    description: string;
    date: string;
    updatedAt: number;
    category: "shopping" | "other" | "food" | "transport" | "accommodation" | "tickets";
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    amount: number;
    paidById: import("convex/values").GenericId<"tripMembers">;
    splitType: "exact" | "percentage" | "equal" | "shares";
}[]>>;
export declare const getExpense: import("convex/server").RegisteredQuery<"public", {
    expenseId: import("convex/values").GenericId<"sharedExpenses">;
}, Promise<{
    payerName: string;
    participants: {
        memberName: string;
        _id: import("convex/values").GenericId<"expenseParticipants">;
        _creationTime: number;
        expenseId: import("convex/values").GenericId<"sharedExpenses">;
        memberId: import("convex/values").GenericId<"tripMembers">;
        splitValue: number;
        amountOwed: number;
    }[];
    _id: import("convex/values").GenericId<"sharedExpenses">;
    _creationTime: number;
    notes?: string | undefined;
    receiptImageUrl?: string | undefined;
    createdAt: number;
    description: string;
    date: string;
    updatedAt: number;
    category: "shopping" | "other" | "food" | "transport" | "accommodation" | "tickets";
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    amount: number;
    paidById: import("convex/values").GenericId<"tripMembers">;
    splitType: "exact" | "percentage" | "equal" | "shares";
} | null>>;
export declare const addExpense: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    receiptImageUrl?: string | undefined;
    description: string;
    date: string;
    userId: string;
    category: "shopping" | "other" | "food" | "transport" | "accommodation" | "tickets";
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    amount: number;
    paidById: import("convex/values").GenericId<"tripMembers">;
    splitType: "exact" | "percentage" | "equal" | "shares";
    participants: {
        memberId: import("convex/values").GenericId<"tripMembers">;
        splitValue: number;
    }[];
}, Promise<import("convex/values").GenericId<"sharedExpenses">>>;
export declare const updateExpense: import("convex/server").RegisteredMutation<"public", {
    description?: string | undefined;
    date?: string | undefined;
    category?: "shopping" | "other" | "food" | "transport" | "accommodation" | "tickets" | undefined;
    currency?: string | undefined;
    notes?: string | undefined;
    amount?: number | undefined;
    receiptImageUrl?: string | undefined;
    paidById?: import("convex/values").GenericId<"tripMembers"> | undefined;
    splitType?: "exact" | "percentage" | "equal" | "shares" | undefined;
    participants?: {
        memberId: import("convex/values").GenericId<"tripMembers">;
        splitValue: number;
    }[] | undefined;
    userId: string;
    expenseId: import("convex/values").GenericId<"sharedExpenses">;
}, Promise<{
    _id: import("convex/values").GenericId<"sharedExpenses">;
    _creationTime: number;
    notes?: string | undefined;
    receiptImageUrl?: string | undefined;
    createdAt: number;
    description: string;
    date: string;
    updatedAt: number;
    category: "shopping" | "other" | "food" | "transport" | "accommodation" | "tickets";
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    amount: number;
    paidById: import("convex/values").GenericId<"tripMembers">;
    splitType: "exact" | "percentage" | "equal" | "shares";
} | null>>;
export declare const deleteExpense: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    expenseId: import("convex/values").GenericId<"sharedExpenses">;
}, Promise<void>>;
export declare const getBalances: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    memberId: import("convex/values").GenericId<"tripMembers">;
    memberName: string;
    avatarUrl: string | undefined;
    isOwner: boolean;
    balance: number;
}[]>>;
export declare const getExpenseSummary: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    total: number;
    expenseCount: number;
    breakdown: {
        category: string;
        amount: number;
        percentage: number;
    }[];
    currency: string;
}>>;
export declare const getSettlementSuggestions: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    suggestions: {
        fromMemberId: string;
        fromMemberName: string;
        toMemberId: string;
        toMemberName: string;
        amount: number;
    }[];
    pendingSettlements: {
        fromMemberName: string;
        toMemberName: string;
        _id: import("convex/values").GenericId<"settlements">;
        _creationTime: number;
        notes?: string | undefined;
        settledAt?: number | undefined;
        createdAt: number;
        currency: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        amount: number;
        fromMemberId: import("convex/values").GenericId<"tripMembers">;
        toMemberId: import("convex/values").GenericId<"tripMembers">;
        isSettled: boolean;
    }[];
}>>;
export declare const createSettlement: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    userId: string;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    amount: number;
    fromMemberId: import("convex/values").GenericId<"tripMembers">;
    toMemberId: import("convex/values").GenericId<"tripMembers">;
}, Promise<import("convex/values").GenericId<"settlements">>>;
export declare const markSettlementComplete: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    settlementId: import("convex/values").GenericId<"settlements">;
}, Promise<{
    _id: import("convex/values").GenericId<"settlements">;
    _creationTime: number;
    notes?: string | undefined;
    settledAt?: number | undefined;
    createdAt: number;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    amount: number;
    fromMemberId: import("convex/values").GenericId<"tripMembers">;
    toMemberId: import("convex/values").GenericId<"tripMembers">;
    isSettled: boolean;
} | null>>;
export declare const deleteSettlement: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    settlementId: import("convex/values").GenericId<"settlements">;
}, Promise<void>>;
export declare const listSettlements: import("convex/server").RegisteredQuery<"public", {
    showSettled?: boolean | undefined;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    fromMemberName: string;
    fromMemberAvatarUrl: string | undefined;
    toMemberName: string;
    toMemberAvatarUrl: string | undefined;
    _id: import("convex/values").GenericId<"settlements">;
    _creationTime: number;
    notes?: string | undefined;
    settledAt?: number | undefined;
    createdAt: number;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    amount: number;
    fromMemberId: import("convex/values").GenericId<"tripMembers">;
    toMemberId: import("convex/values").GenericId<"tripMembers">;
    isSettled: boolean;
}[]>>;
