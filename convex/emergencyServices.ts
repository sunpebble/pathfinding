/* eslint-disable ts/ban-ts-comment */
// @ts-nocheck
import { v } from 'convex/values';
import { mutation, query } from './_generated/server';

/**
 * Emergency Services - Country/city emergency numbers and embassy info
 * Provides destination-specific emergency service information
 */

// Get emergency services by country code
export const getByCountry = query({
  args: { countryCode: v.string() },
  handler: async (ctx, args) => {
    // First try to get country-level services (no city specified)
    const countryServices = await ctx.db
      .query('emergencyServices')
      .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode))
      .filter((q) => q.eq(q.field('cityName'), undefined))
      .first();

    return countryServices;
  },
});

// Get emergency services by country and city
export const getByCountryCity = query({
  args: {
    countryCode: v.string(),
    cityName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If city is specified, try to get city-specific services first
    if (args.cityName) {
      const cityServices = await ctx.db
        .query('emergencyServices')
        .withIndex('by_country_city', (q) =>
          q.eq('countryCode', args.countryCode).eq('cityName', args.cityName)
        )
        .first();

      if (cityServices) {
        return cityServices;
      }
    }

    // Fall back to country-level services
    const countryServices = await ctx.db
      .query('emergencyServices')
      .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode))
      .filter((q) => q.eq(q.field('cityName'), undefined))
      .first();

    return countryServices;
  },
});

// List all countries with emergency services
export const listCountries = query({
  args: {},
  handler: async (ctx) => {
    const services = await ctx.db.query('emergencyServices').collect();

    // Get unique countries (country-level entries only)
    const countries = services
      .filter((s) => !s.cityName)
      .map((s) => ({
        countryCode: s.countryCode,
        countryName: s.countryName,
        countryNameEn: s.countryNameEn,
      }));

    // Sort by country name
    countries.sort((a, b) => a.countryName.localeCompare(b.countryName));

    return countries;
  },
});

// Search emergency services by country name
export const searchByName = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const services = await ctx.db.query('emergencyServices').collect();

    const searchTerm = args.query.toLowerCase();
    const matches = services.filter(
      (s) =>
        !s.cityName &&
        (s.countryName.toLowerCase().includes(searchTerm) ||
          (s.countryNameEn &&
            s.countryNameEn.toLowerCase().includes(searchTerm)))
    );

    return matches;
  },
});

// Create emergency services entry (admin use)
export const create = mutation({
  args: {
    countryCode: v.string(),
    countryName: v.string(),
    countryNameEn: v.optional(v.string()),
    cityName: v.optional(v.string()),
    policeNumber: v.string(),
    ambulanceNumber: v.string(),
    fireNumber: v.string(),
    generalEmergencyNumber: v.optional(v.string()),
    embassyPhone: v.optional(v.string()),
    embassyAddress: v.optional(v.string()),
    embassyWebsite: v.optional(v.string()),
    consulateInfo: v.optional(
      v.array(
        v.object({
          city: v.string(),
          phone: v.string(),
          address: v.optional(v.string()),
        })
      )
    ),
    touristPoliceNumber: v.optional(v.string()),
    coastGuardNumber: v.optional(v.string()),
    roadAssistanceNumber: v.optional(v.string()),
    poisonControlNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('emergencyServices', {
      ...args,
      lastUpdated: Date.now(),
    });
  },
});

// Update emergency services entry (admin use)
export const update = mutation({
  args: {
    id: v.id('emergencyServices'),
    countryName: v.optional(v.string()),
    countryNameEn: v.optional(v.string()),
    policeNumber: v.optional(v.string()),
    ambulanceNumber: v.optional(v.string()),
    fireNumber: v.optional(v.string()),
    generalEmergencyNumber: v.optional(v.string()),
    embassyPhone: v.optional(v.string()),
    embassyAddress: v.optional(v.string()),
    embassyWebsite: v.optional(v.string()),
    consulateInfo: v.optional(
      v.array(
        v.object({
          city: v.string(),
          phone: v.string(),
          address: v.optional(v.string()),
        })
      )
    ),
    touristPoliceNumber: v.optional(v.string()),
    coastGuardNumber: v.optional(v.string()),
    roadAssistanceNumber: v.optional(v.string()),
    poisonControlNumber: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;

    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(id, { ...filteredUpdates, lastUpdated: Date.now() });
    return await ctx.db.get(id);
  },
});

// Delete emergency services entry (admin use)
export const remove = mutation({
  args: { id: v.id('emergencyServices') },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});

// Seed common emergency services data
export const seedCommonCountries = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Common travel destinations with their emergency numbers
    const countries = [
      {
        countryCode: 'CN',
        countryName: '中国',
        countryNameEn: 'China',
        policeNumber: '110',
        ambulanceNumber: '120',
        fireNumber: '119',
        notes: '中国大陆地区紧急服务电话',
      },
      {
        countryCode: 'JP',
        countryName: '日本',
        countryNameEn: 'Japan',
        policeNumber: '110',
        ambulanceNumber: '119',
        fireNumber: '119',
        embassyPhone: '+81-3-3403-3388',
        embassyAddress: '东京都港区元麻布3-4-33',
        touristPoliceNumber: '03-3501-0110',
        notes: '日本的救护车和消防都是119，警察是110',
      },
      {
        countryCode: 'KR',
        countryName: '韩国',
        countryNameEn: 'South Korea',
        policeNumber: '112',
        ambulanceNumber: '119',
        fireNumber: '119',
        embassyPhone: '+82-2-738-1038',
        embassyAddress: '首尔特别市中区明洞2街27',
        touristPoliceNumber: '1330',
        notes: '韩国旅游咨询热线1330提供中文服务',
      },
      {
        countryCode: 'TH',
        countryName: '泰国',
        countryNameEn: 'Thailand',
        policeNumber: '191',
        ambulanceNumber: '1669',
        fireNumber: '199',
        embassyPhone: '+66-2-245-7044',
        embassyAddress: '曼谷拉查达披色路57号',
        touristPoliceNumber: '1155',
        notes: '泰国旅游警察热线1155提供多语言服务',
      },
      {
        countryCode: 'SG',
        countryName: '新加坡',
        countryNameEn: 'Singapore',
        policeNumber: '999',
        ambulanceNumber: '995',
        fireNumber: '995',
        embassyPhone: '+65-6418-0333',
        embassyAddress: '新加坡东陵路150号',
        notes: '新加坡警察999，消防和救护都是995',
      },
      {
        countryCode: 'MY',
        countryName: '马来西亚',
        countryNameEn: 'Malaysia',
        policeNumber: '999',
        ambulanceNumber: '999',
        fireNumber: '994',
        embassyPhone: '+60-3-2164-5301',
        embassyAddress: '吉隆坡安邦路229号',
        touristPoliceNumber: '03-2149-6590',
        notes: '马来西亚通用紧急电话999',
      },
      {
        countryCode: 'US',
        countryName: '美国',
        countryNameEn: 'United States',
        policeNumber: '911',
        ambulanceNumber: '911',
        fireNumber: '911',
        generalEmergencyNumber: '911',
        embassyPhone: '+1-202-495-2266',
        embassyAddress: '3505 International Place NW, Washington, DC 20008',
        poisonControlNumber: '1-800-222-1222',
        notes: '美国统一紧急电话911',
      },
      {
        countryCode: 'GB',
        countryName: '英国',
        countryNameEn: 'United Kingdom',
        policeNumber: '999',
        ambulanceNumber: '999',
        fireNumber: '999',
        generalEmergencyNumber: '112',
        embassyPhone: '+44-20-7299-4049',
        embassyAddress: '49-51 Portland Place, London W1B 1JL',
        notes: '英国紧急电话999，欧洲通用112也可使用',
      },
      {
        countryCode: 'FR',
        countryName: '法国',
        countryNameEn: 'France',
        policeNumber: '17',
        ambulanceNumber: '15',
        fireNumber: '18',
        generalEmergencyNumber: '112',
        embassyPhone: '+33-1-4953-8950',
        embassyAddress: '11 Avenue George V, 75008 Paris',
        notes: '法国警察17，急救15，消防18，通用112',
      },
      {
        countryCode: 'DE',
        countryName: '德国',
        countryNameEn: 'Germany',
        policeNumber: '110',
        ambulanceNumber: '112',
        fireNumber: '112',
        generalEmergencyNumber: '112',
        embassyPhone: '+49-30-27588-0',
        embassyAddress: 'Märkisches Ufer 54, 10179 Berlin',
        notes: '德国警察110，消防和急救112',
      },
      {
        countryCode: 'AU',
        countryName: '澳大利亚',
        countryNameEn: 'Australia',
        policeNumber: '000',
        ambulanceNumber: '000',
        fireNumber: '000',
        generalEmergencyNumber: '000',
        embassyPhone: '+61-2-6228-3999',
        embassyAddress: '15 Coronation Drive, Yarralumla, ACT 2600',
        notes: '澳大利亚统一紧急电话000',
      },
    ];

    const results = [];
    for (const country of countries) {
      // Check if already exists
      const existing = await ctx.db
        .query('emergencyServices')
        .withIndex('by_country', (q) =>
          q.eq('countryCode', country.countryCode)
        )
        .filter((q) => q.eq(q.field('cityName'), undefined))
        .first();

      if (!existing) {
        const id = await ctx.db.insert('emergencyServices', {
          ...country,
          lastUpdated: now,
        });
        results.push({
          countryCode: country.countryCode,
          id,
          action: 'created',
        });
      } else {
        results.push({
          countryCode: country.countryCode,
          id: existing._id,
          action: 'exists',
        });
      }
    }

    return results;
  },
});

// Get emergency guide for a specific situation
export const getEmergencyGuide = query({
  args: {
    guideType: v.union(
      v.literal('medical'),
      v.literal('theft'),
      v.literal('lost_passport'),
      v.literal('natural_disaster'),
      v.literal('accident'),
      v.literal('assault'),
      v.literal('general')
    ),
    countryCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Return emergency guide based on type
    const guides: Record<
      string,
      { title: string; titleEn: string; steps: string[]; tips: string[] }
    > = {
      medical: {
        title: '医疗紧急情况',
        titleEn: 'Medical Emergency',
        steps: [
          '1. 保持冷静，评估伤情严重程度',
          '2. 拨打当地急救电话（查看紧急服务号码）',
          '3. 如有同伴，让其联系酒店前台或当地导游',
          '4. 准备好护照和保险信息',
          '5. 记录医院名称和地址',
          '6. 联系保险公司报案',
          '7. 保留所有医疗单据和收据',
        ],
        tips: [
          '随身携带常用药物和过敏信息卡',
          '提前了解当地医院位置',
          '购买包含医疗转运的旅行保险',
          '保存保险公司24小时热线',
        ],
      },
      theft: {
        title: '财物被盗',
        titleEn: 'Theft',
        steps: [
          '1. 确保自身安全，离开危险区域',
          '2. 拨打当地报警电话',
          '3. 前往最近的警察局报案',
          '4. 获取报案回执（保险理赔必需）',
          '5. 如护照被盗，联系中国大使馆/领事馆',
          '6. 挂失银行卡和信用卡',
          '7. 联系保险公司报案',
        ],
        tips: [
          '分散存放现金和证件',
          '护照复印件与原件分开保管',
          '记录银行卡挂失电话',
          '使用酒店保险箱存放贵重物品',
        ],
      },
      lost_passport: {
        title: '护照丢失',
        titleEn: 'Lost Passport',
        steps: [
          '1. 向当地警察局报案，获取报案证明',
          '2. 联系中国大使馆或领事馆',
          '3. 准备证件照片（2寸白底）',
          '4. 携带身份证明材料（身份证复印件、户口本复印件等）',
          '5. 申请旅行证或临时护照',
          '6. 如需延长签证，联系当地移民局',
        ],
        tips: [
          '出发前将护照首页拍照保存在云端',
          '携带护照复印件和备用证件照',
          '记录大使馆地址和联系方式',
          '了解当地中国公民服务热线',
        ],
      },
      natural_disaster: {
        title: '自然灾害',
        titleEn: 'Natural Disaster',
        steps: [
          '1. 保持冷静，遵循当地官方指示',
          '2. 远离危险区域（海边、山区、建筑物等）',
          '3. 前往指定避难所或安全地点',
          '4. 与家人报平安',
          '5. 关注官方信息渠道',
          '6. 联系中国大使馆报备',
          '7. 配合当地救援安排',
        ],
        tips: [
          '了解目的地常见自然灾害类型',
          '入住时了解酒店疏散路线',
          '准备应急物资（手电筒、饮用水等）',
          '下载当地灾害预警APP',
        ],
      },
      accident: {
        title: '交通事故',
        titleEn: 'Traffic Accident',
        steps: [
          '1. 确保自身安全，开启危险警示灯',
          '2. 检查伤情，如有伤员拨打急救电话',
          '3. 拨打当地报警电话',
          '4. 拍照记录现场情况',
          '5. 交换对方联系方式和保险信息',
          '6. 等待警察到场处理',
          '7. 获取事故报告副本',
          '8. 联系租车公司和保险公司',
        ],
        tips: [
          '租车时购买全险',
          '了解当地交通规则',
          '保存租车公司紧急联系电话',
          '拍照记录租车时车辆状况',
        ],
      },
      assault: {
        title: '人身攻击',
        titleEn: 'Assault',
        steps: [
          '1. 尽快离开危险区域，前往安全地点',
          '2. 如有伤情，立即就医',
          '3. 拨打当地报警电话',
          '4. 前往警察局报案',
          '5. 联系中国大使馆/领事馆',
          '6. 保留所有证据（衣物、照片等）',
          '7. 联系家人和保险公司',
        ],
        tips: [
          '避免夜间独自外出',
          '不要前往偏僻或治安差的区域',
          '保持警惕，注意周围环境',
          '学习基本的当地求助用语',
        ],
      },
      general: {
        title: '一般紧急情况',
        titleEn: 'General Emergency',
        steps: [
          '1. 保持冷静，评估情况',
          '2. 确保自身安全',
          '3. 拨打当地紧急服务电话',
          '4. 联系酒店前台或当地导游',
          '5. 联系中国大使馆/领事馆',
          '6. 通知家人和紧急联系人',
          '7. 保留所有相关文件和收据',
        ],
        tips: [
          '出发前登记外交部"中国领事"APP',
          '保存当地紧急电话号码',
          '了解最近的中国大使馆位置',
          '购买全面的旅行保险',
        ],
      },
    };

    const guide = guides[args.guideType] || guides.general;

    // If country code provided, get emergency services
    let emergencyServices = null;
    if (args.countryCode) {
      emergencyServices = await ctx.db
        .query('emergencyServices')
        .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode!))
        .filter((q) => q.eq(q.field('cityName'), undefined))
        .first();
    }

    return {
      ...guide,
      emergencyServices,
    };
  },
});

// Get all emergency info for a location (comprehensive)
export const getComprehensiveEmergencyInfo = query({
  args: {
    countryCode: v.string(),
    cityName: v.optional(v.string()),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get emergency services
    let emergencyServices;
    if (args.cityName) {
      emergencyServices = await ctx.db
        .query('emergencyServices')
        .withIndex('by_country_city', (q) =>
          q.eq('countryCode', args.countryCode).eq('cityName', args.cityName)
        )
        .first();
    }

    // Fall back to country-level if no city-specific
    if (!emergencyServices) {
      emergencyServices = await ctx.db
        .query('emergencyServices')
        .withIndex('by_country', (q) => q.eq('countryCode', args.countryCode))
        .filter((q) => q.eq(q.field('cityName'), undefined))
        .first();
    }

    // Get user's emergency contacts if userId provided
    let emergencyContacts: Array<{
      _id: string;
      name: string;
      phoneNumber: string;
      relationship: string;
      isPrimary: boolean;
    }> = [];
    if (args.userId) {
      const contacts = await ctx.db
        .query('emergencyContacts')
        .withIndex('by_user', (q) => q.eq('userId', args.userId!))
        .collect();
      emergencyContacts = contacts.map((c) => ({
        _id: c._id,
        name: c.name,
        phoneNumber: c.phoneNumber,
        relationship: c.relationship,
        isPrimary: c.isPrimary,
      }));
    }

    // Get user's active insurance if userId provided
    let activeInsurance = null;
    if (args.userId) {
      activeInsurance = await ctx.db
        .query('travelInsurance')
        .withIndex('by_user_active', (q) =>
          q.eq('userId', args.userId!).eq('isActive', true)
        )
        .first();
    }

    return {
      emergencyServices,
      emergencyContacts,
      activeInsurance,
      quickActions: [
        {
          id: 'call_police',
          label: '报警',
          labelEn: 'Call Police',
          icon: 'shield.fill',
          number: emergencyServices?.policeNumber || '110',
          color: 'blue',
        },
        {
          id: 'call_ambulance',
          label: '急救',
          labelEn: 'Call Ambulance',
          icon: 'cross.fill',
          number: emergencyServices?.ambulanceNumber || '120',
          color: 'red',
        },
        {
          id: 'call_fire',
          label: '消防',
          labelEn: 'Call Fire',
          icon: 'flame.fill',
          number: emergencyServices?.fireNumber || '119',
          color: 'orange',
        },
        {
          id: 'call_embassy',
          label: '大使馆',
          labelEn: 'Embassy',
          icon: 'building.columns.fill',
          number: emergencyServices?.embassyPhone || null,
          color: 'purple',
        },
      ],
    };
  },
});
