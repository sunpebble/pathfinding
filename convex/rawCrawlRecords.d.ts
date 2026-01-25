import type { Id } from './_generated/dataModel';
/**
 * Raw Crawl Records - Storage for crawled data
 */
export declare const listByJob: import("convex/server").RegisteredQuery<"public", {
    status?: string | undefined;
    limit?: number | undefined;
    jobId: import("convex/values").GenericId<"crawlJobs">;
}, Promise<{
    _id: import("convex/values").GenericId<"rawCrawlRecords">;
    _creationTime: number;
    jobId: import("convex/values").GenericId<"crawlJobs">;
    sourceUrl: string;
    rawData: any;
    crawledAt: number;
    processingStatus: string;
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"rawCrawlRecords">;
}, Promise<{
    _id: import("convex/values").GenericId<"rawCrawlRecords">;
    _creationTime: number;
    jobId: import("convex/values").GenericId<"crawlJobs">;
    sourceUrl: string;
    rawData: any;
    crawledAt: number;
    processingStatus: string;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    jobId: import("convex/values").GenericId<"crawlJobs">;
    sourceUrl: string;
    rawData: any;
}, Promise<import("convex/values").GenericId<"rawCrawlRecords">>>;
export declare const bulkInsert: import("convex/server").RegisteredMutation<"public", {
    records: {
        jobId: import("convex/values").GenericId<"crawlJobs">;
        sourceUrl: string;
        rawData: any;
    }[];
}, Promise<Id<"rawCrawlRecords">[]>>;
export declare const updateStatus: import("convex/server").RegisteredMutation<"public", {
    status: string;
    id: import("convex/values").GenericId<"rawCrawlRecords">;
}, Promise<void>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"rawCrawlRecords">;
}, Promise<void>>;
export declare const removeByJob: import("convex/server").RegisteredMutation<"public", {
    jobId: import("convex/values").GenericId<"crawlJobs">;
}, Promise<number>>;
