/**
 * Smart Packing Service
 * AI-powered packing suggestions based on weather, activities, and trip type
 */

import type { PackingCategory, SuggestedBy } from '../models/packingList';
import { WeatherService, type DailyWeather } from './weatherService';

interface PackingSuggestion {
  name: string;
  category: PackingCategory;
  quantity: number;
  isEssential: boolean;
  suggestedBy: SuggestedBy;
  notes?: string;
}

interface WeatherBasedSuggestions {
  weather: {
    avgTemp: number;
    condition: string;
    humidity: number;
  };
  items: PackingSuggestion[];
  tips: string[];
}

interface ActivityBasedSuggestions {
  activities: string[];
  items: PackingSuggestion[];
  tips: string[];
}

// Temperature thresholds in Celsius
const TEMP_THRESHOLDS = {
  FREEZING: 0,
  COLD: 10,
  COOL: 15,
  MILD: 20,
  WARM: 25,
  HOT: 30,
};

// Weather condition mappings
const WEATHER_CONDITIONS = {
  RAIN: ['rain', 'drizzle', 'thunderstorm', 'shower', '雨', '阵雨', '雷雨', '小雨', '中雨', '大雨'],
  SNOW: ['snow', 'sleet', 'hail', '雪', '雨夹雪', '冰雹', '小雪', '中雪', '大雪'],
  SUNNY: ['clear', 'sunny', '晴', '多云转晴'],
  CLOUDY: ['cloud', 'overcast', '阴', '多云'],
  WINDY: ['wind', 'gust', '风', '大风'],
};

// Activity type mappings
const ACTIVITY_TYPES = {
  HIKING: ['hiking', 'trekking', 'mountain', '徒步', '登山', '爬山', '远足'],
  BEACH: ['beach', 'swimming', 'snorkeling', 'diving', '海滩', '游泳', '浮潜', '潜水'],
  SKIING: ['ski', 'snowboard', 'winter sports', '滑雪', '单板', '冬季运动'],
  CITY: ['city', 'urban', 'sightseeing', 'museum', '城市', '观光', '博物馆', '购物'],
  BUSINESS: ['business', 'meeting', 'conference', '商务', '会议'],
  PHOTOGRAPHY: ['photography', 'photo', 'camera', '摄影', '拍照'],
  CAMPING: ['camping', 'outdoor', '露营', '户外'],
};

/**
 * Smart Packing Service
 */
export class SmartPackingService {
  /**
   * Get weather-based packing suggestions
   */
  static async getWeatherSuggestions(
    lat: number,
    lon: number,
    startDate?: string,
    endDate?: string
  ): Promise<WeatherBasedSuggestions> {
    const items: PackingSuggestion[] = [];
    const tips: string[] = [];

    // Fetch weather data
    let weatherData: DailyWeather[] = [];
    if (startDate && endDate) {
      weatherData = await WeatherService.getDailyWeather(lat, lon, startDate, endDate);
    } else {
      const forecast = await WeatherService.getForecast(lat, lon);
      if (forecast) {
        weatherData = forecast.daily;
      }
    }

    if (weatherData.length === 0) {
      return {
        weather: { avgTemp: 20, condition: 'unknown', humidity: 50 },
        items: this.getDefaultItems(),
        tips: ['Unable to fetch weather data. Pack for variable conditions.'],
      };
    }

    // Calculate average weather conditions
    const avgTemp = weatherData.reduce((sum, d) => sum + (d.tempMax + d.tempMin) / 2, 0) / weatherData.length;
    const avgHumidity = weatherData.reduce((sum, d) => sum + d.humidity, 0) / weatherData.length;
    const conditions = weatherData.map(d => d.condition.toLowerCase());
    const primaryCondition = this.getPrimaryCondition(conditions);

    // Temperature-based suggestions
    items.push(...this.getTemperatureItems(avgTemp));
    tips.push(...this.getTemperatureTips(avgTemp));

    // Weather condition-based suggestions
    items.push(...this.getConditionItems(conditions));
    tips.push(...this.getConditionTips(conditions));

    // Humidity-based suggestions
    if (avgHumidity > 70) {
      items.push({
        name: '速干毛巾',
        category: 'toiletries',
        quantity: 1,
        isEssential: false,
        suggestedBy: 'weather',
        notes: '高湿度环境，推荐速干材质',
      });
      tips.push('目的地湿度较高，建议携带速干衣物');
    }

    // UV protection for sunny conditions
    if (this.hasCondition(conditions, WEATHER_CONDITIONS.SUNNY)) {
      items.push(
        {
          name: '防晒霜',
          category: 'toiletries',
          quantity: 1,
          isEssential: true,
          suggestedBy: 'weather',
          notes: 'SPF 30+ 推荐',
        },
        {
          name: '太阳镜',
          category: 'accessories',
          quantity: 1,
          isEssential: false,
          suggestedBy: 'weather',
        },
        {
          name: '遮阳帽',
          category: 'accessories',
          quantity: 1,
          isEssential: false,
          suggestedBy: 'weather',
        }
      );
      tips.push('预报显示晴天较多，注意防晒');
    }

    // Deduplicate items
    const uniqueItems = this.deduplicateItems(items);

    return {
      weather: {
        avgTemp: Math.round(avgTemp),
        condition: primaryCondition,
        humidity: Math.round(avgHumidity),
      },
      items: uniqueItems,
      tips: [...new Set(tips)],
    };
  }

  /**
   * Get activity-based packing suggestions
   */
  static getActivitySuggestions(
    activities: string[],
    tripType?: string
  ): ActivityBasedSuggestions {
    const items: PackingSuggestion[] = [];
    const tips: string[] = [];
    const detectedActivities: string[] = [];

    // Detect activities from provided list
    for (const activity of activities) {
      const lowerActivity = activity.toLowerCase();

      if (this.matchesActivity(lowerActivity, ACTIVITY_TYPES.HIKING)) {
        detectedActivities.push('hiking');
        items.push(...this.getHikingItems());
        tips.push(...this.getHikingTips());
      }

      if (this.matchesActivity(lowerActivity, ACTIVITY_TYPES.BEACH)) {
        detectedActivities.push('beach');
        items.push(...this.getBeachItems());
        tips.push(...this.getBeachTips());
      }

      if (this.matchesActivity(lowerActivity, ACTIVITY_TYPES.SKIING)) {
        detectedActivities.push('skiing');
        items.push(...this.getSkiingItems());
        tips.push(...this.getSkiingTips());
      }

      if (this.matchesActivity(lowerActivity, ACTIVITY_TYPES.CITY)) {
        detectedActivities.push('city');
        items.push(...this.getCityItems());
        tips.push(...this.getCityTips());
      }

      if (this.matchesActivity(lowerActivity, ACTIVITY_TYPES.BUSINESS)) {
        detectedActivities.push('business');
        items.push(...this.getBusinessItems());
        tips.push(...this.getBusinessTips());
      }

      if (this.matchesActivity(lowerActivity, ACTIVITY_TYPES.PHOTOGRAPHY)) {
        detectedActivities.push('photography');
        items.push(...this.getPhotographyItems());
        tips.push(...this.getPhotographyTips());
      }

      if (this.matchesActivity(lowerActivity, ACTIVITY_TYPES.CAMPING)) {
        detectedActivities.push('camping');
        items.push(...this.getCampingItems());
        tips.push(...this.getCampingTips());
      }
    }

    // Add trip type specific items
    if (tripType) {
      items.push(...this.getTripTypeItems(tripType as any));
      tips.push(...this.getTripTypeTips(tripType as any));
    }

    // Always add essential items
    items.push(...this.getEssentialItems());

    // Deduplicate
    const uniqueItems = this.deduplicateItems(items);

    return {
      activities: [...new Set(detectedActivities)],
      items: uniqueItems,
      tips: [...new Set(tips)],
    };
  }

  /**
   * Get comprehensive smart suggestions
   */
  static async getSmartSuggestions(params: {
    lat?: number;
    lon?: number;
    startDate?: string;
    endDate?: string;
    activities?: string[];
    tripType?: string;
    destination?: string;
  }): Promise<{
    weatherSuggestions?: WeatherBasedSuggestions;
    activitySuggestions?: ActivityBasedSuggestions;
    allItems: PackingSuggestion[];
    allTips: string[];
  }> {
    const allItems: PackingSuggestion[] = [];
    const allTips: string[] = [];

    let weatherSuggestions: WeatherBasedSuggestions | undefined;
    let activitySuggestions: ActivityBasedSuggestions | undefined;

    // Get weather-based suggestions
    if (params.lat !== undefined && params.lon !== undefined) {
      weatherSuggestions = await this.getWeatherSuggestions(
        params.lat,
        params.lon,
        params.startDate,
        params.endDate
      );
      allItems.push(...weatherSuggestions.items);
      allTips.push(...weatherSuggestions.tips);
    }

    // Get activity-based suggestions
    if (params.activities && params.activities.length > 0) {
      activitySuggestions = this.getActivitySuggestions(
        params.activities,
        params.tripType
      );
      allItems.push(...activitySuggestions.items);
      allTips.push(...activitySuggestions.tips);
    } else if (params.tripType) {
      // If no activities but have trip type, still get suggestions
      activitySuggestions = this.getActivitySuggestions([], params.tripType);
      allItems.push(...activitySuggestions.items);
      allTips.push(...activitySuggestions.tips);
    }

    // Add essential items if nothing else
    if (allItems.length === 0) {
      allItems.push(...this.getEssentialItems());
      allItems.push(...this.getDefaultItems());
      allTips.push('基础必备物品建议');
    }

    // Deduplicate all items
    const uniqueItems = this.deduplicateItems(allItems);

    return {
      weatherSuggestions,
      activitySuggestions,
      allItems: uniqueItems,
      allTips: [...new Set(allTips)],
    };
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private static getPrimaryCondition(conditions: string[]): string {
    const conditionCounts: Record<string, number> = {};

    for (const condition of conditions) {
      for (const [name, keywords] of Object.entries(WEATHER_CONDITIONS)) {
        if (keywords.some(k => condition.includes(k.toLowerCase()))) {
          conditionCounts[name] = (conditionCounts[name] || 0) + 1;
        }
      }
    }

    const sorted = Object.entries(conditionCounts).sort((a, b) => b[1] - a[1]);
    return sorted.length > 0 ? sorted[0][0].toLowerCase() : 'mixed';
  }

  private static hasCondition(conditions: string[], keywords: string[]): boolean {
    return conditions.some(c =>
      keywords.some(k => c.toLowerCase().includes(k.toLowerCase()))
    );
  }

  private static matchesActivity(activity: string, keywords: string[]): boolean {
    return keywords.some(k => activity.includes(k.toLowerCase()));
  }

  private static deduplicateItems(items: PackingSuggestion[]): PackingSuggestion[] {
    const seen = new Map<string, PackingSuggestion>();

    for (const item of items) {
      const key = item.name.toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, item);
      } else {
        // Keep the one marked as essential
        const existing = seen.get(key)!;
        if (item.isEssential && !existing.isEssential) {
          seen.set(key, item);
        }
      }
    }

    return Array.from(seen.values());
  }

  // Temperature-based items
  private static getTemperatureItems(avgTemp: number): PackingSuggestion[] {
    const items: PackingSuggestion[] = [];

    if (avgTemp <= TEMP_THRESHOLDS.FREEZING) {
      items.push(
        { name: '羽绒服', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'weather', notes: '零下气温必备' },
        { name: '保暖内衣', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'weather' },
        { name: '羊毛袜', category: 'clothing', quantity: 3, isEssential: true, suggestedBy: 'weather' },
        { name: '保暖手套', category: 'accessories', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '围巾', category: 'accessories', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '保暖帽', category: 'accessories', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '暖宝宝', category: 'accessories', quantity: 10, isEssential: false, suggestedBy: 'weather' }
      );
    } else if (avgTemp <= TEMP_THRESHOLDS.COLD) {
      items.push(
        { name: '厚外套/羽绒服', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '毛衣', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'weather' },
        { name: '长裤', category: 'clothing', quantity: 3, isEssential: true, suggestedBy: 'weather' },
        { name: '保暖袜', category: 'clothing', quantity: 3, isEssential: false, suggestedBy: 'weather' }
      );
    } else if (avgTemp <= TEMP_THRESHOLDS.COOL) {
      items.push(
        { name: '轻薄外套', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '长袖衬衫', category: 'clothing', quantity: 3, isEssential: true, suggestedBy: 'weather' },
        { name: '长裤', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'weather' }
      );
    } else if (avgTemp <= TEMP_THRESHOLDS.MILD) {
      items.push(
        { name: '薄外套', category: 'clothing', quantity: 1, isEssential: false, suggestedBy: 'weather' },
        { name: 'T恤', category: 'clothing', quantity: 4, isEssential: true, suggestedBy: 'weather' },
        { name: '长裤/休闲裤', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'weather' }
      );
    } else if (avgTemp <= TEMP_THRESHOLDS.WARM) {
      items.push(
        { name: 'T恤/短袖', category: 'clothing', quantity: 5, isEssential: true, suggestedBy: 'weather' },
        { name: '短裤', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'weather' },
        { name: '凉鞋', category: 'clothing', quantity: 1, isEssential: false, suggestedBy: 'weather' }
      );
    } else {
      items.push(
        { name: '透气T恤', category: 'clothing', quantity: 6, isEssential: true, suggestedBy: 'weather', notes: '高温天气多带几件换洗' },
        { name: '短裤', category: 'clothing', quantity: 3, isEssential: true, suggestedBy: 'weather' },
        { name: '凉鞋/拖鞋', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '便携风扇', category: 'electronics', quantity: 1, isEssential: false, suggestedBy: 'weather' },
        { name: '清凉喷雾', category: 'toiletries', quantity: 1, isEssential: false, suggestedBy: 'weather' }
      );
    }

    return items;
  }

  private static getTemperatureTips(avgTemp: number): string[] {
    const tips: string[] = [];

    if (avgTemp <= TEMP_THRESHOLDS.FREEZING) {
      tips.push('目的地气温极低，注意分层穿衣保暖');
      tips.push('建议携带保温杯喝热水');
    } else if (avgTemp <= TEMP_THRESHOLDS.COLD) {
      tips.push('目的地较冷，建议穿搭保暖外套');
    } else if (avgTemp >= TEMP_THRESHOLDS.HOT) {
      tips.push('目的地气温较高，注意防暑降温');
      tips.push('建议携带充足饮用水');
    }

    return tips;
  }

  // Weather condition-based items
  private static getConditionItems(conditions: string[]): PackingSuggestion[] {
    const items: PackingSuggestion[] = [];

    if (this.hasCondition(conditions, WEATHER_CONDITIONS.RAIN)) {
      items.push(
        { name: '雨伞', category: 'accessories', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '雨衣', category: 'clothing', quantity: 1, isEssential: false, suggestedBy: 'weather' },
        { name: '防水背包罩', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'weather' },
        { name: '防水鞋套', category: 'accessories', quantity: 1, isEssential: false, suggestedBy: 'weather' }
      );
    }

    if (this.hasCondition(conditions, WEATHER_CONDITIONS.SNOW)) {
      items.push(
        { name: '防滑雪地靴', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '防水手套', category: 'accessories', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '护目镜', category: 'accessories', quantity: 1, isEssential: false, suggestedBy: 'weather', notes: '防雪盲' }
      );
    }

    if (this.hasCondition(conditions, WEATHER_CONDITIONS.WINDY)) {
      items.push(
        { name: '防风外套', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'weather' },
        { name: '防风帽/头巾', category: 'accessories', quantity: 1, isEssential: false, suggestedBy: 'weather' }
      );
    }

    return items;
  }

  private static getConditionTips(conditions: string[]): string[] {
    const tips: string[] = [];

    if (this.hasCondition(conditions, WEATHER_CONDITIONS.RAIN)) {
      tips.push('预报有雨，建议携带雨具');
    }
    if (this.hasCondition(conditions, WEATHER_CONDITIONS.SNOW)) {
      tips.push('预报有雪，注意防滑和保暖');
    }

    return tips;
  }

  // Activity-specific items
  private static getHikingItems(): PackingSuggestion[] {
    return [
      { name: '登山鞋', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '登山杖', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'activity' },
      { name: '速干衣裤', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'activity' },
      { name: '登山包', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '水袋/水壶', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '能量棒/零食', category: 'snacks', quantity: 5, isEssential: true, suggestedBy: 'activity' },
      { name: '急救包', category: 'medicine', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '头灯/手电', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '防晒衣', category: 'clothing', quantity: 1, isEssential: false, suggestedBy: 'activity' },
    ];
  }

  private static getHikingTips(): string[] {
    return [
      '登山前检查装备完整性',
      '建议结伴而行，注意安全',
      '携带充足的水和食物',
    ];
  }

  private static getBeachItems(): PackingSuggestion[] {
    return [
      { name: '泳衣', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'activity' },
      { name: '沙滩巾', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '人字拖', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '防水袋', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '浮潜面镜', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'activity' },
      { name: '防晒霜', category: 'toiletries', quantity: 1, isEssential: true, suggestedBy: 'activity', notes: 'SPF 50+ 防水型' },
      { name: '晒后修复', category: 'toiletries', quantity: 1, isEssential: false, suggestedBy: 'activity' },
      { name: '沙滩帽', category: 'accessories', quantity: 1, isEssential: true, suggestedBy: 'activity' },
    ];
  }

  private static getBeachTips(): string[] {
    return [
      '注意防晒，避免晒伤',
      '贵重物品请勿留在海滩',
      '注意潮汐时间和安全区域',
    ];
  }

  private static getSkiingItems(): PackingSuggestion[] {
    return [
      { name: '滑雪服', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '滑雪手套', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '护目镜', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '头盔', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '保暖内衣', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'activity' },
      { name: '护膝/护腕', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'activity' },
      { name: '暖宝宝', category: 'accessories', quantity: 10, isEssential: false, suggestedBy: 'activity' },
      { name: '唇膏', category: 'toiletries', quantity: 1, isEssential: true, suggestedBy: 'activity', notes: '防止嘴唇干裂' },
    ];
  }

  private static getSkiingTips(): string[] {
    return [
      '初学者建议请教练',
      '注意保暖，避免冻伤',
      '遵守雪场规则，量力而行',
    ];
  }

  private static getCityItems(): PackingSuggestion[] {
    return [
      { name: '舒适步行鞋', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '便携背包', category: 'accessories', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '充电宝', category: 'electronics', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '休闲服装', category: 'clothing', quantity: 3, isEssential: true, suggestedBy: 'activity' },
    ];
  }

  private static getCityTips(): string[] {
    return [
      '城市观光穿舒适的鞋子',
      '建议下载离线地图',
    ];
  }

  private static getBusinessItems(): PackingSuggestion[] {
    return [
      { name: '正装/西装', category: 'clothing', quantity: 2, isEssential: true, suggestedBy: 'activity' },
      { name: '皮鞋', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '领带', category: 'accessories', quantity: 2, isEssential: false, suggestedBy: 'activity' },
      { name: '名片', category: 'documents', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '笔记本电脑', category: 'electronics', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '电源适配器', category: 'electronics', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '衬衫', category: 'clothing', quantity: 3, isEssential: true, suggestedBy: 'activity' },
    ];
  }

  private static getBusinessTips(): string[] {
    return [
      '建议携带便携熨斗或挂烫机',
      '提前确认会议地点和时间',
    ];
  }

  private static getPhotographyItems(): PackingSuggestion[] {
    return [
      { name: '相机', category: 'electronics', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '相机电池', category: 'electronics', quantity: 3, isEssential: true, suggestedBy: 'activity' },
      { name: '存储卡', category: 'electronics', quantity: 3, isEssential: true, suggestedBy: 'activity' },
      { name: '三脚架', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'activity' },
      { name: '镜头布', category: 'gear', quantity: 2, isEssential: true, suggestedBy: 'activity' },
      { name: '相机包', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '滤镜', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'activity' },
    ];
  }

  private static getPhotographyTips(): string[] {
    return [
      '提前充满所有电池',
      '备份存储卡数据',
      '注意相机防潮',
    ];
  }

  private static getCampingItems(): PackingSuggestion[] {
    return [
      { name: '帐篷', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '睡袋', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '防潮垫', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '头灯', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '户外炉具', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'activity' },
      { name: '驱蚊液', category: 'toiletries', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '多功能刀', category: 'gear', quantity: 1, isEssential: true, suggestedBy: 'activity' },
      { name: '绳索', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'activity' },
    ];
  }

  private static getCampingTips(): string[] {
    return [
      '提前了解露营地规定',
      '注意野外用火安全',
      '保持环境清洁，不留垃圾',
    ];
  }

  // Trip type specific items
  private static getTripTypeItems(tripType: string): PackingSuggestion[] {
    const items: PackingSuggestion[] = [];

    switch (tripType) {
      case 'leisure':
        items.push(
          { name: '休闲服装', category: 'clothing', quantity: 4, isEssential: true, suggestedBy: 'template' },
          { name: '舒适鞋', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'template' }
        );
        break;
      case 'adventure':
        items.push(
          { name: '运动服', category: 'clothing', quantity: 3, isEssential: true, suggestedBy: 'template' },
          { name: '急救包', category: 'medicine', quantity: 1, isEssential: true, suggestedBy: 'template' },
          { name: '指南针', category: 'gear', quantity: 1, isEssential: false, suggestedBy: 'template' }
        );
        break;
    }

    return items;
  }

  private static getTripTypeTips(tripType: string): string[] {
    const tips: string[] = [];

    switch (tripType) {
      case 'adventure':
        tips.push('冒险旅行注意安全，建议购买旅行保险');
        break;
      case 'business':
        tips.push('商务出行建议提前确认行程安排');
        break;
    }

    return tips;
  }

  // Essential items everyone should have
  private static getEssentialItems(): PackingSuggestion[] {
    return [
      { name: '身份证/护照', category: 'documents', quantity: 1, isEssential: true, suggestedBy: 'template' },
      { name: '银行卡/信用卡', category: 'documents', quantity: 1, isEssential: true, suggestedBy: 'template' },
      { name: '手机', category: 'electronics', quantity: 1, isEssential: true, suggestedBy: 'template' },
      { name: '充电器', category: 'electronics', quantity: 1, isEssential: true, suggestedBy: 'template' },
      { name: '常用药品', category: 'medicine', quantity: 1, isEssential: true, suggestedBy: 'template', notes: '感冒药、止泻药、创可贴等' },
      { name: '洗漱用品', category: 'toiletries', quantity: 1, isEssential: true, suggestedBy: 'template' },
      { name: '内衣裤', category: 'clothing', quantity: 4, isEssential: true, suggestedBy: 'template' },
      { name: '袜子', category: 'clothing', quantity: 4, isEssential: true, suggestedBy: 'template' },
    ];
  }

  // Default items when no specific suggestions
  private static getDefaultItems(): PackingSuggestion[] {
    return [
      { name: '换洗衣物', category: 'clothing', quantity: 3, isEssential: true, suggestedBy: 'template' },
      { name: '舒适鞋', category: 'clothing', quantity: 1, isEssential: true, suggestedBy: 'template' },
      { name: '充电宝', category: 'electronics', quantity: 1, isEssential: false, suggestedBy: 'template' },
      { name: '耳机', category: 'electronics', quantity: 1, isEssential: false, suggestedBy: 'template' },
      { name: '零食', category: 'snacks', quantity: 1, isEssential: false, suggestedBy: 'template' },
    ];
  }
}

export default SmartPackingService;
