/**
 * Crawl Jobs - Data Collection Management
 */
export declare const list: import("convex/server").RegisteredQuery<"public", {
    status?: string | undefined;
    limit?: number | undefined;
    platform?: string | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"crawlJobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
} | null>>;
export declare const getDueJobs: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
}[]>>;
export declare const getJobsForIncrementalCrawl: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    staleThresholdHours?: number | undefined;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
}[]>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    jobType?: string | undefined;
    scheduleCron?: string | undefined;
    name: string;
    config: any;
    platform: string;
}, Promise<import("convex/values").GenericId<"crawlJobs">>>;
export declare const start: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"crawlJobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
} | null>>;
export declare const complete: import("convex/server").RegisteredMutation<"public", {
    statistics?: any;
    id: import("convex/values").GenericId<"crawlJobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
} | null>>;
export declare const fail: import("convex/server").RegisteredMutation<"public", {
    statistics?: any;
    id: import("convex/values").GenericId<"crawlJobs">;
    errorMessage: string;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
} | null>>;
export declare const cancel: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"crawlJobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
} | null>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    errorMessage?: string | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    status: string;
    id: import("convex/values").GenericId<"crawlJobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
} | null>>;
export declare const updateStatistics: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"crawlJobs">;
    statistics: any;
}, Promise<void>>;
export declare const updateNextRunAt: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"crawlJobs">;
    nextRunAt: number;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
} | null>>;
export declare const incrementRetryCount: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"crawlJobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"crawlJobs">;
    _creationTime: number;
    errorMessage?: string | undefined;
    scheduleCron?: string | undefined;
    nextRunAt?: number | undefined;
    startedAt?: number | undefined;
    completedAt?: number | undefined;
    statistics?: any;
    retryCount?: number | undefined;
    lastFailureAt?: number | undefined;
    lastFailureReason?: string | undefined;
    status: string;
    name: string;
    config: any;
    platform: string;
    jobType: string;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"crawlJobs">;
}, Promise<void>>;
