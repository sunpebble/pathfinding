/**
 * Budget Management Functions
 * Handles itinerary budgets, expenses, and expense categories
 */
/**
 * List all expense categories, ordered by sortOrder
 */
export declare const listCategories: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"expenseCategories">;
    _creationTime: number;
    name: string;
    nameEn: string;
    sortOrder: number;
    color: string;
    icon: string;
    isSystem: boolean;
}[]>>;
/**
 * Get a single expense category by ID
 */
export declare const getCategory: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"expenseCategories">;
}, Promise<{
    _id: import("convex/values").GenericId<"expenseCategories">;
    _creationTime: number;
    name: string;
    nameEn: string;
    sortOrder: number;
    color: string;
    icon: string;
    isSystem: boolean;
} | null>>;
/**
 * Create a new expense category
 */
export declare const createCategory: import("convex/server").RegisteredMutation<"public", {
    name: string;
    nameEn: string;
    sortOrder: number;
    color: string;
    icon: string;
    isSystem: boolean;
}, Promise<import("convex/values").GenericId<"expenseCategories">>>;
/**
 * Seed default expense categories
 */
export declare const seedDefaultCategories: import("convex/server").RegisteredMutation<"public", {}, Promise<{
    message: string;
    count?: undefined;
} | {
    message: string;
    count: number;
}>>;
/**
 * Get budget for an itinerary
 */
export declare const getBudget: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"itineraryBudgets">;
    _creationTime: number;
    notes?: string | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    totalBudget: number;
    categoryBudgets: {
        categoryId: import("convex/values").GenericId<"expenseCategories">;
        amount: number;
    }[];
} | null>>;
/**
 * Get budget with enriched category data
 */
export declare const getBudgetWithCategories: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    categoryBudgets: {
        category: {
            _id: import("convex/values").GenericId<"expenseCategories">;
            _creationTime: number;
            name: string;
            nameEn: string;
            sortOrder: number;
            color: string;
            icon: string;
            isSystem: boolean;
        } | null;
        categoryId: import("convex/values").GenericId<"expenseCategories">;
        amount: number;
    }[];
    _id: import("convex/values").GenericId<"itineraryBudgets">;
    _creationTime: number;
    notes?: string | undefined;
    userId: string;
    createdAt: number;
    updatedAt: number;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    totalBudget: number;
} | null>>;
/**
 * Create or update budget for an itinerary
 */
export declare const upsertBudget: import("convex/server").RegisteredMutation<"public", {
    notes?: string | undefined;
    userId: string;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    totalBudget: number;
    categoryBudgets: {
        categoryId: import("convex/values").GenericId<"expenseCategories">;
        amount: number;
    }[];
}, Promise<import("convex/values").GenericId<"itineraryBudgets">>>;
/**
 * Delete budget for an itinerary
 */
export declare const deleteBudget: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"itineraryBudgets">;
}, Promise<void>>;
/**
 * List expenses for an itinerary
 */
export declare const listExpenses: import("convex/server").RegisteredQuery<"public", {
    categoryId?: import("convex/values").GenericId<"expenseCategories"> | undefined;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    _id: import("convex/values").GenericId<"expenses">;
    _creationTime: number;
    time?: string | undefined;
    notes?: string | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
    dayNumber?: number | undefined;
    paymentMethod?: string | undefined;
    receiptImageUrl?: string | undefined;
    date: string;
    description: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    categoryId: import("convex/values").GenericId<"expenseCategories">;
    amount: number;
}[]>>;
/**
 * List expenses with enriched category data
 */
export declare const listExpensesWithCategories: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    category: {
        _id: import("convex/values").GenericId<"expenseCategories">;
        _creationTime: number;
        name: string;
        nameEn: string;
        sortOrder: number;
        color: string;
        icon: string;
        isSystem: boolean;
    } | null;
    _id: import("convex/values").GenericId<"expenses">;
    _creationTime: number;
    time?: string | undefined;
    notes?: string | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
    dayNumber?: number | undefined;
    paymentMethod?: string | undefined;
    receiptImageUrl?: string | undefined;
    date: string;
    description: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    categoryId: import("convex/values").GenericId<"expenseCategories">;
    amount: number;
}[]>>;
/**
 * Get a single expense by ID
 */
export declare const getExpense: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"expenses">;
}, Promise<{
    _id: import("convex/values").GenericId<"expenses">;
    _creationTime: number;
    time?: string | undefined;
    notes?: string | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
    dayNumber?: number | undefined;
    paymentMethod?: string | undefined;
    receiptImageUrl?: string | undefined;
    date: string;
    description: string;
    userId: string;
    createdAt: number;
    updatedAt: number;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    categoryId: import("convex/values").GenericId<"expenseCategories">;
    amount: number;
} | null>>;
/**
 * Create a new expense
 */
export declare const createExpense: import("convex/server").RegisteredMutation<"public", {
    time?: string | undefined;
    notes?: string | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
    dayNumber?: number | undefined;
    paymentMethod?: string | undefined;
    receiptImageUrl?: string | undefined;
    date: string;
    description: string;
    userId: string;
    currency: string;
    itineraryId: import("convex/values").GenericId<"itineraries">;
    categoryId: import("convex/values").GenericId<"expenseCategories">;
    amount: number;
}, Promise<import("convex/values").GenericId<"expenses">>>;
/**
 * Update an expense
 */
export declare const updateExpense: import("convex/server").RegisteredMutation<"public", {
    date?: string | undefined;
    time?: string | undefined;
    description?: string | undefined;
    currency?: string | undefined;
    notes?: string | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
    dayNumber?: number | undefined;
    categoryId?: import("convex/values").GenericId<"expenseCategories"> | undefined;
    amount?: number | undefined;
    paymentMethod?: string | undefined;
    receiptImageUrl?: string | undefined;
    id: import("convex/values").GenericId<"expenses">;
}, Promise<void>>;
/**
 * Delete an expense
 */
export declare const deleteExpense: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"expenses">;
}, Promise<void>>;
/**
 * Get budget summary with spending breakdown for an itinerary
 */
export declare const getBudgetSummary: import("convex/server").RegisteredQuery<"public", {
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    budget: {
        total: number;
        currency: string;
        notes: string | undefined;
    } | null;
    totalSpent: number;
    remaining: number;
    percentUsed: number;
    isOverBudget: boolean;
    expenseCount: number;
    spendingByCategory: {
        category: {
            _id: import("convex/values").GenericId<"expenseCategories">;
            _creationTime: number;
            name: string;
            nameEn: string;
            sortOrder: number;
            color: string;
            icon: string;
            isSystem: boolean;
        };
        budgetAmount: number;
        spent: number;
        remaining: number;
        percentUsed: number;
        isOverBudget: boolean;
        expenseCount: number;
    }[];
    dailyTrend: {
        date: string;
        amount: number;
    }[];
}>>;
/**
 * Get spending trend data for charts
 */
export declare const getSpendingTrend: import("convex/server").RegisteredQuery<"public", {
    groupBy?: "category" | "day" | undefined;
    itineraryId: import("convex/values").GenericId<"itineraries">;
}, Promise<{
    category: {
        _id: import("convex/values").GenericId<"expenseCategories">;
        _creationTime: number;
        name: string;
        nameEn: string;
        sortOrder: number;
        color: string;
        icon: string;
        isSystem: boolean;
    };
    amount: number;
}[] | {
    date: string;
    amount: number;
}[]>>;
