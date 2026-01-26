/**
 * Pathfinding Database Schema
 * Using Convex for data storage
 * Includes Convex Auth tables
 */
declare const _default: import("convex/server").SchemaDefinition<{
    profiles: import("convex/server").TableDefinition<import("convex/values").VObject<{
        phone?: string | undefined;
        displayName?: string | undefined;
        avatarUrl?: string | undefined;
        bio?: string | undefined;
        expoPushToken?: string | undefined;
        followersCount?: number | undefined;
        followingCount?: number | undefined;
        email: string;
    }, {
        email: import("convex/values").VString<string, "required">;
        phone: import("convex/values").VString<string | undefined, "optional">;
        displayName: import("convex/values").VString<string | undefined, "optional">;
        avatarUrl: import("convex/values").VString<string | undefined, "optional">;
        bio: import("convex/values").VString<string | undefined, "optional">;
        expoPushToken: import("convex/values").VString<string | undefined, "optional">;
        followersCount: import("convex/values").VFloat64<number | undefined, "optional">;
        followingCount: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "email" | "phone" | "displayName" | "avatarUrl" | "bio" | "expoPushToken" | "followersCount" | "followingCount">, {
        by_email: ["email", "_creationTime"];
        by_phone: ["phone", "_creationTime"];
    }, {}, {}>;
    userFollows: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        followerId: string;
        followingId: string;
    }, {
        followerId: import("convex/values").VString<string, "required">;
        followingId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "followerId" | "followingId">, {
        by_follower: ["followerId", "_creationTime"];
        by_following: ["followingId", "_creationTime"];
        by_follower_following: ["followerId", "followingId", "_creationTime"];
    }, {}, {}>;
    activityFeed: import("convex/server").TableDefinition<import("convex/values").VObject<{
        actorName?: string | undefined;
        actorAvatarUrl?: string | undefined;
        targetTitle?: string | undefined;
        targetCoverImageUrl?: string | undefined;
        targetUserName?: string | undefined;
        targetCityName?: string | undefined;
        updatedAt?: number | undefined;
        createdAt: number;
        likesCount: number;
        commentsCount: number;
        actorId: string;
        activityType: "new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user";
        targetType: "user" | "itinerary";
        targetId: string;
        visibility: "public" | "followers";
    }, {
        actorId: import("convex/values").VString<string, "required">;
        actorName: import("convex/values").VString<string | undefined, "optional">;
        actorAvatarUrl: import("convex/values").VString<string | undefined, "optional">;
        activityType: import("convex/values").VUnion<"new_itinerary" | "update_itinerary" | "like_itinerary" | "comment_itinerary" | "copy_itinerary" | "follow_user", [import("convex/values").VLiteral<"new_itinerary", "required">, import("convex/values").VLiteral<"update_itinerary", "required">, import("convex/values").VLiteral<"like_itinerary", "required">, import("convex/values").VLiteral<"comment_itinerary", "required">, import("convex/values").VLiteral<"copy_itinerary", "required">, import("convex/values").VLiteral<"follow_user", "required">], "required", never>;
        targetType: import("convex/values").VUnion<"user" | "itinerary", [import("convex/values").VLiteral<"itinerary", "required">, import("convex/values").VLiteral<"user", "required">], "required", never>;
        targetId: import("convex/values").VString<string, "required">;
        targetTitle: import("convex/values").VString<string | undefined, "optional">;
        targetCoverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        targetUserName: import("convex/values").VString<string | undefined, "optional">;
        targetCityName: import("convex/values").VString<string | undefined, "optional">;
        likesCount: import("convex/values").VFloat64<number, "required">;
        commentsCount: import("convex/values").VFloat64<number, "required">;
        visibility: import("convex/values").VUnion<"public" | "followers", [import("convex/values").VLiteral<"public", "required">, import("convex/values").VLiteral<"followers", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "createdAt" | "likesCount" | "commentsCount" | "actorId" | "actorName" | "actorAvatarUrl" | "activityType" | "targetType" | "targetId" | "targetTitle" | "targetCoverImageUrl" | "targetUserName" | "targetCityName" | "visibility" | "updatedAt">, {
        by_actor: ["actorId", "_creationTime"];
        by_target: ["targetType", "targetId", "_creationTime"];
        by_type: ["activityType", "_creationTime"];
        by_visibility: ["visibility", "_creationTime"];
        by_visibility_created: ["visibility", "createdAt", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_actor_created: ["actorId", "createdAt", "_creationTime"];
    }, {}, {}>;
    cities: import("convex/server").TableDefinition<import("convex/values").VObject<{
        nameEn?: string | undefined;
        utcOffset?: number | undefined;
        dstOffset?: number | undefined;
        observesDst?: boolean | undefined;
        name: string;
        latitude: number;
        longitude: number;
        timezone: string;
        countryCode: string;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        timezone: import("convex/values").VString<string, "required">;
        countryCode: import("convex/values").VString<string, "required">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        utcOffset: import("convex/values").VFloat64<number | undefined, "optional">;
        dstOffset: import("convex/values").VFloat64<number | undefined, "optional">;
        observesDst: import("convex/values").VBoolean<boolean | undefined, "optional">;
    }, "required", "name" | "latitude" | "longitude" | "nameEn" | "timezone" | "countryCode" | "utcOffset" | "dstOffset" | "observesDst">, {
        by_name: ["name", "_creationTime"];
        by_country: ["countryCode", "_creationTime"];
        by_timezone: ["timezone", "_creationTime"];
    }, {}, {}>;
    cityEncyclopedia: import("convex/server").TableDefinition<import("convex/values").VObject<{
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
        lastUpdatedAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        customs: {
            descriptionEn?: string | undefined;
            titleEn?: string | undefined;
            description: string;
            title: string;
            category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
            isTaboo: boolean;
            importance: "low" | "medium" | "high";
        }[];
    }, {
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
        basicInfo: import("convex/values").VObject<{
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
        } | undefined, {
            population: import("convex/values").VFloat64<number | undefined, "optional">;
            populationYear: import("convex/values").VFloat64<number | undefined, "optional">;
            area: import("convex/values").VFloat64<number | undefined, "optional">;
            elevation: import("convex/values").VFloat64<number | undefined, "optional">;
            climate: import("convex/values").VString<string | undefined, "optional">;
            climateEn: import("convex/values").VString<string | undefined, "optional">;
            motto: import("convex/values").VString<string | undefined, "optional">;
            mottoEn: import("convex/values").VString<string | undefined, "optional">;
            nicknames: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            nicknamesEn: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        }, "optional", "population" | "populationYear" | "area" | "elevation" | "climate" | "climateEn" | "motto" | "mottoEn" | "nicknames" | "nicknamesEn">;
        history: import("convex/values").VObject<{
            foundedYear?: number | undefined;
            historicalNames?: string[] | undefined;
            briefHistoryEn?: string | undefined;
            culturalHighlightsEn?: string[] | undefined;
            famousForEn?: string[] | undefined;
            worldHeritageSites?: string[] | undefined;
            briefHistory: string;
            culturalHighlights: string[];
            famousFor: string[];
        } | undefined, {
            foundedYear: import("convex/values").VFloat64<number | undefined, "optional">;
            historicalNames: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            briefHistory: import("convex/values").VString<string, "required">;
            briefHistoryEn: import("convex/values").VString<string | undefined, "optional">;
            culturalHighlights: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            culturalHighlightsEn: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            famousFor: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            famousForEn: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            worldHeritageSites: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        }, "optional", "foundedYear" | "historicalNames" | "briefHistory" | "briefHistoryEn" | "culturalHighlights" | "culturalHighlightsEn" | "famousFor" | "famousForEn" | "worldHeritageSites">;
        bestTravelTime: import("convex/values").VObject<{
            descriptionEn?: string | undefined;
            weatherNotes?: string | undefined;
            crowdLevel?: "low" | "medium" | "high" | undefined;
            priceLevel?: "low" | "medium" | "high" | undefined;
            description: string;
            seasons: ("spring" | "summer" | "autumn" | "winter" | "all_year")[];
            months: number[];
        } | undefined, {
            seasons: import("convex/values").VArray<("spring" | "summer" | "autumn" | "winter" | "all_year")[], import("convex/values").VUnion<"spring" | "summer" | "autumn" | "winter" | "all_year", [import("convex/values").VLiteral<"spring", "required">, import("convex/values").VLiteral<"summer", "required">, import("convex/values").VLiteral<"autumn", "required">, import("convex/values").VLiteral<"winter", "required">, import("convex/values").VLiteral<"all_year", "required">], "required", never>, "required">;
            months: import("convex/values").VArray<number[], import("convex/values").VFloat64<number, "required">, "required">;
            description: import("convex/values").VString<string, "required">;
            descriptionEn: import("convex/values").VString<string | undefined, "optional">;
            weatherNotes: import("convex/values").VString<string | undefined, "optional">;
            crowdLevel: import("convex/values").VUnion<"low" | "medium" | "high" | undefined, [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">], "optional", never>;
            priceLevel: import("convex/values").VUnion<"low" | "medium" | "high" | undefined, [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">], "optional", never>;
        }, "optional", "description" | "seasons" | "months" | "descriptionEn" | "weatherNotes" | "crowdLevel" | "priceLevel">;
        customs: import("convex/values").VArray<{
            descriptionEn?: string | undefined;
            titleEn?: string | undefined;
            description: string;
            title: string;
            category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
            isTaboo: boolean;
            importance: "low" | "medium" | "high";
        }[], import("convex/values").VObject<{
            descriptionEn?: string | undefined;
            titleEn?: string | undefined;
            description: string;
            title: string;
            category: "etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general";
            isTaboo: boolean;
            importance: "low" | "medium" | "high";
        }, {
            category: import("convex/values").VUnion<"etiquette" | "religion" | "dining" | "dress" | "gift" | "gesture" | "general", [import("convex/values").VLiteral<"etiquette", "required">, import("convex/values").VLiteral<"religion", "required">, import("convex/values").VLiteral<"dining", "required">, import("convex/values").VLiteral<"dress", "required">, import("convex/values").VLiteral<"gift", "required">, import("convex/values").VLiteral<"gesture", "required">, import("convex/values").VLiteral<"general", "required">], "required", never>;
            title: import("convex/values").VString<string, "required">;
            titleEn: import("convex/values").VString<string | undefined, "optional">;
            description: import("convex/values").VString<string, "required">;
            descriptionEn: import("convex/values").VString<string | undefined, "optional">;
            isTaboo: import("convex/values").VBoolean<boolean, "required">;
            importance: import("convex/values").VUnion<"low" | "medium" | "high", [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">], "required", never>;
        }, "required", "description" | "title" | "descriptionEn" | "category" | "titleEn" | "isTaboo" | "importance">, "required">;
        practicalInfo: import("convex/values").VObject<{
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
        } | undefined, {
            voltage: import("convex/values").VString<string, "required">;
            plugType: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            currency: import("convex/values").VString<string, "required">;
            currencySymbol: import("convex/values").VString<string, "required">;
            currencyNameLocal: import("convex/values").VString<string, "required">;
            currencyNameEn: import("convex/values").VString<string, "required">;
            tippingCustom: import("convex/values").VString<string, "required">;
            tippingCustomEn: import("convex/values").VString<string | undefined, "optional">;
            waterSafety: import("convex/values").VUnion<"safe" | "boil" | "bottled", [import("convex/values").VLiteral<"safe", "required">, import("convex/values").VLiteral<"boil", "required">, import("convex/values").VLiteral<"bottled", "required">], "required", never>;
            waterSafetyNote: import("convex/values").VString<string | undefined, "optional">;
            visaRequired: import("convex/values").VBoolean<boolean | undefined, "optional">;
            visaNote: import("convex/values").VString<string | undefined, "optional">;
            languageOfficial: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            languageCommon: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            emergencyNumber: import("convex/values").VString<string, "required">;
            ambulanceNumber: import("convex/values").VString<string, "required">;
            fireNumber: import("convex/values").VString<string, "required">;
            touristHotline: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "voltage" | "plugType" | "currency" | "currencySymbol" | "currencyNameLocal" | "currencyNameEn" | "tippingCustom" | "tippingCustomEn" | "waterSafety" | "waterSafetyNote" | "visaRequired" | "visaNote" | "languageOfficial" | "languageCommon" | "emergencyNumber" | "ambulanceNumber" | "fireNumber" | "touristHotline">;
        sources: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        lastUpdatedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "lastUpdatedAt" | "cityId" | "basicInfo" | "history" | "bestTravelTime" | "customs" | "practicalInfo" | "sources" | "basicInfo.population" | "basicInfo.populationYear" | "basicInfo.area" | "basicInfo.elevation" | "basicInfo.climate" | "basicInfo.climateEn" | "basicInfo.motto" | "basicInfo.mottoEn" | "basicInfo.nicknames" | "basicInfo.nicknamesEn" | "history.foundedYear" | "history.historicalNames" | "history.briefHistory" | "history.briefHistoryEn" | "history.culturalHighlights" | "history.culturalHighlightsEn" | "history.famousFor" | "history.famousForEn" | "history.worldHeritageSites" | "bestTravelTime.description" | "bestTravelTime.seasons" | "bestTravelTime.months" | "bestTravelTime.descriptionEn" | "bestTravelTime.weatherNotes" | "bestTravelTime.crowdLevel" | "bestTravelTime.priceLevel" | "practicalInfo.voltage" | "practicalInfo.plugType" | "practicalInfo.currency" | "practicalInfo.currencySymbol" | "practicalInfo.currencyNameLocal" | "practicalInfo.currencyNameEn" | "practicalInfo.tippingCustom" | "practicalInfo.tippingCustomEn" | "practicalInfo.waterSafety" | "practicalInfo.waterSafetyNote" | "practicalInfo.visaRequired" | "practicalInfo.visaNote" | "practicalInfo.languageOfficial" | "practicalInfo.languageCommon" | "practicalInfo.emergencyNumber" | "practicalInfo.ambulanceNumber" | "practicalInfo.fireNumber" | "practicalInfo.touristHotline">, {
        by_city: ["cityId", "_creationTime"];
    }, {}, {}>;
    userTimezoneSettings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        homeCityId?: import("convex/values").GenericId<"cities"> | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        homeTimezone: string;
        displayFormat: "24h" | "12h";
        showSeconds: boolean;
        autoDetect: boolean;
        savedClocks: {
            label?: string | undefined;
            cityId: import("convex/values").GenericId<"cities">;
            sortOrder: number;
        }[];
    }, {
        userId: import("convex/values").VString<string, "required">;
        homeTimezone: import("convex/values").VString<string, "required">;
        homeCityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
        displayFormat: import("convex/values").VUnion<"24h" | "12h", [import("convex/values").VLiteral<"12h", "required">, import("convex/values").VLiteral<"24h", "required">], "required", never>;
        showSeconds: import("convex/values").VBoolean<boolean, "required">;
        autoDetect: import("convex/values").VBoolean<boolean, "required">;
        savedClocks: import("convex/values").VArray<{
            label?: string | undefined;
            cityId: import("convex/values").GenericId<"cities">;
            sortOrder: number;
        }[], import("convex/values").VObject<{
            label?: string | undefined;
            cityId: import("convex/values").GenericId<"cities">;
            sortOrder: number;
        }, {
            cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
            label: import("convex/values").VString<string | undefined, "optional">;
            sortOrder: import("convex/values").VFloat64<number, "required">;
        }, "required", "cityId" | "label" | "sortOrder">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "homeTimezone" | "homeCityId" | "displayFormat" | "showSeconds" | "autoDetect" | "savedClocks">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    pois: import("convex/server").TableDefinition<import("convex/values").VObject<{
        imageUrls?: string[] | undefined;
        phone?: string | undefined;
        nameEn?: string | undefined;
        priceLevel?: number | undefined;
        externalId?: string | undefined;
        address?: string | undefined;
        rating?: number | undefined;
        businessHours?: {
            timezone?: string | undefined;
            monday?: {
                open: string;
                close: string;
            }[] | undefined;
            tuesday?: {
                open: string;
                close: string;
            }[] | undefined;
            wednesday?: {
                open: string;
                close: string;
            }[] | undefined;
            thursday?: {
                open: string;
                close: string;
            }[] | undefined;
            friday?: {
                open: string;
                close: string;
            }[] | undefined;
            saturday?: {
                open: string;
                close: string;
            }[] | undefined;
            sunday?: {
                open: string;
                close: string;
            }[] | undefined;
            notes?: string | undefined;
        } | undefined;
        bestVisitTime?: {
            recommendedTime?: string | undefined;
            reason?: string | undefined;
            avoidTimes?: string[] | undefined;
            peakHours?: string[] | undefined;
            seasonalNotes?: string | undefined;
        } | undefined;
        isHiddenGem?: boolean | undefined;
        hiddenGemScore?: number | undefined;
        hiddenGemRating?: number | undefined;
        hiddenGemRatingCount?: number | undefined;
        localRecommendation?: {
            localTips?: string | undefined;
            bestTimeToVisit?: string | undefined;
            localSecrets?: string[] | undefined;
            recommendedBy?: string | undefined;
            isLocalRecommended: boolean;
        } | undefined;
        popularityLevel?: "hidden" | "emerging" | "moderate" | "popular" | "crowded" | undefined;
        cuisineType?: string | undefined;
        isLocalFavorite?: boolean | undefined;
        signatureDishes?: string[] | undefined;
        dietaryOptions?: string[] | undefined;
        averagePrice?: number | undefined;
        name: string;
        latitude: number;
        longitude: number;
        cityId: import("convex/values").GenericId<"cities">;
        category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
        ratingCount: number;
        source: string;
    }, {
        externalId: import("convex/values").VString<string | undefined, "optional">;
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        category: import("convex/values").VUnion<"attraction" | "restaurant" | "hotel" | "shopping" | "other", [import("convex/values").VLiteral<"attraction", "required">, import("convex/values").VLiteral<"restaurant", "required">, import("convex/values").VLiteral<"hotel", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
        address: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        ratingCount: import("convex/values").VFloat64<number, "required">;
        priceLevel: import("convex/values").VFloat64<number | undefined, "optional">;
        businessHours: import("convex/values").VObject<{
            timezone?: string | undefined;
            monday?: {
                open: string;
                close: string;
            }[] | undefined;
            tuesday?: {
                open: string;
                close: string;
            }[] | undefined;
            wednesday?: {
                open: string;
                close: string;
            }[] | undefined;
            thursday?: {
                open: string;
                close: string;
            }[] | undefined;
            friday?: {
                open: string;
                close: string;
            }[] | undefined;
            saturday?: {
                open: string;
                close: string;
            }[] | undefined;
            sunday?: {
                open: string;
                close: string;
            }[] | undefined;
            notes?: string | undefined;
        } | undefined, {
            monday: import("convex/values").VArray<{
                open: string;
                close: string;
            }[] | undefined, import("convex/values").VObject<{
                open: string;
                close: string;
            }, {
                open: import("convex/values").VString<string, "required">;
                close: import("convex/values").VString<string, "required">;
            }, "required", "open" | "close">, "optional">;
            tuesday: import("convex/values").VArray<{
                open: string;
                close: string;
            }[] | undefined, import("convex/values").VObject<{
                open: string;
                close: string;
            }, {
                open: import("convex/values").VString<string, "required">;
                close: import("convex/values").VString<string, "required">;
            }, "required", "open" | "close">, "optional">;
            wednesday: import("convex/values").VArray<{
                open: string;
                close: string;
            }[] | undefined, import("convex/values").VObject<{
                open: string;
                close: string;
            }, {
                open: import("convex/values").VString<string, "required">;
                close: import("convex/values").VString<string, "required">;
            }, "required", "open" | "close">, "optional">;
            thursday: import("convex/values").VArray<{
                open: string;
                close: string;
            }[] | undefined, import("convex/values").VObject<{
                open: string;
                close: string;
            }, {
                open: import("convex/values").VString<string, "required">;
                close: import("convex/values").VString<string, "required">;
            }, "required", "open" | "close">, "optional">;
            friday: import("convex/values").VArray<{
                open: string;
                close: string;
            }[] | undefined, import("convex/values").VObject<{
                open: string;
                close: string;
            }, {
                open: import("convex/values").VString<string, "required">;
                close: import("convex/values").VString<string, "required">;
            }, "required", "open" | "close">, "optional">;
            saturday: import("convex/values").VArray<{
                open: string;
                close: string;
            }[] | undefined, import("convex/values").VObject<{
                open: string;
                close: string;
            }, {
                open: import("convex/values").VString<string, "required">;
                close: import("convex/values").VString<string, "required">;
            }, "required", "open" | "close">, "optional">;
            sunday: import("convex/values").VArray<{
                open: string;
                close: string;
            }[] | undefined, import("convex/values").VObject<{
                open: string;
                close: string;
            }, {
                open: import("convex/values").VString<string, "required">;
                close: import("convex/values").VString<string, "required">;
            }, "required", "open" | "close">, "optional">;
            timezone: import("convex/values").VString<string | undefined, "optional">;
            notes: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "timezone" | "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" | "notes">;
        bestVisitTime: import("convex/values").VObject<{
            recommendedTime?: string | undefined;
            reason?: string | undefined;
            avoidTimes?: string[] | undefined;
            peakHours?: string[] | undefined;
            seasonalNotes?: string | undefined;
        } | undefined, {
            recommendedTime: import("convex/values").VString<string | undefined, "optional">;
            reason: import("convex/values").VString<string | undefined, "optional">;
            avoidTimes: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            peakHours: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            seasonalNotes: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "recommendedTime" | "reason" | "avoidTimes" | "peakHours" | "seasonalNotes">;
        phone: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        source: import("convex/values").VString<string, "required">;
        isHiddenGem: import("convex/values").VBoolean<boolean | undefined, "optional">;
        hiddenGemScore: import("convex/values").VFloat64<number | undefined, "optional">;
        hiddenGemRating: import("convex/values").VFloat64<number | undefined, "optional">;
        hiddenGemRatingCount: import("convex/values").VFloat64<number | undefined, "optional">;
        localRecommendation: import("convex/values").VObject<{
            localTips?: string | undefined;
            bestTimeToVisit?: string | undefined;
            localSecrets?: string[] | undefined;
            recommendedBy?: string | undefined;
            isLocalRecommended: boolean;
        } | undefined, {
            isLocalRecommended: import("convex/values").VBoolean<boolean, "required">;
            localTips: import("convex/values").VString<string | undefined, "optional">;
            bestTimeToVisit: import("convex/values").VString<string | undefined, "optional">;
            localSecrets: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            recommendedBy: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "isLocalRecommended" | "localTips" | "bestTimeToVisit" | "localSecrets" | "recommendedBy">;
        popularityLevel: import("convex/values").VUnion<"hidden" | "emerging" | "moderate" | "popular" | "crowded" | undefined, [import("convex/values").VLiteral<"hidden", "required">, import("convex/values").VLiteral<"emerging", "required">, import("convex/values").VLiteral<"moderate", "required">, import("convex/values").VLiteral<"popular", "required">, import("convex/values").VLiteral<"crowded", "required">], "optional", never>;
        cuisineType: import("convex/values").VString<string | undefined, "optional">;
        isLocalFavorite: import("convex/values").VBoolean<boolean | undefined, "optional">;
        signatureDishes: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        dietaryOptions: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        averagePrice: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "name" | "imageUrls" | "latitude" | "longitude" | "phone" | "nameEn" | "cityId" | "priceLevel" | "category" | "externalId" | "address" | "rating" | "ratingCount" | "businessHours" | "bestVisitTime" | "source" | "isHiddenGem" | "hiddenGemScore" | "hiddenGemRating" | "hiddenGemRatingCount" | "localRecommendation" | "popularityLevel" | "cuisineType" | "isLocalFavorite" | "signatureDishes" | "dietaryOptions" | "averagePrice" | "businessHours.timezone" | "businessHours.monday" | "businessHours.tuesday" | "businessHours.wednesday" | "businessHours.thursday" | "businessHours.friday" | "businessHours.saturday" | "businessHours.sunday" | "businessHours.notes" | "bestVisitTime.recommendedTime" | "bestVisitTime.reason" | "bestVisitTime.avoidTimes" | "bestVisitTime.peakHours" | "bestVisitTime.seasonalNotes" | "localRecommendation.isLocalRecommended" | "localRecommendation.localTips" | "localRecommendation.bestTimeToVisit" | "localRecommendation.localSecrets" | "localRecommendation.recommendedBy">, {
        by_city: ["cityId", "_creationTime"];
        by_category: ["category", "_creationTime"];
        by_city_category: ["cityId", "category", "_creationTime"];
        by_external_source: ["externalId", "source", "_creationTime"];
        by_hidden_gem: ["isHiddenGem", "_creationTime"];
        by_city_hidden_gem: ["cityId", "isHiddenGem", "_creationTime"];
        by_popularity_level: ["popularityLevel", "_creationTime"];
    }, {}, {}>;
    userSubmittedPois: import("convex/server").TableDefinition<import("convex/values").VObject<{
        imageUrls?: string[] | undefined;
        updatedAt?: number | undefined;
        nameEn?: string | undefined;
        address?: string | undefined;
        avoidTimes?: string | undefined;
        localTips?: string | undefined;
        bestTimeToVisit?: string | undefined;
        localSecrets?: string[] | undefined;
        priceRange?: string | undefined;
        howDiscovered?: string | undefined;
        moderatorNotes?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        mergedPoiId?: import("convex/values").GenericId<"pois"> | undefined;
        status: "approved" | "rejected" | "pending" | "merged";
        createdAt: number;
        name: string;
        description: string;
        latitude: number;
        longitude: number;
        userId: string;
        cityId: import("convex/values").GenericId<"cities">;
        category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
        upvotes: number;
        downvotes: number;
        viewCount: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        category: import("convex/values").VUnion<"attraction" | "restaurant" | "hotel" | "shopping" | "other", [import("convex/values").VLiteral<"attraction", "required">, import("convex/values").VLiteral<"restaurant", "required">, import("convex/values").VLiteral<"hotel", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
        address: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        description: import("convex/values").VString<string, "required">;
        localTips: import("convex/values").VString<string | undefined, "optional">;
        bestTimeToVisit: import("convex/values").VString<string | undefined, "optional">;
        priceRange: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        howDiscovered: import("convex/values").VString<string | undefined, "optional">;
        localSecrets: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        avoidTimes: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"approved" | "rejected" | "pending" | "merged", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"rejected", "required">, import("convex/values").VLiteral<"merged", "required">], "required", never>;
        moderatorNotes: import("convex/values").VString<string | undefined, "optional">;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
        reviewedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        mergedPoiId: import("convex/values").VId<import("convex/values").GenericId<"pois"> | undefined, "optional">;
        upvotes: import("convex/values").VFloat64<number, "required">;
        downvotes: import("convex/values").VFloat64<number, "required">;
        viewCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "status" | "createdAt" | "name" | "description" | "imageUrls" | "latitude" | "longitude" | "userId" | "updatedAt" | "nameEn" | "cityId" | "category" | "address" | "avoidTimes" | "localTips" | "bestTimeToVisit" | "localSecrets" | "priceRange" | "howDiscovered" | "moderatorNotes" | "reviewedBy" | "reviewedAt" | "mergedPoiId" | "upvotes" | "downvotes" | "viewCount">, {
        by_user: ["userId", "_creationTime"];
        by_city: ["cityId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_city_status: ["cityId", "status", "_creationTime"];
        by_category: ["category", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    userSubmittedPoiVotes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        poiId: import("convex/values").GenericId<"userSubmittedPois">;
        voteType: "up" | "down";
    }, {
        poiId: import("convex/values").VId<import("convex/values").GenericId<"userSubmittedPois">, "required">;
        userId: import("convex/values").VString<string, "required">;
        voteType: import("convex/values").VUnion<"up" | "down", [import("convex/values").VLiteral<"up", "required">, import("convex/values").VLiteral<"down", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "poiId" | "voteType">, {
        by_poi: ["poiId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_poi_user: ["poiId", "userId", "_creationTime"];
    }, {}, {}>;
    hiddenGemRatings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number | undefined;
        review?: string | undefined;
        visitDate?: string | undefined;
        createdAt: number;
        userId: string;
        rating: number;
        poiId: import("convex/values").GenericId<"pois">;
        wouldRecommend: boolean;
    }, {
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        userId: import("convex/values").VString<string, "required">;
        rating: import("convex/values").VFloat64<number, "required">;
        review: import("convex/values").VString<string | undefined, "optional">;
        visitDate: import("convex/values").VString<string | undefined, "optional">;
        wouldRecommend: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "rating" | "poiId" | "review" | "visitDate" | "wouldRecommend">, {
        by_poi: ["poiId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_poi_user: ["poiId", "userId", "_creationTime"];
        by_rating: ["rating", "_creationTime"];
    }, {}, {}>;
    poiHolidayHours: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        holidayNameEn?: string | undefined;
        hours?: {
            open: string;
            close: string;
        }[] | undefined;
        createdAt: number;
        startDate: string;
        endDate: string;
        updatedAt: number;
        poiId: import("convex/values").GenericId<"pois">;
        holidayName: string;
        isClosed: boolean;
        isRecurring: boolean;
    }, {
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        holidayName: import("convex/values").VString<string, "required">;
        holidayNameEn: import("convex/values").VString<string | undefined, "optional">;
        startDate: import("convex/values").VString<string, "required">;
        endDate: import("convex/values").VString<string, "required">;
        isClosed: import("convex/values").VBoolean<boolean, "required">;
        hours: import("convex/values").VArray<{
            open: string;
            close: string;
        }[] | undefined, import("convex/values").VObject<{
            open: string;
            close: string;
        }, {
            open: import("convex/values").VString<string, "required">;
            close: import("convex/values").VString<string, "required">;
        }, "required", "open" | "close">, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        isRecurring: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "startDate" | "endDate" | "updatedAt" | "notes" | "poiId" | "holidayName" | "holidayNameEn" | "isClosed" | "hours" | "isRecurring">, {
        by_poi: ["poiId", "_creationTime"];
        by_poi_dates: ["poiId", "startDate", "endDate", "_creationTime"];
        by_dates: ["startDate", "endDate", "_creationTime"];
    }, {}, {}>;
    poiBusinessHoursReminders: import("convex/server").TableDefinition<import("convex/values").VObject<{
        itineraryItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
        triggeredAt?: number | undefined;
        createdAt: number;
        userId: string;
        poiId: import("convex/values").GenericId<"pois">;
        reminderType: "opening" | "closing" | "best_time";
        minutesBefore: number;
        scheduledTime: number;
        isTriggered: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        itineraryItemId: import("convex/values").VId<import("convex/values").GenericId<"itineraryItems"> | undefined, "optional">;
        reminderType: import("convex/values").VUnion<"opening" | "closing" | "best_time", [import("convex/values").VLiteral<"opening", "required">, import("convex/values").VLiteral<"closing", "required">, import("convex/values").VLiteral<"best_time", "required">], "required", never>;
        minutesBefore: import("convex/values").VFloat64<number, "required">;
        scheduledTime: import("convex/values").VFloat64<number, "required">;
        isTriggered: import("convex/values").VBoolean<boolean, "required">;
        triggeredAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "poiId" | "itineraryItemId" | "reminderType" | "minutesBefore" | "scheduledTime" | "isTriggered" | "triggeredAt">, {
        by_user: ["userId", "_creationTime"];
        by_poi: ["poiId", "_creationTime"];
        by_user_poi: ["userId", "poiId", "_creationTime"];
        by_scheduled_time: ["scheduledTime", "_creationTime"];
        by_itinerary_item: ["itineraryItemId", "_creationTime"];
    }, {}, {}>;
    itineraries: import("convex/server").TableDefinition<import("convex/values").VObject<{
        coverImageUrl?: string | undefined;
        copiedFromId?: import("convex/values").GenericId<"itineraries"> | undefined;
        title: string;
        userId: string;
        startDate: string;
        endDate: string;
        visibility: "public" | "private" | "team";
        cityId: import("convex/values").GenericId<"cities">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
        startDate: import("convex/values").VString<string, "required">;
        endDate: import("convex/values").VString<string, "required">;
        visibility: import("convex/values").VUnion<"public" | "private" | "team", [import("convex/values").VLiteral<"private", "required">, import("convex/values").VLiteral<"team", "required">, import("convex/values").VLiteral<"public", "required">], "required", never>;
        coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        copiedFromId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
    }, "required", "title" | "coverImageUrl" | "userId" | "startDate" | "endDate" | "visibility" | "cityId" | "copiedFromId">, {
        by_user: ["userId", "_creationTime"];
        by_visibility: ["visibility", "_creationTime"];
        by_city: ["cityId", "_creationTime"];
        by_visibility_city: ["visibility", "cityId", "_creationTime"];
        by_user_visibility: ["userId", "visibility", "_creationTime"];
    }, {}, {}>;
    itineraryCollaborators: import("convex/server").TableDefinition<import("convex/values").VObject<{
        role: "owner" | "editor" | "viewer";
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        role: import("convex/values").VUnion<"owner" | "editor" | "viewer", [import("convex/values").VLiteral<"owner", "required">, import("convex/values").VLiteral<"editor", "required">, import("convex/values").VLiteral<"viewer", "required">], "required", never>;
    }, "required", "role" | "userId" | "itineraryId">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_itinerary_user: ["itineraryId", "userId", "_creationTime"];
    }, {}, {}>;
    collaboratorPresence: import("convex/server").TableDefinition<import("convex/values").VObject<{
        displayName?: string | undefined;
        avatarUrl?: string | undefined;
        currentDayId?: import("convex/values").GenericId<"itineraryDays"> | undefined;
        currentItemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
        cursorPosition?: {
            offset?: number | undefined;
            field: string;
        } | undefined;
        selectedElements?: {
            type: "day" | "item" | "poi";
            id: string;
        }[] | undefined;
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        color: string;
        lastActiveAt: number;
        isOnline: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        displayName: import("convex/values").VString<string | undefined, "optional">;
        avatarUrl: import("convex/values").VString<string | undefined, "optional">;
        color: import("convex/values").VString<string, "required">;
        lastActiveAt: import("convex/values").VFloat64<number, "required">;
        isOnline: import("convex/values").VBoolean<boolean, "required">;
        currentDayId: import("convex/values").VId<import("convex/values").GenericId<"itineraryDays"> | undefined, "optional">;
        currentItemId: import("convex/values").VId<import("convex/values").GenericId<"itineraryItems"> | undefined, "optional">;
        cursorPosition: import("convex/values").VObject<{
            offset?: number | undefined;
            field: string;
        } | undefined, {
            field: import("convex/values").VString<string, "required">;
            offset: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "optional", "field" | "offset">;
        selectedElements: import("convex/values").VArray<{
            type: "day" | "item" | "poi";
            id: string;
        }[] | undefined, import("convex/values").VObject<{
            type: "day" | "item" | "poi";
            id: string;
        }, {
            type: import("convex/values").VUnion<"day" | "item" | "poi", [import("convex/values").VLiteral<"day", "required">, import("convex/values").VLiteral<"item", "required">, import("convex/values").VLiteral<"poi", "required">], "required", never>;
            id: import("convex/values").VString<string, "required">;
        }, "required", "type" | "id">, "optional">;
    }, "required", "userId" | "displayName" | "avatarUrl" | "itineraryId" | "color" | "lastActiveAt" | "isOnline" | "currentDayId" | "currentItemId" | "cursorPosition" | "selectedElements" | "cursorPosition.field" | "cursorPosition.offset">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_itinerary_user: ["itineraryId", "userId", "_creationTime"];
        by_itinerary_online: ["itineraryId", "isOnline", "_creationTime"];
    }, {}, {}>;
    editOperations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        conflictResolution?: {
            resolvedBy: string;
            resolvedAt: number;
            resolution: "accept_mine" | "accept_theirs" | "merge";
        } | undefined;
        status: "rejected" | "pending" | "applied" | "conflicted";
        version: number;
        timestamp: number;
        userId: string;
        targetType: "itinerary" | "day" | "item";
        targetId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        operationType: "create" | "update" | "delete" | "reorder";
        changes: any;
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        userId: import("convex/values").VString<string, "required">;
        operationType: import("convex/values").VUnion<"create" | "update" | "delete" | "reorder", [import("convex/values").VLiteral<"create", "required">, import("convex/values").VLiteral<"update", "required">, import("convex/values").VLiteral<"delete", "required">, import("convex/values").VLiteral<"reorder", "required">], "required", never>;
        targetType: import("convex/values").VUnion<"itinerary" | "day" | "item", [import("convex/values").VLiteral<"itinerary", "required">, import("convex/values").VLiteral<"day", "required">, import("convex/values").VLiteral<"item", "required">], "required", never>;
        targetId: import("convex/values").VString<string, "required">;
        changes: import("convex/values").VAny<any, "required", string>;
        timestamp: import("convex/values").VFloat64<number, "required">;
        version: import("convex/values").VFloat64<number, "required">;
        status: import("convex/values").VUnion<"rejected" | "pending" | "applied" | "conflicted", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"applied", "required">, import("convex/values").VLiteral<"conflicted", "required">, import("convex/values").VLiteral<"rejected", "required">], "required", never>;
        conflictResolution: import("convex/values").VObject<{
            resolvedBy: string;
            resolvedAt: number;
            resolution: "accept_mine" | "accept_theirs" | "merge";
        } | undefined, {
            resolvedBy: import("convex/values").VString<string, "required">;
            resolvedAt: import("convex/values").VFloat64<number, "required">;
            resolution: import("convex/values").VUnion<"accept_mine" | "accept_theirs" | "merge", [import("convex/values").VLiteral<"accept_mine", "required">, import("convex/values").VLiteral<"accept_theirs", "required">, import("convex/values").VLiteral<"merge", "required">], "required", never>;
        }, "optional", "resolvedBy" | "resolvedAt" | "resolution">;
    }, "required", "status" | "version" | "timestamp" | "userId" | "targetType" | "targetId" | "itineraryId" | "operationType" | "changes" | "conflictResolution" | `changes.${string}` | "conflictResolution.resolvedBy" | "conflictResolution.resolvedAt" | "conflictResolution.resolution">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_itinerary_timestamp: ["itineraryId", "timestamp", "_creationTime"];
        by_itinerary_status: ["itineraryId", "status", "_creationTime"];
    }, {}, {}>;
    itineraryCopyHistory: import("convex/server").TableDefinition<import("convex/values").VObject<{
        selectedDays?: number[] | undefined;
        createdAt: number;
        userId: string;
        originalItineraryId: import("convex/values").GenericId<"itineraries">;
        copiedItineraryId: import("convex/values").GenericId<"itineraries">;
        copyType: "partial" | "full";
        originalStartDate: string;
        newStartDate: string;
        dateOffset: number;
    }, {
        originalItineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        copiedItineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        userId: import("convex/values").VString<string, "required">;
        copyType: import("convex/values").VUnion<"partial" | "full", [import("convex/values").VLiteral<"full", "required">, import("convex/values").VLiteral<"partial", "required">], "required", never>;
        selectedDays: import("convex/values").VArray<number[] | undefined, import("convex/values").VFloat64<number, "required">, "optional">;
        originalStartDate: import("convex/values").VString<string, "required">;
        newStartDate: import("convex/values").VString<string, "required">;
        dateOffset: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "originalItineraryId" | "copiedItineraryId" | "copyType" | "selectedDays" | "originalStartDate" | "newStartDate" | "dateOffset">, {
        by_user: ["userId", "_creationTime"];
        by_original: ["originalItineraryId", "_creationTime"];
        by_copied: ["copiedItineraryId", "_creationTime"];
        by_user_created: ["userId", "createdAt", "_creationTime"];
    }, {}, {}>;
    itineraryDays: import("convex/server").TableDefinition<import("convex/values").VObject<{
        date: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        dayNumber: number;
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        dayNumber: import("convex/values").VFloat64<number, "required">;
        date: import("convex/values").VString<string, "required">;
    }, "required", "date" | "itineraryId" | "dayNumber">, {
        by_itinerary: ["itineraryId", "_creationTime"];
    }, {}, {}>;
    itineraryItems: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        startTime?: string | undefined;
        endTime?: string | undefined;
        poiId: import("convex/values").GenericId<"pois">;
        dayId: import("convex/values").GenericId<"itineraryDays">;
        orderIndex: number;
        transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
    }, {
        dayId: import("convex/values").VId<import("convex/values").GenericId<"itineraryDays">, "required">;
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        orderIndex: import("convex/values").VFloat64<number, "required">;
        startTime: import("convex/values").VString<string | undefined, "optional">;
        endTime: import("convex/values").VString<string | undefined, "optional">;
        transportMode: import("convex/values").VUnion<"walking" | "driving" | "transit" | "cycling" | "taxi", [import("convex/values").VLiteral<"walking", "required">, import("convex/values").VLiteral<"driving", "required">, import("convex/values").VLiteral<"transit", "required">, import("convex/values").VLiteral<"cycling", "required">, import("convex/values").VLiteral<"taxi", "required">], "required", never>;
        notes: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "notes" | "poiId" | "dayId" | "orderIndex" | "startTime" | "endTime" | "transportMode">, {
        by_day: ["dayId", "_creationTime"];
    }, {}, {}>;
    reminders: import("convex/server").TableDefinition<import("convex/values").VObject<{
        triggeredAt?: number | undefined;
        itemId?: import("convex/values").GenericId<"itineraryItems"> | undefined;
        message: string;
        userId: string;
        isTriggered: boolean;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        reminderTime: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        itemId: import("convex/values").VId<import("convex/values").GenericId<"itineraryItems"> | undefined, "optional">;
        reminderTime: import("convex/values").VFloat64<number, "required">;
        message: import("convex/values").VString<string, "required">;
        isTriggered: import("convex/values").VBoolean<boolean, "required">;
        triggeredAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "message" | "userId" | "isTriggered" | "triggeredAt" | "itineraryId" | "itemId" | "reminderTime">, {
        by_user: ["userId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_reminder_time: ["reminderTime", "_creationTime"];
    }, {}, {}>;
    crawlJobs: import("convex/server").TableDefinition<import("convex/values").VObject<{
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
        platform: string;
        config: any;
        jobType: string;
    }, {
        name: import("convex/values").VString<string, "required">;
        platform: import("convex/values").VString<string, "required">;
        jobType: import("convex/values").VString<string, "required">;
        config: import("convex/values").VAny<any, "required", string>;
        scheduleCron: import("convex/values").VString<string | undefined, "optional">;
        nextRunAt: import("convex/values").VFloat64<number | undefined, "optional">;
        status: import("convex/values").VString<string, "required">;
        startedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        completedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        statistics: import("convex/values").VAny<any, "optional", string>;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        retryCount: import("convex/values").VFloat64<number | undefined, "optional">;
        lastFailureAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastFailureReason: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "name" | "platform" | "errorMessage" | "config" | "jobType" | "scheduleCron" | "nextRunAt" | "startedAt" | "completedAt" | "statistics" | "retryCount" | "lastFailureAt" | "lastFailureReason" | `config.${string}` | `statistics.${string}`>, {
        by_status: ["status", "_creationTime"];
        by_platform: ["platform", "_creationTime"];
    }, {}, {}>;
    rawCrawlRecords: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceUrl: string;
        jobId: import("convex/values").GenericId<"crawlJobs">;
        rawData: any;
        crawledAt: number;
        processingStatus: string;
    }, {
        jobId: import("convex/values").VId<import("convex/values").GenericId<"crawlJobs">, "required">;
        sourceUrl: import("convex/values").VString<string, "required">;
        rawData: import("convex/values").VAny<any, "required", string>;
        crawledAt: import("convex/values").VFloat64<number, "required">;
        processingStatus: import("convex/values").VString<string, "required">;
    }, "required", "sourceUrl" | "jobId" | "rawData" | "crawledAt" | "processingStatus" | `rawData.${string}`>, {
        by_job: ["jobId", "_creationTime"];
        by_job_status: ["jobId", "processingStatus", "_creationTime"];
        by_status: ["processingStatus", "_creationTime"];
    }, {}, {}>;
    normalizedPois: import("convex/server").TableDefinition<import("convex/values").VObject<{
        imageUrls?: string[] | undefined;
        phone?: string | undefined;
        nameEn?: string | undefined;
        priceLevel?: number | undefined;
        address?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        businessHours?: any;
        sourceMappingId?: import("convex/values").GenericId<"poiSourceMappings"> | undefined;
        name: string;
        latitude: number;
        longitude: number;
        category: string;
        normalizedAt: number;
        confidence: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        category: import("convex/values").VString<string, "required">;
        address: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        ratingCount: import("convex/values").VFloat64<number | undefined, "optional">;
        priceLevel: import("convex/values").VFloat64<number | undefined, "optional">;
        businessHours: import("convex/values").VAny<any, "optional", string>;
        phone: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        normalizedAt: import("convex/values").VFloat64<number, "required">;
        confidence: import("convex/values").VFloat64<number, "required">;
        sourceMappingId: import("convex/values").VId<import("convex/values").GenericId<"poiSourceMappings"> | undefined, "optional">;
    }, "required", "name" | "imageUrls" | "latitude" | "longitude" | "phone" | "nameEn" | "priceLevel" | "category" | "address" | "rating" | "ratingCount" | "businessHours" | "normalizedAt" | "confidence" | "sourceMappingId" | `businessHours.${string}`>, {
        by_category: ["category", "_creationTime"];
        by_confidence: ["confidence", "_creationTime"];
        by_category_confidence: ["category", "confidence", "_creationTime"];
    }, {}, {}>;
    poiTickets: import("convex/server").TableDefinition<import("convex/values").VObject<{
        currency?: string | undefined;
        source?: string | undefined;
        originalPrice?: number | undefined;
        discountInfo?: string | undefined;
        discountPercentage?: number | undefined;
        eligibilityRequirements?: string | undefined;
        ageRange?: {
            minAge?: number | undefined;
            maxAge?: number | undefined;
        } | undefined;
        validFrom?: number | undefined;
        validUntil?: number | undefined;
        validDays?: number | undefined;
        purchaseUrl?: string | undefined;
        purchasePlatform?: string | undefined;
        reservationUrl?: string | undefined;
        reservationTips?: string | undefined;
        advanceBookingDays?: number | undefined;
        usageInstructions?: string | undefined;
        includedServices?: string[] | undefined;
        excludedServices?: string[] | undefined;
        stockStatus?: "unknown" | "in_stock" | "low_stock" | "sold_out" | undefined;
        isRecommended?: boolean | undefined;
        lastSyncedAt?: number | undefined;
        createdAt: number;
        updatedAt: number;
        sortOrder: number;
        poiId: import("convex/values").GenericId<"pois">;
        ticketName: string;
        ticketType: "other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free";
        price: number;
        requiresReservation: boolean;
        isActive: boolean;
    }, {
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        ticketName: import("convex/values").VString<string, "required">;
        ticketType: import("convex/values").VUnion<"other" | "adult" | "student" | "senior" | "child" | "group" | "family" | "vip" | "free", [import("convex/values").VLiteral<"adult", "required">, import("convex/values").VLiteral<"student", "required">, import("convex/values").VLiteral<"senior", "required">, import("convex/values").VLiteral<"child", "required">, import("convex/values").VLiteral<"group", "required">, import("convex/values").VLiteral<"family", "required">, import("convex/values").VLiteral<"vip", "required">, import("convex/values").VLiteral<"free", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        price: import("convex/values").VFloat64<number, "required">;
        originalPrice: import("convex/values").VFloat64<number | undefined, "optional">;
        currency: import("convex/values").VString<string | undefined, "optional">;
        discountInfo: import("convex/values").VString<string | undefined, "optional">;
        discountPercentage: import("convex/values").VFloat64<number | undefined, "optional">;
        eligibilityRequirements: import("convex/values").VString<string | undefined, "optional">;
        ageRange: import("convex/values").VObject<{
            minAge?: number | undefined;
            maxAge?: number | undefined;
        } | undefined, {
            minAge: import("convex/values").VFloat64<number | undefined, "optional">;
            maxAge: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "optional", "minAge" | "maxAge">;
        validFrom: import("convex/values").VFloat64<number | undefined, "optional">;
        validUntil: import("convex/values").VFloat64<number | undefined, "optional">;
        validDays: import("convex/values").VFloat64<number | undefined, "optional">;
        purchaseUrl: import("convex/values").VString<string | undefined, "optional">;
        purchasePlatform: import("convex/values").VString<string | undefined, "optional">;
        requiresReservation: import("convex/values").VBoolean<boolean, "required">;
        reservationUrl: import("convex/values").VString<string | undefined, "optional">;
        reservationTips: import("convex/values").VString<string | undefined, "optional">;
        advanceBookingDays: import("convex/values").VFloat64<number | undefined, "optional">;
        usageInstructions: import("convex/values").VString<string | undefined, "optional">;
        includedServices: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        excludedServices: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        stockStatus: import("convex/values").VUnion<"unknown" | "in_stock" | "low_stock" | "sold_out" | undefined, [import("convex/values").VLiteral<"in_stock", "required">, import("convex/values").VLiteral<"low_stock", "required">, import("convex/values").VLiteral<"sold_out", "required">, import("convex/values").VLiteral<"unknown", "required">], "optional", never>;
        sortOrder: import("convex/values").VFloat64<number, "required">;
        isRecommended: import("convex/values").VBoolean<boolean | undefined, "optional">;
        source: import("convex/values").VString<string | undefined, "optional">;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "updatedAt" | "currency" | "sortOrder" | "source" | "poiId" | "ticketName" | "ticketType" | "price" | "originalPrice" | "discountInfo" | "discountPercentage" | "eligibilityRequirements" | "ageRange" | "validFrom" | "validUntil" | "validDays" | "purchaseUrl" | "purchasePlatform" | "requiresReservation" | "reservationUrl" | "reservationTips" | "advanceBookingDays" | "usageInstructions" | "includedServices" | "excludedServices" | "isActive" | "stockStatus" | "isRecommended" | "lastSyncedAt" | "ageRange.minAge" | "ageRange.maxAge">, {
        by_poi: ["poiId", "_creationTime"];
        by_poi_type: ["poiId", "ticketType", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
        by_poi_active: ["poiId", "isActive", "_creationTime"];
    }, {}, {}>;
    ticketReminders: import("convex/server").TableDefinition<import("convex/values").VObject<{
        message?: string | undefined;
        triggeredAt?: number | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        ticketId?: import("convex/values").GenericId<"poiTickets"> | undefined;
        readAt?: number | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        poiId: import("convex/values").GenericId<"pois">;
        reminderType: "reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available";
        isTriggered: boolean;
        reminderTime: number;
        isRead: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        ticketId: import("convex/values").VId<import("convex/values").GenericId<"poiTickets"> | undefined, "optional">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        reminderType: import("convex/values").VUnion<"reservation_open" | "booking_reminder" | "visit_reminder" | "price_drop" | "stock_available", [import("convex/values").VLiteral<"reservation_open", "required">, import("convex/values").VLiteral<"booking_reminder", "required">, import("convex/values").VLiteral<"visit_reminder", "required">, import("convex/values").VLiteral<"price_drop", "required">, import("convex/values").VLiteral<"stock_available", "required">], "required", never>;
        reminderTime: import("convex/values").VFloat64<number, "required">;
        message: import("convex/values").VString<string | undefined, "optional">;
        isTriggered: import("convex/values").VBoolean<boolean, "required">;
        triggeredAt: import("convex/values").VFloat64<number | undefined, "optional">;
        isRead: import("convex/values").VBoolean<boolean, "required">;
        readAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "message" | "userId" | "updatedAt" | "poiId" | "reminderType" | "isTriggered" | "triggeredAt" | "itineraryId" | "reminderTime" | "ticketId" | "isRead" | "readAt">, {
        by_user: ["userId", "_creationTime"];
        by_poi: ["poiId", "_creationTime"];
        by_user_poi: ["userId", "poiId", "_creationTime"];
        by_reminder_time: ["reminderTime", "_creationTime"];
        by_triggered: ["isTriggered", "_creationTime"];
    }, {}, {}>;
    poiSourceMappings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        rawRecordId?: import("convex/values").GenericId<"rawCrawlRecords"> | undefined;
        sourceExternalId: string;
        normalizedPoiId: import("convex/values").GenericId<"normalizedPois">;
        sourcePlatform: string;
    }, {
        normalizedPoiId: import("convex/values").VId<import("convex/values").GenericId<"normalizedPois">, "required">;
        sourcePlatform: import("convex/values").VString<string, "required">;
        sourceExternalId: import("convex/values").VString<string, "required">;
        rawRecordId: import("convex/values").VId<import("convex/values").GenericId<"rawCrawlRecords"> | undefined, "optional">;
    }, "required", "sourceExternalId" | "normalizedPoiId" | "sourcePlatform" | "rawRecordId">, {
        by_normalized_poi: ["normalizedPoiId", "_creationTime"];
        by_source: ["sourcePlatform", "sourceExternalId", "_creationTime"];
    }, {}, {}>;
    poiReviews: import("convex/server").TableDefinition<import("convex/values").VObject<{
        authorName?: string | undefined;
        rating?: number | undefined;
        visitDate?: string | undefined;
        sourceId?: string | undefined;
        sentiment?: string | undefined;
        content: string;
        poiId: import("convex/values").GenericId<"pois">;
        crawledAt: number;
    }, {
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        sourceId: import("convex/values").VString<string | undefined, "optional">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        content: import("convex/values").VString<string, "required">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        visitDate: import("convex/values").VString<string | undefined, "optional">;
        sentiment: import("convex/values").VString<string | undefined, "optional">;
        crawledAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "authorName" | "rating" | "poiId" | "visitDate" | "crawledAt" | "sourceId" | "sentiment">, {
        by_poi: ["poiId", "_creationTime"];
        by_rating: ["rating", "_creationTime"];
    }, {}, {}>;
    trainingDatasets: import("convex/server").TableDefinition<import("convex/values").VObject<{
        statistics?: any;
        generatedAt?: number | undefined;
        status: string;
        name: string;
        version: string;
        generationParams: any;
        outputFormats: string[];
        storagePaths: any;
    }, {
        name: import("convex/values").VString<string, "required">;
        version: import("convex/values").VString<string, "required">;
        generationParams: import("convex/values").VAny<any, "required", string>;
        statistics: import("convex/values").VAny<any, "optional", string>;
        outputFormats: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        storagePaths: import("convex/values").VAny<any, "required", string>;
        status: import("convex/values").VString<string, "required">;
        generatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "status" | "name" | "version" | "statistics" | `statistics.${string}` | "generationParams" | "outputFormats" | "storagePaths" | "generatedAt" | `generationParams.${string}` | `storagePaths.${string}`>, {
        by_name: ["name", "_creationTime"];
        by_version: ["version", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    dataQualityReports: import("convex/server").TableDefinition<import("convex/values").VObject<{
        issues?: any[] | undefined;
        datasetId?: import("convex/values").GenericId<"trainingDatasets"> | undefined;
        generatedAt: number;
        reportType: string;
        metrics: any;
    }, {
        datasetId: import("convex/values").VId<import("convex/values").GenericId<"trainingDatasets"> | undefined, "optional">;
        reportType: import("convex/values").VString<string, "required">;
        metrics: import("convex/values").VAny<any, "required", string>;
        issues: import("convex/values").VArray<any[] | undefined, import("convex/values").VAny<any, "required", string>, "optional">;
        generatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "issues" | "generatedAt" | "datasetId" | "reportType" | "metrics" | `metrics.${string}`>, {
        by_dataset: ["datasetId", "_creationTime"];
    }, {}, {}>;
    travelGuides: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title?: string | undefined;
        sourceUrl?: string | undefined;
        authorName?: string | undefined;
        publishedAt?: number | undefined;
        coverImageUrl?: string | undefined;
        contentHtml?: string | undefined;
        authorId?: string | undefined;
        contentHash?: string | undefined;
        enrichmentStatus?: "completed" | "failed" | "processing" | "pending" | undefined;
        enrichmentError?: string | undefined;
        enrichmentStartedAt?: number | undefined;
        aiProcessedAt?: number | undefined;
        aiSummary?: string | undefined;
        aiTips?: string[] | undefined;
        aiBestTime?: string | undefined;
        aiDuration?: string | undefined;
        aiBudget?: string | undefined;
        aiDays?: {
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                duration?: string | undefined;
                tips?: string | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                openingHours?: string | undefined;
                highlights?: string[] | undefined;
                transportToNext?: {
                    duration?: string | undefined;
                    mode?: string | undefined;
                    distance?: string | undefined;
                    notes?: string | undefined;
                } | undefined;
                geocodeConfidence?: number | undefined;
                geocodeSource?: string | undefined;
                isManuallyVerified?: boolean | undefined;
                verifiedAt?: number | undefined;
                verifiedBy?: string | undefined;
                name: string;
                type: string;
                latitude: number;
                longitude: number;
            }[];
            dayNumber: number;
        }[] | undefined;
        geocodingMetrics?: {
            sourceDistribution?: {
                nominatim?: number | undefined;
                amap?: number | undefined;
                overpass?: number | undefined;
                consensus?: number | undefined;
                manual?: number | undefined;
            } | undefined;
            lastUpdated?: number | undefined;
            totalPois: number;
            averageConfidence: number;
            lowConfidenceCount: number;
            manuallyVerifiedCount: number;
        } | undefined;
        content: string;
        sourceExternalId: string;
        imageUrls: string[];
        destinations: string[];
        tags: string[];
        likesCount: number;
        savesCount: number;
        commentsCount: number;
        viewsCount: number;
        qualityScore: number;
        crawledAt: number;
        sourcePlatform: "tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor";
    }, {
        sourcePlatform: import("convex/values").VUnion<"tongcheng" | "xiaohongshu" | "mafengwo" | "ctrip" | "qunar" | "weibo" | "douyin" | "tripadvisor", [import("convex/values").VLiteral<"xiaohongshu", "required">, import("convex/values").VLiteral<"weibo", "required">, import("convex/values").VLiteral<"ctrip", "required">, import("convex/values").VLiteral<"douyin", "required">, import("convex/values").VLiteral<"tripadvisor", "required">, import("convex/values").VLiteral<"qunar", "required">, import("convex/values").VLiteral<"tongcheng", "required">, import("convex/values").VLiteral<"mafengwo", "required">], "required", never>;
        sourceExternalId: import("convex/values").VString<string, "required">;
        sourceUrl: import("convex/values").VString<string | undefined, "optional">;
        title: import("convex/values").VString<string | undefined, "optional">;
        content: import("convex/values").VString<string, "required">;
        contentHtml: import("convex/values").VString<string | undefined, "optional">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        authorId: import("convex/values").VString<string | undefined, "optional">;
        destinations: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        tags: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        likesCount: import("convex/values").VFloat64<number, "required">;
        savesCount: import("convex/values").VFloat64<number, "required">;
        commentsCount: import("convex/values").VFloat64<number, "required">;
        viewsCount: import("convex/values").VFloat64<number, "required">;
        coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        publishedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        crawledAt: import("convex/values").VFloat64<number, "required">;
        qualityScore: import("convex/values").VFloat64<number, "required">;
        contentHash: import("convex/values").VString<string | undefined, "optional">;
        enrichmentStatus: import("convex/values").VUnion<"completed" | "failed" | "processing" | "pending" | undefined, [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"processing", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"failed", "required">], "optional", never>;
        enrichmentError: import("convex/values").VString<string | undefined, "optional">;
        enrichmentStartedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        aiProcessedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        aiSummary: import("convex/values").VString<string | undefined, "optional">;
        aiTips: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        aiBestTime: import("convex/values").VString<string | undefined, "optional">;
        aiDuration: import("convex/values").VString<string | undefined, "optional">;
        aiBudget: import("convex/values").VString<string | undefined, "optional">;
        aiDays: import("convex/values").VArray<{
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                duration?: string | undefined;
                tips?: string | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                openingHours?: string | undefined;
                highlights?: string[] | undefined;
                transportToNext?: {
                    duration?: string | undefined;
                    mode?: string | undefined;
                    distance?: string | undefined;
                    notes?: string | undefined;
                } | undefined;
                geocodeConfidence?: number | undefined;
                geocodeSource?: string | undefined;
                isManuallyVerified?: boolean | undefined;
                verifiedAt?: number | undefined;
                verifiedBy?: string | undefined;
                name: string;
                type: string;
                latitude: number;
                longitude: number;
            }[];
            dayNumber: number;
        }[] | undefined, import("convex/values").VObject<{
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                duration?: string | undefined;
                tips?: string | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                openingHours?: string | undefined;
                highlights?: string[] | undefined;
                transportToNext?: {
                    duration?: string | undefined;
                    mode?: string | undefined;
                    distance?: string | undefined;
                    notes?: string | undefined;
                } | undefined;
                geocodeConfidence?: number | undefined;
                geocodeSource?: string | undefined;
                isManuallyVerified?: boolean | undefined;
                verifiedAt?: number | undefined;
                verifiedBy?: string | undefined;
                name: string;
                type: string;
                latitude: number;
                longitude: number;
            }[];
            dayNumber: number;
        }, {
            dayNumber: import("convex/values").VFloat64<number, "required">;
            theme: import("convex/values").VString<string | undefined, "optional">;
            pois: import("convex/values").VArray<{
                description?: string | undefined;
                duration?: string | undefined;
                tips?: string | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                openingHours?: string | undefined;
                highlights?: string[] | undefined;
                transportToNext?: {
                    duration?: string | undefined;
                    mode?: string | undefined;
                    distance?: string | undefined;
                    notes?: string | undefined;
                } | undefined;
                geocodeConfidence?: number | undefined;
                geocodeSource?: string | undefined;
                isManuallyVerified?: boolean | undefined;
                verifiedAt?: number | undefined;
                verifiedBy?: string | undefined;
                name: string;
                type: string;
                latitude: number;
                longitude: number;
            }[], import("convex/values").VObject<{
                description?: string | undefined;
                duration?: string | undefined;
                tips?: string | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                openingHours?: string | undefined;
                highlights?: string[] | undefined;
                transportToNext?: {
                    duration?: string | undefined;
                    mode?: string | undefined;
                    distance?: string | undefined;
                    notes?: string | undefined;
                } | undefined;
                geocodeConfidence?: number | undefined;
                geocodeSource?: string | undefined;
                isManuallyVerified?: boolean | undefined;
                verifiedAt?: number | undefined;
                verifiedBy?: string | undefined;
                name: string;
                type: string;
                latitude: number;
                longitude: number;
            }, {
                name: import("convex/values").VString<string, "required">;
                type: import("convex/values").VString<string, "required">;
                description: import("convex/values").VString<string | undefined, "optional">;
                latitude: import("convex/values").VFloat64<number, "required">;
                longitude: import("convex/values").VFloat64<number, "required">;
                address: import("convex/values").VString<string | undefined, "optional">;
                duration: import("convex/values").VString<string | undefined, "optional">;
                priceInfo: import("convex/values").VString<string | undefined, "optional">;
                openingHours: import("convex/values").VString<string | undefined, "optional">;
                tips: import("convex/values").VString<string | undefined, "optional">;
                rating: import("convex/values").VFloat64<number | undefined, "optional">;
                highlights: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
                transportToNext: import("convex/values").VObject<{
                    duration?: string | undefined;
                    mode?: string | undefined;
                    distance?: string | undefined;
                    notes?: string | undefined;
                } | undefined, {
                    mode: import("convex/values").VString<string | undefined, "optional">;
                    duration: import("convex/values").VString<string | undefined, "optional">;
                    distance: import("convex/values").VString<string | undefined, "optional">;
                    notes: import("convex/values").VString<string | undefined, "optional">;
                }, "optional", "duration" | "mode" | "distance" | "notes">;
                geocodeConfidence: import("convex/values").VFloat64<number | undefined, "optional">;
                geocodeSource: import("convex/values").VString<string | undefined, "optional">;
                isManuallyVerified: import("convex/values").VBoolean<boolean | undefined, "optional">;
                verifiedAt: import("convex/values").VFloat64<number | undefined, "optional">;
                verifiedBy: import("convex/values").VString<string | undefined, "optional">;
            }, "required", "name" | "type" | "description" | "duration" | "latitude" | "longitude" | "tips" | "address" | "rating" | "priceInfo" | "openingHours" | "highlights" | "transportToNext" | "geocodeConfidence" | "geocodeSource" | "isManuallyVerified" | "verifiedAt" | "verifiedBy" | "transportToNext.duration" | "transportToNext.mode" | "transportToNext.distance" | "transportToNext.notes">, "required">;
        }, "required", "theme" | "pois" | "dayNumber">, "optional">;
        geocodingMetrics: import("convex/values").VObject<{
            sourceDistribution?: {
                nominatim?: number | undefined;
                amap?: number | undefined;
                overpass?: number | undefined;
                consensus?: number | undefined;
                manual?: number | undefined;
            } | undefined;
            lastUpdated?: number | undefined;
            totalPois: number;
            averageConfidence: number;
            lowConfidenceCount: number;
            manuallyVerifiedCount: number;
        } | undefined, {
            totalPois: import("convex/values").VFloat64<number, "required">;
            averageConfidence: import("convex/values").VFloat64<number, "required">;
            lowConfidenceCount: import("convex/values").VFloat64<number, "required">;
            manuallyVerifiedCount: import("convex/values").VFloat64<number, "required">;
            sourceDistribution: import("convex/values").VObject<{
                nominatim?: number | undefined;
                amap?: number | undefined;
                overpass?: number | undefined;
                consensus?: number | undefined;
                manual?: number | undefined;
            } | undefined, {
                amap: import("convex/values").VFloat64<number | undefined, "optional">;
                nominatim: import("convex/values").VFloat64<number | undefined, "optional">;
                overpass: import("convex/values").VFloat64<number | undefined, "optional">;
                consensus: import("convex/values").VFloat64<number | undefined, "optional">;
                manual: import("convex/values").VFloat64<number | undefined, "optional">;
            }, "optional", "nominatim" | "amap" | "overpass" | "consensus" | "manual">;
            lastUpdated: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "optional", "totalPois" | "averageConfidence" | "lowConfidenceCount" | "manuallyVerifiedCount" | "sourceDistribution" | "lastUpdated" | "sourceDistribution.nominatim" | "sourceDistribution.amap" | "sourceDistribution.overpass" | "sourceDistribution.consensus" | "sourceDistribution.manual">;
    }, "required", "content" | "title" | "sourceExternalId" | "sourceUrl" | "authorName" | "publishedAt" | "coverImageUrl" | "imageUrls" | "destinations" | "tags" | "likesCount" | "savesCount" | "commentsCount" | "viewsCount" | "qualityScore" | "crawledAt" | "sourcePlatform" | "contentHtml" | "authorId" | "contentHash" | "enrichmentStatus" | "enrichmentError" | "enrichmentStartedAt" | "aiProcessedAt" | "aiSummary" | "aiTips" | "aiBestTime" | "aiDuration" | "aiBudget" | "aiDays" | "geocodingMetrics" | "geocodingMetrics.totalPois" | "geocodingMetrics.averageConfidence" | "geocodingMetrics.lowConfidenceCount" | "geocodingMetrics.manuallyVerifiedCount" | "geocodingMetrics.sourceDistribution" | "geocodingMetrics.lastUpdated" | "geocodingMetrics.sourceDistribution.nominatim" | "geocodingMetrics.sourceDistribution.amap" | "geocodingMetrics.sourceDistribution.overpass" | "geocodingMetrics.sourceDistribution.consensus" | "geocodingMetrics.sourceDistribution.manual">, {
        by_platform: ["sourcePlatform", "_creationTime"];
        by_platform_external: ["sourcePlatform", "sourceExternalId", "_creationTime"];
        by_quality: ["qualityScore", "_creationTime"];
        by_destinations: ["destinations", "_creationTime"];
    }, {
        search_content: {
            searchField: "content";
            filterFields: "destinations" | "aiProcessedAt";
        };
        search_title: {
            searchField: "title";
            filterFields: "destinations" | "aiProcessedAt";
        };
    }, {}>;
    itineraryComments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number | undefined;
        parentId?: import("convex/values").GenericId<"itineraryComments"> | undefined;
        content: string;
        createdAt: number;
        likesCount: number;
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        repliesCount: number;
        isEdited: boolean;
        isDeleted: boolean;
        reportCount: number;
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        userId: import("convex/values").VString<string, "required">;
        parentId: import("convex/values").VId<import("convex/values").GenericId<"itineraryComments"> | undefined, "optional">;
        content: import("convex/values").VString<string, "required">;
        likesCount: import("convex/values").VFloat64<number, "required">;
        repliesCount: import("convex/values").VFloat64<number, "required">;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        isDeleted: import("convex/values").VBoolean<boolean, "required">;
        reportCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "content" | "createdAt" | "likesCount" | "userId" | "updatedAt" | "itineraryId" | "parentId" | "repliesCount" | "isEdited" | "isDeleted" | "reportCount">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_parent: ["parentId", "_creationTime"];
        by_itinerary_created: ["itineraryId", "createdAt", "_creationTime"];
    }, {}, {}>;
    guideComments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number | undefined;
        parentId?: string | undefined;
        content: string;
        createdAt: number;
        likesCount: number;
        guideId: string;
        userId: string;
        repliesCount: number;
        isEdited: boolean;
        isDeleted: boolean;
    }, {
        guideId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VString<string, "required">;
        parentId: import("convex/values").VString<string | undefined, "optional">;
        content: import("convex/values").VString<string, "required">;
        likesCount: import("convex/values").VFloat64<number, "required">;
        repliesCount: import("convex/values").VFloat64<number, "required">;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        isDeleted: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "content" | "createdAt" | "likesCount" | "guideId" | "userId" | "updatedAt" | "parentId" | "repliesCount" | "isEdited" | "isDeleted">, {
        by_guide: ["guideId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_parent: ["parentId", "_creationTime"];
        by_guide_created: ["guideId", "createdAt", "_creationTime"];
    }, {}, {}>;
    guideCommentLikes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        commentId: import("convex/values").GenericId<"guideComments">;
    }, {
        commentId: import("convex/values").VId<import("convex/values").GenericId<"guideComments">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "commentId">, {
        by_comment: ["commentId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_comment_user: ["commentId", "userId", "_creationTime"];
    }, {}, {}>;
    commentLikes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        commentId: import("convex/values").GenericId<"itineraryComments">;
    }, {
        commentId: import("convex/values").VId<import("convex/values").GenericId<"itineraryComments">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "commentId">, {
        by_comment: ["commentId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_comment_user: ["commentId", "userId", "_creationTime"];
    }, {}, {}>;
    commentReports: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        status: "pending" | "reviewed" | "resolved" | "dismissed";
        createdAt: number;
        userId: string;
        reason: "other" | "spam" | "harassment" | "inappropriate" | "misinformation";
        commentId: import("convex/values").GenericId<"itineraryComments">;
    }, {
        commentId: import("convex/values").VId<import("convex/values").GenericId<"itineraryComments">, "required">;
        userId: import("convex/values").VString<string, "required">;
        reason: import("convex/values").VUnion<"other" | "spam" | "harassment" | "inappropriate" | "misinformation", [import("convex/values").VLiteral<"spam", "required">, import("convex/values").VLiteral<"harassment", "required">, import("convex/values").VLiteral<"inappropriate", "required">, import("convex/values").VLiteral<"misinformation", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        description: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"pending" | "reviewed" | "resolved" | "dismissed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"reviewed", "required">, import("convex/values").VLiteral<"resolved", "required">, import("convex/values").VLiteral<"dismissed", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        reviewedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "createdAt" | "description" | "userId" | "reason" | "reviewedBy" | "reviewedAt" | "commentId">, {
        by_comment: ["commentId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_comment_user: ["commentId", "userId", "_creationTime"];
    }, {}, {}>;
    notifications: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title?: string | undefined;
        priority?: "normal" | "low" | "high" | undefined;
        data?: any;
        actorId?: string | undefined;
        readAt?: number | undefined;
        body?: string | undefined;
        isPushSent?: boolean | undefined;
        pushSentAt?: number | undefined;
        createdAt: number;
        type: "comment" | "reply" | "like" | "mention" | "new_follower" | "following_itinerary" | "itinerary_reminder" | "flight_status" | "weather_alert" | "social_interaction";
        message: string;
        userId: string;
        isRead: boolean;
        referenceType: "user" | "itinerary" | "comment" | "flight" | "weather";
        referenceId: string;
    }, {
        userId: import("convex/values").VString<string, "required">;
        type: import("convex/values").VUnion<"comment" | "reply" | "like" | "mention" | "new_follower" | "following_itinerary" | "itinerary_reminder" | "flight_status" | "weather_alert" | "social_interaction", [import("convex/values").VLiteral<"comment", "required">, import("convex/values").VLiteral<"reply", "required">, import("convex/values").VLiteral<"like", "required">, import("convex/values").VLiteral<"mention", "required">, import("convex/values").VLiteral<"new_follower", "required">, import("convex/values").VLiteral<"following_itinerary", "required">, import("convex/values").VLiteral<"itinerary_reminder", "required">, import("convex/values").VLiteral<"flight_status", "required">, import("convex/values").VLiteral<"weather_alert", "required">, import("convex/values").VLiteral<"social_interaction", "required">], "required", never>;
        referenceType: import("convex/values").VUnion<"user" | "itinerary" | "comment" | "flight" | "weather", [import("convex/values").VLiteral<"itinerary", "required">, import("convex/values").VLiteral<"comment", "required">, import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"flight", "required">, import("convex/values").VLiteral<"weather", "required">], "required", never>;
        referenceId: import("convex/values").VString<string, "required">;
        actorId: import("convex/values").VString<string | undefined, "optional">;
        message: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string | undefined, "optional">;
        body: import("convex/values").VString<string | undefined, "optional">;
        data: import("convex/values").VAny<any, "optional", string>;
        isRead: import("convex/values").VBoolean<boolean, "required">;
        isPushSent: import("convex/values").VBoolean<boolean | undefined, "optional">;
        pushSentAt: import("convex/values").VFloat64<number | undefined, "optional">;
        priority: import("convex/values").VUnion<"normal" | "low" | "high" | undefined, [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"normal", "required">, import("convex/values").VLiteral<"high", "required">], "optional", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        readAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "createdAt" | "type" | "title" | "priority" | "data" | "message" | "userId" | "actorId" | "isRead" | "readAt" | "referenceType" | "referenceId" | "body" | "isPushSent" | "pushSentAt" | `data.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_user_read: ["userId", "isRead", "_creationTime"];
        by_user_created: ["userId", "createdAt", "_creationTime"];
        by_type: ["type", "_creationTime"];
        by_push_pending: ["isPushSent", "_creationTime"];
    }, {}, {}>;
    pushTokens: import("convex/server").TableDefinition<import("convex/values").VObject<{
        deviceId?: string | undefined;
        deviceName?: string | undefined;
        appVersion?: string | undefined;
        osVersion?: string | undefined;
        createdAt: number;
        platform: "ios" | "android";
        userId: string;
        token: string;
        updatedAt: number;
        isActive: boolean;
        lastUsedAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        token: import("convex/values").VString<string, "required">;
        platform: import("convex/values").VUnion<"ios" | "android", [import("convex/values").VLiteral<"ios", "required">, import("convex/values").VLiteral<"android", "required">], "required", never>;
        deviceId: import("convex/values").VString<string | undefined, "optional">;
        deviceName: import("convex/values").VString<string | undefined, "optional">;
        appVersion: import("convex/values").VString<string | undefined, "optional">;
        osVersion: import("convex/values").VString<string | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        lastUsedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "platform" | "userId" | "token" | "updatedAt" | "isActive" | "deviceId" | "deviceName" | "appVersion" | "osVersion" | "lastUsedAt">, {
        by_user: ["userId", "_creationTime"];
        by_token: ["token", "_creationTime"];
        by_user_active: ["userId", "isActive", "_creationTime"];
    }, {}, {}>;
    notificationSettings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        timezone?: string | undefined;
        emailEnabled?: boolean | undefined;
        quietHoursEnabled?: boolean | undefined;
        quietHoursStart?: string | undefined;
        quietHoursEnd?: string | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        pushEnabled: boolean;
        inAppEnabled: boolean;
        itineraryReminders: {
            enabled: boolean;
            advanceHours: number;
        };
        flightAlerts: {
            enabled: boolean;
            statusChanges: boolean;
            checkInReminders: boolean;
            boardingReminders: boolean;
        };
        weatherAlerts: {
            enabled: boolean;
            severeOnly: boolean;
        };
        socialNotifications: {
            enabled: boolean;
            comments: boolean;
            likes: boolean;
            follows: boolean;
            mentions: boolean;
        };
    }, {
        userId: import("convex/values").VString<string, "required">;
        pushEnabled: import("convex/values").VBoolean<boolean, "required">;
        emailEnabled: import("convex/values").VBoolean<boolean | undefined, "optional">;
        inAppEnabled: import("convex/values").VBoolean<boolean, "required">;
        quietHoursEnabled: import("convex/values").VBoolean<boolean | undefined, "optional">;
        quietHoursStart: import("convex/values").VString<string | undefined, "optional">;
        quietHoursEnd: import("convex/values").VString<string | undefined, "optional">;
        timezone: import("convex/values").VString<string | undefined, "optional">;
        itineraryReminders: import("convex/values").VObject<{
            enabled: boolean;
            advanceHours: number;
        }, {
            enabled: import("convex/values").VBoolean<boolean, "required">;
            advanceHours: import("convex/values").VFloat64<number, "required">;
        }, "required", "enabled" | "advanceHours">;
        flightAlerts: import("convex/values").VObject<{
            enabled: boolean;
            statusChanges: boolean;
            checkInReminders: boolean;
            boardingReminders: boolean;
        }, {
            enabled: import("convex/values").VBoolean<boolean, "required">;
            statusChanges: import("convex/values").VBoolean<boolean, "required">;
            checkInReminders: import("convex/values").VBoolean<boolean, "required">;
            boardingReminders: import("convex/values").VBoolean<boolean, "required">;
        }, "required", "enabled" | "statusChanges" | "checkInReminders" | "boardingReminders">;
        weatherAlerts: import("convex/values").VObject<{
            enabled: boolean;
            severeOnly: boolean;
        }, {
            enabled: import("convex/values").VBoolean<boolean, "required">;
            severeOnly: import("convex/values").VBoolean<boolean, "required">;
        }, "required", "enabled" | "severeOnly">;
        socialNotifications: import("convex/values").VObject<{
            enabled: boolean;
            comments: boolean;
            likes: boolean;
            follows: boolean;
            mentions: boolean;
        }, {
            enabled: import("convex/values").VBoolean<boolean, "required">;
            comments: import("convex/values").VBoolean<boolean, "required">;
            likes: import("convex/values").VBoolean<boolean, "required">;
            follows: import("convex/values").VBoolean<boolean, "required">;
            mentions: import("convex/values").VBoolean<boolean, "required">;
        }, "required", "enabled" | "comments" | "likes" | "follows" | "mentions">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "timezone" | "pushEnabled" | "emailEnabled" | "inAppEnabled" | "quietHoursEnabled" | "quietHoursStart" | "quietHoursEnd" | "itineraryReminders" | "flightAlerts" | "weatherAlerts" | "socialNotifications" | "itineraryReminders.enabled" | "itineraryReminders.advanceHours" | "flightAlerts.enabled" | "flightAlerts.statusChanges" | "flightAlerts.checkInReminders" | "flightAlerts.boardingReminders" | "weatherAlerts.enabled" | "weatherAlerts.severeOnly" | "socialNotifications.enabled" | "socialNotifications.comments" | "socialNotifications.likes" | "socialNotifications.follows" | "socialNotifications.mentions">, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    scheduledNotifications: import("convex/server").TableDefinition<import("convex/values").VObject<{
        data?: any;
        errorMessage?: string | undefined;
        retryCount?: number | undefined;
        referenceType?: string | undefined;
        referenceId?: string | undefined;
        sentAt?: number | undefined;
        status: "failed" | "cancelled" | "pending" | "sent";
        createdAt: number;
        type: "custom" | "itinerary_reminder" | "flight_checkin" | "flight_boarding" | "weather_check";
        title: string;
        userId: string;
        body: string;
        scheduledFor: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        type: import("convex/values").VUnion<"custom" | "itinerary_reminder" | "flight_checkin" | "flight_boarding" | "weather_check", [import("convex/values").VLiteral<"itinerary_reminder", "required">, import("convex/values").VLiteral<"flight_checkin", "required">, import("convex/values").VLiteral<"flight_boarding", "required">, import("convex/values").VLiteral<"weather_check", "required">, import("convex/values").VLiteral<"custom", "required">], "required", never>;
        referenceType: import("convex/values").VString<string | undefined, "optional">;
        referenceId: import("convex/values").VString<string | undefined, "optional">;
        scheduledFor: import("convex/values").VFloat64<number, "required">;
        title: import("convex/values").VString<string, "required">;
        body: import("convex/values").VString<string, "required">;
        data: import("convex/values").VAny<any, "optional", string>;
        status: import("convex/values").VUnion<"failed" | "cancelled" | "pending" | "sent", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"sent", "required">, import("convex/values").VLiteral<"cancelled", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        sentAt: import("convex/values").VFloat64<number | undefined, "optional">;
        errorMessage: import("convex/values").VString<string | undefined, "optional">;
        retryCount: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "type" | "title" | "data" | "errorMessage" | "userId" | "retryCount" | "referenceType" | "referenceId" | "body" | `data.${string}` | "scheduledFor" | "sentAt">, {
        by_user: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_scheduled: ["scheduledFor", "_creationTime"];
        by_status_scheduled: ["status", "scheduledFor", "_creationTime"];
    }, {}, {}>;
    itineraryLikes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "itineraryId">, {
        by_user: ["userId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_user_itinerary: ["userId", "itineraryId", "_creationTime"];
    }, {}, {}>;
    favoriteCollections: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        coverImageUrl?: string | undefined;
        createdAt: number;
        name: string;
        userId: string;
        updatedAt: number;
        sortOrder: number;
        isDefault: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        isDefault: import("convex/values").VBoolean<boolean, "required">;
        sortOrder: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "description" | "coverImageUrl" | "userId" | "updatedAt" | "sortOrder" | "isDefault">, {
        by_user: ["userId", "_creationTime"];
        by_user_default: ["userId", "isDefault", "_creationTime"];
        by_user_sort: ["userId", "sortOrder", "_creationTime"];
    }, {}, {}>;
    itineraryFavorites: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        collectionId?: import("convex/values").GenericId<"favoriteCollections"> | undefined;
        createdAt: number;
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        collectionId: import("convex/values").VId<import("convex/values").GenericId<"favoriteCollections"> | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "notes" | "itineraryId" | "collectionId">, {
        by_user: ["userId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_collection: ["collectionId", "_creationTime"];
        by_user_itinerary: ["userId", "itineraryId", "_creationTime"];
        by_user_collection: ["userId", "collectionId", "_creationTime"];
    }, {}, {}>;
    conversations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastMessageText?: string | undefined;
        lastMessageAt?: number | undefined;
        lastMessageSenderId?: string | undefined;
        participantIds: string[];
    }, {
        participantIds: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        lastMessageText: import("convex/values").VString<string | undefined, "optional">;
        lastMessageAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastMessageSenderId: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "participantIds" | "lastMessageText" | "lastMessageAt" | "lastMessageSenderId">, {
        by_last_message: ["lastMessageAt", "_creationTime"];
    }, {}, {}>;
    messages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        isDeleted?: boolean | undefined;
        sharedItineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        sharedImageUrl?: string | undefined;
        content: string;
        sentAt: number;
        conversationId: import("convex/values").GenericId<"conversations">;
        senderId: string;
        messageType: "text" | "image" | "itinerary_share";
    }, {
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations">, "required">;
        senderId: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        messageType: import("convex/values").VUnion<"text" | "image" | "itinerary_share", [import("convex/values").VLiteral<"text", "required">, import("convex/values").VLiteral<"image", "required">, import("convex/values").VLiteral<"itinerary_share", "required">], "required", never>;
        sharedItineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        sharedImageUrl: import("convex/values").VString<string | undefined, "optional">;
        sentAt: import("convex/values").VFloat64<number, "required">;
        isDeleted: import("convex/values").VBoolean<boolean | undefined, "optional">;
    }, "required", "content" | "isDeleted" | "sentAt" | "conversationId" | "senderId" | "messageType" | "sharedItineraryId" | "sharedImageUrl">, {
        by_conversation: ["conversationId", "_creationTime"];
        by_conversation_time: ["conversationId", "sentAt", "_creationTime"];
        by_sender: ["senderId", "_creationTime"];
    }, {}, {}>;
    messageReadStatus: import("convex/server").TableDefinition<import("convex/values").VObject<{
        lastReadMessageId?: import("convex/values").GenericId<"messages"> | undefined;
        userId: string;
        conversationId: import("convex/values").GenericId<"conversations">;
        lastReadAt: number;
    }, {
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations">, "required">;
        userId: import("convex/values").VString<string, "required">;
        lastReadAt: import("convex/values").VFloat64<number, "required">;
        lastReadMessageId: import("convex/values").VId<import("convex/values").GenericId<"messages"> | undefined, "optional">;
    }, "required", "userId" | "conversationId" | "lastReadAt" | "lastReadMessageId">, {
        by_conversation_user: ["conversationId", "userId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    hotelBookings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        status?: "completed" | "cancelled" | "pending" | "confirmed" | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        currency?: string | undefined;
        address?: string | undefined;
        notes?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        checkInTime?: string | undefined;
        checkOutTime?: string | undefined;
        roomType?: string | undefined;
        guestCount?: number | undefined;
        totalPrice?: number | undefined;
        pricePerNight?: number | undefined;
        confirmationNumber?: string | undefined;
        bookingPlatform?: string | undefined;
        bookingUrl?: string | undefined;
        hotelPhone?: string | undefined;
        hotelEmail?: string | undefined;
        amenities?: string[] | undefined;
        images?: string[] | undefined;
        importSource?: "email" | "manual" | "import" | undefined;
        rawEmailContent?: string | undefined;
        userId: string;
        hotelName: string;
        checkInDate: string;
        checkOutDate: string;
        roomCount: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        hotelName: import("convex/values").VString<string, "required">;
        address: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number | undefined, "optional">;
        longitude: import("convex/values").VFloat64<number | undefined, "optional">;
        checkInDate: import("convex/values").VString<string, "required">;
        checkOutDate: import("convex/values").VString<string, "required">;
        checkInTime: import("convex/values").VString<string | undefined, "optional">;
        checkOutTime: import("convex/values").VString<string | undefined, "optional">;
        roomType: import("convex/values").VString<string | undefined, "optional">;
        roomCount: import("convex/values").VFloat64<number, "required">;
        guestCount: import("convex/values").VFloat64<number | undefined, "optional">;
        totalPrice: import("convex/values").VFloat64<number | undefined, "optional">;
        currency: import("convex/values").VString<string | undefined, "optional">;
        pricePerNight: import("convex/values").VFloat64<number | undefined, "optional">;
        confirmationNumber: import("convex/values").VString<string | undefined, "optional">;
        bookingPlatform: import("convex/values").VString<string | undefined, "optional">;
        bookingUrl: import("convex/values").VString<string | undefined, "optional">;
        hotelPhone: import("convex/values").VString<string | undefined, "optional">;
        hotelEmail: import("convex/values").VString<string | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        amenities: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        images: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        importSource: import("convex/values").VUnion<"email" | "manual" | "import" | undefined, [import("convex/values").VLiteral<"manual", "required">, import("convex/values").VLiteral<"email", "required">, import("convex/values").VLiteral<"import", "required">], "optional", never>;
        rawEmailContent: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"completed" | "cancelled" | "pending" | "confirmed" | undefined, [import("convex/values").VLiteral<"confirmed", "required">, import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"cancelled", "required">, import("convex/values").VLiteral<"completed", "required">], "optional", never>;
    }, "required", "status" | "latitude" | "longitude" | "userId" | "currency" | "address" | "notes" | "itineraryId" | "hotelName" | "checkInDate" | "checkOutDate" | "checkInTime" | "checkOutTime" | "roomType" | "roomCount" | "guestCount" | "totalPrice" | "pricePerNight" | "confirmationNumber" | "bookingPlatform" | "bookingUrl" | "hotelPhone" | "hotelEmail" | "amenities" | "images" | "importSource" | "rawEmailContent">, {
        by_user: ["userId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_user_dates: ["userId", "checkInDate", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    expenseCategories: import("convex/server").TableDefinition<import("convex/values").VObject<{
        name: string;
        icon: string;
        nameEn: string;
        sortOrder: number;
        color: string;
        isSystem: boolean;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string, "required">;
        icon: import("convex/values").VString<string, "required">;
        color: import("convex/values").VString<string, "required">;
        sortOrder: import("convex/values").VFloat64<number, "required">;
        isSystem: import("convex/values").VBoolean<boolean, "required">;
    }, "required", "name" | "icon" | "nameEn" | "sortOrder" | "color" | "isSystem">, {
        by_sort_order: ["sortOrder", "_creationTime"];
    }, {}, {}>;
    itineraryBudgets: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        currency: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        totalBudget: number;
        categoryBudgets: {
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
        }[];
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        userId: import("convex/values").VString<string, "required">;
        totalBudget: import("convex/values").VFloat64<number, "required">;
        currency: import("convex/values").VString<string, "required">;
        categoryBudgets: import("convex/values").VArray<{
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
        }[], import("convex/values").VObject<{
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
        }, {
            categoryId: import("convex/values").VId<import("convex/values").GenericId<"expenseCategories">, "required">;
            amount: import("convex/values").VFloat64<number, "required">;
        }, "required", "categoryId" | "amount">, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "currency" | "notes" | "itineraryId" | "totalBudget" | "categoryBudgets">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    expenses: import("convex/server").TableDefinition<import("convex/values").VObject<{
        time?: string | undefined;
        notes?: string | undefined;
        poiId?: import("convex/values").GenericId<"pois"> | undefined;
        dayNumber?: number | undefined;
        paymentMethod?: string | undefined;
        receiptImageUrl?: string | undefined;
        createdAt: number;
        description: string;
        date: string;
        userId: string;
        updatedAt: number;
        currency: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        categoryId: import("convex/values").GenericId<"expenseCategories">;
        amount: number;
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        userId: import("convex/values").VString<string, "required">;
        categoryId: import("convex/values").VId<import("convex/values").GenericId<"expenseCategories">, "required">;
        amount: import("convex/values").VFloat64<number, "required">;
        currency: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        date: import("convex/values").VString<string, "required">;
        time: import("convex/values").VString<string | undefined, "optional">;
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois"> | undefined, "optional">;
        dayNumber: import("convex/values").VFloat64<number | undefined, "optional">;
        paymentMethod: import("convex/values").VString<string | undefined, "optional">;
        receiptImageUrl: import("convex/values").VString<string | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "description" | "date" | "time" | "userId" | "updatedAt" | "currency" | "notes" | "poiId" | "itineraryId" | "dayNumber" | "categoryId" | "amount" | "paymentMethod" | "receiptImageUrl">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_category: ["categoryId", "_creationTime"];
        by_itinerary_category: ["itineraryId", "categoryId", "_creationTime"];
        by_date: ["date", "_creationTime"];
    }, {}, {}>;
    calendarSyncs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        lastSyncedAt?: number | undefined;
        savedItineraryLocalId?: string | undefined;
        calendarId?: string | undefined;
        calendarEventIds?: string[] | undefined;
        syncError?: string | undefined;
        reminderMinutesBefore?: number | undefined;
        syncedDayNumbers?: number[] | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        calendarProvider: "apple" | "google";
        syncStatus: "failed" | "pending" | "synced" | "deleted";
        enableReminders: boolean;
        syncAllDays: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        savedItineraryLocalId: import("convex/values").VString<string | undefined, "optional">;
        calendarProvider: import("convex/values").VUnion<"apple" | "google", [import("convex/values").VLiteral<"apple", "required">, import("convex/values").VLiteral<"google", "required">], "required", never>;
        calendarId: import("convex/values").VString<string | undefined, "optional">;
        calendarEventIds: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        syncStatus: import("convex/values").VUnion<"failed" | "pending" | "synced" | "deleted", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"synced", "required">, import("convex/values").VLiteral<"failed", "required">, import("convex/values").VLiteral<"deleted", "required">], "required", never>;
        lastSyncedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        syncError: import("convex/values").VString<string | undefined, "optional">;
        enableReminders: import("convex/values").VBoolean<boolean, "required">;
        reminderMinutesBefore: import("convex/values").VFloat64<number | undefined, "optional">;
        syncAllDays: import("convex/values").VBoolean<boolean, "required">;
        syncedDayNumbers: import("convex/values").VArray<number[] | undefined, import("convex/values").VFloat64<number, "required">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "itineraryId" | "lastSyncedAt" | "savedItineraryLocalId" | "calendarProvider" | "calendarId" | "calendarEventIds" | "syncStatus" | "syncError" | "enableReminders" | "reminderMinutesBefore" | "syncAllDays" | "syncedDayNumbers">, {
        by_user: ["userId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_local_itinerary: ["savedItineraryLocalId", "_creationTime"];
        by_user_itinerary: ["userId", "itineraryId", "_creationTime"];
        by_user_local_itinerary: ["userId", "savedItineraryLocalId", "_creationTime"];
        by_status: ["syncStatus", "_creationTime"];
    }, {}, {}>;
    guideRecommendations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        reason?: string | undefined;
        guideId: import("convex/values").GenericId<"travelGuides">;
        userId: string;
        score: number;
        isDismissed: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        guideId: import("convex/values").VId<import("convex/values").GenericId<"travelGuides">, "required">;
        score: import("convex/values").VFloat64<number, "required">;
        reason: import("convex/values").VString<string | undefined, "optional">;
        isDismissed: import("convex/values").VBoolean<boolean, "required">;
    }, "required", "guideId" | "userId" | "reason" | "score" | "isDismissed">, {
        by_user: ["userId", "_creationTime"];
        by_user_guide: ["userId", "guideId", "_creationTime"];
        by_score: ["score", "_creationTime"];
    }, {}, {}>;
    visitedCities: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt?: number | undefined;
        rating?: number | undefined;
        notes?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        cityNameEn?: string | undefined;
        countryNameEn?: string | undefined;
        firstVisitedAt?: number | undefined;
        lastVisitedAt?: number | undefined;
        visitCount?: number | undefined;
        photos?: string[] | undefined;
        travelGuideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
        latitude: number;
        longitude: number;
        userId: string;
        countryCode: string;
        cityName: string;
        countryName: string;
        visitedAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        cityName: import("convex/values").VString<string, "required">;
        cityNameEn: import("convex/values").VString<string | undefined, "optional">;
        countryCode: import("convex/values").VString<string, "required">;
        countryName: import("convex/values").VString<string, "required">;
        countryNameEn: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        visitedAt: import("convex/values").VFloat64<number, "required">;
        firstVisitedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastVisitedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        visitCount: import("convex/values").VFloat64<number | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        photos: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        travelGuideId: import("convex/values").VId<import("convex/values").GenericId<"travelGuides"> | undefined, "optional">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "createdAt" | "latitude" | "longitude" | "userId" | "countryCode" | "rating" | "notes" | "itineraryId" | "cityName" | "cityNameEn" | "countryName" | "countryNameEn" | "visitedAt" | "firstVisitedAt" | "lastVisitedAt" | "visitCount" | "photos" | "travelGuideId">, {
        by_user: ["userId", "_creationTime"];
        by_user_city: ["userId", "cityName", "_creationTime"];
        by_user_country: ["userId", "countryCode", "_creationTime"];
        by_country: ["countryCode", "_creationTime"];
    }, {}, {}>;
    visitedCountries: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt?: number | undefined;
        countryNameEn?: string | undefined;
        userId: string;
        countryCode: string;
        countryName: string;
        firstVisitedAt: number;
        lastVisitedAt: number;
        citiesCount: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        countryCode: import("convex/values").VString<string, "required">;
        countryName: import("convex/values").VString<string, "required">;
        countryNameEn: import("convex/values").VString<string | undefined, "optional">;
        citiesCount: import("convex/values").VFloat64<number, "required">;
        firstVisitedAt: import("convex/values").VFloat64<number, "required">;
        lastVisitedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "createdAt" | "userId" | "countryCode" | "countryName" | "countryNameEn" | "firstVisitedAt" | "lastVisitedAt" | "citiesCount">, {
        by_user: ["userId", "_creationTime"];
        by_user_country: ["userId", "countryCode", "_creationTime"];
        by_country: ["countryCode", "_creationTime"];
    }, {}, {}>;
    travelStats: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt?: number | undefined;
        updatedAt?: number | undefined;
        totalDays?: number | undefined;
        totalExpenses?: number | undefined;
        mostVisitedCity?: {
            name: string;
            count: number;
        } | undefined;
        mostVisitedCountry?: {
            name: string;
            count: number;
        } | undefined;
        firstTripDate?: number | undefined;
        lastTripDate?: number | undefined;
        goalCities?: number | undefined;
        goalCountries?: number | undefined;
        nextGoalCity?: {
            notes?: string | undefined;
            plannedDate?: number | undefined;
            latitude: number;
            longitude: number;
            countryCode: string;
            cityName: string;
            countryName: string;
        } | undefined;
        yearlyStats?: any;
        userId: string;
        totalCities: number;
        totalCountries: number;
        totalTrips: number;
        totalDistance: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        totalCities: import("convex/values").VFloat64<number, "required">;
        totalCountries: import("convex/values").VFloat64<number, "required">;
        totalTrips: import("convex/values").VFloat64<number, "required">;
        totalDistance: import("convex/values").VFloat64<number, "required">;
        totalDays: import("convex/values").VFloat64<number | undefined, "optional">;
        totalExpenses: import("convex/values").VFloat64<number | undefined, "optional">;
        mostVisitedCity: import("convex/values").VObject<{
            name: string;
            count: number;
        } | undefined, {
            name: import("convex/values").VString<string, "required">;
            count: import("convex/values").VFloat64<number, "required">;
        }, "optional", "name" | "count">;
        mostVisitedCountry: import("convex/values").VObject<{
            name: string;
            count: number;
        } | undefined, {
            name: import("convex/values").VString<string, "required">;
            count: import("convex/values").VFloat64<number, "required">;
        }, "optional", "name" | "count">;
        firstTripDate: import("convex/values").VFloat64<number | undefined, "optional">;
        lastTripDate: import("convex/values").VFloat64<number | undefined, "optional">;
        goalCities: import("convex/values").VFloat64<number | undefined, "optional">;
        goalCountries: import("convex/values").VFloat64<number | undefined, "optional">;
        nextGoalCity: import("convex/values").VObject<{
            notes?: string | undefined;
            plannedDate?: number | undefined;
            latitude: number;
            longitude: number;
            countryCode: string;
            cityName: string;
            countryName: string;
        } | undefined, {
            cityName: import("convex/values").VString<string, "required">;
            countryCode: import("convex/values").VString<string, "required">;
            countryName: import("convex/values").VString<string, "required">;
            latitude: import("convex/values").VFloat64<number, "required">;
            longitude: import("convex/values").VFloat64<number, "required">;
            plannedDate: import("convex/values").VFloat64<number | undefined, "optional">;
            notes: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "latitude" | "longitude" | "countryCode" | "notes" | "cityName" | "countryName" | "plannedDate">;
        yearlyStats: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number | undefined, "optional">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "totalCities" | "totalCountries" | "totalTrips" | "totalDistance" | "totalDays" | "totalExpenses" | "mostVisitedCity" | "mostVisitedCountry" | "firstTripDate" | "lastTripDate" | "goalCities" | "goalCountries" | "nextGoalCity" | "yearlyStats" | "mostVisitedCity.name" | "mostVisitedCity.count" | "mostVisitedCountry.name" | "mostVisitedCountry.count" | "nextGoalCity.latitude" | "nextGoalCity.longitude" | "nextGoalCity.countryCode" | "nextGoalCity.notes" | "nextGoalCity.cityName" | "nextGoalCity.countryName" | "nextGoalCity.plannedDate" | `yearlyStats.${string}`>, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    insuranceProducts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        nameEn?: string | undefined;
        rating?: number | undefined;
        providerLogo?: string | undefined;
        exclusions?: string[] | undefined;
        contactPhone?: string | undefined;
        contactEmail?: string | undefined;
        createdAt: number;
        name: string;
        type: "comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation";
        priority: number;
        provider: string;
        updatedAt: number;
        purchaseUrl: string;
        isActive: boolean;
        coverageAmount: number;
        coverageDetails: {
            description?: string | undefined;
            item: string;
            amount: number;
        }[];
        pricePerDay: number;
        minDays: number;
        maxDays: number;
        applicableRegions: string[];
        domesticOnly: boolean;
        riskLevelCoverage: ("low" | "medium" | "high" | "extreme")[];
        features: string[];
        reviewCount: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        provider: import("convex/values").VString<string, "required">;
        providerLogo: import("convex/values").VString<string | undefined, "optional">;
        type: import("convex/values").VUnion<"comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation", [import("convex/values").VLiteral<"comprehensive", "required">, import("convex/values").VLiteral<"medical", "required">, import("convex/values").VLiteral<"accident", "required">, import("convex/values").VLiteral<"flight_delay", "required">, import("convex/values").VLiteral<"luggage", "required">, import("convex/values").VLiteral<"cancellation", "required">, import("convex/values").VLiteral<"emergency_evacuation", "required">], "required", never>;
        coverageAmount: import("convex/values").VFloat64<number, "required">;
        coverageDetails: import("convex/values").VArray<{
            description?: string | undefined;
            item: string;
            amount: number;
        }[], import("convex/values").VObject<{
            description?: string | undefined;
            item: string;
            amount: number;
        }, {
            item: import("convex/values").VString<string, "required">;
            amount: import("convex/values").VFloat64<number, "required">;
            description: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "description" | "item" | "amount">, "required">;
        pricePerDay: import("convex/values").VFloat64<number, "required">;
        minDays: import("convex/values").VFloat64<number, "required">;
        maxDays: import("convex/values").VFloat64<number, "required">;
        applicableRegions: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        domesticOnly: import("convex/values").VBoolean<boolean, "required">;
        riskLevelCoverage: import("convex/values").VArray<("low" | "medium" | "high" | "extreme")[], import("convex/values").VUnion<"low" | "medium" | "high" | "extreme", [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">, import("convex/values").VLiteral<"extreme", "required">], "required", never>, "required">;
        features: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        exclusions: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        reviewCount: import("convex/values").VFloat64<number, "required">;
        purchaseUrl: import("convex/values").VString<string, "required">;
        contactPhone: import("convex/values").VString<string | undefined, "optional">;
        contactEmail: import("convex/values").VString<string | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        priority: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "type" | "priority" | "provider" | "updatedAt" | "nameEn" | "rating" | "purchaseUrl" | "isActive" | "providerLogo" | "coverageAmount" | "coverageDetails" | "pricePerDay" | "minDays" | "maxDays" | "applicableRegions" | "domesticOnly" | "riskLevelCoverage" | "features" | "exclusions" | "reviewCount" | "contactPhone" | "contactEmail">, {
        by_type: ["type", "_creationTime"];
        by_provider: ["provider", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
        by_domestic: ["domesticOnly", "_creationTime"];
        by_priority: ["priority", "_creationTime"];
    }, {}, {}>;
    userInsurance: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        orderNumber?: string | undefined;
        policyNumber?: string | undefined;
        claimHistory?: {
            notes?: string | undefined;
            status: "approved" | "rejected" | "processing" | "paid" | "submitted";
            claimId: string;
            claimDate: number;
            claimType: string;
            claimAmount: number;
        }[] | undefined;
        status: "cancelled" | "pending" | "active" | "expired" | "claimed";
        createdAt: number;
        destinations: string[];
        userId: string;
        startDate: string;
        endDate: string;
        updatedAt: number;
        totalPrice: number;
        productId: import("convex/values").GenericId<"insuranceProducts">;
        coverageDays: number;
        insuredPersons: {
            phone?: string | undefined;
            name: string;
            idType: "other" | "id_card" | "passport";
            idNumber: string;
            relationship: "other" | "child" | "self" | "spouse" | "parent";
        }[];
        paymentStatus: "failed" | "pending" | "paid" | "refunded";
        purchasedAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        productId: import("convex/values").VId<import("convex/values").GenericId<"insuranceProducts">, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        startDate: import("convex/values").VString<string, "required">;
        endDate: import("convex/values").VString<string, "required">;
        coverageDays: import("convex/values").VFloat64<number, "required">;
        destinations: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        insuredPersons: import("convex/values").VArray<{
            phone?: string | undefined;
            name: string;
            idType: "other" | "id_card" | "passport";
            idNumber: string;
            relationship: "other" | "child" | "self" | "spouse" | "parent";
        }[], import("convex/values").VObject<{
            phone?: string | undefined;
            name: string;
            idType: "other" | "id_card" | "passport";
            idNumber: string;
            relationship: "other" | "child" | "self" | "spouse" | "parent";
        }, {
            name: import("convex/values").VString<string, "required">;
            idType: import("convex/values").VUnion<"other" | "id_card" | "passport", [import("convex/values").VLiteral<"id_card", "required">, import("convex/values").VLiteral<"passport", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
            idNumber: import("convex/values").VString<string, "required">;
            phone: import("convex/values").VString<string | undefined, "optional">;
            relationship: import("convex/values").VUnion<"other" | "child" | "self" | "spouse" | "parent", [import("convex/values").VLiteral<"self", "required">, import("convex/values").VLiteral<"spouse", "required">, import("convex/values").VLiteral<"child", "required">, import("convex/values").VLiteral<"parent", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        }, "required", "name" | "phone" | "idType" | "idNumber" | "relationship">, "required">;
        orderNumber: import("convex/values").VString<string | undefined, "optional">;
        policyNumber: import("convex/values").VString<string | undefined, "optional">;
        totalPrice: import("convex/values").VFloat64<number, "required">;
        paymentStatus: import("convex/values").VUnion<"failed" | "pending" | "paid" | "refunded", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"paid", "required">, import("convex/values").VLiteral<"refunded", "required">, import("convex/values").VLiteral<"failed", "required">], "required", never>;
        status: import("convex/values").VUnion<"cancelled" | "pending" | "active" | "expired" | "claimed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"expired", "required">, import("convex/values").VLiteral<"cancelled", "required">, import("convex/values").VLiteral<"claimed", "required">], "required", never>;
        claimHistory: import("convex/values").VArray<{
            notes?: string | undefined;
            status: "approved" | "rejected" | "processing" | "paid" | "submitted";
            claimId: string;
            claimDate: number;
            claimType: string;
            claimAmount: number;
        }[] | undefined, import("convex/values").VObject<{
            notes?: string | undefined;
            status: "approved" | "rejected" | "processing" | "paid" | "submitted";
            claimId: string;
            claimDate: number;
            claimType: string;
            claimAmount: number;
        }, {
            claimId: import("convex/values").VString<string, "required">;
            claimDate: import("convex/values").VFloat64<number, "required">;
            claimType: import("convex/values").VString<string, "required">;
            claimAmount: import("convex/values").VFloat64<number, "required">;
            status: import("convex/values").VUnion<"approved" | "rejected" | "processing" | "paid" | "submitted", [import("convex/values").VLiteral<"submitted", "required">, import("convex/values").VLiteral<"processing", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"rejected", "required">, import("convex/values").VLiteral<"paid", "required">], "required", never>;
            notes: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "status" | "notes" | "claimId" | "claimDate" | "claimType" | "claimAmount">, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        purchasedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "destinations" | "userId" | "startDate" | "endDate" | "updatedAt" | "notes" | "itineraryId" | "totalPrice" | "productId" | "coverageDays" | "insuredPersons" | "orderNumber" | "policyNumber" | "paymentStatus" | "claimHistory" | "purchasedAt">, {
        by_user: ["userId", "_creationTime"];
        by_product: ["productId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
    }, {}, {}>;
    destinationRiskProfiles: import("convex/server").TableDefinition<import("convex/values").VObject<{
        destinationCode?: string | undefined;
        travelAdvisory?: string | undefined;
        destination: string;
        lastUpdated: number;
        riskLevel: "low" | "medium" | "high" | "extreme";
        riskFactors: string[];
        recommendedInsuranceTypes: ("comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation")[];
    }, {
        destination: import("convex/values").VString<string, "required">;
        destinationCode: import("convex/values").VString<string | undefined, "optional">;
        riskLevel: import("convex/values").VUnion<"low" | "medium" | "high" | "extreme", [import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">, import("convex/values").VLiteral<"extreme", "required">], "required", never>;
        riskFactors: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        recommendedInsuranceTypes: import("convex/values").VArray<("comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation")[], import("convex/values").VUnion<"comprehensive" | "medical" | "accident" | "flight_delay" | "luggage" | "cancellation" | "emergency_evacuation", [import("convex/values").VLiteral<"comprehensive", "required">, import("convex/values").VLiteral<"medical", "required">, import("convex/values").VLiteral<"accident", "required">, import("convex/values").VLiteral<"flight_delay", "required">, import("convex/values").VLiteral<"luggage", "required">, import("convex/values").VLiteral<"cancellation", "required">, import("convex/values").VLiteral<"emergency_evacuation", "required">], "required", never>, "required">;
        travelAdvisory: import("convex/values").VString<string | undefined, "optional">;
        lastUpdated: import("convex/values").VFloat64<number, "required">;
    }, "required", "destination" | "lastUpdated" | "destinationCode" | "riskLevel" | "riskFactors" | "recommendedInsuranceTypes" | "travelAdvisory">, {
        by_destination: ["destination", "_creationTime"];
        by_code: ["destinationCode", "_creationTime"];
        by_risk_level: ["riskLevel", "_creationTime"];
    }, {}, {}>;
    insuranceClaimGuides: import("convex/server").TableDefinition<import("convex/values").VObject<{
        timeLimit?: string | undefined;
        contactInfo?: {
            email?: string | undefined;
            phone?: string | undefined;
            website?: string | undefined;
        } | undefined;
        faqs?: {
            question: string;
            answer: string;
        }[] | undefined;
        content: string;
        createdAt: number;
        title: string;
        priority: number;
        steps: {
            tips?: string | undefined;
            requiredDocuments?: string[] | undefined;
            description: string;
            title: string;
            stepNumber: number;
        }[];
        updatedAt: number;
        isActive: boolean;
        claimType: "other" | "medical" | "accident" | "flight_delay" | "emergency_evacuation" | "luggage_loss" | "trip_cancellation";
        requiredDocuments: string[];
    }, {
        title: import("convex/values").VString<string, "required">;
        claimType: import("convex/values").VUnion<"other" | "medical" | "accident" | "flight_delay" | "emergency_evacuation" | "luggage_loss" | "trip_cancellation", [import("convex/values").VLiteral<"medical", "required">, import("convex/values").VLiteral<"accident", "required">, import("convex/values").VLiteral<"flight_delay", "required">, import("convex/values").VLiteral<"luggage_loss", "required">, import("convex/values").VLiteral<"trip_cancellation", "required">, import("convex/values").VLiteral<"emergency_evacuation", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        content: import("convex/values").VString<string, "required">;
        steps: import("convex/values").VArray<{
            tips?: string | undefined;
            requiredDocuments?: string[] | undefined;
            description: string;
            title: string;
            stepNumber: number;
        }[], import("convex/values").VObject<{
            tips?: string | undefined;
            requiredDocuments?: string[] | undefined;
            description: string;
            title: string;
            stepNumber: number;
        }, {
            stepNumber: import("convex/values").VFloat64<number, "required">;
            title: import("convex/values").VString<string, "required">;
            description: import("convex/values").VString<string, "required">;
            requiredDocuments: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            tips: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "description" | "title" | "tips" | "stepNumber" | "requiredDocuments">, "required">;
        requiredDocuments: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        timeLimit: import("convex/values").VString<string | undefined, "optional">;
        contactInfo: import("convex/values").VObject<{
            email?: string | undefined;
            phone?: string | undefined;
            website?: string | undefined;
        } | undefined, {
            phone: import("convex/values").VString<string | undefined, "optional">;
            email: import("convex/values").VString<string | undefined, "optional">;
            website: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "email" | "phone" | "website">;
        faqs: import("convex/values").VArray<{
            question: string;
            answer: string;
        }[] | undefined, import("convex/values").VObject<{
            question: string;
            answer: string;
        }, {
            question: import("convex/values").VString<string, "required">;
            answer: import("convex/values").VString<string, "required">;
        }, "required", "question" | "answer">, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        priority: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "createdAt" | "title" | "priority" | "steps" | "updatedAt" | "isActive" | "claimType" | "requiredDocuments" | "timeLimit" | "contactInfo" | "faqs" | "contactInfo.email" | "contactInfo.phone" | "contactInfo.website">, {
        by_claim_type: ["claimType", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
        by_priority: ["priority", "_creationTime"];
    }, {}, {}>;
    chatSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        context?: string | undefined;
        guideId?: import("convex/values").GenericId<"travelGuides"> | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        createdAt: number;
        title: string;
        userId: string;
        lastMessageAt: number;
        messageCount: number;
        isArchived: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        guideId: import("convex/values").VId<import("convex/values").GenericId<"travelGuides"> | undefined, "optional">;
        context: import("convex/values").VString<string | undefined, "optional">;
        messageCount: import("convex/values").VFloat64<number, "required">;
        lastMessageAt: import("convex/values").VFloat64<number, "required">;
        isArchived: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "title" | "context" | "guideId" | "userId" | "itineraryId" | "lastMessageAt" | "messageCount" | "isArchived">, {
        by_user: ["userId", "_creationTime"];
        by_user_archived: ["userId", "isArchived", "_creationTime"];
        by_user_last_message: ["userId", "lastMessageAt", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
    }, {}, {}>;
    chatMessages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: {
            pois?: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                name: string;
                type: string;
            }[] | undefined;
            sources?: string[] | undefined;
            itineraryChanges?: {
                dayNumber?: number | undefined;
                poiName?: string | undefined;
                details?: string | undefined;
                action: string;
            }[] | undefined;
            quickActions?: {
                payload?: string | undefined;
                action: string;
                label: string;
            }[] | undefined;
        } | undefined;
        role: "user" | "assistant" | "system";
        content: string;
        createdAt: number;
        sessionId: import("convex/values").GenericId<"chatSessions">;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"chatSessions">, "required">;
        role: import("convex/values").VUnion<"user" | "assistant" | "system", [import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"assistant", "required">, import("convex/values").VLiteral<"system", "required">], "required", never>;
        content: import("convex/values").VString<string, "required">;
        metadata: import("convex/values").VObject<{
            pois?: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                name: string;
                type: string;
            }[] | undefined;
            sources?: string[] | undefined;
            itineraryChanges?: {
                dayNumber?: number | undefined;
                poiName?: string | undefined;
                details?: string | undefined;
                action: string;
            }[] | undefined;
            quickActions?: {
                payload?: string | undefined;
                action: string;
                label: string;
            }[] | undefined;
        } | undefined, {
            pois: import("convex/values").VArray<{
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                name: string;
                type: string;
            }[] | undefined, import("convex/values").VObject<{
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                rating?: number | undefined;
                priceInfo?: string | undefined;
                name: string;
                type: string;
            }, {
                name: import("convex/values").VString<string, "required">;
                type: import("convex/values").VString<string, "required">;
                description: import("convex/values").VString<string | undefined, "optional">;
                latitude: import("convex/values").VFloat64<number | undefined, "optional">;
                longitude: import("convex/values").VFloat64<number | undefined, "optional">;
                address: import("convex/values").VString<string | undefined, "optional">;
                rating: import("convex/values").VFloat64<number | undefined, "optional">;
                priceInfo: import("convex/values").VString<string | undefined, "optional">;
            }, "required", "name" | "type" | "description" | "latitude" | "longitude" | "address" | "rating" | "priceInfo">, "optional">;
            itineraryChanges: import("convex/values").VArray<{
                dayNumber?: number | undefined;
                poiName?: string | undefined;
                details?: string | undefined;
                action: string;
            }[] | undefined, import("convex/values").VObject<{
                dayNumber?: number | undefined;
                poiName?: string | undefined;
                details?: string | undefined;
                action: string;
            }, {
                action: import("convex/values").VString<string, "required">;
                dayNumber: import("convex/values").VFloat64<number | undefined, "optional">;
                poiName: import("convex/values").VString<string | undefined, "optional">;
                details: import("convex/values").VString<string | undefined, "optional">;
            }, "required", "action" | "dayNumber" | "poiName" | "details">, "optional">;
            quickActions: import("convex/values").VArray<{
                payload?: string | undefined;
                action: string;
                label: string;
            }[] | undefined, import("convex/values").VObject<{
                payload?: string | undefined;
                action: string;
                label: string;
            }, {
                label: import("convex/values").VString<string, "required">;
                action: import("convex/values").VString<string, "required">;
                payload: import("convex/values").VString<string | undefined, "optional">;
            }, "required", "action" | "label" | "payload">, "optional">;
            sources: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        }, "optional", "pois" | "sources" | "itineraryChanges" | "quickActions">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "role" | "content" | "createdAt" | "metadata" | "sessionId" | "metadata.pois" | "metadata.sources" | "metadata.itineraryChanges" | "metadata.quickActions">, {
        by_session: ["sessionId", "_creationTime"];
        by_session_created: ["sessionId", "createdAt", "_creationTime"];
    }, {}, {}>;
    tippingGuides: import("convex/server").TableDefinition<import("convex/values").VObject<{
        tips?: string[] | undefined;
        countryNameEn?: string | undefined;
        countryCode: string;
        currency: string;
        currencySymbol: string;
        lastUpdated: number;
        countryName: string;
        tippingCulture: "optional" | "expected" | "appreciated" | "not_expected" | "offensive";
        cultureSummary: string;
        scenarios: {
            notes?: string | undefined;
            fixedAmount?: number | undefined;
            type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
            typeName: string;
            minPercentage: number;
            maxPercentage: number;
            suggestedPercentage: number;
        }[];
    }, {
        countryCode: import("convex/values").VString<string, "required">;
        countryName: import("convex/values").VString<string, "required">;
        countryNameEn: import("convex/values").VString<string | undefined, "optional">;
        currency: import("convex/values").VString<string, "required">;
        currencySymbol: import("convex/values").VString<string, "required">;
        tippingCulture: import("convex/values").VUnion<"optional" | "expected" | "appreciated" | "not_expected" | "offensive", [import("convex/values").VLiteral<"expected", "required">, import("convex/values").VLiteral<"appreciated", "required">, import("convex/values").VLiteral<"optional", "required">, import("convex/values").VLiteral<"not_expected", "required">, import("convex/values").VLiteral<"offensive", "required">], "required", never>;
        cultureSummary: import("convex/values").VString<string, "required">;
        scenarios: import("convex/values").VArray<{
            notes?: string | undefined;
            fixedAmount?: number | undefined;
            type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
            typeName: string;
            minPercentage: number;
            maxPercentage: number;
            suggestedPercentage: number;
        }[], import("convex/values").VObject<{
            notes?: string | undefined;
            fixedAmount?: number | undefined;
            type: "restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser";
            typeName: string;
            minPercentage: number;
            maxPercentage: number;
            suggestedPercentage: number;
        }, {
            type: import("convex/values").VUnion<"restaurant" | "hotel" | "other" | "taxi" | "bar" | "spa" | "tour" | "delivery" | "hairdresser", [import("convex/values").VLiteral<"restaurant", "required">, import("convex/values").VLiteral<"hotel", "required">, import("convex/values").VLiteral<"taxi", "required">, import("convex/values").VLiteral<"bar", "required">, import("convex/values").VLiteral<"spa", "required">, import("convex/values").VLiteral<"tour", "required">, import("convex/values").VLiteral<"delivery", "required">, import("convex/values").VLiteral<"hairdresser", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
            typeName: import("convex/values").VString<string, "required">;
            minPercentage: import("convex/values").VFloat64<number, "required">;
            maxPercentage: import("convex/values").VFloat64<number, "required">;
            suggestedPercentage: import("convex/values").VFloat64<number, "required">;
            fixedAmount: import("convex/values").VFloat64<number | undefined, "optional">;
            notes: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "type" | "typeName" | "notes" | "minPercentage" | "maxPercentage" | "suggestedPercentage" | "fixedAmount">, "required">;
        tips: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        lastUpdated: import("convex/values").VFloat64<number, "required">;
    }, "required", "tips" | "countryCode" | "currency" | "currencySymbol" | "lastUpdated" | "countryName" | "countryNameEn" | "tippingCulture" | "cultureSummary" | "scenarios">, {
        by_country_code: ["countryCode", "_creationTime"];
        by_tipping_culture: ["tippingCulture", "_creationTime"];
    }, {}, {}>;
    travelBlogPosts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceUrl?: string | undefined;
        authorName?: string | undefined;
        publishedAt?: number | undefined;
        content: string;
        title: string;
        sourceExternalId: string;
        crawledAt: number;
        sourcePlatform: string;
    }, {
        sourcePlatform: import("convex/values").VString<string, "required">;
        sourceExternalId: import("convex/values").VString<string, "required">;
        sourceUrl: import("convex/values").VString<string | undefined, "optional">;
        title: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        publishedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        crawledAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "title" | "sourceExternalId" | "sourceUrl" | "authorName" | "publishedAt" | "crawledAt" | "sourcePlatform">, {
        by_platform: ["sourcePlatform", "_creationTime"];
        by_platform_external: ["sourcePlatform", "sourceExternalId", "_creationTime"];
    }, {}, {}>;
    emergencyContacts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        email?: string | undefined;
        notes?: string | undefined;
        createdAt: number;
        name: string;
        userId: string;
        updatedAt: number;
        relationship: string;
        phoneNumber: string;
        isPrimary: boolean;
        notifyOnSos: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        relationship: import("convex/values").VString<string, "required">;
        phoneNumber: import("convex/values").VString<string, "required">;
        email: import("convex/values").VString<string | undefined, "optional">;
        isPrimary: import("convex/values").VBoolean<boolean, "required">;
        notifyOnSos: import("convex/values").VBoolean<boolean, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "email" | "userId" | "updatedAt" | "notes" | "relationship" | "phoneNumber" | "isPrimary" | "notifyOnSos">, {
        by_user: ["userId", "_creationTime"];
        by_user_primary: ["userId", "isPrimary", "_creationTime"];
    }, {}, {}>;
    emergencyServices: import("convex/server").TableDefinition<import("convex/values").VObject<{
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
    }, {
        countryCode: import("convex/values").VString<string, "required">;
        countryName: import("convex/values").VString<string, "required">;
        countryNameEn: import("convex/values").VString<string | undefined, "optional">;
        cityName: import("convex/values").VString<string | undefined, "optional">;
        policeNumber: import("convex/values").VString<string, "required">;
        ambulanceNumber: import("convex/values").VString<string, "required">;
        fireNumber: import("convex/values").VString<string, "required">;
        generalEmergencyNumber: import("convex/values").VString<string | undefined, "optional">;
        embassyPhone: import("convex/values").VString<string | undefined, "optional">;
        embassyAddress: import("convex/values").VString<string | undefined, "optional">;
        embassyWebsite: import("convex/values").VString<string | undefined, "optional">;
        consulateInfo: import("convex/values").VArray<{
            address?: string | undefined;
            city: string;
            phone: string;
        }[] | undefined, import("convex/values").VObject<{
            address?: string | undefined;
            city: string;
            phone: string;
        }, {
            city: import("convex/values").VString<string, "required">;
            phone: import("convex/values").VString<string, "required">;
            address: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "city" | "phone" | "address">, "optional">;
        touristPoliceNumber: import("convex/values").VString<string | undefined, "optional">;
        coastGuardNumber: import("convex/values").VString<string | undefined, "optional">;
        roadAssistanceNumber: import("convex/values").VString<string | undefined, "optional">;
        poisonControlNumber: import("convex/values").VString<string | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        lastUpdated: import("convex/values").VFloat64<number, "required">;
    }, "required", "countryCode" | "ambulanceNumber" | "fireNumber" | "notes" | "lastUpdated" | "cityName" | "countryName" | "countryNameEn" | "policeNumber" | "generalEmergencyNumber" | "embassyPhone" | "embassyAddress" | "embassyWebsite" | "consulateInfo" | "touristPoliceNumber" | "coastGuardNumber" | "roadAssistanceNumber" | "poisonControlNumber">, {
        by_country: ["countryCode", "_creationTime"];
        by_country_city: ["countryCode", "cityName", "_creationTime"];
    }, {}, {}>;
    travelInsurance: import("convex/server").TableDefinition<import("convex/values").VObject<{
        email?: string | undefined;
        notes?: string | undefined;
        coverageAmount?: string | undefined;
        exclusions?: string | undefined;
        website?: string | undefined;
        claimsPhone?: string | undefined;
        medicalCoverage?: string | undefined;
        evacuationCoverage?: string | undefined;
        policyDocumentUrl?: string | undefined;
        insuranceCardUrl?: string | undefined;
        coveredRegions?: string[] | undefined;
        createdAt: number;
        userId: string;
        startDate: string;
        endDate: string;
        updatedAt: number;
        isActive: boolean;
        policyNumber: string;
        providerName: string;
        emergencyHotline: string;
        coverageType: string;
    }, {
        userId: import("convex/values").VString<string, "required">;
        providerName: import("convex/values").VString<string, "required">;
        policyNumber: import("convex/values").VString<string, "required">;
        startDate: import("convex/values").VString<string, "required">;
        endDate: import("convex/values").VString<string, "required">;
        emergencyHotline: import("convex/values").VString<string, "required">;
        claimsPhone: import("convex/values").VString<string | undefined, "optional">;
        email: import("convex/values").VString<string | undefined, "optional">;
        website: import("convex/values").VString<string | undefined, "optional">;
        coverageType: import("convex/values").VString<string, "required">;
        coverageAmount: import("convex/values").VString<string | undefined, "optional">;
        medicalCoverage: import("convex/values").VString<string | undefined, "optional">;
        evacuationCoverage: import("convex/values").VString<string | undefined, "optional">;
        policyDocumentUrl: import("convex/values").VString<string | undefined, "optional">;
        insuranceCardUrl: import("convex/values").VString<string | undefined, "optional">;
        coveredRegions: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        exclusions: import("convex/values").VString<string | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "email" | "userId" | "startDate" | "endDate" | "updatedAt" | "notes" | "isActive" | "coverageAmount" | "exclusions" | "policyNumber" | "website" | "providerName" | "emergencyHotline" | "claimsPhone" | "coverageType" | "medicalCoverage" | "evacuationCoverage" | "policyDocumentUrl" | "insuranceCardUrl" | "coveredRegions">, {
        by_user: ["userId", "_creationTime"];
        by_user_active: ["userId", "isActive", "_creationTime"];
    }, {}, {}>;
    sosAlerts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        message?: string | undefined;
        resolvedBy?: string | undefined;
        resolvedAt?: number | undefined;
        locationName?: string | undefined;
        accuracy?: number | undefined;
        status: "cancelled" | "received" | "resolved" | "sent";
        createdAt: number;
        latitude: number;
        longitude: number;
        userId: string;
        alertType: "emergency" | "other" | "medical" | "safety";
        notifiedContacts: import("convex/values").GenericId<"emergencyContacts">[];
    }, {
        userId: import("convex/values").VString<string, "required">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        locationName: import("convex/values").VString<string | undefined, "optional">;
        accuracy: import("convex/values").VFloat64<number | undefined, "optional">;
        alertType: import("convex/values").VUnion<"emergency" | "other" | "medical" | "safety", [import("convex/values").VLiteral<"emergency", "required">, import("convex/values").VLiteral<"medical", "required">, import("convex/values").VLiteral<"safety", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        message: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"cancelled" | "received" | "resolved" | "sent", [import("convex/values").VLiteral<"sent", "required">, import("convex/values").VLiteral<"received", "required">, import("convex/values").VLiteral<"resolved", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        notifiedContacts: import("convex/values").VArray<import("convex/values").GenericId<"emergencyContacts">[], import("convex/values").VId<import("convex/values").GenericId<"emergencyContacts">, "required">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        resolvedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        resolvedBy: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "createdAt" | "message" | "latitude" | "longitude" | "userId" | "resolvedBy" | "resolvedAt" | "locationName" | "accuracy" | "alertType" | "notifiedContacts">, {
        by_user: ["userId", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    safetyRatings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceUrl?: string | undefined;
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        verifiedBy?: string | undefined;
        destinationNameEn?: string | undefined;
        womenSafetyRating?: number | undefined;
        lgbtqSafetyRating?: number | undefined;
        summaryEn?: string | undefined;
        emergencyNumbers?: {
            touristHotline?: string | undefined;
            police?: string | undefined;
            ambulance?: string | undefined;
            fire?: string | undefined;
        } | undefined;
        createdAt: number;
        summary: string;
        updatedAt: number;
        countryCode: string;
        source: string;
        destinationName: string;
        overallRating: number;
        crimeRating: number;
        healthRating: number;
        naturalDisasterRating: number;
        transportRating: number;
        generalTips: string[];
        lastVerifiedAt: number;
    }, {
        destinationName: import("convex/values").VString<string, "required">;
        destinationNameEn: import("convex/values").VString<string | undefined, "optional">;
        countryCode: import("convex/values").VString<string, "required">;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
        overallRating: import("convex/values").VFloat64<number, "required">;
        crimeRating: import("convex/values").VFloat64<number, "required">;
        healthRating: import("convex/values").VFloat64<number, "required">;
        naturalDisasterRating: import("convex/values").VFloat64<number, "required">;
        transportRating: import("convex/values").VFloat64<number, "required">;
        womenSafetyRating: import("convex/values").VFloat64<number | undefined, "optional">;
        lgbtqSafetyRating: import("convex/values").VFloat64<number | undefined, "optional">;
        summary: import("convex/values").VString<string, "required">;
        summaryEn: import("convex/values").VString<string | undefined, "optional">;
        generalTips: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        emergencyNumbers: import("convex/values").VObject<{
            touristHotline?: string | undefined;
            police?: string | undefined;
            ambulance?: string | undefined;
            fire?: string | undefined;
        } | undefined, {
            police: import("convex/values").VString<string | undefined, "optional">;
            ambulance: import("convex/values").VString<string | undefined, "optional">;
            fire: import("convex/values").VString<string | undefined, "optional">;
            touristHotline: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "touristHotline" | "police" | "ambulance" | "fire">;
        source: import("convex/values").VString<string, "required">;
        sourceUrl: import("convex/values").VString<string | undefined, "optional">;
        lastVerifiedAt: import("convex/values").VFloat64<number, "required">;
        verifiedBy: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "sourceUrl" | "summary" | "updatedAt" | "countryCode" | "cityId" | "source" | "verifiedBy" | "destinationName" | "destinationNameEn" | "overallRating" | "crimeRating" | "healthRating" | "naturalDisasterRating" | "transportRating" | "womenSafetyRating" | "lgbtqSafetyRating" | "summaryEn" | "generalTips" | "emergencyNumbers" | "lastVerifiedAt" | "emergencyNumbers.touristHotline" | "emergencyNumbers.police" | "emergencyNumbers.ambulance" | "emergencyNumbers.fire">, {
        by_destination: ["destinationName", "_creationTime"];
        by_country: ["countryCode", "_creationTime"];
        by_city: ["cityId", "_creationTime"];
        by_overall_rating: ["overallRating", "_creationTime"];
    }, {}, {}>;
    safetyAlerts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceUrl?: string | undefined;
        endDate?: number | undefined;
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        descriptionEn?: string | undefined;
        titleEn?: string | undefined;
        affectedAreas?: string[] | undefined;
        avoidAreas?: string[] | undefined;
        officialAdvisoryLevel?: string | undefined;
        createdBy?: string | undefined;
        createdAt: number;
        description: string;
        title: string;
        startDate: number;
        updatedAt: number;
        countryCode: string;
        source: string;
        isActive: boolean;
        alertType: "other" | "travel_advisory" | "health_warning" | "natural_disaster" | "civil_unrest" | "terrorism" | "crime_spike" | "scam_warning";
        destinationName: string;
        severity: "info" | "critical" | "low" | "medium" | "high";
        recommendations: string[];
    }, {
        destinationName: import("convex/values").VString<string, "required">;
        countryCode: import("convex/values").VString<string, "required">;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
        affectedAreas: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        alertType: import("convex/values").VUnion<"other" | "travel_advisory" | "health_warning" | "natural_disaster" | "civil_unrest" | "terrorism" | "crime_spike" | "scam_warning", [import("convex/values").VLiteral<"travel_advisory", "required">, import("convex/values").VLiteral<"health_warning", "required">, import("convex/values").VLiteral<"natural_disaster", "required">, import("convex/values").VLiteral<"civil_unrest", "required">, import("convex/values").VLiteral<"terrorism", "required">, import("convex/values").VLiteral<"crime_spike", "required">, import("convex/values").VLiteral<"scam_warning", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        severity: import("convex/values").VUnion<"info" | "critical" | "low" | "medium" | "high", [import("convex/values").VLiteral<"info", "required">, import("convex/values").VLiteral<"low", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"high", "required">, import("convex/values").VLiteral<"critical", "required">], "required", never>;
        title: import("convex/values").VString<string, "required">;
        titleEn: import("convex/values").VString<string | undefined, "optional">;
        description: import("convex/values").VString<string, "required">;
        descriptionEn: import("convex/values").VString<string | undefined, "optional">;
        recommendations: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        avoidAreas: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        startDate: import("convex/values").VFloat64<number, "required">;
        endDate: import("convex/values").VFloat64<number | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        source: import("convex/values").VString<string, "required">;
        sourceUrl: import("convex/values").VString<string | undefined, "optional">;
        officialAdvisoryLevel: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        createdBy: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "createdAt" | "description" | "title" | "sourceUrl" | "startDate" | "endDate" | "updatedAt" | "countryCode" | "cityId" | "descriptionEn" | "titleEn" | "source" | "isActive" | "alertType" | "destinationName" | "affectedAreas" | "severity" | "recommendations" | "avoidAreas" | "officialAdvisoryLevel" | "createdBy">, {
        by_destination: ["destinationName", "_creationTime"];
        by_country: ["countryCode", "_creationTime"];
        by_city: ["cityId", "_creationTime"];
        by_type: ["alertType", "_creationTime"];
        by_severity: ["severity", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
        by_active_destination: ["isActive", "destinationName", "_creationTime"];
    }, {}, {}>;
    dangerZones: import("convex/server").TableDefinition<import("convex/values").VObject<{
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        descriptionEn?: string | undefined;
        verifiedBy?: string | undefined;
        zoneNameEn?: string | undefined;
        radiusMeters?: number | undefined;
        polygon?: {
            lat: number;
            lng: number;
        }[] | undefined;
        dangerousTimes?: {
            nightOnly?: boolean | undefined;
            specificHours?: string | undefined;
            specificDays?: string[] | undefined;
            allDay: boolean;
        } | undefined;
        lastReportedAt?: number | undefined;
        createdAt: number;
        description: string;
        latitude: number;
        longitude: number;
        updatedAt: number;
        countryCode: string;
        source: string;
        isActive: boolean;
        reportCount: number;
        destinationName: string;
        zoneName: string;
        dangerLevel: "caution" | "avoid_night" | "avoid_alone" | "high_risk" | "no_go";
        dangerTypes: ("other" | "crime" | "scam" | "traffic" | "natural_hazard" | "political" | "health")[];
        precautions: string[];
        isVerified: boolean;
    }, {
        destinationName: import("convex/values").VString<string, "required">;
        countryCode: import("convex/values").VString<string, "required">;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
        zoneName: import("convex/values").VString<string, "required">;
        zoneNameEn: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        radiusMeters: import("convex/values").VFloat64<number | undefined, "optional">;
        polygon: import("convex/values").VArray<{
            lat: number;
            lng: number;
        }[] | undefined, import("convex/values").VObject<{
            lat: number;
            lng: number;
        }, {
            lat: import("convex/values").VFloat64<number, "required">;
            lng: import("convex/values").VFloat64<number, "required">;
        }, "required", "lat" | "lng">, "optional">;
        dangerLevel: import("convex/values").VUnion<"caution" | "avoid_night" | "avoid_alone" | "high_risk" | "no_go", [import("convex/values").VLiteral<"caution", "required">, import("convex/values").VLiteral<"avoid_night", "required">, import("convex/values").VLiteral<"avoid_alone", "required">, import("convex/values").VLiteral<"high_risk", "required">, import("convex/values").VLiteral<"no_go", "required">], "required", never>;
        dangerTypes: import("convex/values").VArray<("other" | "crime" | "scam" | "traffic" | "natural_hazard" | "political" | "health")[], import("convex/values").VUnion<"other" | "crime" | "scam" | "traffic" | "natural_hazard" | "political" | "health", [import("convex/values").VLiteral<"crime", "required">, import("convex/values").VLiteral<"scam", "required">, import("convex/values").VLiteral<"traffic", "required">, import("convex/values").VLiteral<"natural_hazard", "required">, import("convex/values").VLiteral<"political", "required">, import("convex/values").VLiteral<"health", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>, "required">;
        description: import("convex/values").VString<string, "required">;
        descriptionEn: import("convex/values").VString<string | undefined, "optional">;
        precautions: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        dangerousTimes: import("convex/values").VObject<{
            nightOnly?: boolean | undefined;
            specificHours?: string | undefined;
            specificDays?: string[] | undefined;
            allDay: boolean;
        } | undefined, {
            allDay: import("convex/values").VBoolean<boolean, "required">;
            nightOnly: import("convex/values").VBoolean<boolean | undefined, "optional">;
            specificHours: import("convex/values").VString<string | undefined, "optional">;
            specificDays: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        }, "optional", "allDay" | "nightOnly" | "specificHours" | "specificDays">;
        source: import("convex/values").VString<string, "required">;
        reportCount: import("convex/values").VFloat64<number, "required">;
        lastReportedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        isVerified: import("convex/values").VBoolean<boolean, "required">;
        verifiedBy: import("convex/values").VString<string | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "description" | "latitude" | "longitude" | "updatedAt" | "countryCode" | "cityId" | "descriptionEn" | "source" | "isActive" | "verifiedBy" | "reportCount" | "destinationName" | "zoneName" | "zoneNameEn" | "radiusMeters" | "polygon" | "dangerLevel" | "dangerTypes" | "precautions" | "dangerousTimes" | "lastReportedAt" | "isVerified" | "dangerousTimes.allDay" | "dangerousTimes.nightOnly" | "dangerousTimes.specificHours" | "dangerousTimes.specificDays">, {
        by_destination: ["destinationName", "_creationTime"];
        by_country: ["countryCode", "_creationTime"];
        by_city: ["cityId", "_creationTime"];
        by_danger_level: ["dangerLevel", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
        by_location: ["latitude", "longitude", "_creationTime"];
    }, {}, {}>;
    wifiSpots: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        imageUrls?: string[] | undefined;
        nameEn?: string | undefined;
        address?: string | undefined;
        poiId?: import("convex/values").GenericId<"pois"> | undefined;
        openingHours?: string | undefined;
        verifiedAt?: number | undefined;
        verifiedBy?: string | undefined;
        ssid?: string | undefined;
        speedMbps?: number | undefined;
        createdAt: number;
        name: string;
        type: "public" | "restaurant" | "hotel" | "other" | "cafe" | "airport" | "train_station" | "shopping_mall" | "library" | "coworking";
        latitude: number;
        longitude: number;
        updatedAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        ratingCount: number;
        isVerified: boolean;
        requiresPassword: boolean;
        isFree: boolean;
        averageRating: number;
        submittedBy: string;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        type: import("convex/values").VUnion<"public" | "restaurant" | "hotel" | "other" | "cafe" | "airport" | "train_station" | "shopping_mall" | "library" | "coworking", [import("convex/values").VLiteral<"hotel", "required">, import("convex/values").VLiteral<"restaurant", "required">, import("convex/values").VLiteral<"cafe", "required">, import("convex/values").VLiteral<"airport", "required">, import("convex/values").VLiteral<"train_station", "required">, import("convex/values").VLiteral<"shopping_mall", "required">, import("convex/values").VLiteral<"library", "required">, import("convex/values").VLiteral<"coworking", "required">, import("convex/values").VLiteral<"public", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
        address: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        ssid: import("convex/values").VString<string | undefined, "optional">;
        requiresPassword: import("convex/values").VBoolean<boolean, "required">;
        isFree: import("convex/values").VBoolean<boolean, "required">;
        speedMbps: import("convex/values").VFloat64<number | undefined, "optional">;
        openingHours: import("convex/values").VString<string | undefined, "optional">;
        averageRating: import("convex/values").VFloat64<number, "required">;
        ratingCount: import("convex/values").VFloat64<number, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois"> | undefined, "optional">;
        isVerified: import("convex/values").VBoolean<boolean, "required">;
        verifiedBy: import("convex/values").VString<string | undefined, "optional">;
        verifiedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        submittedBy: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "type" | "description" | "imageUrls" | "latitude" | "longitude" | "updatedAt" | "nameEn" | "cityId" | "address" | "ratingCount" | "poiId" | "openingHours" | "verifiedAt" | "verifiedBy" | "isVerified" | "ssid" | "requiresPassword" | "isFree" | "speedMbps" | "averageRating" | "submittedBy">, {
        by_city: ["cityId", "_creationTime"];
        by_type: ["type", "_creationTime"];
        by_city_type: ["cityId", "type", "_creationTime"];
        by_poi: ["poiId", "_creationTime"];
        by_verified: ["isVerified", "_creationTime"];
        by_rating: ["averageRating", "_creationTime"];
    }, {}, {}>;
    wifiCredentials: import("convex/server").TableDefinition<import("convex/values").VObject<{
        latitude?: number | undefined;
        longitude?: number | undefined;
        notes?: string | undefined;
        lastUsedAt?: number | undefined;
        locationName?: string | undefined;
        wifiSpotId?: import("convex/values").GenericId<"wifiSpots"> | undefined;
        securityType?: "unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined;
        createdAt: number;
        name: string;
        userId: string;
        updatedAt: number;
        ssid: string;
        password: string;
        isShared: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        wifiSpotId: import("convex/values").VId<import("convex/values").GenericId<"wifiSpots"> | undefined, "optional">;
        name: import("convex/values").VString<string, "required">;
        ssid: import("convex/values").VString<string, "required">;
        password: import("convex/values").VString<string, "required">;
        securityType: import("convex/values").VUnion<"unknown" | "open" | "wep" | "wpa" | "wpa2" | "wpa3" | undefined, [import("convex/values").VLiteral<"open", "required">, import("convex/values").VLiteral<"wep", "required">, import("convex/values").VLiteral<"wpa", "required">, import("convex/values").VLiteral<"wpa2", "required">, import("convex/values").VLiteral<"wpa3", "required">, import("convex/values").VLiteral<"unknown", "required">], "optional", never>;
        locationName: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number | undefined, "optional">;
        longitude: import("convex/values").VFloat64<number | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        isShared: import("convex/values").VBoolean<boolean, "required">;
        lastUsedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "latitude" | "longitude" | "userId" | "updatedAt" | "notes" | "lastUsedAt" | "locationName" | "ssid" | "wifiSpotId" | "password" | "securityType" | "isShared">, {
        by_user: ["userId", "_creationTime"];
        by_user_spot: ["userId", "wifiSpotId", "_creationTime"];
        by_spot_shared: ["wifiSpotId", "isShared", "_creationTime"];
    }, {}, {}>;
    wifiReviews: import("convex/server").TableDefinition<import("convex/values").VObject<{
        visitDate?: string | undefined;
        comment?: string | undefined;
        speedTestResult?: number | undefined;
        connectionTime?: string | undefined;
        deviceType?: string | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        overallRating: number;
        wifiSpotId: import("convex/values").GenericId<"wifiSpots">;
        speedRating: number;
        stabilityRating: number;
        easeOfAccessRating: number;
        helpfulCount: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        wifiSpotId: import("convex/values").VId<import("convex/values").GenericId<"wifiSpots">, "required">;
        speedRating: import("convex/values").VFloat64<number, "required">;
        stabilityRating: import("convex/values").VFloat64<number, "required">;
        easeOfAccessRating: import("convex/values").VFloat64<number, "required">;
        overallRating: import("convex/values").VFloat64<number, "required">;
        comment: import("convex/values").VString<string | undefined, "optional">;
        speedTestResult: import("convex/values").VFloat64<number | undefined, "optional">;
        connectionTime: import("convex/values").VString<string | undefined, "optional">;
        deviceType: import("convex/values").VString<string | undefined, "optional">;
        visitDate: import("convex/values").VString<string | undefined, "optional">;
        helpfulCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "visitDate" | "comment" | "overallRating" | "wifiSpotId" | "speedRating" | "stabilityRating" | "easeOfAccessRating" | "speedTestResult" | "connectionTime" | "deviceType" | "helpfulCount">, {
        by_spot: ["wifiSpotId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_user_spot: ["userId", "wifiSpotId", "_creationTime"];
        by_rating: ["overallRating", "_creationTime"];
    }, {}, {}>;
    wifiReviewHelpful: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        reviewId: import("convex/values").GenericId<"wifiReviews">;
    }, {
        reviewId: import("convex/values").VId<import("convex/values").GenericId<"wifiReviews">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "reviewId">, {
        by_review: ["reviewId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_review_user: ["reviewId", "userId", "_creationTime"];
    }, {}, {}>;
    safetyIncidentReports: import("convex/server").TableDefinition<import("convex/values").VObject<{
        latitude?: number | undefined;
        longitude?: number | undefined;
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        moderatorNotes?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        specificLocation?: string | undefined;
        wasPoliceInvolved?: boolean | undefined;
        wasResolved?: boolean | undefined;
        resolutionNotes?: string | undefined;
        status: "rejected" | "pending" | "resolved" | "verified";
        createdAt: number;
        description: string;
        title: string;
        userId: string;
        updatedAt: number;
        countryCode: string;
        reportCount: number;
        destinationName: string;
        severity: "critical" | "moderate" | "minor" | "severe";
        helpfulCount: number;
        isAnonymous: boolean;
        incidentType: "other" | "harassment" | "natural_disaster" | "scam" | "theft" | "assault" | "traffic_accident" | "health_issue" | "police_issue";
        incidentDate: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        isAnonymous: import("convex/values").VBoolean<boolean, "required">;
        destinationName: import("convex/values").VString<string, "required">;
        countryCode: import("convex/values").VString<string, "required">;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
        specificLocation: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number | undefined, "optional">;
        longitude: import("convex/values").VFloat64<number | undefined, "optional">;
        incidentType: import("convex/values").VUnion<"other" | "harassment" | "natural_disaster" | "scam" | "theft" | "assault" | "traffic_accident" | "health_issue" | "police_issue", [import("convex/values").VLiteral<"theft", "required">, import("convex/values").VLiteral<"assault", "required">, import("convex/values").VLiteral<"scam", "required">, import("convex/values").VLiteral<"harassment", "required">, import("convex/values").VLiteral<"traffic_accident", "required">, import("convex/values").VLiteral<"natural_disaster", "required">, import("convex/values").VLiteral<"health_issue", "required">, import("convex/values").VLiteral<"police_issue", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        severity: import("convex/values").VUnion<"critical" | "moderate" | "minor" | "severe", [import("convex/values").VLiteral<"minor", "required">, import("convex/values").VLiteral<"moderate", "required">, import("convex/values").VLiteral<"severe", "required">, import("convex/values").VLiteral<"critical", "required">], "required", never>;
        title: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        incidentDate: import("convex/values").VFloat64<number, "required">;
        wasPoliceInvolved: import("convex/values").VBoolean<boolean | undefined, "optional">;
        wasResolved: import("convex/values").VBoolean<boolean | undefined, "optional">;
        resolutionNotes: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"rejected" | "pending" | "resolved" | "verified", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"verified", "required">, import("convex/values").VLiteral<"rejected", "required">, import("convex/values").VLiteral<"resolved", "required">], "required", never>;
        moderatorNotes: import("convex/values").VString<string | undefined, "optional">;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
        reviewedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        helpfulCount: import("convex/values").VFloat64<number, "required">;
        reportCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "description" | "title" | "latitude" | "longitude" | "userId" | "updatedAt" | "countryCode" | "cityId" | "moderatorNotes" | "reviewedBy" | "reviewedAt" | "reportCount" | "destinationName" | "severity" | "helpfulCount" | "isAnonymous" | "specificLocation" | "incidentType" | "incidentDate" | "wasPoliceInvolved" | "wasResolved" | "resolutionNotes">, {
        by_user: ["userId", "_creationTime"];
        by_destination: ["destinationName", "_creationTime"];
        by_country: ["countryCode", "_creationTime"];
        by_city: ["cityId", "_creationTime"];
        by_type: ["incidentType", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_date: ["incidentDate", "_creationTime"];
    }, {}, {}>;
    chargingStations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceUrl?: string | undefined;
        imageUrls?: string[] | undefined;
        phone?: string | undefined;
        updatedAt?: number | undefined;
        nameEn?: string | undefined;
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        externalId?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        amenities?: ("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined;
        reviewCount?: number | undefined;
        website?: string | undefined;
        operatorName?: string | undefined;
        operatorId?: string | undefined;
        pricingInfo?: {
            electricityPrice?: number | undefined;
            serviceFee?: number | undefined;
            parkingFee?: number | undefined;
            peakPrice?: number | undefined;
            valleyPrice?: number | undefined;
            flatPrice?: number | undefined;
            pricingNotes?: string | undefined;
        } | undefined;
        operatingHours?: string | undefined;
        lastStatusUpdate?: number | undefined;
        paymentMethods?: ("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined;
        supportedBrands?: string[] | undefined;
        status: "operational" | "maintenance" | "offline" | "coming_soon";
        name: string;
        latitude: number;
        longitude: number;
        address: string;
        source: string;
        crawledAt: number;
        stationType: "destination" | "public" | "private" | "highway";
        totalPorts: number;
        availablePorts: number;
        chargerTypes: {
            connectorType?: string | undefined;
            type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
            count: number;
            powerKw: number;
            available: number;
        }[];
        is24Hours: boolean;
    }, {
        externalId: import("convex/values").VString<string | undefined, "optional">;
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        operatorName: import("convex/values").VString<string | undefined, "optional">;
        operatorId: import("convex/values").VString<string | undefined, "optional">;
        address: import("convex/values").VString<string, "required">;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        stationType: import("convex/values").VUnion<"destination" | "public" | "private" | "highway", [import("convex/values").VLiteral<"public", "required">, import("convex/values").VLiteral<"private", "required">, import("convex/values").VLiteral<"destination", "required">, import("convex/values").VLiteral<"highway", "required">], "required", never>;
        totalPorts: import("convex/values").VFloat64<number, "required">;
        availablePorts: import("convex/values").VFloat64<number, "required">;
        chargerTypes: import("convex/values").VArray<{
            connectorType?: string | undefined;
            type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
            count: number;
            powerKw: number;
            available: number;
        }[], import("convex/values").VObject<{
            connectorType?: string | undefined;
            type: "ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast";
            count: number;
            powerKw: number;
            available: number;
        }, {
            type: import("convex/values").VUnion<"ac_slow" | "ac_fast" | "dc_fast" | "dc_superfast", [import("convex/values").VLiteral<"ac_slow", "required">, import("convex/values").VLiteral<"ac_fast", "required">, import("convex/values").VLiteral<"dc_fast", "required">, import("convex/values").VLiteral<"dc_superfast", "required">], "required", never>;
            powerKw: import("convex/values").VFloat64<number, "required">;
            count: import("convex/values").VFloat64<number, "required">;
            available: import("convex/values").VFloat64<number, "required">;
            connectorType: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "type" | "count" | "powerKw" | "available" | "connectorType">, "required">;
        pricingInfo: import("convex/values").VObject<{
            electricityPrice?: number | undefined;
            serviceFee?: number | undefined;
            parkingFee?: number | undefined;
            peakPrice?: number | undefined;
            valleyPrice?: number | undefined;
            flatPrice?: number | undefined;
            pricingNotes?: string | undefined;
        } | undefined, {
            electricityPrice: import("convex/values").VFloat64<number | undefined, "optional">;
            serviceFee: import("convex/values").VFloat64<number | undefined, "optional">;
            parkingFee: import("convex/values").VFloat64<number | undefined, "optional">;
            peakPrice: import("convex/values").VFloat64<number | undefined, "optional">;
            valleyPrice: import("convex/values").VFloat64<number | undefined, "optional">;
            flatPrice: import("convex/values").VFloat64<number | undefined, "optional">;
            pricingNotes: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "electricityPrice" | "serviceFee" | "parkingFee" | "peakPrice" | "valleyPrice" | "flatPrice" | "pricingNotes">;
        operatingHours: import("convex/values").VString<string | undefined, "optional">;
        is24Hours: import("convex/values").VBoolean<boolean, "required">;
        amenities: import("convex/values").VArray<("restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security")[] | undefined, import("convex/values").VUnion<"restaurant" | "restroom" | "convenience_store" | "wifi" | "lounge" | "car_wash" | "covered" | "lighting" | "security", [import("convex/values").VLiteral<"restroom", "required">, import("convex/values").VLiteral<"convenience_store", "required">, import("convex/values").VLiteral<"restaurant", "required">, import("convex/values").VLiteral<"wifi", "required">, import("convex/values").VLiteral<"lounge", "required">, import("convex/values").VLiteral<"car_wash", "required">, import("convex/values").VLiteral<"covered", "required">, import("convex/values").VLiteral<"lighting", "required">, import("convex/values").VLiteral<"security", "required">], "required", never>, "optional">;
        status: import("convex/values").VUnion<"operational" | "maintenance" | "offline" | "coming_soon", [import("convex/values").VLiteral<"operational", "required">, import("convex/values").VLiteral<"maintenance", "required">, import("convex/values").VLiteral<"offline", "required">, import("convex/values").VLiteral<"coming_soon", "required">], "required", never>;
        lastStatusUpdate: import("convex/values").VFloat64<number | undefined, "optional">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        ratingCount: import("convex/values").VFloat64<number | undefined, "optional">;
        reviewCount: import("convex/values").VFloat64<number | undefined, "optional">;
        phone: import("convex/values").VString<string | undefined, "optional">;
        website: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        source: import("convex/values").VString<string, "required">;
        sourceUrl: import("convex/values").VString<string | undefined, "optional">;
        crawledAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        paymentMethods: import("convex/values").VArray<("app" | "wechat" | "alipay" | "card" | "membership")[] | undefined, import("convex/values").VUnion<"app" | "wechat" | "alipay" | "card" | "membership", [import("convex/values").VLiteral<"app", "required">, import("convex/values").VLiteral<"wechat", "required">, import("convex/values").VLiteral<"alipay", "required">, import("convex/values").VLiteral<"card", "required">, import("convex/values").VLiteral<"membership", "required">], "required", never>, "optional">;
        supportedBrands: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
    }, "required", "status" | "name" | "sourceUrl" | "imageUrls" | "latitude" | "longitude" | "phone" | "updatedAt" | "nameEn" | "cityId" | "externalId" | "address" | "rating" | "ratingCount" | "source" | "crawledAt" | "amenities" | "reviewCount" | "website" | "operatorName" | "operatorId" | "stationType" | "totalPorts" | "availablePorts" | "chargerTypes" | "pricingInfo" | "operatingHours" | "is24Hours" | "lastStatusUpdate" | "paymentMethods" | "supportedBrands" | "pricingInfo.electricityPrice" | "pricingInfo.serviceFee" | "pricingInfo.parkingFee" | "pricingInfo.peakPrice" | "pricingInfo.valleyPrice" | "pricingInfo.flatPrice" | "pricingInfo.pricingNotes">, {
        by_city: ["cityId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_operator: ["operatorName", "_creationTime"];
        by_type: ["stationType", "_creationTime"];
        by_source: ["source", "_creationTime"];
        by_external: ["externalId", "source", "_creationTime"];
        by_city_status: ["cityId", "status", "_creationTime"];
    }, {}, {}>;
    chargingStationReviews: import("convex/server").TableDefinition<import("convex/values").VObject<{
        authorName?: string | undefined;
        imageUrls?: string[] | undefined;
        userId?: string | undefined;
        visitDate?: string | undefined;
        chargerType?: string | undefined;
        chargingDuration?: number | undefined;
        energyCharged?: number | undefined;
        totalCost?: number | undefined;
        vehicleModel?: string | undefined;
        pros?: string[] | undefined;
        cons?: string[] | undefined;
        content: string;
        createdAt: number;
        rating: number;
        isVerified: boolean;
        stationId: import("convex/values").GenericId<"chargingStations">;
    }, {
        stationId: import("convex/values").VId<import("convex/values").GenericId<"chargingStations">, "required">;
        userId: import("convex/values").VString<string | undefined, "optional">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        content: import("convex/values").VString<string, "required">;
        rating: import("convex/values").VFloat64<number, "required">;
        chargerType: import("convex/values").VString<string | undefined, "optional">;
        chargingDuration: import("convex/values").VFloat64<number | undefined, "optional">;
        energyCharged: import("convex/values").VFloat64<number | undefined, "optional">;
        totalCost: import("convex/values").VFloat64<number | undefined, "optional">;
        vehicleModel: import("convex/values").VString<string | undefined, "optional">;
        visitDate: import("convex/values").VString<string | undefined, "optional">;
        pros: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        cons: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        isVerified: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "createdAt" | "authorName" | "imageUrls" | "userId" | "rating" | "visitDate" | "isVerified" | "stationId" | "chargerType" | "chargingDuration" | "energyCharged" | "totalCost" | "vehicleModel" | "pros" | "cons">, {
        by_station: ["stationId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_rating: ["rating", "_creationTime"];
        by_station_rating: ["stationId", "rating", "_creationTime"];
    }, {}, {}>;
    favoriteChargingStations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        createdAt: number;
        userId: string;
        stationId: import("convex/values").GenericId<"chargingStations">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        stationId: import("convex/values").VId<import("convex/values").GenericId<"chargingStations">, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "notes" | "stationId">, {
        by_user: ["userId", "_creationTime"];
        by_station: ["stationId", "_creationTime"];
        by_user_station: ["userId", "stationId", "_creationTime"];
    }, {}, {}>;
    simCards: import("convex/server").TableDefinition<import("convex/values").VObject<{
        nameEn?: string | undefined;
        rating?: number | undefined;
        providerLogo?: string | undefined;
        destinationNames?: string[] | undefined;
        regionName?: string | undefined;
        supportedCarriers?: string[] | undefined;
        esimInfo?: {
            activationInstructions?: string | undefined;
            compatibleDevices?: string[] | undefined;
            supportsQrActivation: boolean;
            supportsAppActivation: boolean;
            requiresUnlockedPhone: boolean;
        } | undefined;
        physicalSimInfo?: {
            deliveryOptions?: {
                description?: string | undefined;
                estimatedDays?: number | undefined;
                fee?: number | undefined;
                method: string;
            }[] | undefined;
            pickupLocations?: string[] | undefined;
            simSize: string[];
        } | undefined;
        voiceMinutes?: number | undefined;
        smsCount?: number | undefined;
        localNumber?: boolean | undefined;
        maxDevices?: number | undefined;
        purchasePlatforms?: string[] | undefined;
        affiliateUrl?: string | undefined;
        salesCount?: number | undefined;
        isPromoted?: boolean | undefined;
        createdAt: number;
        name: string;
        priority: number;
        destinations: string[];
        provider: string;
        updatedAt: number;
        purchaseUrl: string;
        isActive: boolean;
        features: string[];
        reviewCount: number;
        coverageType: "single_country" | "regional" | "global";
        cardType: "physical" | "esim" | "wifi_device";
        dataPlans: {
            originalPrice?: number | undefined;
            pricePerDay?: number | undefined;
            dataAmountBytes?: number | undefined;
            throttledSpeedAfterLimit?: string | undefined;
            pricePerGB?: number | undefined;
            currency: string;
            price: number;
            dataAmount: string;
            isUnlimited: boolean;
            validityDays: number;
        }[];
        networkType: string[];
        includesVoice: boolean;
        includesSms: boolean;
        hotspotSupported: boolean;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        provider: import("convex/values").VString<string, "required">;
        providerLogo: import("convex/values").VString<string | undefined, "optional">;
        cardType: import("convex/values").VUnion<"physical" | "esim" | "wifi_device", [import("convex/values").VLiteral<"physical", "required">, import("convex/values").VLiteral<"esim", "required">, import("convex/values").VLiteral<"wifi_device", "required">], "required", never>;
        destinations: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        destinationNames: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        coverageType: import("convex/values").VUnion<"single_country" | "regional" | "global", [import("convex/values").VLiteral<"single_country", "required">, import("convex/values").VLiteral<"regional", "required">, import("convex/values").VLiteral<"global", "required">], "required", never>;
        regionName: import("convex/values").VString<string | undefined, "optional">;
        dataPlans: import("convex/values").VArray<{
            originalPrice?: number | undefined;
            pricePerDay?: number | undefined;
            dataAmountBytes?: number | undefined;
            throttledSpeedAfterLimit?: string | undefined;
            pricePerGB?: number | undefined;
            currency: string;
            price: number;
            dataAmount: string;
            isUnlimited: boolean;
            validityDays: number;
        }[], import("convex/values").VObject<{
            originalPrice?: number | undefined;
            pricePerDay?: number | undefined;
            dataAmountBytes?: number | undefined;
            throttledSpeedAfterLimit?: string | undefined;
            pricePerGB?: number | undefined;
            currency: string;
            price: number;
            dataAmount: string;
            isUnlimited: boolean;
            validityDays: number;
        }, {
            dataAmount: import("convex/values").VString<string, "required">;
            dataAmountBytes: import("convex/values").VFloat64<number | undefined, "optional">;
            isUnlimited: import("convex/values").VBoolean<boolean, "required">;
            throttledSpeedAfterLimit: import("convex/values").VString<string | undefined, "optional">;
            validityDays: import("convex/values").VFloat64<number, "required">;
            price: import("convex/values").VFloat64<number, "required">;
            originalPrice: import("convex/values").VFloat64<number | undefined, "optional">;
            currency: import("convex/values").VString<string, "required">;
            pricePerDay: import("convex/values").VFloat64<number | undefined, "optional">;
            pricePerGB: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "required", "currency" | "price" | "originalPrice" | "pricePerDay" | "dataAmount" | "dataAmountBytes" | "isUnlimited" | "throttledSpeedAfterLimit" | "validityDays" | "pricePerGB">, "required">;
        networkType: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        supportedCarriers: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        esimInfo: import("convex/values").VObject<{
            activationInstructions?: string | undefined;
            compatibleDevices?: string[] | undefined;
            supportsQrActivation: boolean;
            supportsAppActivation: boolean;
            requiresUnlockedPhone: boolean;
        } | undefined, {
            supportsQrActivation: import("convex/values").VBoolean<boolean, "required">;
            supportsAppActivation: import("convex/values").VBoolean<boolean, "required">;
            activationInstructions: import("convex/values").VString<string | undefined, "optional">;
            compatibleDevices: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            requiresUnlockedPhone: import("convex/values").VBoolean<boolean, "required">;
        }, "optional", "supportsQrActivation" | "supportsAppActivation" | "activationInstructions" | "compatibleDevices" | "requiresUnlockedPhone">;
        physicalSimInfo: import("convex/values").VObject<{
            deliveryOptions?: {
                description?: string | undefined;
                estimatedDays?: number | undefined;
                fee?: number | undefined;
                method: string;
            }[] | undefined;
            pickupLocations?: string[] | undefined;
            simSize: string[];
        } | undefined, {
            simSize: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
            deliveryOptions: import("convex/values").VArray<{
                description?: string | undefined;
                estimatedDays?: number | undefined;
                fee?: number | undefined;
                method: string;
            }[] | undefined, import("convex/values").VObject<{
                description?: string | undefined;
                estimatedDays?: number | undefined;
                fee?: number | undefined;
                method: string;
            }, {
                method: import("convex/values").VString<string, "required">;
                estimatedDays: import("convex/values").VFloat64<number | undefined, "optional">;
                fee: import("convex/values").VFloat64<number | undefined, "optional">;
                description: import("convex/values").VString<string | undefined, "optional">;
            }, "required", "method" | "description" | "estimatedDays" | "fee">, "optional">;
            pickupLocations: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        }, "optional", "simSize" | "deliveryOptions" | "pickupLocations">;
        includesVoice: import("convex/values").VBoolean<boolean, "required">;
        voiceMinutes: import("convex/values").VFloat64<number | undefined, "optional">;
        includesSms: import("convex/values").VBoolean<boolean, "required">;
        smsCount: import("convex/values").VFloat64<number | undefined, "optional">;
        localNumber: import("convex/values").VBoolean<boolean | undefined, "optional">;
        features: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        hotspotSupported: import("convex/values").VBoolean<boolean, "required">;
        maxDevices: import("convex/values").VFloat64<number | undefined, "optional">;
        purchaseUrl: import("convex/values").VString<string, "required">;
        purchasePlatforms: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        affiliateUrl: import("convex/values").VString<string | undefined, "optional">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        reviewCount: import("convex/values").VFloat64<number, "required">;
        salesCount: import("convex/values").VFloat64<number | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        isPromoted: import("convex/values").VBoolean<boolean | undefined, "optional">;
        priority: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "priority" | "destinations" | "provider" | "updatedAt" | "nameEn" | "rating" | "purchaseUrl" | "isActive" | "providerLogo" | "features" | "reviewCount" | "coverageType" | "cardType" | "destinationNames" | "regionName" | "dataPlans" | "networkType" | "supportedCarriers" | "esimInfo" | "physicalSimInfo" | "includesVoice" | "voiceMinutes" | "includesSms" | "smsCount" | "localNumber" | "hotspotSupported" | "maxDevices" | "purchasePlatforms" | "affiliateUrl" | "salesCount" | "isPromoted" | "esimInfo.supportsQrActivation" | "esimInfo.supportsAppActivation" | "esimInfo.activationInstructions" | "esimInfo.compatibleDevices" | "esimInfo.requiresUnlockedPhone" | "physicalSimInfo.simSize" | "physicalSimInfo.deliveryOptions" | "physicalSimInfo.pickupLocations">, {
        by_card_type: ["cardType", "_creationTime"];
        by_provider: ["provider", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
        by_coverage_type: ["coverageType", "_creationTime"];
        by_priority: ["priority", "_creationTime"];
        by_promoted: ["isPromoted", "_creationTime"];
        by_rating: ["rating", "_creationTime"];
    }, {}, {}>;
    simCardReviews: import("convex/server").TableDefinition<import("convex/values").VObject<{
        title?: string | undefined;
        authorName?: string | undefined;
        imageUrls?: string[] | undefined;
        destination?: string | undefined;
        userId?: string | undefined;
        updatedAt?: number | undefined;
        speedRating?: number | undefined;
        speedTestResult?: string | undefined;
        pros?: string[] | undefined;
        cons?: string[] | undefined;
        signalRating?: number | undefined;
        valueRating?: number | undefined;
        serviceRating?: number | undefined;
        usageDuration?: number | undefined;
        actualDataUsed?: string | undefined;
        deviceUsed?: string | undefined;
        activationExperience?: string | undefined;
        signalQuality?: "excellent" | "good" | "average" | "poor" | "very_poor" | undefined;
        purchaseVerified?: boolean | undefined;
        reviewDate?: number | undefined;
        content: string;
        status: "approved" | "rejected" | "pending";
        createdAt: number;
        wouldRecommend: boolean;
        reportCount: number;
        overallRating: number;
        isVerified: boolean;
        helpfulCount: number;
        simCardId: import("convex/values").GenericId<"simCards">;
    }, {
        simCardId: import("convex/values").VId<import("convex/values").GenericId<"simCards">, "required">;
        userId: import("convex/values").VString<string | undefined, "optional">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        overallRating: import("convex/values").VFloat64<number, "required">;
        signalRating: import("convex/values").VFloat64<number | undefined, "optional">;
        speedRating: import("convex/values").VFloat64<number | undefined, "optional">;
        valueRating: import("convex/values").VFloat64<number | undefined, "optional">;
        serviceRating: import("convex/values").VFloat64<number | undefined, "optional">;
        title: import("convex/values").VString<string | undefined, "optional">;
        content: import("convex/values").VString<string, "required">;
        destination: import("convex/values").VString<string | undefined, "optional">;
        usageDuration: import("convex/values").VFloat64<number | undefined, "optional">;
        actualDataUsed: import("convex/values").VString<string | undefined, "optional">;
        deviceUsed: import("convex/values").VString<string | undefined, "optional">;
        pros: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        cons: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        activationExperience: import("convex/values").VString<string | undefined, "optional">;
        signalQuality: import("convex/values").VUnion<"excellent" | "good" | "average" | "poor" | "very_poor" | undefined, [import("convex/values").VLiteral<"excellent", "required">, import("convex/values").VLiteral<"good", "required">, import("convex/values").VLiteral<"average", "required">, import("convex/values").VLiteral<"poor", "required">, import("convex/values").VLiteral<"very_poor", "required">], "optional", never>;
        speedTestResult: import("convex/values").VString<string | undefined, "optional">;
        wouldRecommend: import("convex/values").VBoolean<boolean, "required">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        isVerified: import("convex/values").VBoolean<boolean, "required">;
        purchaseVerified: import("convex/values").VBoolean<boolean | undefined, "optional">;
        helpfulCount: import("convex/values").VFloat64<number, "required">;
        reportCount: import("convex/values").VFloat64<number, "required">;
        status: import("convex/values").VUnion<"approved" | "rejected" | "pending", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"rejected", "required">], "required", never>;
        reviewDate: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "content" | "status" | "createdAt" | "title" | "authorName" | "imageUrls" | "destination" | "userId" | "updatedAt" | "wouldRecommend" | "reportCount" | "overallRating" | "isVerified" | "speedRating" | "speedTestResult" | "helpfulCount" | "pros" | "cons" | "simCardId" | "signalRating" | "valueRating" | "serviceRating" | "usageDuration" | "actualDataUsed" | "deviceUsed" | "activationExperience" | "signalQuality" | "purchaseVerified" | "reviewDate">, {
        by_sim_card: ["simCardId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_overall_rating: ["overallRating", "_creationTime"];
        by_sim_card_rating: ["simCardId", "overallRating", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_verified: ["isVerified", "_creationTime"];
        by_helpful: ["helpfulCount", "_creationTime"];
    }, {}, {}>;
    simCardReviewVotes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        voteType: "helpful" | "not_helpful";
        reviewId: import("convex/values").GenericId<"simCardReviews">;
    }, {
        reviewId: import("convex/values").VId<import("convex/values").GenericId<"simCardReviews">, "required">;
        userId: import("convex/values").VString<string, "required">;
        voteType: import("convex/values").VUnion<"helpful" | "not_helpful", [import("convex/values").VLiteral<"helpful", "required">, import("convex/values").VLiteral<"not_helpful", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "voteType" | "reviewId">, {
        by_review: ["reviewId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_review_user: ["reviewId", "userId", "_creationTime"];
    }, {}, {}>;
    favoriteSimCards: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        createdAt: number;
        userId: string;
        simCardId: import("convex/values").GenericId<"simCards">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        simCardId: import("convex/values").VId<import("convex/values").GenericId<"simCards">, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "notes" | "simCardId">, {
        by_user: ["userId", "_creationTime"];
        by_sim_card: ["simCardId", "_creationTime"];
        by_user_sim_card: ["userId", "simCardId", "_creationTime"];
    }, {}, {}>;
    travelNotes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        location?: string | undefined;
        travelDate?: string | undefined;
        content: string;
        createdAt: number;
        title: string;
        likesCount: number;
        savesCount: number;
        commentsCount: number;
        viewsCount: number;
        visibility: "public" | "followers" | "private";
        updatedAt: number;
        authorId: string;
        isEdited: boolean;
    }, {
        authorId: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        visibility: import("convex/values").VUnion<"public" | "followers" | "private", [import("convex/values").VLiteral<"private", "required">, import("convex/values").VLiteral<"public", "required">, import("convex/values").VLiteral<"followers", "required">], "required", never>;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        location: import("convex/values").VString<string | undefined, "optional">;
        travelDate: import("convex/values").VString<string | undefined, "optional">;
        likesCount: import("convex/values").VFloat64<number, "required">;
        commentsCount: import("convex/values").VFloat64<number, "required">;
        viewsCount: import("convex/values").VFloat64<number, "required">;
        savesCount: import("convex/values").VFloat64<number, "required">;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "createdAt" | "title" | "likesCount" | "savesCount" | "commentsCount" | "viewsCount" | "visibility" | "updatedAt" | "itineraryId" | "authorId" | "isEdited" | "location" | "travelDate">, {
        by_author: ["authorId", "_creationTime"];
        by_visibility: ["visibility", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_author_visibility: ["authorId", "visibility", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    noteImages: import("convex/server").TableDefinition<import("convex/values").VObject<{
        caption?: string | undefined;
        createdAt: number;
        url: string;
        orderIndex: number;
        noteId: import("convex/values").GenericId<"travelNotes">;
        isCover: boolean;
    }, {
        noteId: import("convex/values").VId<import("convex/values").GenericId<"travelNotes">, "required">;
        url: import("convex/values").VString<string, "required">;
        caption: import("convex/values").VString<string | undefined, "optional">;
        isCover: import("convex/values").VBoolean<boolean, "required">;
        orderIndex: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "url" | "orderIndex" | "noteId" | "caption" | "isCover">, {
        by_note: ["noteId", "_creationTime"];
        by_note_order: ["noteId", "orderIndex", "_creationTime"];
    }, {}, {}>;
    noteTags: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        tag: string;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }, {
        noteId: import("convex/values").VId<import("convex/values").GenericId<"travelNotes">, "required">;
        tag: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "tag" | "noteId">, {
        by_note: ["noteId", "_creationTime"];
        by_tag: ["tag", "_creationTime"];
    }, {}, {}>;
    notePois: import("convex/server").TableDefinition<import("convex/values").VObject<{
        mentionIndex?: number | undefined;
        createdAt: number;
        poiId: import("convex/values").GenericId<"pois">;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }, {
        noteId: import("convex/values").VId<import("convex/values").GenericId<"travelNotes">, "required">;
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        mentionIndex: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "poiId" | "noteId" | "mentionIndex">, {
        by_note: ["noteId", "_creationTime"];
        by_poi: ["poiId", "_creationTime"];
    }, {}, {}>;
    noteLikes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        noteId: import("convex/values").VId<import("convex/values").GenericId<"travelNotes">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "noteId">, {
        by_user: ["userId", "_creationTime"];
        by_note: ["noteId", "_creationTime"];
        by_user_note: ["userId", "noteId", "_creationTime"];
    }, {}, {}>;
    noteComments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number | undefined;
        parentId?: import("convex/values").GenericId<"noteComments"> | undefined;
        content: string;
        createdAt: number;
        likesCount: number;
        userId: string;
        repliesCount: number;
        isEdited: boolean;
        isDeleted: boolean;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }, {
        noteId: import("convex/values").VId<import("convex/values").GenericId<"travelNotes">, "required">;
        userId: import("convex/values").VString<string, "required">;
        parentId: import("convex/values").VId<import("convex/values").GenericId<"noteComments"> | undefined, "optional">;
        content: import("convex/values").VString<string, "required">;
        likesCount: import("convex/values").VFloat64<number, "required">;
        repliesCount: import("convex/values").VFloat64<number, "required">;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        isDeleted: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "content" | "createdAt" | "likesCount" | "userId" | "updatedAt" | "parentId" | "repliesCount" | "isEdited" | "isDeleted" | "noteId">, {
        by_note: ["noteId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_parent: ["parentId", "_creationTime"];
        by_note_created: ["noteId", "createdAt", "_creationTime"];
    }, {}, {}>;
    noteCommentLikes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        commentId: import("convex/values").GenericId<"noteComments">;
    }, {
        commentId: import("convex/values").VId<import("convex/values").GenericId<"noteComments">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "commentId">, {
        by_comment: ["commentId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_comment_user: ["commentId", "userId", "_creationTime"];
    }, {}, {}>;
    noteSaves: import("convex/server").TableDefinition<import("convex/values").VObject<{
        collectionId?: import("convex/values").GenericId<"favoriteCollections"> | undefined;
        createdAt: number;
        userId: string;
        noteId: import("convex/values").GenericId<"travelNotes">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        noteId: import("convex/values").VId<import("convex/values").GenericId<"travelNotes">, "required">;
        collectionId: import("convex/values").VId<import("convex/values").GenericId<"favoriteCollections"> | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "collectionId" | "noteId">, {
        by_user: ["userId", "_creationTime"];
        by_note: ["noteId", "_creationTime"];
        by_user_note: ["userId", "noteId", "_creationTime"];
        by_collection: ["collectionId", "_creationTime"];
    }, {}, {}>;
    userTravelStats: import("convex/server").TableDefinition<import("convex/values").VObject<{
        longestTrip?: {
            title: string;
            startDate: string;
            endDate: string;
            days: number;
            itineraryId: import("convex/values").GenericId<"itineraries">;
        } | undefined;
        shortestTrip?: {
            title: string;
            startDate: string;
            endDate: string;
            days: number;
            itineraryId: import("convex/values").GenericId<"itineraries">;
        } | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        totalPois: number;
        totalCities: number;
        totalCountries: number;
        totalTrips: number;
        totalDistance: number;
        totalDays: number;
        totalExpenses: number;
        expensesByCategory: {
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
            categoryName: string;
            percentage: number;
        }[];
        averageExpensePerDay: number;
        averageExpensePerTrip: number;
        topDestinations: {
            cityId: import("convex/values").GenericId<"cities">;
            cityName: string;
            visitCount: number;
            totalDays: number;
        }[];
        preferredTransportModes: {
            mode: string;
            count: number;
            percentage: number;
        }[];
        preferredPoiCategories: {
            count: number;
            category: string;
            percentage: number;
        }[];
        monthlyTripCounts: {
            count: number;
            month: number;
        }[];
        lastCalculatedAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        totalTrips: import("convex/values").VFloat64<number, "required">;
        totalDays: import("convex/values").VFloat64<number, "required">;
        totalDistance: import("convex/values").VFloat64<number, "required">;
        totalCities: import("convex/values").VFloat64<number, "required">;
        totalCountries: import("convex/values").VFloat64<number, "required">;
        totalPois: import("convex/values").VFloat64<number, "required">;
        longestTrip: import("convex/values").VObject<{
            title: string;
            startDate: string;
            endDate: string;
            days: number;
            itineraryId: import("convex/values").GenericId<"itineraries">;
        } | undefined, {
            itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
            title: import("convex/values").VString<string, "required">;
            days: import("convex/values").VFloat64<number, "required">;
            startDate: import("convex/values").VString<string, "required">;
            endDate: import("convex/values").VString<string, "required">;
        }, "optional", "title" | "startDate" | "endDate" | "days" | "itineraryId">;
        shortestTrip: import("convex/values").VObject<{
            title: string;
            startDate: string;
            endDate: string;
            days: number;
            itineraryId: import("convex/values").GenericId<"itineraries">;
        } | undefined, {
            itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
            title: import("convex/values").VString<string, "required">;
            days: import("convex/values").VFloat64<number, "required">;
            startDate: import("convex/values").VString<string, "required">;
            endDate: import("convex/values").VString<string, "required">;
        }, "optional", "title" | "startDate" | "endDate" | "days" | "itineraryId">;
        totalExpenses: import("convex/values").VFloat64<number, "required">;
        expensesByCategory: import("convex/values").VArray<{
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
            categoryName: string;
            percentage: number;
        }[], import("convex/values").VObject<{
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
            categoryName: string;
            percentage: number;
        }, {
            categoryId: import("convex/values").VId<import("convex/values").GenericId<"expenseCategories">, "required">;
            categoryName: import("convex/values").VString<string, "required">;
            amount: import("convex/values").VFloat64<number, "required">;
            percentage: import("convex/values").VFloat64<number, "required">;
        }, "required", "categoryId" | "amount" | "categoryName" | "percentage">, "required">;
        averageExpensePerDay: import("convex/values").VFloat64<number, "required">;
        averageExpensePerTrip: import("convex/values").VFloat64<number, "required">;
        topDestinations: import("convex/values").VArray<{
            cityId: import("convex/values").GenericId<"cities">;
            cityName: string;
            visitCount: number;
            totalDays: number;
        }[], import("convex/values").VObject<{
            cityId: import("convex/values").GenericId<"cities">;
            cityName: string;
            visitCount: number;
            totalDays: number;
        }, {
            cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
            cityName: import("convex/values").VString<string, "required">;
            visitCount: import("convex/values").VFloat64<number, "required">;
            totalDays: import("convex/values").VFloat64<number, "required">;
        }, "required", "cityId" | "cityName" | "visitCount" | "totalDays">, "required">;
        preferredTransportModes: import("convex/values").VArray<{
            mode: string;
            count: number;
            percentage: number;
        }[], import("convex/values").VObject<{
            mode: string;
            count: number;
            percentage: number;
        }, {
            mode: import("convex/values").VString<string, "required">;
            count: import("convex/values").VFloat64<number, "required">;
            percentage: import("convex/values").VFloat64<number, "required">;
        }, "required", "mode" | "count" | "percentage">, "required">;
        preferredPoiCategories: import("convex/values").VArray<{
            count: number;
            category: string;
            percentage: number;
        }[], import("convex/values").VObject<{
            count: number;
            category: string;
            percentage: number;
        }, {
            category: import("convex/values").VString<string, "required">;
            count: import("convex/values").VFloat64<number, "required">;
            percentage: import("convex/values").VFloat64<number, "required">;
        }, "required", "count" | "category" | "percentage">, "required">;
        monthlyTripCounts: import("convex/values").VArray<{
            count: number;
            month: number;
        }[], import("convex/values").VObject<{
            count: number;
            month: number;
        }, {
            month: import("convex/values").VFloat64<number, "required">;
            count: import("convex/values").VFloat64<number, "required">;
        }, "required", "count" | "month">, "required">;
        lastCalculatedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "totalPois" | "totalCities" | "totalCountries" | "totalTrips" | "totalDistance" | "totalDays" | "totalExpenses" | "longestTrip" | "shortestTrip" | "expensesByCategory" | "averageExpensePerDay" | "averageExpensePerTrip" | "topDestinations" | "preferredTransportModes" | "preferredPoiCategories" | "monthlyTripCounts" | "lastCalculatedAt" | "longestTrip.title" | "longestTrip.startDate" | "longestTrip.endDate" | "longestTrip.days" | "longestTrip.itineraryId" | "shortestTrip.title" | "shortestTrip.startDate" | "shortestTrip.endDate" | "shortestTrip.days" | "shortestTrip.itineraryId">, {
        by_user: ["userId", "_creationTime"];
        by_total_trips: ["totalTrips", "_creationTime"];
        by_total_distance: ["totalDistance", "_creationTime"];
    }, {}, {}>;
    yearlyReviews: import("convex/server").TableDefinition<import("convex/values").VObject<{
        error?: string | undefined;
        generatedAt?: number | undefined;
        longestTrip?: {
            title: string;
            days: number;
            itineraryId: import("convex/values").GenericId<"itineraries">;
            cityName: string;
        } | undefined;
        mostExpensiveTrip?: {
            title: string;
            itineraryId: import("convex/values").GenericId<"itineraries">;
            amount: number;
        } | undefined;
        firstTripOfYear?: {
            title: string;
            startDate: string;
            itineraryId: import("convex/values").GenericId<"itineraries">;
            cityName: string;
        } | undefined;
        lastTripOfYear?: {
            title: string;
            startDate: string;
            itineraryId: import("convex/values").GenericId<"itineraries">;
            cityName: string;
        } | undefined;
        yearOverYear?: {
            tripsChange: number;
            expensesChange: number;
            distanceChange: number;
            citiesChange: number;
        } | undefined;
        memories?: {
            itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
            imageUrl?: string | undefined;
            createdAt: number;
            text: string;
        }[] | undefined;
        status: "error" | "generating" | "ready";
        createdAt: number;
        userId: string;
        updatedAt: number;
        citiesCount: number;
        totalDistance: number;
        totalExpenses: number;
        year: number;
        tripsCount: number;
        daysCount: number;
        countriesCount: number;
        poisCount: number;
        expenseBreakdown: {
            icon?: string | undefined;
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
            categoryName: string;
            percentage: number;
        }[];
        averagePerTrip: number;
        averagePerDay: number;
        topCities: {
            imageUrl?: string | undefined;
            cityId: import("convex/values").GenericId<"cities">;
            cityName: string;
            visitCount: number;
            totalDays: number;
        }[];
        monthlyActivity: {
            expenses: number;
            month: number;
            tripsCount: number;
            daysCount: number;
        }[];
        achievements: {
            earnedAt?: number | undefined;
            description: string;
            title: string;
            id: string;
            icon: string;
        }[];
    }, {
        userId: import("convex/values").VString<string, "required">;
        year: import("convex/values").VFloat64<number, "required">;
        tripsCount: import("convex/values").VFloat64<number, "required">;
        daysCount: import("convex/values").VFloat64<number, "required">;
        citiesCount: import("convex/values").VFloat64<number, "required">;
        countriesCount: import("convex/values").VFloat64<number, "required">;
        poisCount: import("convex/values").VFloat64<number, "required">;
        totalDistance: import("convex/values").VFloat64<number, "required">;
        totalExpenses: import("convex/values").VFloat64<number, "required">;
        expenseBreakdown: import("convex/values").VArray<{
            icon?: string | undefined;
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
            categoryName: string;
            percentage: number;
        }[], import("convex/values").VObject<{
            icon?: string | undefined;
            categoryId: import("convex/values").GenericId<"expenseCategories">;
            amount: number;
            categoryName: string;
            percentage: number;
        }, {
            categoryId: import("convex/values").VId<import("convex/values").GenericId<"expenseCategories">, "required">;
            categoryName: import("convex/values").VString<string, "required">;
            icon: import("convex/values").VString<string | undefined, "optional">;
            amount: import("convex/values").VFloat64<number, "required">;
            percentage: import("convex/values").VFloat64<number, "required">;
        }, "required", "icon" | "categoryId" | "amount" | "categoryName" | "percentage">, "required">;
        averagePerTrip: import("convex/values").VFloat64<number, "required">;
        averagePerDay: import("convex/values").VFloat64<number, "required">;
        mostExpensiveTrip: import("convex/values").VObject<{
            title: string;
            itineraryId: import("convex/values").GenericId<"itineraries">;
            amount: number;
        } | undefined, {
            itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
            title: import("convex/values").VString<string, "required">;
            amount: import("convex/values").VFloat64<number, "required">;
        }, "optional", "title" | "itineraryId" | "amount">;
        firstTripOfYear: import("convex/values").VObject<{
            title: string;
            startDate: string;
            itineraryId: import("convex/values").GenericId<"itineraries">;
            cityName: string;
        } | undefined, {
            itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
            title: import("convex/values").VString<string, "required">;
            cityName: import("convex/values").VString<string, "required">;
            startDate: import("convex/values").VString<string, "required">;
        }, "optional", "title" | "startDate" | "itineraryId" | "cityName">;
        lastTripOfYear: import("convex/values").VObject<{
            title: string;
            startDate: string;
            itineraryId: import("convex/values").GenericId<"itineraries">;
            cityName: string;
        } | undefined, {
            itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
            title: import("convex/values").VString<string, "required">;
            cityName: import("convex/values").VString<string, "required">;
            startDate: import("convex/values").VString<string, "required">;
        }, "optional", "title" | "startDate" | "itineraryId" | "cityName">;
        longestTrip: import("convex/values").VObject<{
            title: string;
            days: number;
            itineraryId: import("convex/values").GenericId<"itineraries">;
            cityName: string;
        } | undefined, {
            itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
            title: import("convex/values").VString<string, "required">;
            cityName: import("convex/values").VString<string, "required">;
            days: import("convex/values").VFloat64<number, "required">;
        }, "optional", "title" | "days" | "itineraryId" | "cityName">;
        topCities: import("convex/values").VArray<{
            imageUrl?: string | undefined;
            cityId: import("convex/values").GenericId<"cities">;
            cityName: string;
            visitCount: number;
            totalDays: number;
        }[], import("convex/values").VObject<{
            imageUrl?: string | undefined;
            cityId: import("convex/values").GenericId<"cities">;
            cityName: string;
            visitCount: number;
            totalDays: number;
        }, {
            cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
            cityName: import("convex/values").VString<string, "required">;
            visitCount: import("convex/values").VFloat64<number, "required">;
            totalDays: import("convex/values").VFloat64<number, "required">;
            imageUrl: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "cityId" | "cityName" | "visitCount" | "totalDays" | "imageUrl">, "required">;
        monthlyActivity: import("convex/values").VArray<{
            expenses: number;
            month: number;
            tripsCount: number;
            daysCount: number;
        }[], import("convex/values").VObject<{
            expenses: number;
            month: number;
            tripsCount: number;
            daysCount: number;
        }, {
            month: import("convex/values").VFloat64<number, "required">;
            tripsCount: import("convex/values").VFloat64<number, "required">;
            daysCount: import("convex/values").VFloat64<number, "required">;
            expenses: import("convex/values").VFloat64<number, "required">;
        }, "required", "expenses" | "month" | "tripsCount" | "daysCount">, "required">;
        achievements: import("convex/values").VArray<{
            earnedAt?: number | undefined;
            description: string;
            title: string;
            id: string;
            icon: string;
        }[], import("convex/values").VObject<{
            earnedAt?: number | undefined;
            description: string;
            title: string;
            id: string;
            icon: string;
        }, {
            id: import("convex/values").VString<string, "required">;
            title: import("convex/values").VString<string, "required">;
            description: import("convex/values").VString<string, "required">;
            icon: import("convex/values").VString<string, "required">;
            earnedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "required", "description" | "title" | "id" | "icon" | "earnedAt">, "required">;
        yearOverYear: import("convex/values").VObject<{
            tripsChange: number;
            expensesChange: number;
            distanceChange: number;
            citiesChange: number;
        } | undefined, {
            tripsChange: import("convex/values").VFloat64<number, "required">;
            expensesChange: import("convex/values").VFloat64<number, "required">;
            distanceChange: import("convex/values").VFloat64<number, "required">;
            citiesChange: import("convex/values").VFloat64<number, "required">;
        }, "optional", "tripsChange" | "expensesChange" | "distanceChange" | "citiesChange">;
        memories: import("convex/values").VArray<{
            itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
            imageUrl?: string | undefined;
            createdAt: number;
            text: string;
        }[] | undefined, import("convex/values").VObject<{
            itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
            imageUrl?: string | undefined;
            createdAt: number;
            text: string;
        }, {
            text: import("convex/values").VString<string, "required">;
            itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
            imageUrl: import("convex/values").VString<string | undefined, "optional">;
            createdAt: import("convex/values").VFloat64<number, "required">;
        }, "required", "createdAt" | "text" | "itineraryId" | "imageUrl">, "optional">;
        status: import("convex/values").VUnion<"error" | "generating" | "ready", [import("convex/values").VLiteral<"generating", "required">, import("convex/values").VLiteral<"ready", "required">, import("convex/values").VLiteral<"error", "required">], "required", never>;
        generatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        error: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "error" | "userId" | "updatedAt" | "generatedAt" | "citiesCount" | "totalDistance" | "totalExpenses" | "longestTrip" | "longestTrip.title" | "longestTrip.days" | "longestTrip.itineraryId" | "year" | "tripsCount" | "daysCount" | "countriesCount" | "poisCount" | "expenseBreakdown" | "averagePerTrip" | "averagePerDay" | "mostExpensiveTrip" | "firstTripOfYear" | "lastTripOfYear" | "topCities" | "monthlyActivity" | "achievements" | "yearOverYear" | "memories" | "longestTrip.cityName" | "mostExpensiveTrip.title" | "mostExpensiveTrip.itineraryId" | "mostExpensiveTrip.amount" | "firstTripOfYear.title" | "firstTripOfYear.startDate" | "firstTripOfYear.itineraryId" | "firstTripOfYear.cityName" | "lastTripOfYear.title" | "lastTripOfYear.startDate" | "lastTripOfYear.itineraryId" | "lastTripOfYear.cityName" | "yearOverYear.tripsChange" | "yearOverYear.expensesChange" | "yearOverYear.distanceChange" | "yearOverYear.citiesChange">, {
        by_user: ["userId", "_creationTime"];
        by_year: ["year", "_creationTime"];
        by_user_year: ["userId", "year", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    verificationBadges: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        metadata?: {
            travelExpertLevel?: number | undefined;
            specialties?: string[] | undefined;
            totalGuides?: number | undefined;
            totalLikes?: number | undefined;
            localCity?: string | undefined;
            localCityId?: import("convex/values").GenericId<"cities"> | undefined;
            yearsOfResidence?: number | undefined;
            languages?: string[] | undefined;
            organizationName?: string | undefined;
            organizationType?: string | undefined;
            officialWebsite?: string | undefined;
        } | undefined;
        color?: string | undefined;
        verifiedBy?: string | undefined;
        iconUrl?: string | undefined;
        expiresAt?: number | undefined;
        revokedAt?: number | undefined;
        revokedReason?: string | undefined;
        createdAt: number;
        userId: string;
        displayName: string;
        updatedAt: number;
        isActive: boolean;
        verifiedAt: number;
        badgeType: "travel_expert" | "local_guide" | "official_account";
    }, {
        userId: import("convex/values").VString<string, "required">;
        badgeType: import("convex/values").VUnion<"travel_expert" | "local_guide" | "official_account", [import("convex/values").VLiteral<"travel_expert", "required">, import("convex/values").VLiteral<"local_guide", "required">, import("convex/values").VLiteral<"official_account", "required">], "required", never>;
        displayName: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        iconUrl: import("convex/values").VString<string | undefined, "optional">;
        color: import("convex/values").VString<string | undefined, "optional">;
        verifiedAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
        verifiedBy: import("convex/values").VString<string | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        revokedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        revokedReason: import("convex/values").VString<string | undefined, "optional">;
        metadata: import("convex/values").VObject<{
            travelExpertLevel?: number | undefined;
            specialties?: string[] | undefined;
            totalGuides?: number | undefined;
            totalLikes?: number | undefined;
            localCity?: string | undefined;
            localCityId?: import("convex/values").GenericId<"cities"> | undefined;
            yearsOfResidence?: number | undefined;
            languages?: string[] | undefined;
            organizationName?: string | undefined;
            organizationType?: string | undefined;
            officialWebsite?: string | undefined;
        } | undefined, {
            travelExpertLevel: import("convex/values").VFloat64<number | undefined, "optional">;
            specialties: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            totalGuides: import("convex/values").VFloat64<number | undefined, "optional">;
            totalLikes: import("convex/values").VFloat64<number | undefined, "optional">;
            localCity: import("convex/values").VString<string | undefined, "optional">;
            localCityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
            yearsOfResidence: import("convex/values").VFloat64<number | undefined, "optional">;
            languages: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            organizationName: import("convex/values").VString<string | undefined, "optional">;
            organizationType: import("convex/values").VString<string | undefined, "optional">;
            officialWebsite: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "travelExpertLevel" | "specialties" | "totalGuides" | "totalLikes" | "localCity" | "localCityId" | "yearsOfResidence" | "languages" | "organizationName" | "organizationType" | "officialWebsite">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "description" | "metadata" | "userId" | "displayName" | "updatedAt" | "color" | "isActive" | "verifiedAt" | "verifiedBy" | "badgeType" | "iconUrl" | "expiresAt" | "revokedAt" | "revokedReason" | "metadata.travelExpertLevel" | "metadata.specialties" | "metadata.totalGuides" | "metadata.totalLikes" | "metadata.localCity" | "metadata.localCityId" | "metadata.yearsOfResidence" | "metadata.languages" | "metadata.organizationName" | "metadata.organizationType" | "metadata.officialWebsite">, {
        by_user: ["userId", "_creationTime"];
        by_user_type: ["userId", "badgeType", "_creationTime"];
        by_type: ["badgeType", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
        by_user_active: ["userId", "isActive", "_creationTime"];
    }, {}, {}>;
    verificationApplications: import("convex/server").TableDefinition<import("convex/values").VObject<{
        email?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        supportingMaterials?: {
            description?: string | undefined;
            url: string;
            type: "other" | "id_photo" | "work_proof" | "portfolio" | "certificate";
        }[] | undefined;
        applicationData?: {
            localCity?: string | undefined;
            yearsOfResidence?: number | undefined;
            languages?: string[] | undefined;
            organizationName?: string | undefined;
            organizationType?: string | undefined;
            officialWebsite?: string | undefined;
            travelExperience?: string | undefined;
            socialMediaLinks?: string[] | undefined;
            publishedGuideIds?: string[] | undefined;
            residenceProof?: string | undefined;
            localKnowledge?: string | undefined;
            businessLicenseUrl?: string | undefined;
            authorizationLetterUrl?: string | undefined;
        } | undefined;
        reviewNotes?: string | undefined;
        rejectionReason?: string | undefined;
        badgeId?: import("convex/values").GenericId<"verificationBadges"> | undefined;
        status: "cancelled" | "approved" | "rejected" | "pending" | "under_review";
        createdAt: number;
        userId: string;
        phone: string;
        updatedAt: number;
        idType: "id_card" | "passport" | "business_license";
        idNumber: string;
        badgeType: "travel_expert" | "local_guide" | "official_account";
        realName: string;
        applicationReason: string;
    }, {
        userId: import("convex/values").VString<string, "required">;
        badgeType: import("convex/values").VUnion<"travel_expert" | "local_guide" | "official_account", [import("convex/values").VLiteral<"travel_expert", "required">, import("convex/values").VLiteral<"local_guide", "required">, import("convex/values").VLiteral<"official_account", "required">], "required", never>;
        status: import("convex/values").VUnion<"cancelled" | "approved" | "rejected" | "pending" | "under_review", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"under_review", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"rejected", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        realName: import("convex/values").VString<string, "required">;
        idType: import("convex/values").VUnion<"id_card" | "passport" | "business_license", [import("convex/values").VLiteral<"id_card", "required">, import("convex/values").VLiteral<"passport", "required">, import("convex/values").VLiteral<"business_license", "required">], "required", never>;
        idNumber: import("convex/values").VString<string, "required">;
        phone: import("convex/values").VString<string, "required">;
        email: import("convex/values").VString<string | undefined, "optional">;
        applicationReason: import("convex/values").VString<string, "required">;
        supportingMaterials: import("convex/values").VArray<{
            description?: string | undefined;
            url: string;
            type: "other" | "id_photo" | "work_proof" | "portfolio" | "certificate";
        }[] | undefined, import("convex/values").VObject<{
            description?: string | undefined;
            url: string;
            type: "other" | "id_photo" | "work_proof" | "portfolio" | "certificate";
        }, {
            type: import("convex/values").VUnion<"other" | "id_photo" | "work_proof" | "portfolio" | "certificate", [import("convex/values").VLiteral<"id_photo", "required">, import("convex/values").VLiteral<"work_proof", "required">, import("convex/values").VLiteral<"portfolio", "required">, import("convex/values").VLiteral<"certificate", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
            url: import("convex/values").VString<string, "required">;
            description: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "url" | "type" | "description">, "optional">;
        applicationData: import("convex/values").VObject<{
            localCity?: string | undefined;
            yearsOfResidence?: number | undefined;
            languages?: string[] | undefined;
            organizationName?: string | undefined;
            organizationType?: string | undefined;
            officialWebsite?: string | undefined;
            travelExperience?: string | undefined;
            socialMediaLinks?: string[] | undefined;
            publishedGuideIds?: string[] | undefined;
            residenceProof?: string | undefined;
            localKnowledge?: string | undefined;
            businessLicenseUrl?: string | undefined;
            authorizationLetterUrl?: string | undefined;
        } | undefined, {
            travelExperience: import("convex/values").VString<string | undefined, "optional">;
            socialMediaLinks: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            publishedGuideIds: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            localCity: import("convex/values").VString<string | undefined, "optional">;
            residenceProof: import("convex/values").VString<string | undefined, "optional">;
            yearsOfResidence: import("convex/values").VFloat64<number | undefined, "optional">;
            localKnowledge: import("convex/values").VString<string | undefined, "optional">;
            languages: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
            organizationName: import("convex/values").VString<string | undefined, "optional">;
            organizationType: import("convex/values").VString<string | undefined, "optional">;
            businessLicenseUrl: import("convex/values").VString<string | undefined, "optional">;
            authorizationLetterUrl: import("convex/values").VString<string | undefined, "optional">;
            officialWebsite: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "localCity" | "yearsOfResidence" | "languages" | "organizationName" | "organizationType" | "officialWebsite" | "travelExperience" | "socialMediaLinks" | "publishedGuideIds" | "residenceProof" | "localKnowledge" | "businessLicenseUrl" | "authorizationLetterUrl">;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
        reviewedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        reviewNotes: import("convex/values").VString<string | undefined, "optional">;
        rejectionReason: import("convex/values").VString<string | undefined, "optional">;
        badgeId: import("convex/values").VId<import("convex/values").GenericId<"verificationBadges"> | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "email" | "userId" | "phone" | "updatedAt" | "reviewedBy" | "reviewedAt" | "idType" | "idNumber" | "badgeType" | "realName" | "applicationReason" | "supportingMaterials" | "applicationData" | "reviewNotes" | "rejectionReason" | "badgeId" | "applicationData.localCity" | "applicationData.yearsOfResidence" | "applicationData.languages" | "applicationData.organizationName" | "applicationData.organizationType" | "applicationData.officialWebsite" | "applicationData.travelExperience" | "applicationData.socialMediaLinks" | "applicationData.publishedGuideIds" | "applicationData.residenceProof" | "applicationData.localKnowledge" | "applicationData.businessLicenseUrl" | "applicationData.authorizationLetterUrl">, {
        by_user: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_type: ["badgeType", "_creationTime"];
        by_user_type: ["userId", "badgeType", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    weatherCache: import("convex/server").TableDefinition<import("convex/values").VObject<{
        data: {
            current?: {
                date: string;
                icon: string;
                timestamp: number;
                condition: string;
                conditionDescription: string;
                tempMin: number;
                tempMax: number;
                tempMorning: number;
                tempDay: number;
                tempEvening: number;
                tempNight: number;
                feelsLikeDay: number;
                humidity: number;
                windSpeed: number;
                windDirection: number;
                precipitation: number;
                precipitationProbability: number;
                uvIndex: number;
                sunrise: number;
                sunset: number;
                cloudiness: number;
                pressure: number;
            } | undefined;
            latitude: number;
            longitude: number;
            timezone: string;
            timezoneOffset: number;
            daily: {
                date: string;
                icon: string;
                timestamp: number;
                condition: string;
                conditionDescription: string;
                tempMin: number;
                tempMax: number;
                tempMorning: number;
                tempDay: number;
                tempEvening: number;
                tempNight: number;
                feelsLikeDay: number;
                humidity: number;
                windSpeed: number;
                windDirection: number;
                precipitation: number;
                precipitationProbability: number;
                uvIndex: number;
                sunrise: number;
                sunset: number;
                cloudiness: number;
                pressure: number;
            }[];
            alerts: {
                description: string;
                severity: string;
                event: string;
                sender: string;
                start: number;
                end: number;
            }[];
            fetchedAt: number;
        };
        latitude: number;
        longitude: number;
        fetchedAt: number;
    }, {
        latitude: import("convex/values").VFloat64<number, "required">;
        longitude: import("convex/values").VFloat64<number, "required">;
        data: import("convex/values").VObject<{
            current?: {
                date: string;
                icon: string;
                timestamp: number;
                condition: string;
                conditionDescription: string;
                tempMin: number;
                tempMax: number;
                tempMorning: number;
                tempDay: number;
                tempEvening: number;
                tempNight: number;
                feelsLikeDay: number;
                humidity: number;
                windSpeed: number;
                windDirection: number;
                precipitation: number;
                precipitationProbability: number;
                uvIndex: number;
                sunrise: number;
                sunset: number;
                cloudiness: number;
                pressure: number;
            } | undefined;
            latitude: number;
            longitude: number;
            timezone: string;
            timezoneOffset: number;
            daily: {
                date: string;
                icon: string;
                timestamp: number;
                condition: string;
                conditionDescription: string;
                tempMin: number;
                tempMax: number;
                tempMorning: number;
                tempDay: number;
                tempEvening: number;
                tempNight: number;
                feelsLikeDay: number;
                humidity: number;
                windSpeed: number;
                windDirection: number;
                precipitation: number;
                precipitationProbability: number;
                uvIndex: number;
                sunrise: number;
                sunset: number;
                cloudiness: number;
                pressure: number;
            }[];
            alerts: {
                description: string;
                severity: string;
                event: string;
                sender: string;
                start: number;
                end: number;
            }[];
            fetchedAt: number;
        }, {
            latitude: import("convex/values").VFloat64<number, "required">;
            longitude: import("convex/values").VFloat64<number, "required">;
            timezone: import("convex/values").VString<string, "required">;
            timezoneOffset: import("convex/values").VFloat64<number, "required">;
            current: import("convex/values").VObject<{
                date: string;
                icon: string;
                timestamp: number;
                condition: string;
                conditionDescription: string;
                tempMin: number;
                tempMax: number;
                tempMorning: number;
                tempDay: number;
                tempEvening: number;
                tempNight: number;
                feelsLikeDay: number;
                humidity: number;
                windSpeed: number;
                windDirection: number;
                precipitation: number;
                precipitationProbability: number;
                uvIndex: number;
                sunrise: number;
                sunset: number;
                cloudiness: number;
                pressure: number;
            } | undefined, {
                date: import("convex/values").VString<string, "required">;
                timestamp: import("convex/values").VFloat64<number, "required">;
                condition: import("convex/values").VString<string, "required">;
                conditionDescription: import("convex/values").VString<string, "required">;
                icon: import("convex/values").VString<string, "required">;
                tempMin: import("convex/values").VFloat64<number, "required">;
                tempMax: import("convex/values").VFloat64<number, "required">;
                tempMorning: import("convex/values").VFloat64<number, "required">;
                tempDay: import("convex/values").VFloat64<number, "required">;
                tempEvening: import("convex/values").VFloat64<number, "required">;
                tempNight: import("convex/values").VFloat64<number, "required">;
                feelsLikeDay: import("convex/values").VFloat64<number, "required">;
                humidity: import("convex/values").VFloat64<number, "required">;
                windSpeed: import("convex/values").VFloat64<number, "required">;
                windDirection: import("convex/values").VFloat64<number, "required">;
                precipitation: import("convex/values").VFloat64<number, "required">;
                precipitationProbability: import("convex/values").VFloat64<number, "required">;
                uvIndex: import("convex/values").VFloat64<number, "required">;
                sunrise: import("convex/values").VFloat64<number, "required">;
                sunset: import("convex/values").VFloat64<number, "required">;
                cloudiness: import("convex/values").VFloat64<number, "required">;
                pressure: import("convex/values").VFloat64<number, "required">;
            }, "optional", "date" | "icon" | "timestamp" | "condition" | "conditionDescription" | "tempMin" | "tempMax" | "tempMorning" | "tempDay" | "tempEvening" | "tempNight" | "feelsLikeDay" | "humidity" | "windSpeed" | "windDirection" | "precipitation" | "precipitationProbability" | "uvIndex" | "sunrise" | "sunset" | "cloudiness" | "pressure">;
            daily: import("convex/values").VArray<{
                date: string;
                icon: string;
                timestamp: number;
                condition: string;
                conditionDescription: string;
                tempMin: number;
                tempMax: number;
                tempMorning: number;
                tempDay: number;
                tempEvening: number;
                tempNight: number;
                feelsLikeDay: number;
                humidity: number;
                windSpeed: number;
                windDirection: number;
                precipitation: number;
                precipitationProbability: number;
                uvIndex: number;
                sunrise: number;
                sunset: number;
                cloudiness: number;
                pressure: number;
            }[], import("convex/values").VObject<{
                date: string;
                icon: string;
                timestamp: number;
                condition: string;
                conditionDescription: string;
                tempMin: number;
                tempMax: number;
                tempMorning: number;
                tempDay: number;
                tempEvening: number;
                tempNight: number;
                feelsLikeDay: number;
                humidity: number;
                windSpeed: number;
                windDirection: number;
                precipitation: number;
                precipitationProbability: number;
                uvIndex: number;
                sunrise: number;
                sunset: number;
                cloudiness: number;
                pressure: number;
            }, {
                date: import("convex/values").VString<string, "required">;
                timestamp: import("convex/values").VFloat64<number, "required">;
                condition: import("convex/values").VString<string, "required">;
                conditionDescription: import("convex/values").VString<string, "required">;
                icon: import("convex/values").VString<string, "required">;
                tempMin: import("convex/values").VFloat64<number, "required">;
                tempMax: import("convex/values").VFloat64<number, "required">;
                tempMorning: import("convex/values").VFloat64<number, "required">;
                tempDay: import("convex/values").VFloat64<number, "required">;
                tempEvening: import("convex/values").VFloat64<number, "required">;
                tempNight: import("convex/values").VFloat64<number, "required">;
                feelsLikeDay: import("convex/values").VFloat64<number, "required">;
                humidity: import("convex/values").VFloat64<number, "required">;
                windSpeed: import("convex/values").VFloat64<number, "required">;
                windDirection: import("convex/values").VFloat64<number, "required">;
                precipitation: import("convex/values").VFloat64<number, "required">;
                precipitationProbability: import("convex/values").VFloat64<number, "required">;
                uvIndex: import("convex/values").VFloat64<number, "required">;
                sunrise: import("convex/values").VFloat64<number, "required">;
                sunset: import("convex/values").VFloat64<number, "required">;
                cloudiness: import("convex/values").VFloat64<number, "required">;
                pressure: import("convex/values").VFloat64<number, "required">;
            }, "required", "date" | "icon" | "timestamp" | "condition" | "conditionDescription" | "tempMin" | "tempMax" | "tempMorning" | "tempDay" | "tempEvening" | "tempNight" | "feelsLikeDay" | "humidity" | "windSpeed" | "windDirection" | "precipitation" | "precipitationProbability" | "uvIndex" | "sunrise" | "sunset" | "cloudiness" | "pressure">, "required">;
            alerts: import("convex/values").VArray<{
                description: string;
                severity: string;
                event: string;
                sender: string;
                start: number;
                end: number;
            }[], import("convex/values").VObject<{
                description: string;
                severity: string;
                event: string;
                sender: string;
                start: number;
                end: number;
            }, {
                event: import("convex/values").VString<string, "required">;
                sender: import("convex/values").VString<string, "required">;
                start: import("convex/values").VFloat64<number, "required">;
                end: import("convex/values").VFloat64<number, "required">;
                description: import("convex/values").VString<string, "required">;
                severity: import("convex/values").VString<string, "required">;
            }, "required", "description" | "severity" | "event" | "sender" | "start" | "end">, "required">;
            fetchedAt: import("convex/values").VFloat64<number, "required">;
        }, "required", "latitude" | "longitude" | "current" | "timezone" | "timezoneOffset" | "daily" | "alerts" | "fetchedAt" | "current.date" | "current.icon" | "current.timestamp" | "current.condition" | "current.conditionDescription" | "current.tempMin" | "current.tempMax" | "current.tempMorning" | "current.tempDay" | "current.tempEvening" | "current.tempNight" | "current.feelsLikeDay" | "current.humidity" | "current.windSpeed" | "current.windDirection" | "current.precipitation" | "current.precipitationProbability" | "current.uvIndex" | "current.sunrise" | "current.sunset" | "current.cloudiness" | "current.pressure">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "data" | "latitude" | "longitude" | "fetchedAt" | "data.latitude" | "data.longitude" | "data.current" | "data.timezone" | "data.timezoneOffset" | "data.daily" | "data.alerts" | "data.fetchedAt" | "data.current.date" | "data.current.icon" | "data.current.timestamp" | "data.current.condition" | "data.current.conditionDescription" | "data.current.tempMin" | "data.current.tempMax" | "data.current.tempMorning" | "data.current.tempDay" | "data.current.tempEvening" | "data.current.tempNight" | "data.current.feelsLikeDay" | "data.current.humidity" | "data.current.windSpeed" | "data.current.windDirection" | "data.current.precipitation" | "data.current.precipitationProbability" | "data.current.uvIndex" | "data.current.sunrise" | "data.current.sunset" | "data.current.cloudiness" | "data.current.pressure">, {
        by_location: ["latitude", "longitude", "_creationTime"];
        by_fetched_at: ["fetchedAt", "_creationTime"];
    }, {}, {}>;
    packingLists: import("convex/server").TableDefinition<import("convex/values").VObject<{
        destination?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        weatherInfo?: {
            condition?: string | undefined;
            humidity?: number | undefined;
            fetchedAt?: number | undefined;
            avgTemp?: number | undefined;
        } | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        tripType?: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined;
        shareCode?: string | undefined;
        sharedWith?: string[] | undefined;
        templateId?: import("convex/values").GenericId<"packingTemplates"> | undefined;
        createdAt: number;
        title: string;
        userId: string;
        updatedAt: number;
        isPublic: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        title: import("convex/values").VString<string, "required">;
        destination: import("convex/values").VString<string | undefined, "optional">;
        startDate: import("convex/values").VString<string | undefined, "optional">;
        endDate: import("convex/values").VString<string | undefined, "optional">;
        tripType: import("convex/values").VUnion<"city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking" | undefined, [import("convex/values").VLiteral<"leisure", "required">, import("convex/values").VLiteral<"business", "required">, import("convex/values").VLiteral<"adventure", "required">, import("convex/values").VLiteral<"beach", "required">, import("convex/values").VLiteral<"ski", "required">, import("convex/values").VLiteral<"city", "required">, import("convex/values").VLiteral<"hiking", "required">, import("convex/values").VLiteral<"other", "required">], "optional", never>;
        weatherInfo: import("convex/values").VObject<{
            condition?: string | undefined;
            humidity?: number | undefined;
            fetchedAt?: number | undefined;
            avgTemp?: number | undefined;
        } | undefined, {
            avgTemp: import("convex/values").VFloat64<number | undefined, "optional">;
            condition: import("convex/values").VString<string | undefined, "optional">;
            humidity: import("convex/values").VFloat64<number | undefined, "optional">;
            fetchedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "optional", "condition" | "humidity" | "fetchedAt" | "avgTemp">;
        shareCode: import("convex/values").VString<string | undefined, "optional">;
        sharedWith: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        isPublic: import("convex/values").VBoolean<boolean, "required">;
        templateId: import("convex/values").VId<import("convex/values").GenericId<"packingTemplates"> | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "title" | "destination" | "userId" | "startDate" | "endDate" | "weatherInfo" | "updatedAt" | "itineraryId" | "tripType" | "shareCode" | "sharedWith" | "isPublic" | "templateId" | "weatherInfo.condition" | "weatherInfo.humidity" | "weatherInfo.fetchedAt" | "weatherInfo.avgTemp">, {
        by_user: ["userId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_share_code: ["shareCode", "_creationTime"];
        by_user_created: ["userId", "createdAt", "_creationTime"];
        by_public: ["isPublic", "_creationTime"];
    }, {}, {}>;
    packingItems: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        suggestedBy?: "user" | "ai" | "weather" | "activity" | "template" | undefined;
        packedAt?: number | undefined;
        packedBy?: string | undefined;
        createdAt: number;
        name: string;
        updatedAt: number;
        category: "other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks";
        orderIndex: number;
        packingListId: import("convex/values").GenericId<"packingLists">;
        quantity: number;
        isPacked: boolean;
        isEssential: boolean;
    }, {
        packingListId: import("convex/values").VId<import("convex/values").GenericId<"packingLists">, "required">;
        name: import("convex/values").VString<string, "required">;
        category: import("convex/values").VUnion<"other" | "clothing" | "toiletries" | "electronics" | "documents" | "medicine" | "accessories" | "gear" | "snacks", [import("convex/values").VLiteral<"clothing", "required">, import("convex/values").VLiteral<"toiletries", "required">, import("convex/values").VLiteral<"electronics", "required">, import("convex/values").VLiteral<"documents", "required">, import("convex/values").VLiteral<"medicine", "required">, import("convex/values").VLiteral<"accessories", "required">, import("convex/values").VLiteral<"gear", "required">, import("convex/values").VLiteral<"snacks", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        quantity: import("convex/values").VFloat64<number, "required">;
        isPacked: import("convex/values").VBoolean<boolean, "required">;
        isEssential: import("convex/values").VBoolean<boolean, "required">;
        suggestedBy: import("convex/values").VUnion<"user" | "ai" | "weather" | "activity" | "template" | undefined, [import("convex/values").VLiteral<"user", "required">, import("convex/values").VLiteral<"weather", "required">, import("convex/values").VLiteral<"activity", "required">, import("convex/values").VLiteral<"template", "required">, import("convex/values").VLiteral<"ai", "required">], "optional", never>;
        notes: import("convex/values").VString<string | undefined, "optional">;
        orderIndex: import("convex/values").VFloat64<number, "required">;
        packedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        packedBy: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "updatedAt" | "category" | "notes" | "orderIndex" | "packingListId" | "quantity" | "isPacked" | "isEssential" | "suggestedBy" | "packedAt" | "packedBy">, {
        by_list: ["packingListId", "_creationTime"];
        by_list_category: ["packingListId", "category", "_creationTime"];
        by_list_packed: ["packingListId", "isPacked", "_creationTime"];
        by_list_essential: ["packingListId", "isEssential", "_creationTime"];
    }, {}, {}>;
    packingTemplates: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        nameEn?: string | undefined;
        climate?: "any" | "tropical" | "dry" | "temperate" | "cold" | "polar" | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        createdBy?: string | undefined;
        durationDays?: number | undefined;
        createdAt: number;
        name: string;
        items: {
            conditions?: {
                minDays?: number | undefined;
                maxDays?: number | undefined;
                minTemp?: number | undefined;
                maxTemp?: number | undefined;
                weatherConditions?: string[] | undefined;
                activities?: string[] | undefined;
            } | undefined;
            name: string;
            category: string;
            quantity: number;
            isEssential: boolean;
        }[];
        updatedAt: number;
        isSystem: boolean;
        tripType: "city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking";
        isPublic: boolean;
        usageCount: number;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        description: import("convex/values").VString<string | undefined, "optional">;
        tripType: import("convex/values").VUnion<"city" | "other" | "leisure" | "business" | "adventure" | "beach" | "ski" | "hiking", [import("convex/values").VLiteral<"leisure", "required">, import("convex/values").VLiteral<"business", "required">, import("convex/values").VLiteral<"adventure", "required">, import("convex/values").VLiteral<"beach", "required">, import("convex/values").VLiteral<"ski", "required">, import("convex/values").VLiteral<"city", "required">, import("convex/values").VLiteral<"hiking", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        climate: import("convex/values").VUnion<"any" | "tropical" | "dry" | "temperate" | "cold" | "polar" | undefined, [import("convex/values").VLiteral<"tropical", "required">, import("convex/values").VLiteral<"dry", "required">, import("convex/values").VLiteral<"temperate", "required">, import("convex/values").VLiteral<"cold", "required">, import("convex/values").VLiteral<"polar", "required">, import("convex/values").VLiteral<"any", "required">], "optional", never>;
        durationDays: import("convex/values").VFloat64<number | undefined, "optional">;
        items: import("convex/values").VArray<{
            conditions?: {
                minDays?: number | undefined;
                maxDays?: number | undefined;
                minTemp?: number | undefined;
                maxTemp?: number | undefined;
                weatherConditions?: string[] | undefined;
                activities?: string[] | undefined;
            } | undefined;
            name: string;
            category: string;
            quantity: number;
            isEssential: boolean;
        }[], import("convex/values").VObject<{
            conditions?: {
                minDays?: number | undefined;
                maxDays?: number | undefined;
                minTemp?: number | undefined;
                maxTemp?: number | undefined;
                weatherConditions?: string[] | undefined;
                activities?: string[] | undefined;
            } | undefined;
            name: string;
            category: string;
            quantity: number;
            isEssential: boolean;
        }, {
            name: import("convex/values").VString<string, "required">;
            category: import("convex/values").VString<string, "required">;
            quantity: import("convex/values").VFloat64<number, "required">;
            isEssential: import("convex/values").VBoolean<boolean, "required">;
            conditions: import("convex/values").VObject<{
                minDays?: number | undefined;
                maxDays?: number | undefined;
                minTemp?: number | undefined;
                maxTemp?: number | undefined;
                weatherConditions?: string[] | undefined;
                activities?: string[] | undefined;
            } | undefined, {
                minTemp: import("convex/values").VFloat64<number | undefined, "optional">;
                maxTemp: import("convex/values").VFloat64<number | undefined, "optional">;
                weatherConditions: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
                activities: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
                minDays: import("convex/values").VFloat64<number | undefined, "optional">;
                maxDays: import("convex/values").VFloat64<number | undefined, "optional">;
            }, "optional", "minDays" | "maxDays" | "minTemp" | "maxTemp" | "weatherConditions" | "activities">;
        }, "required", "name" | "category" | "quantity" | "isEssential" | "conditions" | "conditions.minDays" | "conditions.maxDays" | "conditions.minTemp" | "conditions.maxTemp" | "conditions.weatherConditions" | "conditions.activities">, "required">;
        usageCount: import("convex/values").VFloat64<number, "required">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        ratingCount: import("convex/values").VFloat64<number | undefined, "optional">;
        isSystem: import("convex/values").VBoolean<boolean, "required">;
        createdBy: import("convex/values").VString<string | undefined, "optional">;
        isPublic: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "description" | "items" | "updatedAt" | "nameEn" | "climate" | "rating" | "ratingCount" | "isSystem" | "createdBy" | "tripType" | "isPublic" | "durationDays" | "usageCount">, {
        by_trip_type: ["tripType", "_creationTime"];
        by_climate: ["climate", "_creationTime"];
        by_system: ["isSystem", "_creationTime"];
        by_public: ["isPublic", "_creationTime"];
        by_creator: ["createdBy", "_creationTime"];
        by_usage: ["usageCount", "_creationTime"];
    }, {}, {}>;
    tripMembers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        email?: string | undefined;
        userId?: string | undefined;
        avatarUrl?: string | undefined;
        createdAt: number;
        name: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        isOwner: boolean;
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        name: import("convex/values").VString<string, "required">;
        email: import("convex/values").VString<string | undefined, "optional">;
        avatarUrl: import("convex/values").VString<string | undefined, "optional">;
        userId: import("convex/values").VString<string | undefined, "optional">;
        isOwner: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "email" | "userId" | "avatarUrl" | "itineraryId" | "isOwner">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_itinerary_user: ["itineraryId", "userId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    sharedExpenses: import("convex/server").TableDefinition<import("convex/values").VObject<{
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
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        paidById: import("convex/values").VId<import("convex/values").GenericId<"tripMembers">, "required">;
        amount: import("convex/values").VFloat64<number, "required">;
        currency: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        category: import("convex/values").VUnion<"shopping" | "other" | "food" | "transport" | "accommodation" | "tickets", [import("convex/values").VLiteral<"food", "required">, import("convex/values").VLiteral<"transport", "required">, import("convex/values").VLiteral<"accommodation", "required">, import("convex/values").VLiteral<"tickets", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        splitType: import("convex/values").VUnion<"exact" | "percentage" | "equal" | "shares", [import("convex/values").VLiteral<"equal", "required">, import("convex/values").VLiteral<"exact", "required">, import("convex/values").VLiteral<"percentage", "required">, import("convex/values").VLiteral<"shares", "required">], "required", never>;
        date: import("convex/values").VString<string, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        receiptImageUrl: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "description" | "date" | "updatedAt" | "category" | "currency" | "notes" | "itineraryId" | "amount" | "receiptImageUrl" | "paidById" | "splitType">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_itinerary_date: ["itineraryId", "date", "_creationTime"];
        by_paid_by: ["paidById", "_creationTime"];
        by_category: ["category", "_creationTime"];
    }, {}, {}>;
    expenseParticipants: import("convex/server").TableDefinition<import("convex/values").VObject<{
        expenseId: import("convex/values").GenericId<"sharedExpenses">;
        memberId: import("convex/values").GenericId<"tripMembers">;
        splitValue: number;
        amountOwed: number;
    }, {
        expenseId: import("convex/values").VId<import("convex/values").GenericId<"sharedExpenses">, "required">;
        memberId: import("convex/values").VId<import("convex/values").GenericId<"tripMembers">, "required">;
        splitValue: import("convex/values").VFloat64<number, "required">;
        amountOwed: import("convex/values").VFloat64<number, "required">;
    }, "required", "expenseId" | "memberId" | "splitValue" | "amountOwed">, {
        by_expense: ["expenseId", "_creationTime"];
        by_member: ["memberId", "_creationTime"];
        by_expense_member: ["expenseId", "memberId", "_creationTime"];
    }, {}, {}>;
    settlements: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        settledAt?: number | undefined;
        createdAt: number;
        currency: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        amount: number;
        fromMemberId: import("convex/values").GenericId<"tripMembers">;
        toMemberId: import("convex/values").GenericId<"tripMembers">;
        isSettled: boolean;
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        fromMemberId: import("convex/values").VId<import("convex/values").GenericId<"tripMembers">, "required">;
        toMemberId: import("convex/values").VId<import("convex/values").GenericId<"tripMembers">, "required">;
        amount: import("convex/values").VFloat64<number, "required">;
        currency: import("convex/values").VString<string, "required">;
        isSettled: import("convex/values").VBoolean<boolean, "required">;
        settledAt: import("convex/values").VFloat64<number | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "currency" | "notes" | "itineraryId" | "amount" | "fromMemberId" | "toMemberId" | "isSettled" | "settledAt">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_from_member: ["fromMemberId", "_creationTime"];
        by_to_member: ["toMemberId", "_creationTime"];
        by_settled: ["isSettled", "_creationTime"];
    }, {}, {}>;
    templateCategories: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        nameEn?: string | undefined;
        createdAt: number;
        name: string;
        icon: string;
        updatedAt: number;
        sortOrder: number;
        isActive: boolean;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        icon: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        sortOrder: import("convex/values").VFloat64<number, "required">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "description" | "icon" | "updatedAt" | "nameEn" | "sortOrder" | "isActive">, {
        by_sort_order: ["sortOrder", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
    }, {}, {}>;
    itineraryTemplates: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        publishedAt?: number | undefined;
        coverImageUrl?: string | undefined;
        destinations?: string[] | undefined;
        tags?: string[] | undefined;
        creatorId?: string | undefined;
        creatorName?: string | undefined;
        estimatedBudget?: {
            currency: string;
            min: number;
            max: number;
        } | undefined;
        suitableFor?: string[] | undefined;
        bestSeasons?: string[] | undefined;
        createdAt: number;
        title: string;
        days: {
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                name: string;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            }[];
            dayNumber: number;
        }[];
        visibility: "public" | "private" | "unlisted";
        updatedAt: number;
        viewCount: number;
        categoryId: import("convex/values").GenericId<"templateCategories">;
        daysCount: number;
        templateType: "user" | "preset";
        isPublished: boolean;
        likeCount: number;
        saveCount: number;
        useCount: number;
    }, {
        title: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        categoryId: import("convex/values").VId<import("convex/values").GenericId<"templateCategories">, "required">;
        templateType: import("convex/values").VUnion<"user" | "preset", [import("convex/values").VLiteral<"preset", "required">, import("convex/values").VLiteral<"user", "required">], "required", never>;
        creatorId: import("convex/values").VString<string | undefined, "optional">;
        creatorName: import("convex/values").VString<string | undefined, "optional">;
        daysCount: import("convex/values").VFloat64<number, "required">;
        days: import("convex/values").VArray<{
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                name: string;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            }[];
            dayNumber: number;
        }[], import("convex/values").VObject<{
            theme?: string | undefined;
            pois: {
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                name: string;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            }[];
            dayNumber: number;
        }, {
            dayNumber: import("convex/values").VFloat64<number, "required">;
            theme: import("convex/values").VString<string | undefined, "optional">;
            pois: import("convex/values").VArray<{
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                name: string;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            }[], import("convex/values").VObject<{
                description?: string | undefined;
                latitude?: number | undefined;
                longitude?: number | undefined;
                address?: string | undefined;
                notes?: string | undefined;
                suggestedDuration?: number | undefined;
                suggestedTime?: string | undefined;
                name: string;
                type: "attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation";
            }, {
                name: import("convex/values").VString<string, "required">;
                type: import("convex/values").VUnion<"attraction" | "restaurant" | "hotel" | "shopping" | "activity" | "transportation", [import("convex/values").VLiteral<"attraction", "required">, import("convex/values").VLiteral<"restaurant", "required">, import("convex/values").VLiteral<"hotel", "required">, import("convex/values").VLiteral<"transportation", "required">, import("convex/values").VLiteral<"activity", "required">, import("convex/values").VLiteral<"shopping", "required">], "required", never>;
                description: import("convex/values").VString<string | undefined, "optional">;
                suggestedDuration: import("convex/values").VFloat64<number | undefined, "optional">;
                suggestedTime: import("convex/values").VString<string | undefined, "optional">;
                notes: import("convex/values").VString<string | undefined, "optional">;
                latitude: import("convex/values").VFloat64<number | undefined, "optional">;
                longitude: import("convex/values").VFloat64<number | undefined, "optional">;
                address: import("convex/values").VString<string | undefined, "optional">;
            }, "required", "name" | "type" | "description" | "latitude" | "longitude" | "address" | "notes" | "suggestedDuration" | "suggestedTime">, "required">;
        }, "required", "theme" | "pois" | "dayNumber">, "required">;
        destinations: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        tags: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        estimatedBudget: import("convex/values").VObject<{
            currency: string;
            min: number;
            max: number;
        } | undefined, {
            min: import("convex/values").VFloat64<number, "required">;
            max: import("convex/values").VFloat64<number, "required">;
            currency: import("convex/values").VString<string, "required">;
        }, "optional", "currency" | "min" | "max">;
        suitableFor: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        bestSeasons: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        visibility: import("convex/values").VUnion<"public" | "private" | "unlisted", [import("convex/values").VLiteral<"private", "required">, import("convex/values").VLiteral<"public", "required">, import("convex/values").VLiteral<"unlisted", "required">], "required", never>;
        isPublished: import("convex/values").VBoolean<boolean, "required">;
        viewCount: import("convex/values").VFloat64<number, "required">;
        likeCount: import("convex/values").VFloat64<number, "required">;
        saveCount: import("convex/values").VFloat64<number, "required">;
        useCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        publishedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "createdAt" | "description" | "title" | "publishedAt" | "coverImageUrl" | "destinations" | "tags" | "days" | "visibility" | "updatedAt" | "viewCount" | "categoryId" | "daysCount" | "templateType" | "creatorId" | "creatorName" | "estimatedBudget" | "suitableFor" | "bestSeasons" | "isPublished" | "likeCount" | "saveCount" | "useCount" | "estimatedBudget.currency" | "estimatedBudget.min" | "estimatedBudget.max">, {
        by_category: ["categoryId", "_creationTime"];
        by_type: ["templateType", "_creationTime"];
        by_creator: ["creatorId", "_creationTime"];
        by_visibility: ["visibility", "_creationTime"];
        by_published: ["isPublished", "_creationTime"];
        by_use_count: ["useCount", "_creationTime"];
        by_like_count: ["likeCount", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    templateLikes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        templateId: import("convex/values").GenericId<"itineraryTemplates">;
    }, {
        templateId: import("convex/values").VId<import("convex/values").GenericId<"itineraryTemplates">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "templateId">, {
        by_template: ["templateId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_template_user: ["templateId", "userId", "_creationTime"];
    }, {}, {}>;
    templateSaves: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        templateId: import("convex/values").GenericId<"itineraryTemplates">;
    }, {
        templateId: import("convex/values").VId<import("convex/values").GenericId<"itineraryTemplates">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "templateId">, {
        by_template: ["templateId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_template_user: ["templateId", "userId", "_creationTime"];
    }, {}, {}>;
    itineraryDrafts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        coverImageUrl?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        days?: {
            date?: string | undefined;
            items: {
                notes?: string | undefined;
                poiId?: import("convex/values").GenericId<"pois"> | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
                inlinePoi?: {
                    latitude?: number | undefined;
                    longitude?: number | undefined;
                    address?: string | undefined;
                    name: string;
                    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
                } | undefined;
                orderIndex: number;
            }[];
            dayNumber: number;
        }[] | undefined;
        visibility?: "public" | "private" | "team" | undefined;
        cityId?: import("convex/values").GenericId<"cities"> | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        deviceId?: string | undefined;
        title: string;
        userId: string;
        expiresAt: number;
        lastModifiedAt: number;
        syncVersion: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        title: import("convex/values").VString<string, "required">;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
        startDate: import("convex/values").VString<string | undefined, "optional">;
        endDate: import("convex/values").VString<string | undefined, "optional">;
        visibility: import("convex/values").VUnion<"public" | "private" | "team" | undefined, [import("convex/values").VLiteral<"private", "required">, import("convex/values").VLiteral<"team", "required">, import("convex/values").VLiteral<"public", "required">], "optional", never>;
        coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        days: import("convex/values").VArray<{
            date?: string | undefined;
            items: {
                notes?: string | undefined;
                poiId?: import("convex/values").GenericId<"pois"> | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
                inlinePoi?: {
                    latitude?: number | undefined;
                    longitude?: number | undefined;
                    address?: string | undefined;
                    name: string;
                    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
                } | undefined;
                orderIndex: number;
            }[];
            dayNumber: number;
        }[] | undefined, import("convex/values").VObject<{
            date?: string | undefined;
            items: {
                notes?: string | undefined;
                poiId?: import("convex/values").GenericId<"pois"> | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
                inlinePoi?: {
                    latitude?: number | undefined;
                    longitude?: number | undefined;
                    address?: string | undefined;
                    name: string;
                    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
                } | undefined;
                orderIndex: number;
            }[];
            dayNumber: number;
        }, {
            dayNumber: import("convex/values").VFloat64<number, "required">;
            date: import("convex/values").VString<string | undefined, "optional">;
            items: import("convex/values").VArray<{
                notes?: string | undefined;
                poiId?: import("convex/values").GenericId<"pois"> | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
                inlinePoi?: {
                    latitude?: number | undefined;
                    longitude?: number | undefined;
                    address?: string | undefined;
                    name: string;
                    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
                } | undefined;
                orderIndex: number;
            }[], import("convex/values").VObject<{
                notes?: string | undefined;
                poiId?: import("convex/values").GenericId<"pois"> | undefined;
                startTime?: string | undefined;
                endTime?: string | undefined;
                transportMode?: "walking" | "driving" | "transit" | "cycling" | "taxi" | undefined;
                inlinePoi?: {
                    latitude?: number | undefined;
                    longitude?: number | undefined;
                    address?: string | undefined;
                    name: string;
                    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
                } | undefined;
                orderIndex: number;
            }, {
                poiId: import("convex/values").VId<import("convex/values").GenericId<"pois"> | undefined, "optional">;
                orderIndex: import("convex/values").VFloat64<number, "required">;
                startTime: import("convex/values").VString<string | undefined, "optional">;
                endTime: import("convex/values").VString<string | undefined, "optional">;
                transportMode: import("convex/values").VUnion<"walking" | "driving" | "transit" | "cycling" | "taxi" | undefined, [import("convex/values").VLiteral<"walking", "required">, import("convex/values").VLiteral<"driving", "required">, import("convex/values").VLiteral<"transit", "required">, import("convex/values").VLiteral<"cycling", "required">, import("convex/values").VLiteral<"taxi", "required">], "optional", never>;
                notes: import("convex/values").VString<string | undefined, "optional">;
                inlinePoi: import("convex/values").VObject<{
                    latitude?: number | undefined;
                    longitude?: number | undefined;
                    address?: string | undefined;
                    name: string;
                    category: "attraction" | "restaurant" | "hotel" | "shopping" | "other";
                } | undefined, {
                    name: import("convex/values").VString<string, "required">;
                    category: import("convex/values").VUnion<"attraction" | "restaurant" | "hotel" | "shopping" | "other", [import("convex/values").VLiteral<"attraction", "required">, import("convex/values").VLiteral<"restaurant", "required">, import("convex/values").VLiteral<"hotel", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
                    address: import("convex/values").VString<string | undefined, "optional">;
                    latitude: import("convex/values").VFloat64<number | undefined, "optional">;
                    longitude: import("convex/values").VFloat64<number | undefined, "optional">;
                }, "optional", "name" | "latitude" | "longitude" | "category" | "address">;
            }, "required", "notes" | "poiId" | "orderIndex" | "startTime" | "endTime" | "transportMode" | "inlinePoi" | "inlinePoi.name" | "inlinePoi.latitude" | "inlinePoi.longitude" | "inlinePoi.category" | "inlinePoi.address">, "required">;
        }, "required", "date" | "items" | "dayNumber">, "optional">;
        lastModifiedAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
        deviceId: import("convex/values").VString<string | undefined, "optional">;
        syncVersion: import("convex/values").VFloat64<number, "required">;
    }, "required", "title" | "coverImageUrl" | "userId" | "startDate" | "endDate" | "days" | "visibility" | "cityId" | "itineraryId" | "deviceId" | "expiresAt" | "lastModifiedAt" | "syncVersion">, {
        by_user: ["userId", "_creationTime"];
        by_user_itinerary: ["userId", "itineraryId", "_creationTime"];
        by_expires: ["expiresAt", "_creationTime"];
        by_user_modified: ["userId", "lastModifiedAt", "_creationTime"];
    }, {}, {}>;
    userTravelPreferences: import("convex/server").TableDefinition<import("convex/values").VObject<{
        bio?: string | undefined;
        ageRange?: "18-25" | "26-35" | "36-45" | "46-55" | "55+" | undefined;
        languages?: string[] | undefined;
        travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
        preferredPace?: "moderate" | "slow" | "fast" | undefined;
        gender?: "other" | "male" | "female" | undefined;
        preferredPartnerGender?: "any" | "other" | "male" | "female" | undefined;
        interests?: string[] | undefined;
        smokingPreference?: "smoker" | "non_smoker" | "no_preference" | undefined;
        accommodationPreference?: "luxury" | "no_preference" | "hostel" | "budget_hotel" | "mid_range" | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        travelStyles: import("convex/values").VArray<("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined, import("convex/values").VUnion<"budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury", [import("convex/values").VLiteral<"adventure", "required">, import("convex/values").VLiteral<"relaxation", "required">, import("convex/values").VLiteral<"culture", "required">, import("convex/values").VLiteral<"food", "required">, import("convex/values").VLiteral<"nature", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"photography", "required">, import("convex/values").VLiteral<"budget", "required">, import("convex/values").VLiteral<"luxury", "required">], "required", never>, "optional">;
        preferredPace: import("convex/values").VUnion<"moderate" | "slow" | "fast" | undefined, [import("convex/values").VLiteral<"slow", "required">, import("convex/values").VLiteral<"moderate", "required">, import("convex/values").VLiteral<"fast", "required">], "optional", never>;
        languages: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        ageRange: import("convex/values").VUnion<"18-25" | "26-35" | "36-45" | "46-55" | "55+" | undefined, [import("convex/values").VLiteral<"18-25", "required">, import("convex/values").VLiteral<"26-35", "required">, import("convex/values").VLiteral<"36-45", "required">, import("convex/values").VLiteral<"46-55", "required">, import("convex/values").VLiteral<"55+", "required">], "optional", never>;
        gender: import("convex/values").VUnion<"other" | "male" | "female" | undefined, [import("convex/values").VLiteral<"male", "required">, import("convex/values").VLiteral<"female", "required">, import("convex/values").VLiteral<"other", "required">], "optional", never>;
        preferredPartnerGender: import("convex/values").VUnion<"any" | "other" | "male" | "female" | undefined, [import("convex/values").VLiteral<"male", "required">, import("convex/values").VLiteral<"female", "required">, import("convex/values").VLiteral<"other", "required">, import("convex/values").VLiteral<"any", "required">], "optional", never>;
        bio: import("convex/values").VString<string | undefined, "optional">;
        interests: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        smokingPreference: import("convex/values").VUnion<"smoker" | "non_smoker" | "no_preference" | undefined, [import("convex/values").VLiteral<"smoker", "required">, import("convex/values").VLiteral<"non_smoker", "required">, import("convex/values").VLiteral<"no_preference", "required">], "optional", never>;
        accommodationPreference: import("convex/values").VUnion<"luxury" | "no_preference" | "hostel" | "budget_hotel" | "mid_range" | undefined, [import("convex/values").VLiteral<"hostel", "required">, import("convex/values").VLiteral<"budget_hotel", "required">, import("convex/values").VLiteral<"mid_range", "required">, import("convex/values").VLiteral<"luxury", "required">, import("convex/values").VLiteral<"no_preference", "required">], "optional", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "bio" | "updatedAt" | "ageRange" | "languages" | "travelStyles" | "preferredPace" | "gender" | "preferredPartnerGender" | "interests" | "smokingPreference" | "accommodationPreference">, {
        by_user: ["userId", "_creationTime"];
        by_age_range: ["ageRange", "_creationTime"];
        by_gender: ["gender", "_creationTime"];
    }, {}, {}>;
    travelPartnerRequests: import("convex/server").TableDefinition<import("convex/values").VObject<{
        coverImageUrl?: string | undefined;
        imageUrls?: string[] | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        expiresAt?: number | undefined;
        estimatedBudget?: number | undefined;
        travelStyles?: ("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined;
        destinationCityId?: import("convex/values").GenericId<"cities"> | undefined;
        preferredGender?: "any" | "other" | "male" | "female" | undefined;
        preferredAgeRange?: ("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined;
        budgetRange?: "budget" | "moderate" | "luxury" | "comfortable" | undefined;
        status: "cancelled" | "active" | "expired" | "paused" | "fulfilled";
        createdAt: number;
        description: string;
        title: string;
        destination: string;
        userId: string;
        startDate: string;
        endDate: string;
        updatedAt: number;
        viewCount: number;
        isFlexibleDates: boolean;
        currentGroupSize: number;
        maxGroupSize: number;
        applicationCount: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        destination: import("convex/values").VString<string, "required">;
        destinationCityId: import("convex/values").VId<import("convex/values").GenericId<"cities"> | undefined, "optional">;
        startDate: import("convex/values").VString<string, "required">;
        endDate: import("convex/values").VString<string, "required">;
        isFlexibleDates: import("convex/values").VBoolean<boolean, "required">;
        currentGroupSize: import("convex/values").VFloat64<number, "required">;
        maxGroupSize: import("convex/values").VFloat64<number, "required">;
        preferredGender: import("convex/values").VUnion<"any" | "other" | "male" | "female" | undefined, [import("convex/values").VLiteral<"male", "required">, import("convex/values").VLiteral<"female", "required">, import("convex/values").VLiteral<"other", "required">, import("convex/values").VLiteral<"any", "required">], "optional", never>;
        preferredAgeRange: import("convex/values").VArray<("18-25" | "26-35" | "36-45" | "46-55" | "55+")[] | undefined, import("convex/values").VUnion<"18-25" | "26-35" | "36-45" | "46-55" | "55+", [import("convex/values").VLiteral<"18-25", "required">, import("convex/values").VLiteral<"26-35", "required">, import("convex/values").VLiteral<"36-45", "required">, import("convex/values").VLiteral<"46-55", "required">, import("convex/values").VLiteral<"55+", "required">], "required", never>, "optional">;
        travelStyles: import("convex/values").VArray<("budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury")[] | undefined, import("convex/values").VUnion<"budget" | "shopping" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury", [import("convex/values").VLiteral<"adventure", "required">, import("convex/values").VLiteral<"relaxation", "required">, import("convex/values").VLiteral<"culture", "required">, import("convex/values").VLiteral<"food", "required">, import("convex/values").VLiteral<"nature", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"photography", "required">, import("convex/values").VLiteral<"budget", "required">, import("convex/values").VLiteral<"luxury", "required">], "required", never>, "optional">;
        budgetRange: import("convex/values").VUnion<"budget" | "moderate" | "luxury" | "comfortable" | undefined, [import("convex/values").VLiteral<"budget", "required">, import("convex/values").VLiteral<"moderate", "required">, import("convex/values").VLiteral<"comfortable", "required">, import("convex/values").VLiteral<"luxury", "required">], "optional", never>;
        estimatedBudget: import("convex/values").VFloat64<number | undefined, "optional">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        status: import("convex/values").VUnion<"cancelled" | "active" | "expired" | "paused" | "fulfilled", [import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"paused", "required">, import("convex/values").VLiteral<"fulfilled", "required">, import("convex/values").VLiteral<"cancelled", "required">, import("convex/values").VLiteral<"expired", "required">], "required", never>;
        viewCount: import("convex/values").VFloat64<number, "required">;
        applicationCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "status" | "createdAt" | "description" | "title" | "coverImageUrl" | "imageUrls" | "destination" | "userId" | "startDate" | "endDate" | "updatedAt" | "viewCount" | "itineraryId" | "expiresAt" | "estimatedBudget" | "travelStyles" | "destinationCityId" | "isFlexibleDates" | "currentGroupSize" | "maxGroupSize" | "preferredGender" | "preferredAgeRange" | "budgetRange" | "applicationCount">, {
        by_user: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_destination: ["destination", "_creationTime"];
        by_city: ["destinationCityId", "_creationTime"];
        by_dates: ["startDate", "endDate", "_creationTime"];
        by_status_dates: ["status", "startDate", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    partnerMatchApplications: import("convex/server").TableDefinition<import("convex/values").VObject<{
        matchScore?: number | undefined;
        matchFactors?: {
            styleMatch?: number | undefined;
            ageMatch?: number | undefined;
            budgetMatch?: number | undefined;
            languageMatch?: number | undefined;
            interestMatch?: number | undefined;
        } | undefined;
        responseMessage?: string | undefined;
        respondedAt?: number | undefined;
        status: "rejected" | "pending" | "expired" | "accepted" | "withdrawn";
        createdAt: number;
        message: string;
        updatedAt: number;
        requestId: import("convex/values").GenericId<"travelPartnerRequests">;
        applicantId: string;
        requestOwnerId: string;
    }, {
        requestId: import("convex/values").VId<import("convex/values").GenericId<"travelPartnerRequests">, "required">;
        applicantId: import("convex/values").VString<string, "required">;
        requestOwnerId: import("convex/values").VString<string, "required">;
        message: import("convex/values").VString<string, "required">;
        matchScore: import("convex/values").VFloat64<number | undefined, "optional">;
        matchFactors: import("convex/values").VObject<{
            styleMatch?: number | undefined;
            ageMatch?: number | undefined;
            budgetMatch?: number | undefined;
            languageMatch?: number | undefined;
            interestMatch?: number | undefined;
        } | undefined, {
            styleMatch: import("convex/values").VFloat64<number | undefined, "optional">;
            ageMatch: import("convex/values").VFloat64<number | undefined, "optional">;
            budgetMatch: import("convex/values").VFloat64<number | undefined, "optional">;
            languageMatch: import("convex/values").VFloat64<number | undefined, "optional">;
            interestMatch: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "optional", "styleMatch" | "ageMatch" | "budgetMatch" | "languageMatch" | "interestMatch">;
        status: import("convex/values").VUnion<"rejected" | "pending" | "expired" | "accepted" | "withdrawn", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"accepted", "required">, import("convex/values").VLiteral<"rejected", "required">, import("convex/values").VLiteral<"withdrawn", "required">, import("convex/values").VLiteral<"expired", "required">], "required", never>;
        responseMessage: import("convex/values").VString<string | undefined, "optional">;
        respondedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "message" | "updatedAt" | "requestId" | "applicantId" | "requestOwnerId" | "matchScore" | "matchFactors" | "responseMessage" | "respondedAt" | "matchFactors.styleMatch" | "matchFactors.ageMatch" | "matchFactors.budgetMatch" | "matchFactors.languageMatch" | "matchFactors.interestMatch">, {
        by_request: ["requestId", "_creationTime"];
        by_applicant: ["applicantId", "_creationTime"];
        by_owner: ["requestOwnerId", "_creationTime"];
        by_request_status: ["requestId", "status", "_creationTime"];
        by_applicant_status: ["applicantId", "status", "_creationTime"];
        by_owner_status: ["requestOwnerId", "status", "_creationTime"];
        by_match_score: ["matchScore", "_creationTime"];
    }, {}, {}>;
    partnerMatches: import("convex/server").TableDefinition<import("convex/values").VObject<{
        conversationId?: import("convex/values").GenericId<"conversations"> | undefined;
        ownerFeedback?: {
            review?: string | undefined;
            createdAt: number;
            rating: number;
            wouldTravelAgain: boolean;
        } | undefined;
        partnerFeedback?: {
            review?: string | undefined;
            createdAt: number;
            rating: number;
            wouldTravelAgain: boolean;
        } | undefined;
        status: "completed" | "cancelled" | "active";
        createdAt: number;
        destination: string;
        startDate: string;
        endDate: string;
        updatedAt: number;
        requestId: import("convex/values").GenericId<"travelPartnerRequests">;
        requestOwnerId: string;
        matchScore: number;
        applicationId: import("convex/values").GenericId<"partnerMatchApplications">;
        partnerId: string;
        matchedAt: number;
    }, {
        requestId: import("convex/values").VId<import("convex/values").GenericId<"travelPartnerRequests">, "required">;
        applicationId: import("convex/values").VId<import("convex/values").GenericId<"partnerMatchApplications">, "required">;
        requestOwnerId: import("convex/values").VString<string, "required">;
        partnerId: import("convex/values").VString<string, "required">;
        matchScore: import("convex/values").VFloat64<number, "required">;
        matchedAt: import("convex/values").VFloat64<number, "required">;
        destination: import("convex/values").VString<string, "required">;
        startDate: import("convex/values").VString<string, "required">;
        endDate: import("convex/values").VString<string, "required">;
        status: import("convex/values").VUnion<"completed" | "cancelled" | "active", [import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        conversationId: import("convex/values").VId<import("convex/values").GenericId<"conversations"> | undefined, "optional">;
        ownerFeedback: import("convex/values").VObject<{
            review?: string | undefined;
            createdAt: number;
            rating: number;
            wouldTravelAgain: boolean;
        } | undefined, {
            rating: import("convex/values").VFloat64<number, "required">;
            review: import("convex/values").VString<string | undefined, "optional">;
            wouldTravelAgain: import("convex/values").VBoolean<boolean, "required">;
            createdAt: import("convex/values").VFloat64<number, "required">;
        }, "optional", "createdAt" | "rating" | "review" | "wouldTravelAgain">;
        partnerFeedback: import("convex/values").VObject<{
            review?: string | undefined;
            createdAt: number;
            rating: number;
            wouldTravelAgain: boolean;
        } | undefined, {
            rating: import("convex/values").VFloat64<number, "required">;
            review: import("convex/values").VString<string | undefined, "optional">;
            wouldTravelAgain: import("convex/values").VBoolean<boolean, "required">;
            createdAt: import("convex/values").VFloat64<number, "required">;
        }, "optional", "createdAt" | "rating" | "review" | "wouldTravelAgain">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "destination" | "startDate" | "endDate" | "updatedAt" | "conversationId" | "requestId" | "requestOwnerId" | "matchScore" | "applicationId" | "partnerId" | "matchedAt" | "ownerFeedback" | "partnerFeedback" | "ownerFeedback.createdAt" | "ownerFeedback.rating" | "ownerFeedback.review" | "ownerFeedback.wouldTravelAgain" | "partnerFeedback.createdAt" | "partnerFeedback.rating" | "partnerFeedback.review" | "partnerFeedback.wouldTravelAgain">, {
        by_request: ["requestId", "_creationTime"];
        by_owner: ["requestOwnerId", "_creationTime"];
        by_partner: ["partnerId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_destination: ["destination", "_creationTime"];
        by_dates: ["startDate", "endDate", "_creationTime"];
    }, {}, {}>;
    userVerifications: import("convex/server").TableDefinition<import("convex/values").VObject<{
        reviewedBy?: string | undefined;
        verifiedAt?: number | undefined;
        expiresAt?: number | undefined;
        verificationData?: string | undefined;
        verificationMethod?: string | undefined;
        socialPlatform?: string | undefined;
        socialId?: string | undefined;
        referenceUserId?: string | undefined;
        referenceNote?: string | undefined;
        adminNotes?: string | undefined;
        status: "rejected" | "pending" | "expired" | "verified";
        createdAt: number;
        userId: string;
        updatedAt: number;
        verificationType: "email" | "phone" | "identity" | "social" | "travel_history" | "reference";
    }, {
        userId: import("convex/values").VString<string, "required">;
        verificationType: import("convex/values").VUnion<"email" | "phone" | "identity" | "social" | "travel_history" | "reference", [import("convex/values").VLiteral<"identity", "required">, import("convex/values").VLiteral<"phone", "required">, import("convex/values").VLiteral<"email", "required">, import("convex/values").VLiteral<"social", "required">, import("convex/values").VLiteral<"travel_history", "required">, import("convex/values").VLiteral<"reference", "required">], "required", never>;
        status: import("convex/values").VUnion<"rejected" | "pending" | "expired" | "verified", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"verified", "required">, import("convex/values").VLiteral<"rejected", "required">, import("convex/values").VLiteral<"expired", "required">], "required", never>;
        verificationData: import("convex/values").VString<string | undefined, "optional">;
        verificationMethod: import("convex/values").VString<string | undefined, "optional">;
        socialPlatform: import("convex/values").VString<string | undefined, "optional">;
        socialId: import("convex/values").VString<string | undefined, "optional">;
        referenceUserId: import("convex/values").VString<string | undefined, "optional">;
        referenceNote: import("convex/values").VString<string | undefined, "optional">;
        adminNotes: import("convex/values").VString<string | undefined, "optional">;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
        verifiedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        expiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "userId" | "updatedAt" | "reviewedBy" | "verifiedAt" | "expiresAt" | "verificationType" | "verificationData" | "verificationMethod" | "socialPlatform" | "socialId" | "referenceUserId" | "referenceNote" | "adminNotes">, {
        by_user: ["userId", "_creationTime"];
        by_user_type: ["userId", "verificationType", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_type_status: ["verificationType", "status", "_creationTime"];
    }, {}, {}>;
    userTrustScores: import("convex/server").TableDefinition<import("convex/values").VObject<{
        averageRating?: number | undefined;
        badges?: ("verified_identity" | "trusted_traveler" | "super_host" | "responsive" | "experienced" | "top_rated")[] | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        totalTrips: number;
        lastCalculatedAt: number;
        overallScore: number;
        verificationScore: number;
        activityScore: number;
        feedbackScore: number;
        responseScore: number;
        successfulMatches: number;
        cancelledMatches: number;
        totalRatings: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        overallScore: import("convex/values").VFloat64<number, "required">;
        verificationScore: import("convex/values").VFloat64<number, "required">;
        activityScore: import("convex/values").VFloat64<number, "required">;
        feedbackScore: import("convex/values").VFloat64<number, "required">;
        responseScore: import("convex/values").VFloat64<number, "required">;
        totalTrips: import("convex/values").VFloat64<number, "required">;
        successfulMatches: import("convex/values").VFloat64<number, "required">;
        cancelledMatches: import("convex/values").VFloat64<number, "required">;
        averageRating: import("convex/values").VFloat64<number | undefined, "optional">;
        totalRatings: import("convex/values").VFloat64<number, "required">;
        badges: import("convex/values").VArray<("verified_identity" | "trusted_traveler" | "super_host" | "responsive" | "experienced" | "top_rated")[] | undefined, import("convex/values").VUnion<"verified_identity" | "trusted_traveler" | "super_host" | "responsive" | "experienced" | "top_rated", [import("convex/values").VLiteral<"verified_identity", "required">, import("convex/values").VLiteral<"trusted_traveler", "required">, import("convex/values").VLiteral<"super_host", "required">, import("convex/values").VLiteral<"responsive", "required">, import("convex/values").VLiteral<"experienced", "required">, import("convex/values").VLiteral<"top_rated", "required">], "required", never>, "optional">;
        lastCalculatedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "updatedAt" | "totalTrips" | "averageRating" | "lastCalculatedAt" | "overallScore" | "verificationScore" | "activityScore" | "feedbackScore" | "responseScore" | "successfulMatches" | "cancelledMatches" | "totalRatings" | "badges">, {
        by_user: ["userId", "_creationTime"];
        by_overall_score: ["overallScore", "_creationTime"];
    }, {}, {}>;
    partnerRequestSaves: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        requestId: import("convex/values").GenericId<"travelPartnerRequests">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        requestId: import("convex/values").VId<import("convex/values").GenericId<"travelPartnerRequests">, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "requestId">, {
        by_user: ["userId", "_creationTime"];
        by_request: ["requestId", "_creationTime"];
        by_user_request: ["userId", "requestId", "_creationTime"];
    }, {}, {}>;
    poiQuestions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        authorName?: string | undefined;
        imageUrls?: string[] | undefined;
        tags?: string[] | undefined;
        updatedAt?: number | undefined;
        isDeleted?: boolean | undefined;
        acceptedAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
        bestAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
        hasBestAnswer?: boolean | undefined;
        upvotesCount?: number | undefined;
        downvotesCount?: number | undefined;
        authorAvatarUrl?: string | undefined;
        content: string;
        status: "open" | "resolved" | "answered" | "closed";
        createdAt: number;
        title: string;
        viewsCount: number;
        userId: string;
        followersCount: number;
        category: "tips" | "general" | "other" | "safety" | "food" | "accommodation" | "transportation" | "timing" | "pricing";
        poiId: import("convex/values").GenericId<"pois">;
        isEdited: boolean;
        reportCount: number;
        answersCount: number;
        isPinned: boolean;
        isHidden: boolean;
        lastActivityAt: number;
    }, {
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        userId: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        category: import("convex/values").VUnion<"tips" | "general" | "other" | "safety" | "food" | "accommodation" | "transportation" | "timing" | "pricing", [import("convex/values").VLiteral<"general", "required">, import("convex/values").VLiteral<"transportation", "required">, import("convex/values").VLiteral<"timing", "required">, import("convex/values").VLiteral<"pricing", "required">, import("convex/values").VLiteral<"tips", "required">, import("convex/values").VLiteral<"food", "required">, import("convex/values").VLiteral<"accommodation", "required">, import("convex/values").VLiteral<"safety", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        tags: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        viewsCount: import("convex/values").VFloat64<number, "required">;
        answersCount: import("convex/values").VFloat64<number, "required">;
        followersCount: import("convex/values").VFloat64<number, "required">;
        status: import("convex/values").VUnion<"open" | "resolved" | "answered" | "closed", [import("convex/values").VLiteral<"open", "required">, import("convex/values").VLiteral<"answered", "required">, import("convex/values").VLiteral<"closed", "required">, import("convex/values").VLiteral<"resolved", "required">], "required", never>;
        acceptedAnswerId: import("convex/values").VId<import("convex/values").GenericId<"poiAnswers"> | undefined, "optional">;
        bestAnswerId: import("convex/values").VId<import("convex/values").GenericId<"poiAnswers"> | undefined, "optional">;
        hasBestAnswer: import("convex/values").VBoolean<boolean | undefined, "optional">;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        isPinned: import("convex/values").VBoolean<boolean, "required">;
        reportCount: import("convex/values").VFloat64<number, "required">;
        isHidden: import("convex/values").VBoolean<boolean, "required">;
        isDeleted: import("convex/values").VBoolean<boolean | undefined, "optional">;
        upvotesCount: import("convex/values").VFloat64<number | undefined, "optional">;
        downvotesCount: import("convex/values").VFloat64<number | undefined, "optional">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        authorAvatarUrl: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastActivityAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "status" | "createdAt" | "title" | "authorName" | "imageUrls" | "tags" | "viewsCount" | "userId" | "followersCount" | "updatedAt" | "category" | "poiId" | "isEdited" | "isDeleted" | "reportCount" | "answersCount" | "acceptedAnswerId" | "bestAnswerId" | "hasBestAnswer" | "isPinned" | "isHidden" | "upvotesCount" | "downvotesCount" | "authorAvatarUrl" | "lastActivityAt">, {
        by_poi: ["poiId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_poi_status: ["poiId", "status", "_creationTime"];
        by_poi_category: ["poiId", "category", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_category: ["category", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_last_activity: ["lastActivityAt", "_creationTime"];
        by_poi_last_activity: ["poiId", "lastActivityAt", "_creationTime"];
    }, {
        search_questions: {
            searchField: "title";
            filterFields: "poiId" | "isDeleted";
        };
    }, {}>;
    poiAnswers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        authorName?: string | undefined;
        imageUrls?: string[] | undefined;
        updatedAt?: number | undefined;
        poiId?: import("convex/values").GenericId<"pois"> | undefined;
        authorAvatarUrl?: string | undefined;
        isBestAnswer?: boolean | undefined;
        authorBadgeType?: "travel_expert" | "local_guide" | "official_account" | undefined;
        content: string;
        createdAt: number;
        commentsCount: number;
        userId: string;
        isEdited: boolean;
        isDeleted: boolean;
        reportCount: number;
        isHidden: boolean;
        upvotesCount: number;
        downvotesCount: number;
        questionId: import("convex/values").GenericId<"poiQuestions">;
        isAccepted: boolean;
        isVerifiedAuthor: boolean;
    }, {
        questionId: import("convex/values").VId<import("convex/values").GenericId<"poiQuestions">, "required">;
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois"> | undefined, "optional">;
        userId: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        authorAvatarUrl: import("convex/values").VString<string | undefined, "optional">;
        upvotesCount: import("convex/values").VFloat64<number, "required">;
        downvotesCount: import("convex/values").VFloat64<number, "required">;
        commentsCount: import("convex/values").VFloat64<number, "required">;
        isAccepted: import("convex/values").VBoolean<boolean, "required">;
        isBestAnswer: import("convex/values").VBoolean<boolean | undefined, "optional">;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        isDeleted: import("convex/values").VBoolean<boolean, "required">;
        isVerifiedAuthor: import("convex/values").VBoolean<boolean, "required">;
        authorBadgeType: import("convex/values").VUnion<"travel_expert" | "local_guide" | "official_account" | undefined, [import("convex/values").VLiteral<"travel_expert", "required">, import("convex/values").VLiteral<"local_guide", "required">, import("convex/values").VLiteral<"official_account", "required">], "optional", never>;
        reportCount: import("convex/values").VFloat64<number, "required">;
        isHidden: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "content" | "createdAt" | "authorName" | "imageUrls" | "commentsCount" | "userId" | "updatedAt" | "poiId" | "isEdited" | "isDeleted" | "reportCount" | "isHidden" | "upvotesCount" | "downvotesCount" | "authorAvatarUrl" | "questionId" | "isAccepted" | "isBestAnswer" | "isVerifiedAuthor" | "authorBadgeType">, {
        by_question: ["questionId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_question_accepted: ["questionId", "isAccepted", "_creationTime"];
        by_question_upvotes: ["questionId", "upvotesCount", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    answerVotes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        voteType: "up" | "down";
        answerId: import("convex/values").GenericId<"poiAnswers">;
    }, {
        answerId: import("convex/values").VId<import("convex/values").GenericId<"poiAnswers">, "required">;
        userId: import("convex/values").VString<string, "required">;
        voteType: import("convex/values").VUnion<"up" | "down", [import("convex/values").VLiteral<"up", "required">, import("convex/values").VLiteral<"down", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "voteType" | "answerId">, {
        by_answer: ["answerId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_answer_user: ["answerId", "userId", "_creationTime"];
    }, {}, {}>;
    answerComments: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number | undefined;
        parentId?: import("convex/values").GenericId<"answerComments"> | undefined;
        content: string;
        createdAt: number;
        likesCount: number;
        userId: string;
        isEdited: boolean;
        isDeleted: boolean;
        answerId: import("convex/values").GenericId<"poiAnswers">;
    }, {
        answerId: import("convex/values").VId<import("convex/values").GenericId<"poiAnswers">, "required">;
        userId: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        parentId: import("convex/values").VId<import("convex/values").GenericId<"answerComments"> | undefined, "optional">;
        likesCount: import("convex/values").VFloat64<number, "required">;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        isDeleted: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "content" | "createdAt" | "likesCount" | "userId" | "updatedAt" | "parentId" | "isEdited" | "isDeleted" | "answerId">, {
        by_answer: ["answerId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_parent: ["parentId", "_creationTime"];
        by_answer_created: ["answerId", "createdAt", "_creationTime"];
    }, {}, {}>;
    questionFollowers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        questionId: import("convex/values").GenericId<"poiQuestions">;
    }, {
        questionId: import("convex/values").VId<import("convex/values").GenericId<"poiQuestions">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "questionId">, {
        by_question: ["questionId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_question_user: ["questionId", "userId", "_creationTime"];
    }, {}, {}>;
    questionReports: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        status: "pending" | "reviewed" | "resolved" | "dismissed";
        createdAt: number;
        userId: string;
        reason: "other" | "spam" | "inappropriate" | "duplicate" | "off_topic";
        questionId: import("convex/values").GenericId<"poiQuestions">;
    }, {
        questionId: import("convex/values").VId<import("convex/values").GenericId<"poiQuestions">, "required">;
        userId: import("convex/values").VString<string, "required">;
        reason: import("convex/values").VUnion<"other" | "spam" | "inappropriate" | "duplicate" | "off_topic", [import("convex/values").VLiteral<"spam", "required">, import("convex/values").VLiteral<"inappropriate", "required">, import("convex/values").VLiteral<"duplicate", "required">, import("convex/values").VLiteral<"off_topic", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        description: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"pending" | "reviewed" | "resolved" | "dismissed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"reviewed", "required">, import("convex/values").VLiteral<"resolved", "required">, import("convex/values").VLiteral<"dismissed", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        reviewedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "createdAt" | "description" | "userId" | "reason" | "reviewedBy" | "reviewedAt" | "questionId">, {
        by_question: ["questionId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_question_user: ["questionId", "userId", "_creationTime"];
    }, {}, {}>;
    answerReports: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        status: "pending" | "reviewed" | "resolved" | "dismissed";
        createdAt: number;
        userId: string;
        reason: "other" | "spam" | "inappropriate" | "misleading" | "plagiarism";
        answerId: import("convex/values").GenericId<"poiAnswers">;
    }, {
        answerId: import("convex/values").VId<import("convex/values").GenericId<"poiAnswers">, "required">;
        userId: import("convex/values").VString<string, "required">;
        reason: import("convex/values").VUnion<"other" | "spam" | "inappropriate" | "misleading" | "plagiarism", [import("convex/values").VLiteral<"spam", "required">, import("convex/values").VLiteral<"inappropriate", "required">, import("convex/values").VLiteral<"misleading", "required">, import("convex/values").VLiteral<"plagiarism", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        description: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"pending" | "reviewed" | "resolved" | "dismissed", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"reviewed", "required">, import("convex/values").VLiteral<"resolved", "required">, import("convex/values").VLiteral<"dismissed", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        reviewedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "status" | "createdAt" | "description" | "userId" | "reason" | "reviewedBy" | "reviewedAt" | "answerId">, {
        by_answer: ["answerId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_answer_user: ["answerId", "userId", "_creationTime"];
    }, {}, {}>;
    translationPhrases: import("convex/server").TableDefinition<import("convex/values").VObject<{
        audioUrls?: {
            url: string;
            lang: string;
        }[] | undefined;
        usageContext?: string | undefined;
        category: "time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common";
        sortOrder: number;
        sourceText: string;
        sourceLang: string;
        translations: {
            pinyin?: string | undefined;
            pronunciation?: string | undefined;
            text: string;
            lang: string;
        }[];
        isOfflineAvailable: boolean;
    }, {
        category: import("convex/values").VUnion<"time" | "emergency" | "dining" | "shopping" | "accommodation" | "transportation" | "greeting" | "directions" | "numbers" | "common", [import("convex/values").VLiteral<"greeting", "required">, import("convex/values").VLiteral<"transportation", "required">, import("convex/values").VLiteral<"dining", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"accommodation", "required">, import("convex/values").VLiteral<"emergency", "required">, import("convex/values").VLiteral<"directions", "required">, import("convex/values").VLiteral<"numbers", "required">, import("convex/values").VLiteral<"time", "required">, import("convex/values").VLiteral<"common", "required">], "required", never>;
        sourceText: import("convex/values").VString<string, "required">;
        sourceLang: import("convex/values").VString<string, "required">;
        translations: import("convex/values").VArray<{
            pinyin?: string | undefined;
            pronunciation?: string | undefined;
            text: string;
            lang: string;
        }[], import("convex/values").VObject<{
            pinyin?: string | undefined;
            pronunciation?: string | undefined;
            text: string;
            lang: string;
        }, {
            lang: import("convex/values").VString<string, "required">;
            text: import("convex/values").VString<string, "required">;
            pinyin: import("convex/values").VString<string | undefined, "optional">;
            pronunciation: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "text" | "lang" | "pinyin" | "pronunciation">, "required">;
        audioUrls: import("convex/values").VArray<{
            url: string;
            lang: string;
        }[] | undefined, import("convex/values").VObject<{
            url: string;
            lang: string;
        }, {
            lang: import("convex/values").VString<string, "required">;
            url: import("convex/values").VString<string, "required">;
        }, "required", "url" | "lang">, "optional">;
        usageContext: import("convex/values").VString<string | undefined, "optional">;
        sortOrder: import("convex/values").VFloat64<number, "required">;
        isOfflineAvailable: import("convex/values").VBoolean<boolean, "required">;
    }, "required", "category" | "sortOrder" | "sourceText" | "sourceLang" | "translations" | "audioUrls" | "usageContext" | "isOfflineAvailable">, {
        by_category: ["category", "_creationTime"];
        by_source_lang: ["sourceLang", "_creationTime"];
        by_category_lang: ["category", "sourceLang", "_creationTime"];
    }, {
        search_phrases: {
            searchField: "sourceText";
            filterFields: "category" | "sourceLang";
        };
    }, {}>;
    savedTranslations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        imageUrl?: string | undefined;
        audioUrl?: string | undefined;
        createdAt: number;
        targetLang: string;
        userId: string;
        lastUsedAt: number;
        usageCount: number;
        sourceText: string;
        sourceLang: string;
        targetText: string;
        translationType: "text" | "photo" | "voice";
        isFavorite: boolean;
    }, {
        userId: import("convex/values").VString<string, "required">;
        sourceText: import("convex/values").VString<string, "required">;
        sourceLang: import("convex/values").VString<string, "required">;
        targetText: import("convex/values").VString<string, "required">;
        targetLang: import("convex/values").VString<string, "required">;
        translationType: import("convex/values").VUnion<"text" | "photo" | "voice", [import("convex/values").VLiteral<"text", "required">, import("convex/values").VLiteral<"photo", "required">, import("convex/values").VLiteral<"voice", "required">], "required", never>;
        imageUrl: import("convex/values").VString<string | undefined, "optional">;
        audioUrl: import("convex/values").VString<string | undefined, "optional">;
        isFavorite: import("convex/values").VBoolean<boolean, "required">;
        usageCount: import("convex/values").VFloat64<number, "required">;
        lastUsedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "createdAt" | "targetLang" | "userId" | "notes" | "lastUsedAt" | "imageUrl" | "usageCount" | "sourceText" | "sourceLang" | "targetText" | "translationType" | "audioUrl" | "isFavorite">, {
        by_user: ["userId", "_creationTime"];
        by_user_type: ["userId", "translationType", "_creationTime"];
        by_user_favorite: ["userId", "isFavorite", "_creationTime"];
        by_user_last_used: ["userId", "lastUsedAt", "_creationTime"];
    }, {
        search_saved: {
            searchField: "sourceText";
            filterFields: "userId";
        };
    }, {}>;
    offlineTranslationPacks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        name: string;
        version: string;
        description: string;
        targetLang: string;
        updatedAt: number;
        isActive: boolean;
        sourceLang: string;
        phraseCount: number;
        downloadSize: number;
        downloadUrl: string;
        categories: string[];
    }, {
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string, "required">;
        sourceLang: import("convex/values").VString<string, "required">;
        targetLang: import("convex/values").VString<string, "required">;
        version: import("convex/values").VString<string, "required">;
        phraseCount: import("convex/values").VFloat64<number, "required">;
        downloadSize: import("convex/values").VFloat64<number, "required">;
        downloadUrl: import("convex/values").VString<string, "required">;
        categories: import("convex/values").VArray<string[], import("convex/values").VString<string, "required">, "required">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "version" | "description" | "targetLang" | "updatedAt" | "isActive" | "sourceLang" | "phraseCount" | "downloadSize" | "downloadUrl" | "categories">, {
        by_source_lang: ["sourceLang", "_creationTime"];
        by_target_lang: ["targetLang", "_creationTime"];
        by_lang_pair: ["sourceLang", "targetLang", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
    }, {}, {}>;
    userOfflinePacks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: string;
        lastSyncedAt: number;
        packId: import("convex/values").GenericId<"offlineTranslationPacks">;
        downloadedVersion: string;
        downloadedAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        packId: import("convex/values").VId<import("convex/values").GenericId<"offlineTranslationPacks">, "required">;
        downloadedVersion: import("convex/values").VString<string, "required">;
        downloadedAt: import("convex/values").VFloat64<number, "required">;
        lastSyncedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "lastSyncedAt" | "packId" | "downloadedVersion" | "downloadedAt">, {
        by_user: ["userId", "_creationTime"];
        by_pack: ["packId", "_creationTime"];
        by_user_pack: ["userId", "packId", "_creationTime"];
    }, {}, {}>;
    poiPhotos: import("convex/server").TableDefinition<import("convex/values").VObject<{
        updatedAt?: number | undefined;
        category?: "other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined;
        moderatorNotes?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        location?: {
            latitude: number;
            longitude: number;
        } | undefined;
        caption?: string | undefined;
        userName?: string | undefined;
        userAvatarUrl?: string | undefined;
        thumbnailUrl?: string | undefined;
        width?: number | undefined;
        height?: number | undefined;
        takenAt?: number | undefined;
        featuredAt?: number | undefined;
        featuredBy?: string | undefined;
        status: "approved" | "rejected" | "hidden" | "pending";
        createdAt: number;
        likesCount: number;
        viewsCount: number;
        userId: string;
        poiId: import("convex/values").GenericId<"pois">;
        imageUrl: string;
        isFeatured: boolean;
    }, {
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        userId: import("convex/values").VString<string, "required">;
        userName: import("convex/values").VString<string | undefined, "optional">;
        userAvatarUrl: import("convex/values").VString<string | undefined, "optional">;
        imageUrl: import("convex/values").VString<string, "required">;
        thumbnailUrl: import("convex/values").VString<string | undefined, "optional">;
        caption: import("convex/values").VString<string | undefined, "optional">;
        width: import("convex/values").VFloat64<number | undefined, "optional">;
        height: import("convex/values").VFloat64<number | undefined, "optional">;
        category: import("convex/values").VUnion<"other" | "activity" | "food" | "interior" | "exterior" | "scenery" | "detail" | undefined, [import("convex/values").VLiteral<"interior", "required">, import("convex/values").VLiteral<"exterior", "required">, import("convex/values").VLiteral<"food", "required">, import("convex/values").VLiteral<"scenery", "required">, import("convex/values").VLiteral<"activity", "required">, import("convex/values").VLiteral<"detail", "required">, import("convex/values").VLiteral<"other", "required">], "optional", never>;
        takenAt: import("convex/values").VFloat64<number | undefined, "optional">;
        location: import("convex/values").VObject<{
            latitude: number;
            longitude: number;
        } | undefined, {
            latitude: import("convex/values").VFloat64<number, "required">;
            longitude: import("convex/values").VFloat64<number, "required">;
        }, "optional", "latitude" | "longitude">;
        likesCount: import("convex/values").VFloat64<number, "required">;
        viewsCount: import("convex/values").VFloat64<number, "required">;
        isFeatured: import("convex/values").VBoolean<boolean, "required">;
        featuredAt: import("convex/values").VFloat64<number | undefined, "optional">;
        featuredBy: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"approved" | "rejected" | "hidden" | "pending", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"rejected", "required">, import("convex/values").VLiteral<"hidden", "required">], "required", never>;
        moderatorNotes: import("convex/values").VString<string | undefined, "optional">;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
        reviewedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "status" | "createdAt" | "likesCount" | "viewsCount" | "userId" | "updatedAt" | "category" | "moderatorNotes" | "reviewedBy" | "reviewedAt" | "poiId" | "location" | "caption" | "imageUrl" | "userName" | "userAvatarUrl" | "thumbnailUrl" | "width" | "height" | "takenAt" | "isFeatured" | "featuredAt" | "featuredBy" | "location.latitude" | "location.longitude">, {
        by_poi: ["poiId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_poi_status: ["poiId", "status", "_creationTime"];
        by_poi_featured: ["poiId", "isFeatured", "_creationTime"];
        by_poi_category: ["poiId", "category", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_featured: ["isFeatured", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_poi_created: ["poiId", "createdAt", "_creationTime"];
        by_user_created: ["userId", "createdAt", "_creationTime"];
    }, {}, {}>;
    poiPhotoLikes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        photoId: import("convex/values").GenericId<"poiPhotos">;
    }, {
        photoId: import("convex/values").VId<import("convex/values").GenericId<"poiPhotos">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "photoId">, {
        by_photo: ["photoId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_photo_user: ["photoId", "userId", "_creationTime"];
    }, {}, {}>;
    flights: import("convex/server").TableDefinition<import("convex/values").VObject<{
        duration?: number | undefined;
        distance?: number | undefined;
        departureAirportName?: string | undefined;
        departureCity?: string | undefined;
        departureTerminal?: string | undefined;
        departureGate?: string | undefined;
        arrivalAirportName?: string | undefined;
        arrivalCity?: string | undefined;
        arrivalTerminal?: string | undefined;
        arrivalGate?: string | undefined;
        estimatedDeparture?: number | undefined;
        estimatedArrival?: number | undefined;
        actualDeparture?: number | undefined;
        actualArrival?: number | undefined;
        aircraftType?: string | undefined;
        codeshares?: string[] | undefined;
        delayReason?: string | undefined;
        status: "cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted";
        lastUpdated: number;
        flightNumber: string;
        airline: string;
        airlineCode: string;
        departureAirport: string;
        arrivalAirport: string;
        departureDate: string;
        scheduledDeparture: number;
        scheduledArrival: number;
    }, {
        flightNumber: import("convex/values").VString<string, "required">;
        airline: import("convex/values").VString<string, "required">;
        airlineCode: import("convex/values").VString<string, "required">;
        departureAirport: import("convex/values").VString<string, "required">;
        departureAirportName: import("convex/values").VString<string | undefined, "optional">;
        departureCity: import("convex/values").VString<string | undefined, "optional">;
        departureTerminal: import("convex/values").VString<string | undefined, "optional">;
        departureGate: import("convex/values").VString<string | undefined, "optional">;
        arrivalAirport: import("convex/values").VString<string, "required">;
        arrivalAirportName: import("convex/values").VString<string | undefined, "optional">;
        arrivalCity: import("convex/values").VString<string | undefined, "optional">;
        arrivalTerminal: import("convex/values").VString<string | undefined, "optional">;
        arrivalGate: import("convex/values").VString<string | undefined, "optional">;
        departureDate: import("convex/values").VString<string, "required">;
        scheduledDeparture: import("convex/values").VFloat64<number, "required">;
        scheduledArrival: import("convex/values").VFloat64<number, "required">;
        estimatedDeparture: import("convex/values").VFloat64<number | undefined, "optional">;
        estimatedArrival: import("convex/values").VFloat64<number | undefined, "optional">;
        actualDeparture: import("convex/values").VFloat64<number | undefined, "optional">;
        actualArrival: import("convex/values").VFloat64<number | undefined, "optional">;
        status: import("convex/values").VUnion<"cancelled" | "scheduled" | "delayed" | "boarding" | "departed" | "in_air" | "landed" | "arrived" | "diverted", [import("convex/values").VLiteral<"scheduled", "required">, import("convex/values").VLiteral<"delayed", "required">, import("convex/values").VLiteral<"boarding", "required">, import("convex/values").VLiteral<"departed", "required">, import("convex/values").VLiteral<"in_air", "required">, import("convex/values").VLiteral<"landed", "required">, import("convex/values").VLiteral<"arrived", "required">, import("convex/values").VLiteral<"cancelled", "required">, import("convex/values").VLiteral<"diverted", "required">], "required", never>;
        aircraftType: import("convex/values").VString<string | undefined, "optional">;
        duration: import("convex/values").VFloat64<number | undefined, "optional">;
        distance: import("convex/values").VFloat64<number | undefined, "optional">;
        codeshares: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        delayReason: import("convex/values").VString<string | undefined, "optional">;
        lastUpdated: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "duration" | "distance" | "lastUpdated" | "flightNumber" | "airline" | "airlineCode" | "departureAirport" | "departureAirportName" | "departureCity" | "departureTerminal" | "departureGate" | "arrivalAirport" | "arrivalAirportName" | "arrivalCity" | "arrivalTerminal" | "arrivalGate" | "departureDate" | "scheduledDeparture" | "scheduledArrival" | "estimatedDeparture" | "estimatedArrival" | "actualDeparture" | "actualArrival" | "aircraftType" | "codeshares" | "delayReason">, {
        by_flight_number: ["flightNumber", "_creationTime"];
        by_flight_number_date: ["flightNumber", "departureDate", "_creationTime"];
        by_route: ["departureAirport", "arrivalAirport", "_creationTime"];
        by_departure_date: ["departureDate", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    flightBookings: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        checkInTime?: number | undefined;
        rawEmailContent?: string | undefined;
        passengerEmail?: string | undefined;
        passengerPhone?: string | undefined;
        seatNumber?: string | undefined;
        ticketNumber?: string | undefined;
        mealPreference?: string | undefined;
        specialRequests?: string | undefined;
        baggageAllowance?: string | undefined;
        frequentFlyerNumber?: string | undefined;
        importedFrom?: string | undefined;
        status: "completed" | "cancelled" | "pending" | "confirmed" | "checked_in" | "boarded";
        createdAt: number;
        userId: string;
        updatedAt: number;
        flightId: import("convex/values").GenericId<"flights">;
        confirmationCode: string;
        passengerName: string;
        cabinClass: "business" | "economy" | "premium_economy" | "first";
        departureTime: number;
        arrivalTime: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        flightId: import("convex/values").VId<import("convex/values").GenericId<"flights">, "required">;
        confirmationCode: import("convex/values").VString<string, "required">;
        passengerName: import("convex/values").VString<string, "required">;
        passengerEmail: import("convex/values").VString<string | undefined, "optional">;
        passengerPhone: import("convex/values").VString<string | undefined, "optional">;
        seatNumber: import("convex/values").VString<string | undefined, "optional">;
        cabinClass: import("convex/values").VUnion<"business" | "economy" | "premium_economy" | "first", [import("convex/values").VLiteral<"economy", "required">, import("convex/values").VLiteral<"premium_economy", "required">, import("convex/values").VLiteral<"business", "required">, import("convex/values").VLiteral<"first", "required">], "required", never>;
        status: import("convex/values").VUnion<"completed" | "cancelled" | "pending" | "confirmed" | "checked_in" | "boarded", [import("convex/values").VLiteral<"confirmed", "required">, import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"cancelled", "required">, import("convex/values").VLiteral<"checked_in", "required">, import("convex/values").VLiteral<"boarded", "required">, import("convex/values").VLiteral<"completed", "required">], "required", never>;
        departureTime: import("convex/values").VFloat64<number, "required">;
        arrivalTime: import("convex/values").VFloat64<number, "required">;
        ticketNumber: import("convex/values").VString<string | undefined, "optional">;
        mealPreference: import("convex/values").VString<string | undefined, "optional">;
        specialRequests: import("convex/values").VString<string | undefined, "optional">;
        baggageAllowance: import("convex/values").VString<string | undefined, "optional">;
        frequentFlyerNumber: import("convex/values").VString<string | undefined, "optional">;
        checkInTime: import("convex/values").VFloat64<number | undefined, "optional">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        importedFrom: import("convex/values").VString<string | undefined, "optional">;
        rawEmailContent: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "userId" | "updatedAt" | "notes" | "itineraryId" | "checkInTime" | "rawEmailContent" | "flightId" | "confirmationCode" | "passengerName" | "passengerEmail" | "passengerPhone" | "seatNumber" | "cabinClass" | "departureTime" | "arrivalTime" | "ticketNumber" | "mealPreference" | "specialRequests" | "baggageAllowance" | "frequentFlyerNumber" | "importedFrom">, {
        by_user: ["userId", "_creationTime"];
        by_user_departure: ["userId", "departureTime", "_creationTime"];
        by_confirmation: ["confirmationCode", "_creationTime"];
        by_flight: ["flightId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    visaRequirements: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceUrl?: string | undefined;
        verifiedBy?: string | undefined;
        serviceFee?: number | undefined;
        originCountryNameEn?: string | undefined;
        destinationCountryNameEn?: string | undefined;
        visaTypeNameEn?: string | undefined;
        maxStayDays?: number | undefined;
        validityPeriod?: string | undefined;
        entryType?: "single" | "multiple" | "dual" | undefined;
        processingTime?: string | undefined;
        processingTimeMin?: number | undefined;
        processingTimeMax?: number | undefined;
        expressFee?: number | undefined;
        expressProcessingTime?: string | undefined;
        visaFee?: number | undefined;
        visaFeeCurrency?: string | undefined;
        entryRequirements?: {
            travelInsurance?: boolean | undefined;
            passportValidity?: string | undefined;
            blankPages?: number | undefined;
            onwardTicket?: boolean | undefined;
            hotelBooking?: boolean | undefined;
            financialProof?: string | undefined;
            invitationLetter?: boolean | undefined;
            returnTicket?: boolean | undefined;
            additionalRequirements?: string[] | undefined;
        } | undefined;
        specialNotes?: string[] | undefined;
        warnings?: string[] | undefined;
        eVisaUrl?: string | undefined;
        eVisaProcessingDays?: number | undefined;
        voaPorts?: string[] | undefined;
        voaFee?: number | undefined;
        voaFeeCurrency?: string | undefined;
        createdAt: number;
        updatedAt: number;
        source: string;
        requiredDocuments: {
            description?: string | undefined;
            nameEn?: string | undefined;
            notes?: string | undefined;
            name: string;
            isRequired: boolean;
        }[];
        lastVerifiedAt: number;
        originCountryCode: string;
        originCountryName: string;
        destinationCountryCode: string;
        destinationCountryName: string;
        visaType: "visa_free" | "visa_on_arrival" | "e_visa" | "standard_visa" | "transit_visa" | "work_visa" | "student_visa" | "business_visa";
        visaTypeName: string;
        difficultyLevel: "moderate" | "very_easy" | "easy" | "difficult" | "very_difficult";
        applicationMethods: {
            url?: string | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            nameEn?: string | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            method: "online" | "embassy" | "consulate" | "visa_center" | "on_arrival";
            name: string;
        }[];
    }, {
        originCountryCode: import("convex/values").VString<string, "required">;
        originCountryName: import("convex/values").VString<string, "required">;
        originCountryNameEn: import("convex/values").VString<string | undefined, "optional">;
        destinationCountryCode: import("convex/values").VString<string, "required">;
        destinationCountryName: import("convex/values").VString<string, "required">;
        destinationCountryNameEn: import("convex/values").VString<string | undefined, "optional">;
        visaType: import("convex/values").VUnion<"visa_free" | "visa_on_arrival" | "e_visa" | "standard_visa" | "transit_visa" | "work_visa" | "student_visa" | "business_visa", [import("convex/values").VLiteral<"visa_free", "required">, import("convex/values").VLiteral<"visa_on_arrival", "required">, import("convex/values").VLiteral<"e_visa", "required">, import("convex/values").VLiteral<"standard_visa", "required">, import("convex/values").VLiteral<"transit_visa", "required">, import("convex/values").VLiteral<"work_visa", "required">, import("convex/values").VLiteral<"student_visa", "required">, import("convex/values").VLiteral<"business_visa", "required">], "required", never>;
        visaTypeName: import("convex/values").VString<string, "required">;
        visaTypeNameEn: import("convex/values").VString<string | undefined, "optional">;
        difficultyLevel: import("convex/values").VUnion<"moderate" | "very_easy" | "easy" | "difficult" | "very_difficult", [import("convex/values").VLiteral<"very_easy", "required">, import("convex/values").VLiteral<"easy", "required">, import("convex/values").VLiteral<"moderate", "required">, import("convex/values").VLiteral<"difficult", "required">, import("convex/values").VLiteral<"very_difficult", "required">], "required", never>;
        maxStayDays: import("convex/values").VFloat64<number | undefined, "optional">;
        validityPeriod: import("convex/values").VString<string | undefined, "optional">;
        entryType: import("convex/values").VUnion<"single" | "multiple" | "dual" | undefined, [import("convex/values").VLiteral<"single", "required">, import("convex/values").VLiteral<"multiple", "required">, import("convex/values").VLiteral<"dual", "required">], "optional", never>;
        processingTime: import("convex/values").VString<string | undefined, "optional">;
        processingTimeMin: import("convex/values").VFloat64<number | undefined, "optional">;
        processingTimeMax: import("convex/values").VFloat64<number | undefined, "optional">;
        expressFee: import("convex/values").VFloat64<number | undefined, "optional">;
        expressProcessingTime: import("convex/values").VString<string | undefined, "optional">;
        visaFee: import("convex/values").VFloat64<number | undefined, "optional">;
        visaFeeCurrency: import("convex/values").VString<string | undefined, "optional">;
        serviceFee: import("convex/values").VFloat64<number | undefined, "optional">;
        requiredDocuments: import("convex/values").VArray<{
            description?: string | undefined;
            nameEn?: string | undefined;
            notes?: string | undefined;
            name: string;
            isRequired: boolean;
        }[], import("convex/values").VObject<{
            description?: string | undefined;
            nameEn?: string | undefined;
            notes?: string | undefined;
            name: string;
            isRequired: boolean;
        }, {
            name: import("convex/values").VString<string, "required">;
            nameEn: import("convex/values").VString<string | undefined, "optional">;
            description: import("convex/values").VString<string | undefined, "optional">;
            isRequired: import("convex/values").VBoolean<boolean, "required">;
            notes: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "name" | "description" | "nameEn" | "notes" | "isRequired">, "required">;
        applicationMethods: import("convex/values").VArray<{
            url?: string | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            nameEn?: string | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            method: "online" | "embassy" | "consulate" | "visa_center" | "on_arrival";
            name: string;
        }[], import("convex/values").VObject<{
            url?: string | undefined;
            email?: string | undefined;
            phone?: string | undefined;
            nameEn?: string | undefined;
            address?: string | undefined;
            notes?: string | undefined;
            method: "online" | "embassy" | "consulate" | "visa_center" | "on_arrival";
            name: string;
        }, {
            method: import("convex/values").VUnion<"online" | "embassy" | "consulate" | "visa_center" | "on_arrival", [import("convex/values").VLiteral<"online", "required">, import("convex/values").VLiteral<"embassy", "required">, import("convex/values").VLiteral<"consulate", "required">, import("convex/values").VLiteral<"visa_center", "required">, import("convex/values").VLiteral<"on_arrival", "required">], "required", never>;
            name: import("convex/values").VString<string, "required">;
            nameEn: import("convex/values").VString<string | undefined, "optional">;
            url: import("convex/values").VString<string | undefined, "optional">;
            address: import("convex/values").VString<string | undefined, "optional">;
            phone: import("convex/values").VString<string | undefined, "optional">;
            email: import("convex/values").VString<string | undefined, "optional">;
            notes: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "method" | "name" | "url" | "email" | "phone" | "nameEn" | "address" | "notes">, "required">;
        entryRequirements: import("convex/values").VObject<{
            travelInsurance?: boolean | undefined;
            passportValidity?: string | undefined;
            blankPages?: number | undefined;
            onwardTicket?: boolean | undefined;
            hotelBooking?: boolean | undefined;
            financialProof?: string | undefined;
            invitationLetter?: boolean | undefined;
            returnTicket?: boolean | undefined;
            additionalRequirements?: string[] | undefined;
        } | undefined, {
            passportValidity: import("convex/values").VString<string | undefined, "optional">;
            blankPages: import("convex/values").VFloat64<number | undefined, "optional">;
            onwardTicket: import("convex/values").VBoolean<boolean | undefined, "optional">;
            hotelBooking: import("convex/values").VBoolean<boolean | undefined, "optional">;
            financialProof: import("convex/values").VString<string | undefined, "optional">;
            invitationLetter: import("convex/values").VBoolean<boolean | undefined, "optional">;
            travelInsurance: import("convex/values").VBoolean<boolean | undefined, "optional">;
            returnTicket: import("convex/values").VBoolean<boolean | undefined, "optional">;
            additionalRequirements: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        }, "optional", "travelInsurance" | "passportValidity" | "blankPages" | "onwardTicket" | "hotelBooking" | "financialProof" | "invitationLetter" | "returnTicket" | "additionalRequirements">;
        specialNotes: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        warnings: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        eVisaUrl: import("convex/values").VString<string | undefined, "optional">;
        eVisaProcessingDays: import("convex/values").VFloat64<number | undefined, "optional">;
        voaPorts: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        voaFee: import("convex/values").VFloat64<number | undefined, "optional">;
        voaFeeCurrency: import("convex/values").VString<string | undefined, "optional">;
        source: import("convex/values").VString<string, "required">;
        sourceUrl: import("convex/values").VString<string | undefined, "optional">;
        verifiedBy: import("convex/values").VString<string | undefined, "optional">;
        lastVerifiedAt: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "sourceUrl" | "updatedAt" | "source" | "verifiedBy" | "requiredDocuments" | "lastVerifiedAt" | "serviceFee" | "originCountryCode" | "originCountryName" | "originCountryNameEn" | "destinationCountryCode" | "destinationCountryName" | "destinationCountryNameEn" | "visaType" | "visaTypeName" | "visaTypeNameEn" | "difficultyLevel" | "maxStayDays" | "validityPeriod" | "entryType" | "processingTime" | "processingTimeMin" | "processingTimeMax" | "expressFee" | "expressProcessingTime" | "visaFee" | "visaFeeCurrency" | "applicationMethods" | "entryRequirements" | "specialNotes" | "warnings" | "eVisaUrl" | "eVisaProcessingDays" | "voaPorts" | "voaFee" | "voaFeeCurrency" | "entryRequirements.travelInsurance" | "entryRequirements.passportValidity" | "entryRequirements.blankPages" | "entryRequirements.onwardTicket" | "entryRequirements.hotelBooking" | "entryRequirements.financialProof" | "entryRequirements.invitationLetter" | "entryRequirements.returnTicket" | "entryRequirements.additionalRequirements">, {
        by_origin: ["originCountryCode", "_creationTime"];
        by_destination: ["destinationCountryCode", "_creationTime"];
        by_origin_destination: ["originCountryCode", "destinationCountryCode", "_creationTime"];
        by_visa_type: ["visaType", "_creationTime"];
        by_difficulty: ["difficultyLevel", "_creationTime"];
    }, {}, {}>;
    userVisaReminders: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        sentAt?: number | undefined;
        visaRequirementId?: import("convex/values").GenericId<"visaRequirements"> | undefined;
        checklist?: {
            completedAt?: number | undefined;
            item: string;
            isCompleted: boolean;
        }[] | undefined;
        status: "completed" | "pending" | "dismissed" | "sent";
        createdAt: number;
        userId: string;
        updatedAt: number;
        travelDate: number;
        destinationCountryCode: string;
        destinationCountryName: string;
        visaType: "visa_free" | "visa_on_arrival" | "e_visa" | "standard_visa" | "transit_visa" | "work_visa" | "student_visa" | "business_visa";
        reminderDate: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        visaRequirementId: import("convex/values").VId<import("convex/values").GenericId<"visaRequirements"> | undefined, "optional">;
        destinationCountryCode: import("convex/values").VString<string, "required">;
        destinationCountryName: import("convex/values").VString<string, "required">;
        travelDate: import("convex/values").VFloat64<number, "required">;
        reminderDate: import("convex/values").VFloat64<number, "required">;
        visaType: import("convex/values").VUnion<"visa_free" | "visa_on_arrival" | "e_visa" | "standard_visa" | "transit_visa" | "work_visa" | "student_visa" | "business_visa", [import("convex/values").VLiteral<"visa_free", "required">, import("convex/values").VLiteral<"visa_on_arrival", "required">, import("convex/values").VLiteral<"e_visa", "required">, import("convex/values").VLiteral<"standard_visa", "required">, import("convex/values").VLiteral<"transit_visa", "required">, import("convex/values").VLiteral<"work_visa", "required">, import("convex/values").VLiteral<"student_visa", "required">, import("convex/values").VLiteral<"business_visa", "required">], "required", never>;
        status: import("convex/values").VUnion<"completed" | "pending" | "dismissed" | "sent", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"sent", "required">, import("convex/values").VLiteral<"dismissed", "required">, import("convex/values").VLiteral<"completed", "required">], "required", never>;
        notes: import("convex/values").VString<string | undefined, "optional">;
        checklist: import("convex/values").VArray<{
            completedAt?: number | undefined;
            item: string;
            isCompleted: boolean;
        }[] | undefined, import("convex/values").VObject<{
            completedAt?: number | undefined;
            item: string;
            isCompleted: boolean;
        }, {
            item: import("convex/values").VString<string, "required">;
            isCompleted: import("convex/values").VBoolean<boolean, "required">;
            completedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "required", "item" | "completedAt" | "isCompleted">, "optional">;
        sentAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "userId" | "updatedAt" | "notes" | "itineraryId" | "sentAt" | "travelDate" | "destinationCountryCode" | "destinationCountryName" | "visaType" | "visaRequirementId" | "reminderDate" | "checklist">, {
        by_user: ["userId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_reminder_date: ["reminderDate", "_creationTime"];
    }, {}, {}>;
    visaApplications: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        validFrom?: number | undefined;
        validUntil?: number | undefined;
        rejectionReason?: string | undefined;
        documents?: {
            notes?: string | undefined;
            status: "completed" | "not_started" | "in_progress";
            name: string;
        }[] | undefined;
        visaRequirementId?: import("convex/values").GenericId<"visaRequirements"> | undefined;
        applicationDate?: number | undefined;
        expectedResultDate?: number | undefined;
        resultDate?: number | undefined;
        applicationNumber?: string | undefined;
        visaNumber?: string | undefined;
        status: "cancelled" | "approved" | "rejected" | "processing" | "submitted" | "preparing";
        createdAt: number;
        userId: string;
        updatedAt: number;
        destinationCountryCode: string;
        destinationCountryName: string;
        visaType: "visa_free" | "visa_on_arrival" | "e_visa" | "standard_visa" | "transit_visa" | "work_visa" | "student_visa" | "business_visa";
        applicationMethod: "online" | "embassy" | "consulate" | "visa_center" | "on_arrival";
        plannedTravelDate: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        visaRequirementId: import("convex/values").VId<import("convex/values").GenericId<"visaRequirements"> | undefined, "optional">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        destinationCountryCode: import("convex/values").VString<string, "required">;
        destinationCountryName: import("convex/values").VString<string, "required">;
        visaType: import("convex/values").VUnion<"visa_free" | "visa_on_arrival" | "e_visa" | "standard_visa" | "transit_visa" | "work_visa" | "student_visa" | "business_visa", [import("convex/values").VLiteral<"visa_free", "required">, import("convex/values").VLiteral<"visa_on_arrival", "required">, import("convex/values").VLiteral<"e_visa", "required">, import("convex/values").VLiteral<"standard_visa", "required">, import("convex/values").VLiteral<"transit_visa", "required">, import("convex/values").VLiteral<"work_visa", "required">, import("convex/values").VLiteral<"student_visa", "required">, import("convex/values").VLiteral<"business_visa", "required">], "required", never>;
        applicationMethod: import("convex/values").VUnion<"online" | "embassy" | "consulate" | "visa_center" | "on_arrival", [import("convex/values").VLiteral<"online", "required">, import("convex/values").VLiteral<"embassy", "required">, import("convex/values").VLiteral<"consulate", "required">, import("convex/values").VLiteral<"visa_center", "required">, import("convex/values").VLiteral<"on_arrival", "required">], "required", never>;
        plannedTravelDate: import("convex/values").VFloat64<number, "required">;
        applicationDate: import("convex/values").VFloat64<number | undefined, "optional">;
        expectedResultDate: import("convex/values").VFloat64<number | undefined, "optional">;
        resultDate: import("convex/values").VFloat64<number | undefined, "optional">;
        applicationNumber: import("convex/values").VString<string | undefined, "optional">;
        visaNumber: import("convex/values").VString<string | undefined, "optional">;
        validFrom: import("convex/values").VFloat64<number | undefined, "optional">;
        validUntil: import("convex/values").VFloat64<number | undefined, "optional">;
        status: import("convex/values").VUnion<"cancelled" | "approved" | "rejected" | "processing" | "submitted" | "preparing", [import("convex/values").VLiteral<"preparing", "required">, import("convex/values").VLiteral<"submitted", "required">, import("convex/values").VLiteral<"processing", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"rejected", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        documents: import("convex/values").VArray<{
            notes?: string | undefined;
            status: "completed" | "not_started" | "in_progress";
            name: string;
        }[] | undefined, import("convex/values").VObject<{
            notes?: string | undefined;
            status: "completed" | "not_started" | "in_progress";
            name: string;
        }, {
            name: import("convex/values").VString<string, "required">;
            status: import("convex/values").VUnion<"completed" | "not_started" | "in_progress", [import("convex/values").VLiteral<"not_started", "required">, import("convex/values").VLiteral<"in_progress", "required">, import("convex/values").VLiteral<"completed", "required">], "required", never>;
            notes: import("convex/values").VString<string | undefined, "optional">;
        }, "required", "status" | "name" | "notes">, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        rejectionReason: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "userId" | "updatedAt" | "notes" | "itineraryId" | "validFrom" | "validUntil" | "rejectionReason" | "documents" | "destinationCountryCode" | "destinationCountryName" | "visaType" | "visaRequirementId" | "applicationMethod" | "plannedTravelDate" | "applicationDate" | "expectedResultDate" | "resultDate" | "applicationNumber" | "visaNumber">, {
        by_user: ["userId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_destination: ["destinationCountryCode", "_creationTime"];
    }, {}, {}>;
    visaCenters: import("convex/server").TableDefinition<import("convex/values").VObject<{
        email?: string | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        services?: string[] | undefined;
        phone?: string | undefined;
        nameEn?: string | undefined;
        businessHours?: {
            monday?: string | undefined;
            tuesday?: string | undefined;
            wednesday?: string | undefined;
            thursday?: string | undefined;
            friday?: string | undefined;
            saturday?: string | undefined;
            sunday?: string | undefined;
            notes?: string | undefined;
        } | undefined;
        website?: string | undefined;
        cityEn?: string | undefined;
        targetCountryNameEn?: string | undefined;
        addressEn?: string | undefined;
        appointmentUrl?: string | undefined;
        createdAt: number;
        name: string;
        type: "embassy" | "consulate" | "visa_center" | "agency";
        city: string;
        updatedAt: number;
        countryCode: string;
        address: string;
        isActive: boolean;
        targetCountryCode: string;
        targetCountryName: string;
        appointmentRequired: boolean;
    }, {
        countryCode: import("convex/values").VString<string, "required">;
        city: import("convex/values").VString<string, "required">;
        cityEn: import("convex/values").VString<string | undefined, "optional">;
        targetCountryCode: import("convex/values").VString<string, "required">;
        targetCountryName: import("convex/values").VString<string, "required">;
        targetCountryNameEn: import("convex/values").VString<string | undefined, "optional">;
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        type: import("convex/values").VUnion<"embassy" | "consulate" | "visa_center" | "agency", [import("convex/values").VLiteral<"embassy", "required">, import("convex/values").VLiteral<"consulate", "required">, import("convex/values").VLiteral<"visa_center", "required">, import("convex/values").VLiteral<"agency", "required">], "required", never>;
        address: import("convex/values").VString<string, "required">;
        addressEn: import("convex/values").VString<string | undefined, "optional">;
        phone: import("convex/values").VString<string | undefined, "optional">;
        email: import("convex/values").VString<string | undefined, "optional">;
        website: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number | undefined, "optional">;
        longitude: import("convex/values").VFloat64<number | undefined, "optional">;
        businessHours: import("convex/values").VObject<{
            monday?: string | undefined;
            tuesday?: string | undefined;
            wednesday?: string | undefined;
            thursday?: string | undefined;
            friday?: string | undefined;
            saturday?: string | undefined;
            sunday?: string | undefined;
            notes?: string | undefined;
        } | undefined, {
            monday: import("convex/values").VString<string | undefined, "optional">;
            tuesday: import("convex/values").VString<string | undefined, "optional">;
            wednesday: import("convex/values").VString<string | undefined, "optional">;
            thursday: import("convex/values").VString<string | undefined, "optional">;
            friday: import("convex/values").VString<string | undefined, "optional">;
            saturday: import("convex/values").VString<string | undefined, "optional">;
            sunday: import("convex/values").VString<string | undefined, "optional">;
            notes: import("convex/values").VString<string | undefined, "optional">;
        }, "optional", "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday" | "notes">;
        services: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        appointmentRequired: import("convex/values").VBoolean<boolean, "required">;
        appointmentUrl: import("convex/values").VString<string | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "type" | "email" | "city" | "latitude" | "longitude" | "services" | "phone" | "updatedAt" | "nameEn" | "countryCode" | "address" | "businessHours" | "businessHours.monday" | "businessHours.tuesday" | "businessHours.wednesday" | "businessHours.thursday" | "businessHours.friday" | "businessHours.saturday" | "businessHours.sunday" | "businessHours.notes" | "isActive" | "website" | "cityEn" | "targetCountryCode" | "targetCountryName" | "targetCountryNameEn" | "addressEn" | "appointmentRequired" | "appointmentUrl">, {
        by_country: ["countryCode", "_creationTime"];
        by_target_country: ["targetCountryCode", "_creationTime"];
        by_country_target: ["countryCode", "targetCountryCode", "_creationTime"];
        by_city: ["city", "_creationTime"];
        by_type: ["type", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
    }, {}, {}>;
    shareLinks: import("convex/server").TableDefinition<import("convex/values").VObject<{
        password?: string | undefined;
        expiresAt?: number | undefined;
        maxViews?: number | undefined;
        lastAccessedAt?: number | undefined;
        createdAt: number;
        platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
        updatedAt: number;
        viewCount: number;
        isActive: boolean;
        shareCode: string;
        saveCount: number;
        resourceType: "itinerary" | "travelGuide" | "travelNote";
        resourceId: string;
        ownerId: string;
        shareUrl: string;
        permission: "public" | "private" | "password" | "unlisted";
        allowDownload: boolean;
        allowCopy: boolean;
        clickCount: number;
    }, {
        resourceType: import("convex/values").VUnion<"itinerary" | "travelGuide" | "travelNote", [import("convex/values").VLiteral<"itinerary", "required">, import("convex/values").VLiteral<"travelGuide", "required">, import("convex/values").VLiteral<"travelNote", "required">], "required", never>;
        resourceId: import("convex/values").VString<string, "required">;
        ownerId: import("convex/values").VString<string, "required">;
        shareCode: import("convex/values").VString<string, "required">;
        shareUrl: import("convex/values").VString<string, "required">;
        platform: import("convex/values").VUnion<"xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic", [import("convex/values").VLiteral<"wechat", "required">, import("convex/values").VLiteral<"weibo", "required">, import("convex/values").VLiteral<"xiaohongshu", "required">, import("convex/values").VLiteral<"qq", "required">, import("convex/values").VLiteral<"douyin", "required">, import("convex/values").VLiteral<"copy_link", "required">, import("convex/values").VLiteral<"system_share", "required">, import("convex/values").VLiteral<"generic", "required">], "required", never>;
        permission: import("convex/values").VUnion<"public" | "private" | "password" | "unlisted", [import("convex/values").VLiteral<"public", "required">, import("convex/values").VLiteral<"unlisted", "required">, import("convex/values").VLiteral<"private", "required">, import("convex/values").VLiteral<"password", "required">], "required", never>;
        password: import("convex/values").VString<string | undefined, "optional">;
        expiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
        maxViews: import("convex/values").VFloat64<number | undefined, "optional">;
        allowDownload: import("convex/values").VBoolean<boolean, "required">;
        allowCopy: import("convex/values").VBoolean<boolean, "required">;
        viewCount: import("convex/values").VFloat64<number, "required">;
        clickCount: import("convex/values").VFloat64<number, "required">;
        saveCount: import("convex/values").VFloat64<number, "required">;
        lastAccessedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        isActive: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "platform" | "updatedAt" | "viewCount" | "isActive" | "password" | "expiresAt" | "shareCode" | "saveCount" | "resourceType" | "resourceId" | "ownerId" | "shareUrl" | "permission" | "maxViews" | "allowDownload" | "allowCopy" | "clickCount" | "lastAccessedAt">, {
        by_share_code: ["shareCode", "_creationTime"];
        by_resource: ["resourceType", "resourceId", "_creationTime"];
        by_owner: ["ownerId", "_creationTime"];
        by_owner_resource: ["ownerId", "resourceType", "_creationTime"];
        by_active: ["isActive", "_creationTime"];
        by_expires: ["expiresAt", "_creationTime"];
    }, {}, {}>;
    shareEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        shareUrl?: string | undefined;
        sharerId?: string | undefined;
        shareLinkId?: import("convex/values").GenericId<"shareLinks"> | undefined;
        createdAt: number;
        platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
        resourceType: "itinerary" | "travelGuide" | "travelNote";
        resourceId: string;
        eventType: "click" | "share" | "view" | "save";
    }, {
        resourceType: import("convex/values").VUnion<"itinerary" | "travelGuide" | "travelNote", [import("convex/values").VLiteral<"itinerary", "required">, import("convex/values").VLiteral<"travelGuide", "required">, import("convex/values").VLiteral<"travelNote", "required">], "required", never>;
        resourceId: import("convex/values").VString<string, "required">;
        sharerId: import("convex/values").VString<string | undefined, "optional">;
        shareLinkId: import("convex/values").VId<import("convex/values").GenericId<"shareLinks"> | undefined, "optional">;
        platform: import("convex/values").VUnion<"xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic", [import("convex/values").VLiteral<"wechat", "required">, import("convex/values").VLiteral<"weibo", "required">, import("convex/values").VLiteral<"xiaohongshu", "required">, import("convex/values").VLiteral<"qq", "required">, import("convex/values").VLiteral<"douyin", "required">, import("convex/values").VLiteral<"copy_link", "required">, import("convex/values").VLiteral<"system_share", "required">, import("convex/values").VLiteral<"generic", "required">], "required", never>;
        eventType: import("convex/values").VUnion<"click" | "share" | "view" | "save", [import("convex/values").VLiteral<"share", "required">, import("convex/values").VLiteral<"click", "required">, import("convex/values").VLiteral<"view", "required">, import("convex/values").VLiteral<"save", "required">], "required", never>;
        shareUrl: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "platform" | "resourceType" | "resourceId" | "shareUrl" | "sharerId" | "shareLinkId" | "eventType">, {
        by_resource: ["resourceType", "resourceId", "_creationTime"];
        by_sharer: ["sharerId", "_creationTime"];
        by_platform: ["platform", "_creationTime"];
        by_event_type: ["eventType", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_share_link: ["shareLinkId", "_creationTime"];
    }, {}, {}>;
    shareEventLogs: import("convex/server").TableDefinition<import("convex/values").VObject<{
        shareLinkId?: import("convex/values").GenericId<"shareLinks"> | undefined;
        referrer?: string | undefined;
        userAgent?: string | undefined;
        ipHash?: string | undefined;
        createdAt: number;
        platform: "xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic";
        resourceType: "itinerary" | "travelGuide" | "travelNote";
        resourceId: string;
        eventType: "click" | "share" | "view" | "save";
    }, {
        shareLinkId: import("convex/values").VId<import("convex/values").GenericId<"shareLinks"> | undefined, "optional">;
        resourceType: import("convex/values").VUnion<"itinerary" | "travelGuide" | "travelNote", [import("convex/values").VLiteral<"itinerary", "required">, import("convex/values").VLiteral<"travelGuide", "required">, import("convex/values").VLiteral<"travelNote", "required">], "required", never>;
        resourceId: import("convex/values").VString<string, "required">;
        platform: import("convex/values").VUnion<"xiaohongshu" | "weibo" | "douyin" | "wechat" | "qq" | "copy_link" | "system_share" | "generic", [import("convex/values").VLiteral<"wechat", "required">, import("convex/values").VLiteral<"weibo", "required">, import("convex/values").VLiteral<"xiaohongshu", "required">, import("convex/values").VLiteral<"qq", "required">, import("convex/values").VLiteral<"douyin", "required">, import("convex/values").VLiteral<"copy_link", "required">, import("convex/values").VLiteral<"system_share", "required">, import("convex/values").VLiteral<"generic", "required">], "required", never>;
        eventType: import("convex/values").VUnion<"click" | "share" | "view" | "save", [import("convex/values").VLiteral<"share", "required">, import("convex/values").VLiteral<"click", "required">, import("convex/values").VLiteral<"view", "required">, import("convex/values").VLiteral<"save", "required">], "required", never>;
        referrer: import("convex/values").VString<string | undefined, "optional">;
        userAgent: import("convex/values").VString<string | undefined, "optional">;
        ipHash: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "platform" | "resourceType" | "resourceId" | "shareLinkId" | "eventType" | "referrer" | "userAgent" | "ipHash">, {
        by_share_link: ["shareLinkId", "_creationTime"];
        by_resource: ["resourceType", "resourceId", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_event_type: ["eventType", "_creationTime"];
    }, {}, {}>;
    luggage: import("convex/server").TableDefinition<import("convex/values").VObject<{
        itineraryId?: import("convex/values").GenericId<"itineraries"> | undefined;
        color?: string | undefined;
        reminderTime?: number | undefined;
        features?: string[] | undefined;
        airlineCode?: string | undefined;
        flightBookingId?: import("convex/values").GenericId<"flightBookings"> | undefined;
        tagNumber?: string | undefined;
        brand?: string | undefined;
        size?: "medium" | "cabin" | "large" | "oversized" | undefined;
        weight?: number | undefined;
        dimensions?: string | undefined;
        tagPhotoUrl?: string | undefined;
        luggagePhotoUrls?: string[] | undefined;
        lastKnownLocation?: string | undefined;
        lossReportFiled?: boolean | undefined;
        lossReportNumber?: string | undefined;
        lossReportDate?: number | undefined;
        lossReportNotes?: string | undefined;
        airlineName?: string | undefined;
        airlineTrackingUrl?: string | undefined;
        airlineContactPhone?: string | undefined;
        airlineContactEmail?: string | undefined;
        reminderEnabled?: boolean | undefined;
        status: "claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged";
        createdAt: number;
        description: string;
        userId: string;
        updatedAt: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        flightBookingId: import("convex/values").VId<import("convex/values").GenericId<"flightBookings"> | undefined, "optional">;
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries"> | undefined, "optional">;
        tagNumber: import("convex/values").VString<string | undefined, "optional">;
        description: import("convex/values").VString<string, "required">;
        color: import("convex/values").VString<string | undefined, "optional">;
        brand: import("convex/values").VString<string | undefined, "optional">;
        size: import("convex/values").VUnion<"medium" | "cabin" | "large" | "oversized" | undefined, [import("convex/values").VLiteral<"cabin", "required">, import("convex/values").VLiteral<"medium", "required">, import("convex/values").VLiteral<"large", "required">, import("convex/values").VLiteral<"oversized", "required">], "optional", never>;
        weight: import("convex/values").VFloat64<number | undefined, "optional">;
        dimensions: import("convex/values").VString<string | undefined, "optional">;
        features: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        tagPhotoUrl: import("convex/values").VString<string | undefined, "optional">;
        luggagePhotoUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        status: import("convex/values").VUnion<"claimed" | "delayed" | "arrived" | "checked_in" | "in_transit" | "lost" | "found" | "damaged", [import("convex/values").VLiteral<"checked_in", "required">, import("convex/values").VLiteral<"in_transit", "required">, import("convex/values").VLiteral<"arrived", "required">, import("convex/values").VLiteral<"claimed", "required">, import("convex/values").VLiteral<"delayed", "required">, import("convex/values").VLiteral<"lost", "required">, import("convex/values").VLiteral<"found", "required">, import("convex/values").VLiteral<"damaged", "required">], "required", never>;
        lastKnownLocation: import("convex/values").VString<string | undefined, "optional">;
        lossReportFiled: import("convex/values").VBoolean<boolean | undefined, "optional">;
        lossReportNumber: import("convex/values").VString<string | undefined, "optional">;
        lossReportDate: import("convex/values").VFloat64<number | undefined, "optional">;
        lossReportNotes: import("convex/values").VString<string | undefined, "optional">;
        airlineCode: import("convex/values").VString<string | undefined, "optional">;
        airlineName: import("convex/values").VString<string | undefined, "optional">;
        airlineTrackingUrl: import("convex/values").VString<string | undefined, "optional">;
        airlineContactPhone: import("convex/values").VString<string | undefined, "optional">;
        airlineContactEmail: import("convex/values").VString<string | undefined, "optional">;
        reminderEnabled: import("convex/values").VBoolean<boolean | undefined, "optional">;
        reminderTime: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "description" | "userId" | "updatedAt" | "itineraryId" | "color" | "reminderTime" | "features" | "airlineCode" | "flightBookingId" | "tagNumber" | "brand" | "size" | "weight" | "dimensions" | "tagPhotoUrl" | "luggagePhotoUrls" | "lastKnownLocation" | "lossReportFiled" | "lossReportNumber" | "lossReportDate" | "lossReportNotes" | "airlineName" | "airlineTrackingUrl" | "airlineContactPhone" | "airlineContactEmail" | "reminderEnabled">, {
        by_user: ["userId", "_creationTime"];
        by_user_status: ["userId", "status", "_creationTime"];
        by_flight_booking: ["flightBookingId", "_creationTime"];
        by_itinerary: ["itineraryId", "_creationTime"];
        by_tag_number: ["tagNumber", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    luggageLossReportTemplates: import("convex/server").TableDefinition<import("convex/values").VObject<{
        requiredDocuments?: string[] | undefined;
        airlineNameEn?: string | undefined;
        baggageServicePhone?: string | undefined;
        baggageServiceEmail?: string | undefined;
        baggageServiceUrl?: string | undefined;
        trackingUrl?: string | undefined;
        reportInstructions?: string | undefined;
        reportInstructionsEn?: string | undefined;
        compensationPolicy?: string | undefined;
        compensationPolicyEn?: string | undefined;
        maxCompensationAmount?: number | undefined;
        claimDeadlineDays?: number | undefined;
        createdAt: number;
        updatedAt: number;
        airlineCode: string;
        airlineName: string;
    }, {
        airlineCode: import("convex/values").VString<string, "required">;
        airlineName: import("convex/values").VString<string, "required">;
        airlineNameEn: import("convex/values").VString<string | undefined, "optional">;
        baggageServicePhone: import("convex/values").VString<string | undefined, "optional">;
        baggageServiceEmail: import("convex/values").VString<string | undefined, "optional">;
        baggageServiceUrl: import("convex/values").VString<string | undefined, "optional">;
        trackingUrl: import("convex/values").VString<string | undefined, "optional">;
        reportInstructions: import("convex/values").VString<string | undefined, "optional">;
        reportInstructionsEn: import("convex/values").VString<string | undefined, "optional">;
        requiredDocuments: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        compensationPolicy: import("convex/values").VString<string | undefined, "optional">;
        compensationPolicyEn: import("convex/values").VString<string | undefined, "optional">;
        maxCompensationAmount: import("convex/values").VFloat64<number | undefined, "optional">;
        claimDeadlineDays: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "updatedAt" | "requiredDocuments" | "airlineCode" | "airlineName" | "airlineNameEn" | "baggageServicePhone" | "baggageServiceEmail" | "baggageServiceUrl" | "trackingUrl" | "reportInstructions" | "reportInstructionsEn" | "compensationPolicy" | "compensationPolicyEn" | "maxCompensationAmount" | "claimDeadlineDays">, {
        by_airline_code: ["airlineCode", "_creationTime"];
    }, {}, {}>;
    localEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sourceUrl?: string | undefined;
        coverImageUrl?: string | undefined;
        imageUrls?: string[] | undefined;
        tags?: string[] | undefined;
        latitude?: number | undefined;
        longitude?: number | undefined;
        tips?: string[] | undefined;
        nameEn?: string | undefined;
        descriptionEn?: string | undefined;
        currency?: string | undefined;
        externalId?: string | undefined;
        rating?: number | undefined;
        ratingCount?: number | undefined;
        source?: string | undefined;
        startTime?: string | undefined;
        endTime?: string | undefined;
        highlights?: string[] | undefined;
        officialWebsite?: string | undefined;
        isFeatured?: boolean | undefined;
        venue?: string | undefined;
        venueAddress?: string | undefined;
        recurrencePattern?: {
            day?: number | undefined;
            month?: number | undefined;
            isLunarCalendar?: boolean | undefined;
            lunarMonth?: number | undefined;
            lunarDay?: number | undefined;
            weekOfMonth?: number | undefined;
            dayOfWeek?: number | undefined;
            type: "yearly" | "monthly" | "weekly";
        } | undefined;
        ticketPrice?: number | undefined;
        ticketPriceMax?: number | undefined;
        ticketUrl?: string | undefined;
        requiresBooking?: boolean | undefined;
        organizerName?: string | undefined;
        organizerPhone?: string | undefined;
        organizerEmail?: string | undefined;
        status: "cancelled" | "upcoming" | "ongoing" | "ended";
        createdAt: number;
        name: string;
        description: string;
        startDate: string;
        endDate: string;
        updatedAt: number;
        cityId: import("convex/values").GenericId<"cities">;
        viewCount: number;
        isRecurring: boolean;
        isVerified: boolean;
        isFree: boolean;
        saveCount: number;
        eventType: "other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom";
        isAllDay: boolean;
    }, {
        name: import("convex/values").VString<string, "required">;
        nameEn: import("convex/values").VString<string | undefined, "optional">;
        description: import("convex/values").VString<string, "required">;
        descriptionEn: import("convex/values").VString<string | undefined, "optional">;
        cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
        venue: import("convex/values").VString<string | undefined, "optional">;
        venueAddress: import("convex/values").VString<string | undefined, "optional">;
        latitude: import("convex/values").VFloat64<number | undefined, "optional">;
        longitude: import("convex/values").VFloat64<number | undefined, "optional">;
        eventType: import("convex/values").VUnion<"other" | "food" | "festival" | "concert" | "exhibition" | "sports" | "cultural" | "market" | "performance" | "religious" | "seasonal" | "local_custom", [import("convex/values").VLiteral<"festival", "required">, import("convex/values").VLiteral<"concert", "required">, import("convex/values").VLiteral<"exhibition", "required">, import("convex/values").VLiteral<"sports", "required">, import("convex/values").VLiteral<"food", "required">, import("convex/values").VLiteral<"cultural", "required">, import("convex/values").VLiteral<"market", "required">, import("convex/values").VLiteral<"performance", "required">, import("convex/values").VLiteral<"religious", "required">, import("convex/values").VLiteral<"seasonal", "required">, import("convex/values").VLiteral<"local_custom", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        startDate: import("convex/values").VString<string, "required">;
        endDate: import("convex/values").VString<string, "required">;
        startTime: import("convex/values").VString<string | undefined, "optional">;
        endTime: import("convex/values").VString<string | undefined, "optional">;
        isAllDay: import("convex/values").VBoolean<boolean, "required">;
        isRecurring: import("convex/values").VBoolean<boolean, "required">;
        recurrencePattern: import("convex/values").VObject<{
            day?: number | undefined;
            month?: number | undefined;
            isLunarCalendar?: boolean | undefined;
            lunarMonth?: number | undefined;
            lunarDay?: number | undefined;
            weekOfMonth?: number | undefined;
            dayOfWeek?: number | undefined;
            type: "yearly" | "monthly" | "weekly";
        } | undefined, {
            type: import("convex/values").VUnion<"yearly" | "monthly" | "weekly", [import("convex/values").VLiteral<"yearly", "required">, import("convex/values").VLiteral<"monthly", "required">, import("convex/values").VLiteral<"weekly", "required">], "required", never>;
            isLunarCalendar: import("convex/values").VBoolean<boolean | undefined, "optional">;
            lunarMonth: import("convex/values").VFloat64<number | undefined, "optional">;
            lunarDay: import("convex/values").VFloat64<number | undefined, "optional">;
            month: import("convex/values").VFloat64<number | undefined, "optional">;
            day: import("convex/values").VFloat64<number | undefined, "optional">;
            weekOfMonth: import("convex/values").VFloat64<number | undefined, "optional">;
            dayOfWeek: import("convex/values").VFloat64<number | undefined, "optional">;
        }, "optional", "type" | "day" | "month" | "isLunarCalendar" | "lunarMonth" | "lunarDay" | "weekOfMonth" | "dayOfWeek">;
        isFree: import("convex/values").VBoolean<boolean, "required">;
        ticketPrice: import("convex/values").VFloat64<number | undefined, "optional">;
        ticketPriceMax: import("convex/values").VFloat64<number | undefined, "optional">;
        currency: import("convex/values").VString<string | undefined, "optional">;
        ticketUrl: import("convex/values").VString<string | undefined, "optional">;
        requiresBooking: import("convex/values").VBoolean<boolean | undefined, "optional">;
        coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        highlights: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        tips: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        tags: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        organizerName: import("convex/values").VString<string | undefined, "optional">;
        organizerPhone: import("convex/values").VString<string | undefined, "optional">;
        organizerEmail: import("convex/values").VString<string | undefined, "optional">;
        officialWebsite: import("convex/values").VString<string | undefined, "optional">;
        viewCount: import("convex/values").VFloat64<number, "required">;
        saveCount: import("convex/values").VFloat64<number, "required">;
        rating: import("convex/values").VFloat64<number | undefined, "optional">;
        ratingCount: import("convex/values").VFloat64<number | undefined, "optional">;
        status: import("convex/values").VUnion<"cancelled" | "upcoming" | "ongoing" | "ended", [import("convex/values").VLiteral<"upcoming", "required">, import("convex/values").VLiteral<"ongoing", "required">, import("convex/values").VLiteral<"ended", "required">, import("convex/values").VLiteral<"cancelled", "required">], "required", never>;
        isVerified: import("convex/values").VBoolean<boolean, "required">;
        isFeatured: import("convex/values").VBoolean<boolean | undefined, "optional">;
        source: import("convex/values").VString<string | undefined, "optional">;
        sourceUrl: import("convex/values").VString<string | undefined, "optional">;
        externalId: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "name" | "description" | "sourceUrl" | "coverImageUrl" | "imageUrls" | "tags" | "latitude" | "longitude" | "startDate" | "endDate" | "tips" | "updatedAt" | "nameEn" | "cityId" | "descriptionEn" | "currency" | "externalId" | "rating" | "ratingCount" | "source" | "viewCount" | "isRecurring" | "startTime" | "endTime" | "highlights" | "isVerified" | "isFree" | "officialWebsite" | "saveCount" | "isFeatured" | "eventType" | "venue" | "venueAddress" | "isAllDay" | "recurrencePattern" | "ticketPrice" | "ticketPriceMax" | "ticketUrl" | "requiresBooking" | "organizerName" | "organizerPhone" | "organizerEmail" | "recurrencePattern.type" | "recurrencePattern.day" | "recurrencePattern.month" | "recurrencePattern.isLunarCalendar" | "recurrencePattern.lunarMonth" | "recurrencePattern.lunarDay" | "recurrencePattern.weekOfMonth" | "recurrencePattern.dayOfWeek">, {
        by_city: ["cityId", "_creationTime"];
        by_city_type: ["cityId", "eventType", "_creationTime"];
        by_city_status: ["cityId", "status", "_creationTime"];
        by_city_dates: ["cityId", "startDate", "endDate", "_creationTime"];
        by_type: ["eventType", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_start_date: ["startDate", "_creationTime"];
        by_featured: ["isFeatured", "_creationTime"];
        by_recurring: ["isRecurring", "_creationTime"];
    }, {}, {}>;
    eventFavorites: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        createdAt: number;
        userId: string;
        eventId: import("convex/values").GenericId<"localEvents">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        eventId: import("convex/values").VId<import("convex/values").GenericId<"localEvents">, "required">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "notes" | "eventId">, {
        by_user: ["userId", "_creationTime"];
        by_event: ["eventId", "_creationTime"];
        by_user_event: ["userId", "eventId", "_creationTime"];
        by_user_created: ["userId", "createdAt", "_creationTime"];
    }, {}, {}>;
    eventReminders: import("convex/server").TableDefinition<import("convex/values").VObject<{
        message?: string | undefined;
        minutesBefore?: number | undefined;
        triggeredAt?: number | undefined;
        readAt?: number | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        reminderType: "custom" | "event_start" | "booking_open";
        isTriggered: boolean;
        reminderTime: number;
        isRead: boolean;
        eventId: import("convex/values").GenericId<"localEvents">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        eventId: import("convex/values").VId<import("convex/values").GenericId<"localEvents">, "required">;
        reminderType: import("convex/values").VUnion<"custom" | "event_start" | "booking_open", [import("convex/values").VLiteral<"event_start", "required">, import("convex/values").VLiteral<"booking_open", "required">, import("convex/values").VLiteral<"custom", "required">], "required", never>;
        reminderTime: import("convex/values").VFloat64<number, "required">;
        minutesBefore: import("convex/values").VFloat64<number | undefined, "optional">;
        message: import("convex/values").VString<string | undefined, "optional">;
        isTriggered: import("convex/values").VBoolean<boolean, "required">;
        triggeredAt: import("convex/values").VFloat64<number | undefined, "optional">;
        isRead: import("convex/values").VBoolean<boolean, "required">;
        readAt: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "message" | "userId" | "updatedAt" | "reminderType" | "minutesBefore" | "isTriggered" | "triggeredAt" | "reminderTime" | "isRead" | "readAt" | "eventId">, {
        by_user: ["userId", "_creationTime"];
        by_event: ["eventId", "_creationTime"];
        by_user_event: ["userId", "eventId", "_creationTime"];
        by_reminder_time: ["reminderTime", "_creationTime"];
        by_triggered: ["isTriggered", "_creationTime"];
        by_user_triggered: ["userId", "isTriggered", "_creationTime"];
    }, {}, {}>;
    eventReviews: import("convex/server").TableDefinition<import("convex/values").VObject<{
        imageUrls?: string[] | undefined;
        updatedAt?: number | undefined;
        pros?: string[] | undefined;
        cons?: string[] | undefined;
        valueRating?: number | undefined;
        atmosphereRating?: number | undefined;
        organizationRating?: number | undefined;
        attendDate?: string | undefined;
        content: string;
        status: "approved" | "rejected" | "pending";
        createdAt: number;
        userId: string;
        rating: number;
        wouldRecommend: boolean;
        reportCount: number;
        isVerified: boolean;
        helpfulCount: number;
        eventId: import("convex/values").GenericId<"localEvents">;
    }, {
        eventId: import("convex/values").VId<import("convex/values").GenericId<"localEvents">, "required">;
        userId: import("convex/values").VString<string, "required">;
        rating: import("convex/values").VFloat64<number, "required">;
        atmosphereRating: import("convex/values").VFloat64<number | undefined, "optional">;
        organizationRating: import("convex/values").VFloat64<number | undefined, "optional">;
        valueRating: import("convex/values").VFloat64<number | undefined, "optional">;
        content: import("convex/values").VString<string, "required">;
        attendDate: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        pros: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        cons: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        wouldRecommend: import("convex/values").VBoolean<boolean, "required">;
        helpfulCount: import("convex/values").VFloat64<number, "required">;
        reportCount: import("convex/values").VFloat64<number, "required">;
        isVerified: import("convex/values").VBoolean<boolean, "required">;
        status: import("convex/values").VUnion<"approved" | "rejected" | "pending", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"approved", "required">, import("convex/values").VLiteral<"rejected", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "content" | "status" | "createdAt" | "imageUrls" | "userId" | "updatedAt" | "rating" | "wouldRecommend" | "reportCount" | "isVerified" | "helpfulCount" | "pros" | "cons" | "valueRating" | "eventId" | "atmosphereRating" | "organizationRating" | "attendDate">, {
        by_event: ["eventId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_event_user: ["eventId", "userId", "_creationTime"];
        by_rating: ["rating", "_creationTime"];
        by_event_rating: ["eventId", "rating", "_creationTime"];
        by_status: ["status", "_creationTime"];
    }, {}, {}>;
    eventReviewVotes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        voteType: "helpful" | "not_helpful";
        reviewId: import("convex/values").GenericId<"eventReviews">;
    }, {
        reviewId: import("convex/values").VId<import("convex/values").GenericId<"eventReviews">, "required">;
        userId: import("convex/values").VString<string, "required">;
        voteType: import("convex/values").VUnion<"helpful" | "not_helpful", [import("convex/values").VLiteral<"helpful", "required">, import("convex/values").VLiteral<"not_helpful", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "voteType" | "reviewId">, {
        by_review: ["reviewId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_review_user: ["reviewId", "userId", "_creationTime"];
    }, {}, {}>;
    userPreferences: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt?: number | undefined;
        userId: string;
        lastUpdated: number;
        categoryScores: any;
        explicitPreferences: ("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[];
        travelStyle: "cultural" | "adventurous" | "relaxed" | "balanced";
        budgetLevel: "budget" | "moderate" | "luxury";
        pacePreference: "moderate" | "slow" | "fast";
        preferLocalFood: boolean;
        preferOffBeatPlaces: boolean;
        accessibilityNeeds: boolean;
        totalInteractions: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        categoryScores: import("convex/values").VAny<any, "required", string>;
        explicitPreferences: import("convex/values").VArray<("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[], import("convex/values").VUnion<"budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife", [import("convex/values").VLiteral<"food", "required">, import("convex/values").VLiteral<"culture", "required">, import("convex/values").VLiteral<"nature", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"nightlife", "required">, import("convex/values").VLiteral<"adventure", "required">, import("convex/values").VLiteral<"relaxation", "required">, import("convex/values").VLiteral<"photography", "required">, import("convex/values").VLiteral<"family", "required">, import("convex/values").VLiteral<"budget", "required">, import("convex/values").VLiteral<"luxury", "required">], "required", never>, "required">;
        travelStyle: import("convex/values").VUnion<"cultural" | "adventurous" | "relaxed" | "balanced", [import("convex/values").VLiteral<"adventurous", "required">, import("convex/values").VLiteral<"relaxed", "required">, import("convex/values").VLiteral<"cultural", "required">, import("convex/values").VLiteral<"balanced", "required">], "required", never>;
        budgetLevel: import("convex/values").VUnion<"budget" | "moderate" | "luxury", [import("convex/values").VLiteral<"budget", "required">, import("convex/values").VLiteral<"moderate", "required">, import("convex/values").VLiteral<"luxury", "required">], "required", never>;
        pacePreference: import("convex/values").VUnion<"moderate" | "slow" | "fast", [import("convex/values").VLiteral<"slow", "required">, import("convex/values").VLiteral<"moderate", "required">, import("convex/values").VLiteral<"fast", "required">], "required", never>;
        preferLocalFood: import("convex/values").VBoolean<boolean, "required">;
        preferOffBeatPlaces: import("convex/values").VBoolean<boolean, "required">;
        accessibilityNeeds: import("convex/values").VBoolean<boolean, "required">;
        totalInteractions: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastUpdated: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "lastUpdated" | "categoryScores" | "explicitPreferences" | "travelStyle" | "budgetLevel" | "pacePreference" | "preferLocalFood" | "preferOffBeatPlaces" | "accessibilityNeeds" | "totalInteractions" | `categoryScores.${string}`>, {
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    userBehaviorEvents: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        metadata: any;
        userId: string;
        targetType: "city" | "itinerary" | "poi" | "search" | "guide";
        targetId: string;
        categories: ("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[];
        behaviorType: "like" | "share" | "view" | "save" | "unsave" | "copy" | "unlike" | "search" | "poi_click" | "poi_add";
    }, {
        userId: import("convex/values").VString<string, "required">;
        behaviorType: import("convex/values").VUnion<"like" | "share" | "view" | "save" | "unsave" | "copy" | "unlike" | "search" | "poi_click" | "poi_add", [import("convex/values").VLiteral<"view", "required">, import("convex/values").VLiteral<"save", "required">, import("convex/values").VLiteral<"unsave", "required">, import("convex/values").VLiteral<"copy", "required">, import("convex/values").VLiteral<"share", "required">, import("convex/values").VLiteral<"like", "required">, import("convex/values").VLiteral<"unlike", "required">, import("convex/values").VLiteral<"search", "required">, import("convex/values").VLiteral<"poi_click", "required">, import("convex/values").VLiteral<"poi_add", "required">], "required", never>;
        targetType: import("convex/values").VUnion<"city" | "itinerary" | "poi" | "search" | "guide", [import("convex/values").VLiteral<"guide", "required">, import("convex/values").VLiteral<"itinerary", "required">, import("convex/values").VLiteral<"poi", "required">, import("convex/values").VLiteral<"city", "required">, import("convex/values").VLiteral<"search", "required">], "required", never>;
        targetId: import("convex/values").VString<string, "required">;
        categories: import("convex/values").VArray<("budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife")[], import("convex/values").VUnion<"budget" | "shopping" | "family" | "adventure" | "food" | "relaxation" | "culture" | "nature" | "photography" | "luxury" | "nightlife", [import("convex/values").VLiteral<"food", "required">, import("convex/values").VLiteral<"culture", "required">, import("convex/values").VLiteral<"nature", "required">, import("convex/values").VLiteral<"shopping", "required">, import("convex/values").VLiteral<"nightlife", "required">, import("convex/values").VLiteral<"adventure", "required">, import("convex/values").VLiteral<"relaxation", "required">, import("convex/values").VLiteral<"photography", "required">, import("convex/values").VLiteral<"family", "required">, import("convex/values").VLiteral<"budget", "required">, import("convex/values").VLiteral<"luxury", "required">], "required", never>, "required">;
        metadata: import("convex/values").VAny<any, "required", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "metadata" | "userId" | "targetType" | "targetId" | "categories" | "behaviorType" | `metadata.${string}`>, {
        by_user: ["userId", "_creationTime"];
        by_user_type: ["userId", "behaviorType", "_creationTime"];
        by_target: ["targetType", "targetId", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    itineraryVersions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        versionNote?: string | undefined;
        changesSummary?: string | undefined;
        changesCount?: {
            daysAdded: number;
            daysRemoved: number;
            itemsAdded: number;
            itemsRemoved: number;
            itemsModified: number;
        } | undefined;
        createdAt: number;
        snapshot: {
            coverImageUrl?: string | undefined;
            title: string;
            startDate: string;
            endDate: string;
            days: {
                date: string;
                items: {
                    notes?: string | undefined;
                    startTime?: string | undefined;
                    endTime?: string | undefined;
                    poiId: import("convex/values").GenericId<"pois">;
                    orderIndex: number;
                    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
                }[];
                dayNumber: number;
            }[];
            visibility: "public" | "private" | "team";
            cityId: import("convex/values").GenericId<"cities">;
        };
        userId: string;
        itineraryId: import("convex/values").GenericId<"itineraries">;
        versionNumber: number;
    }, {
        itineraryId: import("convex/values").VId<import("convex/values").GenericId<"itineraries">, "required">;
        userId: import("convex/values").VString<string, "required">;
        versionNumber: import("convex/values").VFloat64<number, "required">;
        versionNote: import("convex/values").VString<string | undefined, "optional">;
        snapshot: import("convex/values").VObject<{
            coverImageUrl?: string | undefined;
            title: string;
            startDate: string;
            endDate: string;
            days: {
                date: string;
                items: {
                    notes?: string | undefined;
                    startTime?: string | undefined;
                    endTime?: string | undefined;
                    poiId: import("convex/values").GenericId<"pois">;
                    orderIndex: number;
                    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
                }[];
                dayNumber: number;
            }[];
            visibility: "public" | "private" | "team";
            cityId: import("convex/values").GenericId<"cities">;
        }, {
            title: import("convex/values").VString<string, "required">;
            cityId: import("convex/values").VId<import("convex/values").GenericId<"cities">, "required">;
            startDate: import("convex/values").VString<string, "required">;
            endDate: import("convex/values").VString<string, "required">;
            visibility: import("convex/values").VUnion<"public" | "private" | "team", [import("convex/values").VLiteral<"private", "required">, import("convex/values").VLiteral<"team", "required">, import("convex/values").VLiteral<"public", "required">], "required", never>;
            coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
            days: import("convex/values").VArray<{
                date: string;
                items: {
                    notes?: string | undefined;
                    startTime?: string | undefined;
                    endTime?: string | undefined;
                    poiId: import("convex/values").GenericId<"pois">;
                    orderIndex: number;
                    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
                }[];
                dayNumber: number;
            }[], import("convex/values").VObject<{
                date: string;
                items: {
                    notes?: string | undefined;
                    startTime?: string | undefined;
                    endTime?: string | undefined;
                    poiId: import("convex/values").GenericId<"pois">;
                    orderIndex: number;
                    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
                }[];
                dayNumber: number;
            }, {
                dayNumber: import("convex/values").VFloat64<number, "required">;
                date: import("convex/values").VString<string, "required">;
                items: import("convex/values").VArray<{
                    notes?: string | undefined;
                    startTime?: string | undefined;
                    endTime?: string | undefined;
                    poiId: import("convex/values").GenericId<"pois">;
                    orderIndex: number;
                    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
                }[], import("convex/values").VObject<{
                    notes?: string | undefined;
                    startTime?: string | undefined;
                    endTime?: string | undefined;
                    poiId: import("convex/values").GenericId<"pois">;
                    orderIndex: number;
                    transportMode: "walking" | "driving" | "transit" | "cycling" | "taxi";
                }, {
                    poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
                    orderIndex: import("convex/values").VFloat64<number, "required">;
                    startTime: import("convex/values").VString<string | undefined, "optional">;
                    endTime: import("convex/values").VString<string | undefined, "optional">;
                    transportMode: import("convex/values").VUnion<"walking" | "driving" | "transit" | "cycling" | "taxi", [import("convex/values").VLiteral<"walking", "required">, import("convex/values").VLiteral<"driving", "required">, import("convex/values").VLiteral<"transit", "required">, import("convex/values").VLiteral<"cycling", "required">, import("convex/values").VLiteral<"taxi", "required">], "required", never>;
                    notes: import("convex/values").VString<string | undefined, "optional">;
                }, "required", "notes" | "poiId" | "orderIndex" | "startTime" | "endTime" | "transportMode">, "required">;
            }, "required", "date" | "items" | "dayNumber">, "required">;
        }, "required", "title" | "coverImageUrl" | "startDate" | "endDate" | "days" | "visibility" | "cityId">;
        changesSummary: import("convex/values").VString<string | undefined, "optional">;
        changesCount: import("convex/values").VObject<{
            daysAdded: number;
            daysRemoved: number;
            itemsAdded: number;
            itemsRemoved: number;
            itemsModified: number;
        } | undefined, {
            daysAdded: import("convex/values").VFloat64<number, "required">;
            daysRemoved: import("convex/values").VFloat64<number, "required">;
            itemsAdded: import("convex/values").VFloat64<number, "required">;
            itemsRemoved: import("convex/values").VFloat64<number, "required">;
            itemsModified: import("convex/values").VFloat64<number, "required">;
        }, "optional", "daysAdded" | "daysRemoved" | "itemsAdded" | "itemsRemoved" | "itemsModified">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "snapshot" | "userId" | "itineraryId" | "versionNumber" | "versionNote" | "changesSummary" | "changesCount" | "snapshot.title" | "snapshot.coverImageUrl" | "snapshot.startDate" | "snapshot.endDate" | "snapshot.days" | "snapshot.visibility" | "snapshot.cityId" | "changesCount.daysAdded" | "changesCount.daysRemoved" | "changesCount.itemsAdded" | "changesCount.itemsRemoved" | "changesCount.itemsModified">, {
        by_itinerary: ["itineraryId", "_creationTime"];
        by_itinerary_version: ["itineraryId", "versionNumber", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    /**
     * Questions about POIs - Extended
     * Users can ask questions about specific points of interest
     */
    poiQuestionsExtended: import("convex/server").TableDefinition<import("convex/values").VObject<{
        authorName?: string | undefined;
        tags?: string[] | undefined;
        updatedAt?: number | undefined;
        bestAnswerId?: import("convex/values").GenericId<"poiAnswers"> | undefined;
        authorAvatarUrl?: string | undefined;
        content: string;
        status: "open" | "resolved" | "closed";
        createdAt: number;
        title: string;
        viewsCount: number;
        userId: string;
        poiId: import("convex/values").GenericId<"pois">;
        isEdited: boolean;
        isDeleted: boolean;
        reportCount: number;
        answersCount: number;
        hasBestAnswer: boolean;
        isHidden: boolean;
        upvotesCount: number;
        downvotesCount: number;
        lastActivityAt: number;
    }, {
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        userId: import("convex/values").VString<string, "required">;
        title: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        authorAvatarUrl: import("convex/values").VString<string | undefined, "optional">;
        upvotesCount: import("convex/values").VFloat64<number, "required">;
        downvotesCount: import("convex/values").VFloat64<number, "required">;
        answersCount: import("convex/values").VFloat64<number, "required">;
        viewsCount: import("convex/values").VFloat64<number, "required">;
        bestAnswerId: import("convex/values").VId<import("convex/values").GenericId<"poiAnswers"> | undefined, "optional">;
        hasBestAnswer: import("convex/values").VBoolean<boolean, "required">;
        status: import("convex/values").VUnion<"open" | "resolved" | "closed", [import("convex/values").VLiteral<"open", "required">, import("convex/values").VLiteral<"closed", "required">, import("convex/values").VLiteral<"resolved", "required">], "required", never>;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        isDeleted: import("convex/values").VBoolean<boolean, "required">;
        reportCount: import("convex/values").VFloat64<number, "required">;
        isHidden: import("convex/values").VBoolean<boolean, "required">;
        tags: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        lastActivityAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "status" | "createdAt" | "title" | "authorName" | "tags" | "viewsCount" | "userId" | "updatedAt" | "poiId" | "isEdited" | "isDeleted" | "reportCount" | "answersCount" | "bestAnswerId" | "hasBestAnswer" | "isHidden" | "upvotesCount" | "downvotesCount" | "authorAvatarUrl" | "lastActivityAt">, {
        by_poi: ["poiId", "_creationTime"];
        by_poi_status: ["poiId", "status", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_last_activity: ["lastActivityAt", "_creationTime"];
        by_upvotes: ["upvotesCount", "_creationTime"];
        by_poi_created: ["poiId", "createdAt", "_creationTime"];
    }, {
        search_questions: {
            searchField: "title";
            filterFields: "status" | "poiId" | "isDeleted";
        };
    }, {}>;
    /**
     * Answers to POI questions - Extended
     */
    poiAnswersExtended: import("convex/server").TableDefinition<import("convex/values").VObject<{
        authorName?: string | undefined;
        updatedAt?: number | undefined;
        authorAvatarUrl?: string | undefined;
        content: string;
        createdAt: number;
        userId: string;
        poiId: import("convex/values").GenericId<"pois">;
        isEdited: boolean;
        isDeleted: boolean;
        reportCount: number;
        isHidden: boolean;
        upvotesCount: number;
        downvotesCount: number;
        questionId: import("convex/values").GenericId<"poiQuestions">;
        isBestAnswer: boolean;
    }, {
        questionId: import("convex/values").VId<import("convex/values").GenericId<"poiQuestions">, "required">;
        poiId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        userId: import("convex/values").VString<string, "required">;
        content: import("convex/values").VString<string, "required">;
        authorName: import("convex/values").VString<string | undefined, "optional">;
        authorAvatarUrl: import("convex/values").VString<string | undefined, "optional">;
        upvotesCount: import("convex/values").VFloat64<number, "required">;
        downvotesCount: import("convex/values").VFloat64<number, "required">;
        isBestAnswer: import("convex/values").VBoolean<boolean, "required">;
        isEdited: import("convex/values").VBoolean<boolean, "required">;
        isDeleted: import("convex/values").VBoolean<boolean, "required">;
        reportCount: import("convex/values").VFloat64<number, "required">;
        isHidden: import("convex/values").VBoolean<boolean, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "content" | "createdAt" | "authorName" | "userId" | "updatedAt" | "poiId" | "isEdited" | "isDeleted" | "reportCount" | "isHidden" | "upvotesCount" | "downvotesCount" | "authorAvatarUrl" | "questionId" | "isBestAnswer">, {
        by_question: ["questionId", "_creationTime"];
        by_question_best: ["questionId", "isBestAnswer", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_poi: ["poiId", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
        by_upvotes: ["upvotesCount", "_creationTime"];
    }, {}, {}>;
    /**
     * Question votes (upvotes/downvotes)
     * One vote per user per question
     */
    poiQuestionVotes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        voteType: "up" | "down";
        questionId: import("convex/values").GenericId<"poiQuestions">;
    }, {
        questionId: import("convex/values").VId<import("convex/values").GenericId<"poiQuestions">, "required">;
        userId: import("convex/values").VString<string, "required">;
        voteType: import("convex/values").VUnion<"up" | "down", [import("convex/values").VLiteral<"up", "required">, import("convex/values").VLiteral<"down", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "voteType" | "questionId">, {
        by_question: ["questionId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_question_user: ["questionId", "userId", "_creationTime"];
    }, {}, {}>;
    /**
     * Answer votes (upvotes/downvotes)
     * One vote per user per answer
     */
    poiAnswerVotes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        voteType: "up" | "down";
        answerId: import("convex/values").GenericId<"poiAnswers">;
    }, {
        answerId: import("convex/values").VId<import("convex/values").GenericId<"poiAnswers">, "required">;
        userId: import("convex/values").VString<string, "required">;
        voteType: import("convex/values").VUnion<"up" | "down", [import("convex/values").VLiteral<"up", "required">, import("convex/values").VLiteral<"down", "required">], "required", never>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "voteType" | "answerId">, {
        by_answer: ["answerId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_answer_user: ["answerId", "userId", "_creationTime"];
    }, {}, {}>;
    /**
     * Q&A reports for moderation
     */
    poiQAReports: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        reviewedBy?: string | undefined;
        reviewedAt?: number | undefined;
        actionTaken?: string | undefined;
        status: "pending" | "reviewed" | "dismissed" | "actioned";
        createdAt: number;
        userId: string;
        targetType: "question" | "answer";
        targetId: string;
        reason: "other" | "spam" | "harassment" | "inappropriate" | "off_topic" | "misleading";
    }, {
        targetType: import("convex/values").VUnion<"question" | "answer", [import("convex/values").VLiteral<"question", "required">, import("convex/values").VLiteral<"answer", "required">], "required", never>;
        targetId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VString<string, "required">;
        reason: import("convex/values").VUnion<"other" | "spam" | "harassment" | "inappropriate" | "off_topic" | "misleading", [import("convex/values").VLiteral<"spam", "required">, import("convex/values").VLiteral<"inappropriate", "required">, import("convex/values").VLiteral<"misleading", "required">, import("convex/values").VLiteral<"off_topic", "required">, import("convex/values").VLiteral<"harassment", "required">, import("convex/values").VLiteral<"other", "required">], "required", never>;
        description: import("convex/values").VString<string | undefined, "optional">;
        status: import("convex/values").VUnion<"pending" | "reviewed" | "dismissed" | "actioned", [import("convex/values").VLiteral<"pending", "required">, import("convex/values").VLiteral<"reviewed", "required">, import("convex/values").VLiteral<"dismissed", "required">, import("convex/values").VLiteral<"actioned", "required">], "required", never>;
        reviewedBy: import("convex/values").VString<string | undefined, "optional">;
        reviewedAt: import("convex/values").VFloat64<number | undefined, "optional">;
        actionTaken: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "status" | "createdAt" | "description" | "userId" | "targetType" | "targetId" | "reason" | "reviewedBy" | "reviewedAt" | "actionTaken">, {
        by_target: ["targetType", "targetId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    /**
     * Content translations for various entities
     */
    contentTranslations: import("convex/server").TableDefinition<import("convex/values").VObject<{
        translatedBy?: string | undefined;
        createdAt: number;
        value: string;
        updatedAt: number;
        field: string;
        entityType: string;
        entityId: string;
        language: string;
        isAutoTranslated: boolean;
    }, {
        entityType: import("convex/values").VString<string, "required">;
        entityId: import("convex/values").VString<string, "required">;
        field: import("convex/values").VString<string, "required">;
        language: import("convex/values").VString<string, "required">;
        value: import("convex/values").VString<string, "required">;
        isAutoTranslated: import("convex/values").VBoolean<boolean, "required">;
        translatedBy: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "value" | "updatedAt" | "field" | "entityType" | "entityId" | "language" | "isAutoTranslated" | "translatedBy">, {
        by_entity: ["entityType", "entityId", "_creationTime"];
        by_entity_field_language: ["entityType", "entityId", "field", "language", "_creationTime"];
        by_type: ["entityType", "_creationTime"];
    }, {}, {}>;
    /**
     * OTP verification codes for phone login
     */
    otpCodes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        code: string;
        phone: string;
        expiresAt: number;
        attempts: number;
    }, {
        phone: import("convex/values").VString<string, "required">;
        code: import("convex/values").VString<string, "required">;
        attempts: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "code" | "phone" | "expiresAt" | "attempts">, {
        by_phone: ["phone", "_creationTime"];
    }, {}, {}>;
    /**
     * Rate limiting for OTP and other operations
     */
    rateLimits: import("convex/server").TableDefinition<import("convex/values").VObject<{
        key: string;
        count: number;
        expiresAt: number;
    }, {
        key: import("convex/values").VString<string, "required">;
        count: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "key" | "count" | "expiresAt">, {
        by_key: ["key", "_creationTime"];
    }, {}, {}>;
    /**
     * Food reviews for restaurants
     */
    foodReviews: import("convex/server").TableDefinition<import("convex/values").VObject<{
        content?: string | undefined;
        title?: string | undefined;
        imageUrls?: string[] | undefined;
        tags?: string[] | undefined;
        visitDate?: string | undefined;
        helpfulCount?: number | undefined;
        dishesOrdered?: string[] | undefined;
        recommendedDishes?: string[] | undefined;
        pricePerPerson?: number | undefined;
        createdAt: number;
        userId: string;
        updatedAt: number;
        rating: number;
        wouldRecommend: boolean;
        restaurantId: import("convex/values").GenericId<"pois">;
    }, {
        restaurantId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        userId: import("convex/values").VString<string, "required">;
        rating: import("convex/values").VFloat64<number, "required">;
        title: import("convex/values").VString<string | undefined, "optional">;
        content: import("convex/values").VString<string | undefined, "optional">;
        dishesOrdered: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        recommendedDishes: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        pricePerPerson: import("convex/values").VFloat64<number | undefined, "optional">;
        visitDate: import("convex/values").VString<string | undefined, "optional">;
        imageUrls: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        tags: import("convex/values").VArray<string[] | undefined, import("convex/values").VString<string, "required">, "optional">;
        wouldRecommend: import("convex/values").VBoolean<boolean, "required">;
        helpfulCount: import("convex/values").VFloat64<number | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "content" | "createdAt" | "title" | "imageUrls" | "tags" | "userId" | "updatedAt" | "rating" | "visitDate" | "wouldRecommend" | "helpfulCount" | "restaurantId" | "dishesOrdered" | "recommendedDishes" | "pricePerPerson">, {
        by_restaurant: ["restaurantId", "_creationTime"];
        by_restaurant_user: ["restaurantId", "userId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    /**
     * Tracks users marking food reviews as helpful
     */
    foodReviewHelpful: import("convex/server").TableDefinition<import("convex/values").VObject<{
        createdAt: number;
        userId: string;
        reviewId: import("convex/values").GenericId<"foodReviews">;
    }, {
        reviewId: import("convex/values").VId<import("convex/values").GenericId<"foodReviews">, "required">;
        userId: import("convex/values").VString<string, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "reviewId">, {
        by_review: ["reviewId", "_creationTime"];
        by_review_user: ["reviewId", "userId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
    }, {}, {}>;
    /**
     * User's favorite restaurants
     */
    foodFavorites: import("convex/server").TableDefinition<import("convex/values").VObject<{
        notes?: string | undefined;
        collectionId?: import("convex/values").GenericId<"foodCollections"> | undefined;
        createdAt: number;
        userId: string;
        restaurantId: import("convex/values").GenericId<"pois">;
    }, {
        userId: import("convex/values").VString<string, "required">;
        restaurantId: import("convex/values").VId<import("convex/values").GenericId<"pois">, "required">;
        collectionId: import("convex/values").VId<import("convex/values").GenericId<"foodCollections"> | undefined, "optional">;
        notes: import("convex/values").VString<string | undefined, "optional">;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "userId" | "notes" | "collectionId" | "restaurantId">, {
        by_user: ["userId", "_creationTime"];
        by_user_restaurant: ["userId", "restaurantId", "_creationTime"];
        by_collection: ["collectionId", "_creationTime"];
    }, {}, {}>;
    /**
     * Food collections for organizing favorite restaurants
     */
    foodCollections: import("convex/server").TableDefinition<import("convex/values").VObject<{
        description?: string | undefined;
        coverImageUrl?: string | undefined;
        createdAt: number;
        name: string;
        userId: string;
        updatedAt: number;
        isPublic: boolean;
        itemCount: number;
    }, {
        userId: import("convex/values").VString<string, "required">;
        name: import("convex/values").VString<string, "required">;
        description: import("convex/values").VString<string | undefined, "optional">;
        coverImageUrl: import("convex/values").VString<string | undefined, "optional">;
        isPublic: import("convex/values").VBoolean<boolean, "required">;
        itemCount: import("convex/values").VFloat64<number, "required">;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "name" | "description" | "coverImageUrl" | "userId" | "updatedAt" | "isPublic" | "itemCount">, {
        by_user: ["userId", "_creationTime"];
        by_public: ["isPublic", "_creationTime"];
    }, {}, {}>;
    /**
     * Cached exchange rates for a base currency
     */
    currencyRates: import("convex/server").TableDefinition<import("convex/values").VObject<{
        fetchedAt: number;
        base: string;
        rates: any;
    }, {
        base: import("convex/values").VString<string, "required">;
        rates: import("convex/values").VAny<any, "required", string>;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "fetchedAt" | "base" | "rates" | `rates.${string}`>, {
        by_base: ["base", "_creationTime"];
        by_fetched_at: ["fetchedAt", "_creationTime"];
    }, {}, {}>;
    /**
     * Cached exchange rate history for currency pairs
     */
    currencyHistory: import("convex/server").TableDefinition<import("convex/values").VObject<{
        data: {
            base: string;
            rates: {
                date: string;
                rate: number;
            }[];
            target: string;
            change: number;
            trend: "up" | "down" | "stable";
        };
        days: number;
        fetchedAt: number;
        base: string;
        target: string;
    }, {
        base: import("convex/values").VString<string, "required">;
        target: import("convex/values").VString<string, "required">;
        days: import("convex/values").VFloat64<number, "required">;
        data: import("convex/values").VObject<{
            base: string;
            rates: {
                date: string;
                rate: number;
            }[];
            target: string;
            change: number;
            trend: "up" | "down" | "stable";
        }, {
            base: import("convex/values").VString<string, "required">;
            target: import("convex/values").VString<string, "required">;
            rates: import("convex/values").VArray<{
                date: string;
                rate: number;
            }[], import("convex/values").VObject<{
                date: string;
                rate: number;
            }, {
                date: import("convex/values").VString<string, "required">;
                rate: import("convex/values").VFloat64<number, "required">;
            }, "required", "date" | "rate">, "required">;
            change: import("convex/values").VFloat64<number, "required">;
            trend: import("convex/values").VUnion<"up" | "down" | "stable", [import("convex/values").VLiteral<"up", "required">, import("convex/values").VLiteral<"down", "required">, import("convex/values").VLiteral<"stable", "required">], "required", never>;
        }, "required", "base" | "rates" | "target" | "change" | "trend">;
        fetchedAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "data" | "days" | "fetchedAt" | "base" | "target" | "data.base" | "data.rates" | "data.target" | "data.change" | "data.trend">, {
        by_pair: ["base", "target", "_creationTime"];
        by_pair_days: ["base", "target", "days", "_creationTime"];
        by_fetched_at: ["fetchedAt", "_creationTime"];
    }, {}, {}>;
    agentSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        userId?: string | undefined;
        expiresAt?: number | undefined;
        currentNode?: string | undefined;
        interruptData?: any;
        status: "completed" | "active" | "expired" | "paused";
        createdAt: number;
        messages: {
            toolCalls?: any;
            toolName?: string | undefined;
            role: "ai" | "human" | "tool" | "system";
            content: string;
            timestamp: number;
        }[];
        sessionId: string;
        updatedAt: number;
        sessionType: "chat" | "travel_plan" | "enrichment";
    }, {
        sessionId: import("convex/values").VString<string, "required">;
        userId: import("convex/values").VString<string | undefined, "optional">;
        sessionType: import("convex/values").VUnion<"chat" | "travel_plan" | "enrichment", [import("convex/values").VLiteral<"chat", "required">, import("convex/values").VLiteral<"travel_plan", "required">, import("convex/values").VLiteral<"enrichment", "required">], "required", never>;
        status: import("convex/values").VUnion<"completed" | "active" | "expired" | "paused", [import("convex/values").VLiteral<"active", "required">, import("convex/values").VLiteral<"paused", "required">, import("convex/values").VLiteral<"completed", "required">, import("convex/values").VLiteral<"expired", "required">], "required", never>;
        messages: import("convex/values").VArray<{
            toolCalls?: any;
            toolName?: string | undefined;
            role: "ai" | "human" | "tool" | "system";
            content: string;
            timestamp: number;
        }[], import("convex/values").VObject<{
            toolCalls?: any;
            toolName?: string | undefined;
            role: "ai" | "human" | "tool" | "system";
            content: string;
            timestamp: number;
        }, {
            role: import("convex/values").VUnion<"ai" | "human" | "tool" | "system", [import("convex/values").VLiteral<"human", "required">, import("convex/values").VLiteral<"ai", "required">, import("convex/values").VLiteral<"system", "required">, import("convex/values").VLiteral<"tool", "required">], "required", never>;
            content: import("convex/values").VString<string, "required">;
            toolCalls: import("convex/values").VAny<any, "optional", string>;
            toolName: import("convex/values").VString<string | undefined, "optional">;
            timestamp: import("convex/values").VFloat64<number, "required">;
        }, "required", "role" | "content" | "timestamp" | "toolCalls" | "toolName" | `toolCalls.${string}`>, "required">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        currentNode: import("convex/values").VString<string | undefined, "optional">;
        interruptData: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
        updatedAt: import("convex/values").VFloat64<number, "required">;
        expiresAt: import("convex/values").VFloat64<number | undefined, "optional">;
    }, "required", "status" | "createdAt" | "metadata" | "messages" | "sessionId" | "userId" | "updatedAt" | "expiresAt" | `metadata.${string}` | "sessionType" | "currentNode" | "interruptData" | `interruptData.${string}`>, {
        by_session: ["sessionId", "_creationTime"];
        by_user: ["userId", "_creationTime"];
        by_user_type: ["userId", "sessionType", "_creationTime"];
        by_status: ["status", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    agentCheckpoints: import("convex/server").TableDefinition<import("convex/values").VObject<{
        metadata?: any;
        parentCheckpointId?: string | undefined;
        pendingSends?: any[] | undefined;
        createdAt: number;
        threadId: string;
        checkpointNs: string;
        checkpointId: string;
        channelValues: any;
        channelVersions: any;
        versionsSeen: any;
    }, {
        threadId: import("convex/values").VString<string, "required">;
        checkpointNs: import("convex/values").VString<string, "required">;
        checkpointId: import("convex/values").VString<string, "required">;
        parentCheckpointId: import("convex/values").VString<string | undefined, "optional">;
        channelValues: import("convex/values").VAny<any, "required", string>;
        channelVersions: import("convex/values").VAny<any, "required", string>;
        versionsSeen: import("convex/values").VAny<any, "required", string>;
        pendingSends: import("convex/values").VArray<any[] | undefined, import("convex/values").VAny<any, "required", string>, "optional">;
        metadata: import("convex/values").VAny<any, "optional", string>;
        createdAt: import("convex/values").VFloat64<number, "required">;
    }, "required", "createdAt" | "metadata" | `metadata.${string}` | "threadId" | "checkpointNs" | "checkpointId" | "parentCheckpointId" | "channelValues" | "channelVersions" | "versionsSeen" | "pendingSends" | `channelValues.${string}` | `channelVersions.${string}` | `versionsSeen.${string}`>, {
        by_thread: ["threadId", "_creationTime"];
        by_thread_ns: ["threadId", "checkpointNs", "_creationTime"];
        by_thread_ns_id: ["threadId", "checkpointNs", "checkpointId", "_creationTime"];
        by_created: ["createdAt", "_creationTime"];
    }, {}, {}>;
    users: import("convex/server").TableDefinition<import("convex/values").VObject<{
        name?: string | undefined;
        email?: string | undefined;
        phone?: string | undefined;
        image?: string | undefined;
        emailVerificationTime?: number | undefined;
        phoneVerificationTime?: number | undefined;
        isAnonymous?: boolean | undefined;
    }, {
        name: import("convex/values").VString<string | undefined, "optional">;
        image: import("convex/values").VString<string | undefined, "optional">;
        email: import("convex/values").VString<string | undefined, "optional">;
        emailVerificationTime: import("convex/values").VFloat64<number | undefined, "optional">;
        phone: import("convex/values").VString<string | undefined, "optional">;
        phoneVerificationTime: import("convex/values").VFloat64<number | undefined, "optional">;
        isAnonymous: import("convex/values").VBoolean<boolean | undefined, "optional">;
    }, "required", "name" | "email" | "phone" | "image" | "emailVerificationTime" | "phoneVerificationTime" | "isAnonymous">, {
        email: ["email", "_creationTime"];
        phone: ["phone", "_creationTime"];
    }, {}, {}>;
    authSessions: import("convex/server").TableDefinition<import("convex/values").VObject<{
        userId: import("convex/values").GenericId<"users">;
        expirationTime: number;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
    }, "required", "userId" | "expirationTime">, {
        userId: ["userId", "_creationTime"];
    }, {}, {}>;
    authAccounts: import("convex/server").TableDefinition<import("convex/values").VObject<{
        secret?: string | undefined;
        emailVerified?: string | undefined;
        phoneVerified?: string | undefined;
        userId: import("convex/values").GenericId<"users">;
        provider: string;
        providerAccountId: string;
    }, {
        userId: import("convex/values").VId<import("convex/values").GenericId<"users">, "required">;
        provider: import("convex/values").VString<string, "required">;
        providerAccountId: import("convex/values").VString<string, "required">;
        secret: import("convex/values").VString<string | undefined, "optional">;
        emailVerified: import("convex/values").VString<string | undefined, "optional">;
        phoneVerified: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "secret" | "userId" | "provider" | "providerAccountId" | "emailVerified" | "phoneVerified">, {
        userIdAndProvider: ["userId", "provider", "_creationTime"];
        providerAndAccountId: ["provider", "providerAccountId", "_creationTime"];
    }, {}, {}>;
    authRefreshTokens: import("convex/server").TableDefinition<import("convex/values").VObject<{
        firstUsedTime?: number | undefined;
        parentRefreshTokenId?: import("convex/values").GenericId<"authRefreshTokens"> | undefined;
        expirationTime: number;
        sessionId: import("convex/values").GenericId<"authSessions">;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"authSessions">, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
        firstUsedTime: import("convex/values").VFloat64<number | undefined, "optional">;
        parentRefreshTokenId: import("convex/values").VId<import("convex/values").GenericId<"authRefreshTokens"> | undefined, "optional">;
    }, "required", "expirationTime" | "sessionId" | "firstUsedTime" | "parentRefreshTokenId">, {
        sessionId: ["sessionId", "_creationTime"];
        sessionIdAndParentRefreshTokenId: ["sessionId", "parentRefreshTokenId", "_creationTime"];
    }, {}, {}>;
    authVerificationCodes: import("convex/server").TableDefinition<import("convex/values").VObject<{
        emailVerified?: string | undefined;
        phoneVerified?: string | undefined;
        verifier?: string | undefined;
        expirationTime: number;
        provider: string;
        accountId: import("convex/values").GenericId<"authAccounts">;
        code: string;
    }, {
        accountId: import("convex/values").VId<import("convex/values").GenericId<"authAccounts">, "required">;
        provider: import("convex/values").VString<string, "required">;
        code: import("convex/values").VString<string, "required">;
        expirationTime: import("convex/values").VFloat64<number, "required">;
        verifier: import("convex/values").VString<string | undefined, "optional">;
        emailVerified: import("convex/values").VString<string | undefined, "optional">;
        phoneVerified: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "expirationTime" | "provider" | "emailVerified" | "phoneVerified" | "accountId" | "code" | "verifier">, {
        accountId: ["accountId", "_creationTime"];
        code: ["code", "_creationTime"];
    }, {}, {}>;
    authVerifiers: import("convex/server").TableDefinition<import("convex/values").VObject<{
        sessionId?: import("convex/values").GenericId<"authSessions"> | undefined;
        signature?: string | undefined;
    }, {
        sessionId: import("convex/values").VId<import("convex/values").GenericId<"authSessions"> | undefined, "optional">;
        signature: import("convex/values").VString<string | undefined, "optional">;
    }, "required", "sessionId" | "signature">, {
        signature: ["signature", "_creationTime"];
    }, {}, {}>;
    authRateLimits: import("convex/server").TableDefinition<import("convex/values").VObject<{
        identifier: string;
        lastAttemptTime: number;
        attemptsLeft: number;
    }, {
        identifier: import("convex/values").VString<string, "required">;
        lastAttemptTime: import("convex/values").VFloat64<number, "required">;
        attemptsLeft: import("convex/values").VFloat64<number, "required">;
    }, "required", "identifier" | "lastAttemptTime" | "attemptsLeft">, {
        identifier: ["identifier", "_creationTime"];
    }, {}, {}>;
}, true>;
export default _default;
