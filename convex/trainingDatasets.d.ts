/**
 * Training Datasets - Convex Functions
 * CRUD operations for ML training datasets
 */
export declare const list: import("convex/server").RegisteredQuery<"public", {
    status?: "completed" | "failed" | "pending" | "generating" | undefined;
    name?: string | undefined;
    limit?: number | undefined;
    offset?: number | undefined;
}, Promise<{
    data: {
        _id: import("convex/values").GenericId<"trainingDatasets">;
        _creationTime: number;
        statistics?: any;
        generatedAt?: number | undefined;
        status: string;
        name: string;
        version: string;
        generationParams: any;
        outputFormats: string[];
        storagePaths: any;
    }[];
    pagination: {
        total: number;
        limit: number;
        offset: number;
    };
}>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"trainingDatasets">;
}, Promise<{
    _id: import("convex/values").GenericId<"trainingDatasets">;
    _creationTime: number;
    statistics?: any;
    generatedAt?: number | undefined;
    status: string;
    name: string;
    version: string;
    generationParams: any;
    outputFormats: string[];
    storagePaths: any;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    status?: "completed" | "failed" | "pending" | "generating" | undefined;
    statistics?: any;
    name: string;
    version: string;
    generationParams: any;
    outputFormats: string[];
}, Promise<{
    _id: import("convex/values").GenericId<"trainingDatasets">;
    _creationTime: number;
    statistics?: any;
    generatedAt?: number | undefined;
    status: string;
    name: string;
    version: string;
    generationParams: any;
    outputFormats: string[];
    storagePaths: any;
} | null>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    status?: "completed" | "failed" | "pending" | "generating" | undefined;
    statistics?: any;
    storagePaths?: any;
    generatedAt?: number | undefined;
    id: import("convex/values").GenericId<"trainingDatasets">;
}, Promise<{
    _id: import("convex/values").GenericId<"trainingDatasets">;
    _creationTime: number;
    statistics?: any;
    generatedAt?: number | undefined;
    status: string;
    name: string;
    version: string;
    generationParams: any;
    outputFormats: string[];
    storagePaths: any;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"trainingDatasets">;
}, Promise<void>>;
export declare const checkExists: import("convex/server").RegisteredQuery<"public", {
    name: string;
    version: string;
}, Promise<boolean>>;
