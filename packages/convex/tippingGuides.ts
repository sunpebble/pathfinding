/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Tipping Guides - CRUD Operations for Tipping Information by Country
 */

// Tipping culture type
export type TippingCulture =
  | 'expected'
  | 'appreciated'
  | 'optional'
  | 'not_expected'
  | 'offensive';

// Scenario type
export type TippingScenarioType =
  | 'restaurant'
  | 'hotel'
  | 'taxi'
  | 'bar'
  | 'spa'
  | 'tour'
  | 'delivery'
  | 'hairdresser'
  | 'other';

// List all tipping guides
export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('tippingGuides').collect();
  },
});

// Get tipping guide by country code
export const getByCountryCode = query({
  args: { countryCode: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('tippingGuides')
      .withIndex('by_country_code', (q) => q.eq('countryCode', args.countryCode))
      .first();
  },
});

// Get tipping guides by culture type
export const getByTippingCulture = query({
  args: {
    culture: v.union(
      v.literal('expected'),
      v.literal('appreciated'),
      v.literal('optional'),
      v.literal('not_expected'),
      v.literal('offensive')
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('tippingGuides')
      .withIndex('by_tipping_culture', (q) =>
        q.eq('tippingCulture', args.culture)
      )
      .collect();
  },
});

// Search tipping guides by country name
export const searchByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const guides = await ctx.db.query('tippingGuides').collect();
    const searchLower = args.name.toLowerCase();
    return guides.filter(
      (guide) =>
        guide.countryName.toLowerCase().includes(searchLower) ||
        guide.countryNameEn?.toLowerCase().includes(searchLower) ||
        guide.countryCode.toLowerCase().includes(searchLower)
    );
  },
});

// Get scenario info for a specific country and scenario type
export const getScenario = query({
  args: {
    countryCode: v.string(),
    scenarioType: v.union(
      v.literal('restaurant'),
      v.literal('hotel'),
      v.literal('taxi'),
      v.literal('bar'),
      v.literal('spa'),
      v.literal('tour'),
      v.literal('delivery'),
      v.literal('hairdresser'),
      v.literal('other')
    ),
  },
  handler: async (ctx, args) => {
    const guide = await ctx.db
      .query('tippingGuides')
      .withIndex('by_country_code', (q) => q.eq('countryCode', args.countryCode))
      .first();

    if (!guide) return null;

    const scenario = guide.scenarios.find((s) => s.type === args.scenarioType);
    return scenario
      ? {
          ...scenario,
          countryName: guide.countryName,
          currency: guide.currency,
          currencySymbol: guide.currencySymbol,
          tippingCulture: guide.tippingCulture,
        }
      : null;
  },
});

// Create a new tipping guide
export const create = mutation({
  args: {
    countryCode: v.string(),
    countryName: v.string(),
    countryNameEn: v.optional(v.string()),
    currency: v.string(),
    currencySymbol: v.string(),
    tippingCulture: v.union(
      v.literal('expected'),
      v.literal('appreciated'),
      v.literal('optional'),
      v.literal('not_expected'),
      v.literal('offensive')
    ),
    cultureSummary: v.string(),
    scenarios: v.array(
      v.object({
        type: v.union(
          v.literal('restaurant'),
          v.literal('hotel'),
          v.literal('taxi'),
          v.literal('bar'),
          v.literal('spa'),
          v.literal('tour'),
          v.literal('delivery'),
          v.literal('hairdresser'),
          v.literal('other')
        ),
        typeName: v.string(),
        minPercentage: v.number(),
        maxPercentage: v.number(),
        suggestedPercentage: v.number(),
        fixedAmount: v.optional(v.number()),
        notes: v.optional(v.string()),
      })
    ),
    tips: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('tippingGuides', {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

// Update a tipping guide
export const update = mutation({
  args: {
    id: v.id('tippingGuides'),
    countryCode: v.optional(v.string()),
    countryName: v.optional(v.string()),
    countryNameEn: v.optional(v.string()),
    currency: v.optional(v.string()),
    currencySymbol: v.optional(v.string()),
    tippingCulture: v.optional(
      v.union(
        v.literal('expected'),
        v.literal('appreciated'),
        v.literal('optional'),
        v.literal('not_expected'),
        v.literal('offensive')
      )
    ),
    cultureSummary: v.optional(v.string()),
    scenarios: v.optional(
      v.array(
        v.object({
          type: v.union(
            v.literal('restaurant'),
            v.literal('hotel'),
            v.literal('taxi'),
            v.literal('bar'),
            v.literal('spa'),
            v.literal('tour'),
            v.literal('delivery'),
            v.literal('hairdresser'),
            v.literal('other')
          ),
          typeName: v.string(),
          minPercentage: v.number(),
          maxPercentage: v.number(),
          suggestedPercentage: v.number(),
          fixedAmount: v.optional(v.number()),
          notes: v.optional(v.string()),
        })
      )
    ),
    tips: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(id, {
      ...filteredUpdates,
      lastUpdated: Date.now(),
    });
    return await ctx.db.get(id);
  },
});

// Delete a tipping guide
export const remove = mutation({
  args: { id: v.id('tippingGuides') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Seed initial tipping data for common destinations
export const seedInitialData = mutation({
  args: {},
  handler: async (ctx) => {
    const existingGuides = await ctx.db.query('tippingGuides').collect();
    if (existingGuides.length > 0) {
      return { message: 'Data already exists', count: existingGuides.length };
    }

    const initialData = [
      {
        countryCode: 'US',
        countryName: '美国',
        countryNameEn: 'United States',
        currency: 'USD',
        currencySymbol: '$',
        tippingCulture: 'expected' as const,
        cultureSummary:
          '美国是全球小费文化最盛行的国家之一。服务业从业者的基本工资较低，小费是其主要收入来源。不给小费被视为非常不礼貌的行为。',
        scenarios: [
          {
            type: 'restaurant' as const,
            typeName: '餐厅',
            minPercentage: 15,
            maxPercentage: 25,
            suggestedPercentage: 18,
            notes: '午餐可给15%，晚餐建议18-20%。服务特别好可给25%。',
          },
          {
            type: 'hotel' as const,
            typeName: '酒店',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            fixedAmount: 5,
            notes: '行李员每件行李$2-5，客房清洁每天$2-5。',
          },
          {
            type: 'taxi' as const,
            typeName: '出租车',
            minPercentage: 15,
            maxPercentage: 20,
            suggestedPercentage: 15,
            notes: '帮忙搬行李可额外给$1-2。',
          },
          {
            type: 'bar' as const,
            typeName: '酒吧',
            minPercentage: 15,
            maxPercentage: 20,
            suggestedPercentage: 18,
            fixedAmount: 1,
            notes: '每杯饮料$1-2，或账单的15-20%。',
          },
          {
            type: 'spa' as const,
            typeName: '水疗/按摩',
            minPercentage: 15,
            maxPercentage: 20,
            suggestedPercentage: 18,
            notes: '通常给服务费用的15-20%。',
          },
          {
            type: 'tour' as const,
            typeName: '导游',
            minPercentage: 10,
            maxPercentage: 20,
            suggestedPercentage: 15,
            notes: '半日游$10-20，全日游$20-50。',
          },
          {
            type: 'delivery' as const,
            typeName: '外卖',
            minPercentage: 15,
            maxPercentage: 20,
            suggestedPercentage: 15,
            fixedAmount: 3,
            notes: '至少$3-5，或订单金额的15-20%。',
          },
          {
            type: 'hairdresser' as const,
            typeName: '理发店',
            minPercentage: 15,
            maxPercentage: 20,
            suggestedPercentage: 18,
            notes: '给理发师服务费用的15-20%。',
          },
        ],
        tips: [
          '信用卡结账时，小费通常在签单时填写',
          '现金小费更受欢迎，因为可以直接给服务人员',
          '快餐店和自助餐厅通常不需要小费',
          '账单上如果已包含"Service Charge"或"Gratuity"，则不需要额外给小费',
        ],
        lastUpdated: Date.now(),
      },
      {
        countryCode: 'JP',
        countryName: '日本',
        countryNameEn: 'Japan',
        currency: 'JPY',
        currencySymbol: '¥',
        tippingCulture: 'offensive' as const,
        cultureSummary:
          '日本没有小费文化，给小费可能被视为侮辱。日本人认为提供优质服务是职业道德的体现，不需要额外报酬。',
        scenarios: [
          {
            type: 'restaurant' as const,
            typeName: '餐厅',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '不需要给小费。高档餐厅可能已包含10-15%服务费。',
          },
          {
            type: 'hotel' as const,
            typeName: '酒店',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '不需要给小费。如果想表示感谢，可以用信封装好现金。',
          },
          {
            type: 'taxi' as const,
            typeName: '出租车',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '不需要给小费，司机会找零。',
          },
          {
            type: 'spa' as const,
            typeName: '温泉/按摩',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '不需要给小费。',
          },
          {
            type: 'tour' as const,
            typeName: '导游',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '不需要给小费，但可以送小礼物表示感谢。',
          },
        ],
        tips: [
          '如果坚持要给小费，请用信封装好，双手递上',
          '说"谢谢"（ありがとうございます）比给小费更受欢迎',
          '高档旅馆（旅館）可能会收取服务费，已包含在账单中',
          '不要把零钱留在桌上，服务员会追出来还给你',
        ],
        lastUpdated: Date.now(),
      },
      {
        countryCode: 'CN',
        countryName: '中国',
        countryNameEn: 'China',
        currency: 'CNY',
        currencySymbol: '¥',
        tippingCulture: 'not_expected' as const,
        cultureSummary:
          '中国大陆没有小费文化，大多数场合不需要给小费。高档酒店和涉外场所可能会收取服务费。',
        scenarios: [
          {
            type: 'restaurant' as const,
            typeName: '餐厅',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '不需要给小费。高档餐厅可能已包含10-15%服务费。',
          },
          {
            type: 'hotel' as const,
            typeName: '酒店',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            fixedAmount: 10,
            notes: '五星级酒店可给行李员10-20元。',
          },
          {
            type: 'taxi' as const,
            typeName: '出租车',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '不需要给小费。',
          },
          {
            type: 'spa' as const,
            typeName: '按摩',
            minPercentage: 0,
            maxPercentage: 10,
            suggestedPercentage: 0,
            fixedAmount: 20,
            notes: '可以给20-50元表示满意。',
          },
          {
            type: 'tour' as const,
            typeName: '导游',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            fixedAmount: 50,
            notes: '跟团游可给导游50-100元/天。',
          },
        ],
        tips: [
          '大多数场合不需要给小费',
          '高档酒店和餐厅可能已包含服务费',
          '如果服务特别好，可以给少量现金表示感谢',
          '香港和澳门的小费文化与大陆不同，更接近西方习惯',
        ],
        lastUpdated: Date.now(),
      },
      {
        countryCode: 'TH',
        countryName: '泰国',
        countryNameEn: 'Thailand',
        currency: 'THB',
        currencySymbol: '฿',
        tippingCulture: 'appreciated' as const,
        cultureSummary:
          '泰国的小费文化介于东西方之间。小费不是必须的，但会受到欢迎。旅游区的小费期望较高。',
        scenarios: [
          {
            type: 'restaurant' as const,
            typeName: '餐厅',
            minPercentage: 0,
            maxPercentage: 10,
            suggestedPercentage: 5,
            fixedAmount: 20,
            notes: '可以留下找零或20-50泰铢。高档餐厅可给10%。',
          },
          {
            type: 'hotel' as const,
            typeName: '酒店',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            fixedAmount: 20,
            notes: '行李员每件行李20-50泰铢，客房清洁每天20-50泰铢。',
          },
          {
            type: 'taxi' as const,
            typeName: '出租车',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '可以让司机保留找零，或凑整数。',
          },
          {
            type: 'spa' as const,
            typeName: '按摩',
            minPercentage: 10,
            maxPercentage: 20,
            suggestedPercentage: 10,
            fixedAmount: 100,
            notes: '通常给100-300泰铢，或服务费的10-20%。',
          },
          {
            type: 'tour' as const,
            typeName: '导游',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            fixedAmount: 100,
            notes: '半日游100-200泰铢，全日游200-500泰铢。',
          },
        ],
        tips: [
          '不要给硬币作为小费，在泰国被认为是给乞丐的',
          '按摩师的小费是其重要收入来源',
          '嘟嘟车和摩托车出租通常不需要小费',
          '寺庙捐款箱可以投入适量现金',
        ],
        lastUpdated: Date.now(),
      },
      {
        countryCode: 'FR',
        countryName: '法国',
        countryNameEn: 'France',
        currency: 'EUR',
        currencySymbol: '€',
        tippingCulture: 'optional' as const,
        cultureSummary:
          '法国的服务费通常已包含在账单中（service compris）。额外小费是可选的，用于表示对特别好服务的感谢。',
        scenarios: [
          {
            type: 'restaurant' as const,
            typeName: '餐厅',
            minPercentage: 0,
            maxPercentage: 10,
            suggestedPercentage: 5,
            notes: '服务费已包含。可以留下找零或5-10%表示满意。',
          },
          {
            type: 'hotel' as const,
            typeName: '酒店',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            fixedAmount: 2,
            notes: '行李员每件行李€1-2，客房清洁每天€1-2。',
          },
          {
            type: 'taxi' as const,
            typeName: '出租车',
            minPercentage: 5,
            maxPercentage: 10,
            suggestedPercentage: 5,
            notes: '可以凑整数或给5-10%。',
          },
          {
            type: 'bar' as const,
            typeName: '咖啡馆/酒吧',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            fixedAmount: 1,
            notes: '可以留下找零，通常€0.50-1。',
          },
          {
            type: 'tour' as const,
            typeName: '导游',
            minPercentage: 5,
            maxPercentage: 10,
            suggestedPercentage: 5,
            notes: '可以给€5-10表示感谢。',
          },
        ],
        tips: [
          '账单上的"service compris"表示服务费已包含',
          '在咖啡馆，站着喝咖啡比坐着便宜',
          '高档餐厅可以给更多小费表示感谢',
          '小费通常用现金，放在桌上或给服务员',
        ],
        lastUpdated: Date.now(),
      },
      {
        countryCode: 'GB',
        countryName: '英国',
        countryNameEn: 'United Kingdom',
        currency: 'GBP',
        currencySymbol: '£',
        tippingCulture: 'appreciated' as const,
        cultureSummary:
          '英国的小费文化比美国温和。服务费有时已包含在账单中，额外小费是可选的但受欢迎。',
        scenarios: [
          {
            type: 'restaurant' as const,
            typeName: '餐厅',
            minPercentage: 10,
            maxPercentage: 15,
            suggestedPercentage: 10,
            notes: '如果账单未包含服务费，给10-15%。',
          },
          {
            type: 'hotel' as const,
            typeName: '酒店',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            fixedAmount: 2,
            notes: '行李员每件行李£1-2，客房清洁可给£1-2/天。',
          },
          {
            type: 'taxi' as const,
            typeName: '出租车',
            minPercentage: 10,
            maxPercentage: 15,
            suggestedPercentage: 10,
            notes: '凑整数或给10%。',
          },
          {
            type: 'bar' as const,
            typeName: '酒吧',
            minPercentage: 0,
            maxPercentage: 0,
            suggestedPercentage: 0,
            notes: '传统上不给小费，但可以说"and one for yourself"请酒保喝一杯。',
          },
          {
            type: 'hairdresser' as const,
            typeName: '理发店',
            minPercentage: 10,
            maxPercentage: 15,
            suggestedPercentage: 10,
            notes: '可以给10-15%。',
          },
        ],
        tips: [
          '检查账单是否已包含"service charge"',
          '酒吧通常不给小费，但可以请酒保喝一杯',
          '出租车司机期望得到小费',
          '可以用现金或在刷卡时添加小费',
        ],
        lastUpdated: Date.now(),
      },
    ];

    const insertedIds = [];
    for (const data of initialData) {
      const id = await ctx.db.insert('tippingGuides', data);
      insertedIds.push(id);
    }

    return { message: 'Initial data seeded', count: insertedIds.length };
  },
});
