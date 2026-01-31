/**
 * Chinese Cities Configuration
 * Comprehensive list of cities for travel guide crawling
 */

// 一线城市 (Tier 1)
export const TIER_1_CITIES = [
  '北京',
  '上海',
  '广州',
  '深圳',
] as const;

// 新一线城市 (New Tier 1)
export const NEW_TIER_1_CITIES = [
  '成都',
  '杭州',
  '武汉',
  '西安',
  '南京',
  '重庆',
  '天津',
  '苏州',
  '郑州',
  '长沙',
  '东莞',
  '沈阳',
  '青岛',
  '合肥',
  '佛山',
] as const;

// 旅游热门城市 (Popular Tourist Cities)
export const TOURIST_CITIES = [
  // 海滨城市
  '三亚',
  '厦门',
  '大连',
  '珠海',
  '北海',
  '威海',
  '烟台',
  '秦皇岛',
  // 历史文化名城
  '丽江',
  '大理',
  '桂林',
  '洛阳',
  '开封',
  '曲阜',
  '敦煌',
  '绍兴',
  '扬州',
  '泉州',
  // 山水风景
  '张家界',
  '黄山',
  '九寨沟',
  '峨眉山',
  '泰安',
  '庐山',
  '武夷山',
  '张掖',
  '稻城',
  '色达',
  // 民族风情
  '拉萨',
  '香格里拉',
  '西双版纳',
  '喀什',
  '伊犁',
  '呼伦贝尔',
  '阿尔山',
  '延边',
  // 古镇水乡
  '乌镇',
  '周庄',
  '凤凰古城',
  '平遥',
  '婺源',
  '阳朔',
  '西塘',
  '同里',
  // 省会及重要城市
  '呼和浩特',
  '银川',
  '西宁',
  '昆明',
  '贵阳',
  '南宁',
  '海口',
  '哈尔滨',
  '长春',
  '吉林',
  '漠河',
  '兰州',
  '太原',
  '石家庄',
  '济南',
  '福州',
  '南昌',
  '无锡',
  '常州',
  '宁波',
  '温州',
  '金华',
] as const;

// 去重后的完整城市列表
export const ALL_CITIES: string[] = [
  ...new Set([
    ...TIER_1_CITIES,
    ...NEW_TIER_1_CITIES,
    ...TOURIST_CITIES,
  ]),
];

// 城市分类类型
export type CityCategory = 'tier1' | 'newTier1' | 'tourist' | 'all';

/**
 * Get cities by category
 */
export function getCitiesByCategory(category: CityCategory): readonly string[] {
  switch (category) {
    case 'tier1':
      return TIER_1_CITIES;
    case 'newTier1':
      return NEW_TIER_1_CITIES;
    case 'tourist':
      return TOURIST_CITIES;
    case 'all':
    default:
      return ALL_CITIES;
  }
}

/**
 * Validate if a city is in the configuration
 */
export function isValidCity(city: string): boolean {
  return ALL_CITIES.includes(city);
}

/**
 * Get all supported platforms for crawling
 */
export const SUPPORTED_PLATFORMS = [
  'ctrip',
  'mafengwo',
  'tongcheng',
  'qunar',
  'qyer',
  'xiaohongshu',
] as const;

export type SupportedPlatform = (typeof SUPPORTED_PLATFORMS)[number];

/**
 * Validate if a platform is supported
 */
export function isValidPlatform(platform: string): platform is SupportedPlatform {
  return SUPPORTED_PLATFORMS.includes(platform as SupportedPlatform);
}
