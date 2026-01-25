/**
 * Cities - Reference Data Queries and Mutations
 */
export declare const list: import("convex/server").RegisteredQuery<"public", {}, Promise<{
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
}[]>>;
export declare const getById: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"cities">;
}, Promise<{
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
} | null>>;
export declare const getByCountry: import("convex/server").RegisteredQuery<"public", {
    countryCode: string;
}, Promise<{
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
}[]>>;
export declare const getByTimezone: import("convex/server").RegisteredQuery<"public", {
    timezone: string;
}, Promise<{
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
}[]>>;
export declare const searchByName: import("convex/server").RegisteredQuery<"public", {
    name: string;
}, Promise<{
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
}[]>>;
export declare const getByIds: import("convex/server").RegisteredQuery<"public", {
    ids: import("convex/values").GenericId<"cities">[];
}, Promise<{
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
}[]>>;
export declare const getTimezoneInfo: import("convex/server").RegisteredQuery<"public", {
    id: import("convex/values").GenericId<"cities">;
}, Promise<{
    id: import("convex/values").GenericId<"cities">;
    name: string;
    nameEn: string | undefined;
    timezone: string;
    utcOffset: number | undefined;
    dstOffset: number | undefined;
    observesDst: boolean | undefined;
    countryCode: string;
} | null>>;
export declare const create: import("convex/server").RegisteredMutation<"public", {
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
}, Promise<import("convex/values").GenericId<"cities">>>;
export declare const update: import("convex/server").RegisteredMutation<"public", {
    name?: string | undefined;
    latitude?: number | undefined;
    longitude?: number | undefined;
    nameEn?: string | undefined;
    timezone?: string | undefined;
    countryCode?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    id: import("convex/values").GenericId<"cities">;
}, Promise<{
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
} | null>>;
export declare const remove: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"cities">;
}, Promise<void>>;
export declare const getEncyclopedia: import("convex/server").RegisteredQuery<"public", {
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
    _id: import("convex/values").GenericId<"cityEncyclopedia">;
    _creationTime: number;
    basicInfo?: {
        population?: number | undefined;
        populationYear?: number | undefined;
        area?: number | undefined;
        elevation?: number | undefined;
        climate?: string | undefined;
        climateEn?: string | undefined;
        motto?: string | undefined;
        mottoEn?: string | undefined;
        nicknames?: string[] | undefined;
        nicknamesEn?: string[] | undefined;
    } | undefined;
    history?: {
        foundedYear?: number | undefined;
        historicalNames?: string[] | undefined;
        briefHistoryEn?: string | undefined;
        culturalHighlightsEn?: string[] | undefined;
        famousForEn?: string[] | undefined;
        worldHeritageSites?: string[] | undefined;
        briefHistory: string;
        culturalHighlights: string[];
        famousFor: string[];
    } | undefined;
    bestTravelTime?: {
        descriptionEn?: string | undefined;
        weatherNotes?: string | undefined;
        crowdLevel?: "low" | "medium" | "high" | undefined;
        priceLevel?: "low" | "medium" | "high" | undefined;
        description: string;
        seasons: ("spring" | "summer" | "autumn" | "winter" | "all_year")[];
        months: number[];
    } | undefined;
    practicalInfo?: {
        tippingCustomEn?: string | undefined;
        waterSafetyNote?: string | undefined;
        visaRequired?: boolean | undefined;
        visaNote?: string | undefined;
        touristHotline?: string | undefined;
        voltage: string;
        plugType: string[];
        currency: string;
        currencySymbol: string;
        currencyNameLocal: string;
        currencyNameEn: string;
        tippingCustom: string;
        waterSafety: "safe" | "boil" | "bottled";
        languageOfficial: string[];
        languageCommon: string[];
        emergencyNumber: string;
        ambulanceNumber: string;
        fireNumber: string;
    } | undefined;
    sources?: string[] | undefined;
    createdAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    customs: {
        descriptionEn?: string | undefined;
        titleEn?: string | undefined;
        title: string;
        description: string;
        category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
        isTaboo: boolean;
        importance: "low" | "medium" | "high";
    }[];
    lastUpdatedAt: number;
} | null>>;
export declare const getCityWithEncyclopedia: import("convex/server").RegisteredQuery<"public", {
    cityId: import("convex/values").GenericId<"cities">;
}, Promise<{
    encyclopedia: {
        _id: import("convex/values").GenericId<"cityEncyclopedia">;
        _creationTime: number;
        basicInfo?: {
            population?: number | undefined;
            populationYear?: number | undefined;
            area?: number | undefined;
            elevation?: number | undefined;
            climate?: string | undefined;
            climateEn?: string | undefined;
            motto?: string | undefined;
            mottoEn?: string | undefined;
            nicknames?: string[] | undefined;
            nicknamesEn?: string[] | undefined;
        } | undefined;
        history?: {
            foundedYear?: number | undefined;
            historicalNames?: string[] | undefined;
            briefHistoryEn?: string | undefined;
            culturalHighlightsEn?: string[] | undefined;
            famousForEn?: string[] | undefined;
            worldHeritageSites?: string[] | undefined;
            briefHistory: string;
            culturalHighlights: string[];
            famousFor: string[];
        } | undefined;
        bestTravelTime?: {
            descriptionEn?: string | undefined;
            weatherNotes?: string | undefined;
            crowdLevel?: "low" | "medium" | "high" | undefined;
            priceLevel?: "low" | "medium" | "high" | undefined;
            description: string;
            seasons: ("spring" | "summer" | "autumn" | "winter" | "all_year")[];
            months: number[];
        } | undefined;
        practicalInfo?: {
            tippingCustomEn?: string | undefined;
            waterSafetyNote?: string | undefined;
            visaRequired?: boolean | undefined;
            visaNote?: string | undefined;
            touristHotline?: string | undefined;
            voltage: string;
            plugType: string[];
            currency: string;
            currencySymbol: string;
            currencyNameLocal: string;
            currencyNameEn: string;
            tippingCustom: string;
            waterSafety: "safe" | "boil" | "bottled";
            languageOfficial: string[];
            languageCommon: string[];
            emergencyNumber: string;
            ambulanceNumber: string;
            fireNumber: string;
        } | undefined;
        sources?: string[] | undefined;
        createdAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        customs: {
            descriptionEn?: string | undefined;
            titleEn?: string | undefined;
            title: string;
            description: string;
            category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
            isTaboo: boolean;
            importance: "low" | "medium" | "high";
        }[];
        lastUpdatedAt: number;
    } | null;
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
} | null>>;
export declare const createEncyclopedia: import("convex/server").RegisteredMutation<"public", {
    basicInfo?: {
        population?: number | undefined;
        populationYear?: number | undefined;
        area?: number | undefined;
        elevation?: number | undefined;
        climate?: string | undefined;
        climateEn?: string | undefined;
        motto?: string | undefined;
        mottoEn?: string | undefined;
        nicknames?: string[] | undefined;
        nicknamesEn?: string[] | undefined;
    } | undefined;
    history?: {
        foundedYear?: number | undefined;
        historicalNames?: string[] | undefined;
        briefHistoryEn?: string | undefined;
        culturalHighlightsEn?: string[] | undefined;
        famousForEn?: string[] | undefined;
        worldHeritageSites?: string[] | undefined;
        briefHistory: string;
        culturalHighlights: string[];
        famousFor: string[];
    } | undefined;
    bestTravelTime?: {
        descriptionEn?: string | undefined;
        weatherNotes?: string | undefined;
        crowdLevel?: "low" | "medium" | "high" | undefined;
        priceLevel?: "low" | "medium" | "high" | undefined;
        description: string;
        seasons: ("spring" | "summer" | "autumn" | "winter" | "all_year")[];
        months: number[];
    } | undefined;
    practicalInfo?: {
        tippingCustomEn?: string | undefined;
        waterSafetyNote?: string | undefined;
        visaRequired?: boolean | undefined;
        visaNote?: string | undefined;
        touristHotline?: string | undefined;
        voltage: string;
        plugType: string[];
        currency: string;
        currencySymbol: string;
        currencyNameLocal: string;
        currencyNameEn: string;
        tippingCustom: string;
        waterSafety: "safe" | "boil" | "bottled";
        languageOfficial: string[];
        languageCommon: string[];
        emergencyNumber: string;
        ambulanceNumber: string;
        fireNumber: string;
    } | undefined;
    sources?: string[] | undefined;
    cityId: import("convex/values").GenericId<"cities">;
    customs: {
        descriptionEn?: string | undefined;
        titleEn?: string | undefined;
        title: string;
        description: string;
        category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
        isTaboo: boolean;
        importance: "low" | "medium" | "high";
    }[];
}, Promise<import("convex/values").GenericId<"cityEncyclopedia">>>;
export declare const updateEncyclopedia: import("convex/server").RegisteredMutation<"public", {
    basicInfo?: {
        population?: number | undefined;
        populationYear?: number | undefined;
        area?: number | undefined;
        elevation?: number | undefined;
        climate?: string | undefined;
        climateEn?: string | undefined;
        motto?: string | undefined;
        mottoEn?: string | undefined;
        nicknames?: string[] | undefined;
        nicknamesEn?: string[] | undefined;
    } | undefined;
    history?: {
        foundedYear?: number | undefined;
        historicalNames?: string[] | undefined;
        briefHistoryEn?: string | undefined;
        culturalHighlightsEn?: string[] | undefined;
        famousForEn?: string[] | undefined;
        worldHeritageSites?: string[] | undefined;
        briefHistory: string;
        culturalHighlights: string[];
        famousFor: string[];
    } | undefined;
    bestTravelTime?: {
        descriptionEn?: string | undefined;
        weatherNotes?: string | undefined;
        crowdLevel?: "low" | "medium" | "high" | undefined;
        priceLevel?: "low" | "medium" | "high" | undefined;
        description: string;
        seasons: ("spring" | "summer" | "autumn" | "winter" | "all_year")[];
        months: number[];
    } | undefined;
    customs?: {
        descriptionEn?: string | undefined;
        titleEn?: string | undefined;
        title: string;
        description: string;
        category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
        isTaboo: boolean;
        importance: "low" | "medium" | "high";
    }[] | undefined;
    practicalInfo?: {
        tippingCustomEn?: string | undefined;
        waterSafetyNote?: string | undefined;
        visaRequired?: boolean | undefined;
        visaNote?: string | undefined;
        touristHotline?: string | undefined;
        voltage: string;
        plugType: string[];
        currency: string;
        currencySymbol: string;
        currencyNameLocal: string;
        currencyNameEn: string;
        tippingCustom: string;
        waterSafety: "safe" | "boil" | "bottled";
        languageOfficial: string[];
        languageCommon: string[];
        emergencyNumber: string;
        ambulanceNumber: string;
        fireNumber: string;
    } | undefined;
    sources?: string[] | undefined;
    id: import("convex/values").GenericId<"cityEncyclopedia">;
}, Promise<{
    _id: import("convex/values").GenericId<"cityEncyclopedia">;
    _creationTime: number;
    basicInfo?: {
        population?: number | undefined;
        populationYear?: number | undefined;
        area?: number | undefined;
        elevation?: number | undefined;
        climate?: string | undefined;
        climateEn?: string | undefined;
        motto?: string | undefined;
        mottoEn?: string | undefined;
        nicknames?: string[] | undefined;
        nicknamesEn?: string[] | undefined;
    } | undefined;
    history?: {
        foundedYear?: number | undefined;
        historicalNames?: string[] | undefined;
        briefHistoryEn?: string | undefined;
        culturalHighlightsEn?: string[] | undefined;
        famousForEn?: string[] | undefined;
        worldHeritageSites?: string[] | undefined;
        briefHistory: string;
        culturalHighlights: string[];
        famousFor: string[];
    } | undefined;
    bestTravelTime?: {
        descriptionEn?: string | undefined;
        weatherNotes?: string | undefined;
        crowdLevel?: "low" | "medium" | "high" | undefined;
        priceLevel?: "low" | "medium" | "high" | undefined;
        description: string;
        seasons: ("spring" | "summer" | "autumn" | "winter" | "all_year")[];
        months: number[];
    } | undefined;
    practicalInfo?: {
        tippingCustomEn?: string | undefined;
        waterSafetyNote?: string | undefined;
        visaRequired?: boolean | undefined;
        visaNote?: string | undefined;
        touristHotline?: string | undefined;
        voltage: string;
        plugType: string[];
        currency: string;
        currencySymbol: string;
        currencyNameLocal: string;
        currencyNameEn: string;
        tippingCustom: string;
        waterSafety: "safe" | "boil" | "bottled";
        languageOfficial: string[];
        languageCommon: string[];
        emergencyNumber: string;
        ambulanceNumber: string;
        fireNumber: string;
    } | undefined;
    sources?: string[] | undefined;
    createdAt: number;
    cityId: import("convex/values").GenericId<"cities">;
    customs: {
        descriptionEn?: string | undefined;
        titleEn?: string | undefined;
        title: string;
        description: string;
        category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
        isTaboo: boolean;
        importance: "low" | "medium" | "high";
    }[];
    lastUpdatedAt: number;
} | null>>;
export declare const removeEncyclopedia: import("convex/server").RegisteredMutation<"public", {
    id: import("convex/values").GenericId<"cityEncyclopedia">;
}, Promise<void>>;
export declare const listWithEncyclopedia: import("convex/server").RegisteredQuery<"public", {
    limit?: number | undefined;
    countryCode?: string | undefined;
}, Promise<{
    encyclopedia: {
        _id: import("convex/values").GenericId<"cityEncyclopedia">;
        _creationTime: number;
        basicInfo?: {
            population?: number | undefined;
            populationYear?: number | undefined;
            area?: number | undefined;
            elevation?: number | undefined;
            climate?: string | undefined;
            climateEn?: string | undefined;
            motto?: string | undefined;
            mottoEn?: string | undefined;
            nicknames?: string[] | undefined;
            nicknamesEn?: string[] | undefined;
        } | undefined;
        history?: {
            foundedYear?: number | undefined;
            historicalNames?: string[] | undefined;
            briefHistoryEn?: string | undefined;
            culturalHighlightsEn?: string[] | undefined;
            famousForEn?: string[] | undefined;
            worldHeritageSites?: string[] | undefined;
            briefHistory: string;
            culturalHighlights: string[];
            famousFor: string[];
        } | undefined;
        bestTravelTime?: {
            descriptionEn?: string | undefined;
            weatherNotes?: string | undefined;
            crowdLevel?: "low" | "medium" | "high" | undefined;
            priceLevel?: "low" | "medium" | "high" | undefined;
            description: string;
            seasons: ("spring" | "summer" | "autumn" | "winter" | "all_year")[];
            months: number[];
        } | undefined;
        practicalInfo?: {
            tippingCustomEn?: string | undefined;
            waterSafetyNote?: string | undefined;
            visaRequired?: boolean | undefined;
            visaNote?: string | undefined;
            touristHotline?: string | undefined;
            voltage: string;
            plugType: string[];
            currency: string;
            currencySymbol: string;
            currencyNameLocal: string;
            currencyNameEn: string;
            tippingCustom: string;
            waterSafety: "safe" | "boil" | "bottled";
            languageOfficial: string[];
            languageCommon: string[];
            emergencyNumber: string;
            ambulanceNumber: string;
            fireNumber: string;
        } | undefined;
        sources?: string[] | undefined;
        createdAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        customs: {
            descriptionEn?: string | undefined;
            titleEn?: string | undefined;
            title: string;
            description: string;
            category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
            isTaboo: boolean;
            importance: "low" | "medium" | "high";
        }[];
        lastUpdatedAt: number;
    } | null;
    hasEncyclopedia: boolean;
    _id: import("convex/values").GenericId<"cities">;
    _creationTime: number;
    nameEn?: string | undefined;
    utcOffset?: number | undefined;
    dstOffset?: number | undefined;
    observesDst?: boolean | undefined;
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
    countryCode: string;
}[]>>;
