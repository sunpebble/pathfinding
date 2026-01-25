/**
 * List questions for a POI with pagination
 */
export declare const listQuestionsByPoi: import("convex/server").RegisteredQuery<"public", {
    status?: "open" | "resolved" | "closed" | undefined;
    userId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: "newest" | "oldest" | "most_upvoted" | "most_active" | undefined;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<{
    data: {
        id: import("convex/values").GenericId<"poiQuestions">;
        authorName: string;
        authorAvatarUrl: string | undefined;
        userVote: "up" | "down" | null;
        score: number;
        _id: import("convex/values").GenericId<"poiQuestions">;
        _creationTime: number;
        tags?: string[] | undefined;
        updatedAt?: number | undefined;
        imageUrls?: string[] | undefined;
        isDeleted?: boolean | undefined;
        acceptedAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
        bestAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
        hasBestAnswer?: boolean | undefined;
        upvotesCount?: number | undefined;
        downvotesCount?: number | undefined;
        status: "open" | "resolved" | "answered" | "closed";
        title: string;
        content: string;
        userId: string;
        followersCount: number;
        createdAt: number;
        category: "tips" | "general" | "other" | "safety" | "food" | "accommodation" | "transportation" | "timing" | "pricing";
        poiId: import("convex/values").GenericId<"pois">;
        viewsCount: number;
        isEdited: boolean;
        reportCount: number;
        answersCount: number;
        isPinned: boolean;
        isHidden: boolean;
        lastActivityAt: number;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>>;
/**
 * Get a single question by ID with full details
 */
export declare const getQuestionById: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    id: import("convex/values").GenericId<"poiQuestions">;
}, Promise<{
    id: import("convex/values").GenericId<"poiQuestions">;
    authorName: string;
    authorAvatarUrl: string | undefined;
    userVote: "up" | "down" | null;
    score: number;
    poiName: string | undefined;
    _id: import("convex/values").GenericId<"poiQuestions">;
    _creationTime: number;
    tags?: string[] | undefined;
    updatedAt?: number | undefined;
    imageUrls?: string[] | undefined;
    isDeleted?: boolean | undefined;
    acceptedAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
    bestAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
    hasBestAnswer?: boolean | undefined;
    upvotesCount?: number | undefined;
    downvotesCount?: number | undefined;
    status: "open" | "resolved" | "answered" | "closed";
    title: string;
    content: string;
    userId: string;
    followersCount: number;
    createdAt: number;
    category: "tips" | "general" | "other" | "safety" | "food" | "accommodation" | "transportation" | "timing" | "pricing";
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    isEdited: boolean;
    reportCount: number;
    answersCount: number;
    isPinned: boolean;
    isHidden: boolean;
    lastActivityAt: number;
} | null>>;
/**
 * Search questions by text
 */
export declare const searchQuestions: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
    query: string;
}, Promise<{
    id: import("convex/values").GenericId<"poiQuestions">;
    authorName: string;
    authorAvatarUrl: string | undefined;
    score: number;
    poiName: string | undefined;
    _id: import("convex/values").GenericId<"poiQuestions">;
    _creationTime: number;
    tags?: string[] | undefined;
    updatedAt?: number | undefined;
    imageUrls?: string[] | undefined;
    isDeleted?: boolean | undefined;
    acceptedAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
    bestAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
    hasBestAnswer?: boolean | undefined;
    upvotesCount?: number | undefined;
    downvotesCount?: number | undefined;
    status: "open" | "resolved" | "answered" | "closed";
    title: string;
    content: string;
    userId: string;
    followersCount: number;
    createdAt: number;
    category: "tips" | "general" | "other" | "safety" | "food" | "accommodation" | "transportation" | "timing" | "pricing";
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    isEdited: boolean;
    reportCount: number;
    answersCount: number;
    isPinned: boolean;
    isHidden: boolean;
    lastActivityAt: number;
}[]>>;
/**
 * Get question count for a POI
 */
export declare const getQuestionCount: import("convex/server").RegisteredQuery<"public", {
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<number>>;
/**
 * Get user's questions
 */
export declare const getMyQuestions: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        id: import("convex/values").GenericId<"poiQuestions">;
        poiName: string | undefined;
        score: number;
        _id: import("convex/values").GenericId<"poiQuestions">;
        _creationTime: number;
        tags?: string[] | undefined;
        updatedAt?: number | undefined;
        imageUrls?: string[] | undefined;
        authorName?: string | undefined;
        isDeleted?: boolean | undefined;
        acceptedAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
        bestAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
        hasBestAnswer?: boolean | undefined;
        upvotesCount?: number | undefined;
        downvotesCount?: number | undefined;
        authorAvatarUrl?: string | undefined;
        status: "open" | "resolved" | "answered" | "closed";
        title: string;
        content: string;
        userId: string;
        followersCount: number;
        createdAt: number;
        category: "tips" | "general" | "other" | "safety" | "food" | "accommodation" | "transportation" | "timing" | "pricing";
        poiId: import("convex/values").GenericId<"pois">;
        viewsCount: number;
        isEdited: boolean;
        reportCount: number;
        answersCount: number;
        isPinned: boolean;
        isHidden: boolean;
        lastActivityAt: number;
    }[];
    total: number;
}>>;
/**
 * List answers for a question with pagination
 */
export declare const listAnswersByQuestion: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    page?: number | undefined;
    pageSize?: number | undefined;
    sortBy?: "newest" | "oldest" | "most_upvoted" | undefined;
    questionId: import("convex/values").GenericId<"poiQuestions">;
}, Promise<{
    data: {
        id: import("convex/values").GenericId<"poiAnswers">;
        authorName: string;
        authorAvatarUrl: string | undefined;
        userVote: "up" | "down" | null;
        score: number;
        _id: import("convex/values").GenericId<"poiAnswers">;
        _creationTime: number;
        updatedAt?: number | undefined;
        imageUrls?: string[] | undefined;
        poiId?: import("convex/values").GenericId<"pois"> | undefined;
        isBestAnswer?: boolean | undefined;
        authorBadgeType?: "travel_expert" | "local_guide" | "official_account" | undefined;
        content: string;
        userId: string;
        createdAt: number;
        commentsCount: number;
        isEdited: boolean;
        isDeleted: boolean;
        reportCount: number;
        isHidden: boolean;
        upvotesCount: number;
        downvotesCount: number;
        questionId: import("convex/values").GenericId<"poiQuestions">;
        isAccepted: boolean;
        isVerifiedAuthor: boolean;
    }[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
}>>;
/**
 * Get a single answer by ID
 */
export declare const getAnswerById: import("convex/server").RegisteredQuery<"public", {
    userId?: string | undefined;
    id: import("convex/values").GenericId<"poiAnswers">;
}, Promise<{
    id: import("convex/values").GenericId<"poiAnswers">;
    authorName: string;
    authorAvatarUrl: string | undefined;
    userVote: "up" | "down" | null;
    score: number;
    _id: import("convex/values").GenericId<"poiAnswers">;
    _creationTime: number;
    updatedAt?: number | undefined;
    imageUrls?: string[] | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
    isBestAnswer?: boolean | undefined;
    authorBadgeType?: "travel_expert" | "local_guide" | "official_account" | undefined;
    content: string;
    userId: string;
    createdAt: number;
    commentsCount: number;
    isEdited: boolean;
    isDeleted: boolean;
    reportCount: number;
    isHidden: boolean;
    upvotesCount: number;
    downvotesCount: number;
    questionId: import("convex/values").GenericId<"poiQuestions">;
    isAccepted: boolean;
    isVerifiedAuthor: boolean;
} | null>>;
/**
 * Get user's answers
 */
export declare const getMyAnswers: import("convex/server").RegisteredQuery<"public", {
    page?: number | undefined;
    pageSize?: number | undefined;
    userId: string;
}, Promise<{
    data: {
        id: import("convex/values").GenericId<"poiAnswers">;
        questionTitle: string | undefined;
        poiName: string | undefined;
        score: number;
        _id: import("convex/values").GenericId<"poiAnswers">;
        _creationTime: number;
        updatedAt?: number | undefined;
        imageUrls?: string[] | undefined;
        poiId?: import("convex/values").GenericId<"pois"> | undefined;
        authorName?: string | undefined;
        authorAvatarUrl?: string | undefined;
        isBestAnswer?: boolean | undefined;
        authorBadgeType?: "travel_expert" | "local_guide" | "official_account" | undefined;
        content: string;
        userId: string;
        createdAt: number;
        commentsCount: number;
        isEdited: boolean;
        isDeleted: boolean;
        reportCount: number;
        isHidden: boolean;
        upvotesCount: number;
        downvotesCount: number;
        questionId: import("convex/values").GenericId<"poiQuestions">;
        isAccepted: boolean;
        isVerifiedAuthor: boolean;
    }[];
    total: number;
}>>;
/**
 * Create a new question
 */
export declare const createQuestion: import("convex/server").RegisteredMutation<"public", {
    tags?: string[] | undefined;
    category?: "tips" | "general" | "other" | "safety" | "food" | "accommodation" | "transportation" | "timing" | "pricing" | undefined;
    title: string;
    content: string;
    userId: string;
    poiId: import("convex/values").GenericId<"pois">;
}, Promise<import("convex/values").GenericId<"poiQuestions">>>;
/**
 * Update a question
 */
export declare const updateQuestion: import("convex/server").RegisteredMutation<"public", {
    tags?: string[] | undefined;
    title?: string | undefined;
    content?: string | undefined;
    id: import("convex/values").GenericId<"poiQuestions">;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"poiQuestions">;
    _creationTime: number;
    tags?: string[] | undefined;
    updatedAt?: number | undefined;
    imageUrls?: string[] | undefined;
    authorName?: string | undefined;
    isDeleted?: boolean | undefined;
    acceptedAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
    bestAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
    hasBestAnswer?: boolean | undefined;
    upvotesCount?: number | undefined;
    downvotesCount?: number | undefined;
    authorAvatarUrl?: string | undefined;
    status: "open" | "resolved" | "answered" | "closed";
    title: string;
    content: string;
    userId: string;
    followersCount: number;
    createdAt: number;
    category: "tips" | "general" | "other" | "safety" | "food" | "accommodation" | "transportation" | "timing" | "pricing";
    poiId: import("convex/values").GenericId<"pois">;
    viewsCount: number;
    isEdited: boolean;
    reportCount: number;
    answersCount: number;
    isPinned: boolean;
    isHidden: boolean;
    lastActivityAt: number;
} | null>>;
/**
 * Delete a question (soft delete)
 */
export declare const deleteQuestion: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiQuestions">;
    userId: string;
}, Promise<boolean>>;
/**
 * Vote on a question
 */
export declare const voteQuestion: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    voteType: "up" | "down";
    questionId: import("convex/values").GenericId<"poiQuestions">;
}, Promise<{
    action: string;
    voteType: null;
} | {
    action: string;
    voteType: "up" | "down";
}>>;
/**
 * Increment view count
 */
export declare const incrementQuestionViews: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiQuestions">;
}, Promise<number>>;
/**
 * Close a question (stop accepting answers)
 */
export declare const closeQuestion: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiQuestions">;
    userId: string;
}, Promise<boolean>>;
/**
 * Reopen a closed question
 */
export declare const reopenQuestion: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiQuestions">;
    userId: string;
}, Promise<boolean>>;
/**
 * Create a new answer
 */
export declare const createAnswer: import("convex/server").RegisteredMutation<"public", {
    content: string;
    userId: string;
    questionId: import("convex/values").GenericId<"poiQuestions">;
}, Promise<import("convex/values").GenericId<"poiAnswers">>>;
/**
 * Update an answer
 */
export declare const updateAnswer: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiAnswers">;
    content: string;
    userId: string;
}, Promise<{
    _id: import("convex/values").GenericId<"poiAnswers">;
    _creationTime: number;
    updatedAt?: number | undefined;
    imageUrls?: string[] | undefined;
    poiId?: import("convex/values").GenericId<"pois"> | undefined;
    authorName?: string | undefined;
    authorAvatarUrl?: string | undefined;
    isBestAnswer?: boolean | undefined;
    authorBadgeType?: "travel_expert" | "local_guide" | "official_account" | undefined;
    content: string;
    userId: string;
    createdAt: number;
    commentsCount: number;
    isEdited: boolean;
    isDeleted: boolean;
    reportCount: number;
    isHidden: boolean;
    upvotesCount: number;
    downvotesCount: number;
    questionId: import("convex/values").GenericId<"poiQuestions">;
    isAccepted: boolean;
    isVerifiedAuthor: boolean;
} | null>>;
/**
 * Delete an answer (soft delete)
 */
export declare const deleteAnswer: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"poiAnswers">;
    userId: string;
}, Promise<boolean>>;
/**
 * Vote on an answer
 */
export declare const voteAnswer: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    voteType: "up" | "down";
    answerId: import("convex/values").GenericId<"poiAnswers">;
}, Promise<{
    action: string;
    voteType: null;
} | {
    action: string;
    voteType: "up" | "down";
}>>;
/**
 * Mark an answer as best answer
 */
export declare const markBestAnswer: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    answerId: import("convex/values").GenericId<"poiAnswers">;
}, Promise<boolean>>;
/**
 * Unmark best answer
 */
export declare const unmarkBestAnswer: import("convex/server").RegisteredMutation<"public", {
    userId: string;
    answerId: import("convex/values").GenericId<"poiAnswers">;
}, Promise<boolean>>;
/**
 * Report a question or answer
 */
export declare const reportQA: import("convex/server").RegisteredMutation<"public", {
    description?: string | undefined;
    userId: string;
    targetType: "question" | "answer";
    targetId: string;
    reason: "other" | "spam" | "harassment" | "inappropriate" | "off_topic" | "misleading";
}, Promise<import("convex/values").GenericId<"poiQAReports">>>;
