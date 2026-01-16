/**
 * Sentiment Analyzer
 * Analyzes sentiment of Chinese text using keyword matching
 */

import type { SentimentLabel } from '@pathfinding/crawler-types';

/**
 * Positive keywords for sentiment analysis
 */
const POSITIVE_KEYWORDS = [
  // Food & Taste
  '好吃',
  '美味',
  '鲜美',
  '可口',
  '香',
  '嫩',
  '入味',
  '地道',
  '正宗',
  // Service
  '热情',
  '周到',
  '贴心',
  '专业',
  '耐心',
  '细心',
  '服务好',
  // General
  '推荐',
  '值得',
  '满意',
  '喜欢',
  '棒',
  '赞',
  '不错',
  '很好',
  '超好',
  '惊艳',
  '惊喜',
  '完美',
  '优秀',
  '出色',
  '一流',
  '顶级',
  // Experience
  '舒适',
  '干净',
  '整洁',
  '温馨',
  '浪漫',
  '氛围好',
  '环境好',
  '性价比高',
  '实惠',
  '划算',
  '物超所值',
  // Repeat visit
  '还会再来',
  '下次还来',
  '回头客',
  '常来',
  '必去',
  '必吃',
];

/**
 * Negative keywords for sentiment analysis
 */
const NEGATIVE_KEYWORDS = [
  // Food & Taste
  '难吃',
  '不好吃',
  '太咸',
  '太淡',
  '太油',
  '太辣',
  '不新鲜',
  '变质',
  // Service
  '态度差',
  '服务差',
  '不耐烦',
  '慢',
  '等太久',
  '冷漠',
  '敷衍',
  // General
  '差评',
  '失望',
  '不推荐',
  '不值',
  '坑',
  '踩雷',
  '避雷',
  '黑店',
  '后悔',
  '上当',
  '骗人',
  '虚假',
  '夸大',
  // Experience
  '脏',
  '乱',
  '差',
  '吵',
  '臭',
  '难闻',
  '不卫生',
  '贵',
  '太贵',
  '宰客',
  '性价比低',
  // Issues
  '投诉',
  '退款',
  '食物中毒',
  '拉肚子',
  '过敏',
];

/**
 * Intensifier words that amplify sentiment
 */
const INTENSIFIERS = [
  '非常',
  '特别',
  '超级',
  '极其',
  '太',
  '真的',
  '确实',
  '绝对',
  '相当',
  '十分',
  '格外',
  '尤其',
  '无比',
];

/**
 * Negation words that flip sentiment
 */
const NEGATIONS = [
  '不',
  '没',
  '没有',
  '不是',
  '不太',
  '不够',
  '不怎么',
  '并不',
];

export interface SentimentResult {
  score: number; // -1 to 1
  label: SentimentLabel;
  confidence: number; // 0 to 1
  keywords: string[];
}

/**
 * Analyze sentiment of Chinese text
 */
export function analyzeSentiment(text: string): SentimentResult {
  if (!text || text.trim().length === 0) {
    return {
      score: 0,
      label: 'neutral',
      confidence: 0,
      keywords: [],
    };
  }

  const normalizedText = text.toLowerCase();
  const foundKeywords: string[] = [];
  let positiveScore = 0;
  let negativeScore = 0;

  // Check for positive keywords
  for (const keyword of POSITIVE_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      foundKeywords.push(keyword);

      // Check for negation before the keyword
      const keywordIndex = normalizedText.indexOf(keyword);
      const precedingText = normalizedText.slice(
        Math.max(0, keywordIndex - 5),
        keywordIndex
      );

      if (NEGATIONS.some((neg) => precedingText.includes(neg))) {
        negativeScore += 1; // Negated positive = negative
      } else {
        // Check for intensifier
        if (INTENSIFIERS.some((int) => precedingText.includes(int))) {
          positiveScore += 1.5;
        } else {
          positiveScore += 1;
        }
      }
    }
  }

  // Check for negative keywords
  for (const keyword of NEGATIVE_KEYWORDS) {
    if (normalizedText.includes(keyword)) {
      foundKeywords.push(keyword);

      // Check for negation before the keyword
      const keywordIndex = normalizedText.indexOf(keyword);
      const precedingText = normalizedText.slice(
        Math.max(0, keywordIndex - 5),
        keywordIndex
      );

      if (NEGATIONS.some((neg) => precedingText.includes(neg))) {
        positiveScore += 0.5; // Negated negative = weak positive
      } else {
        // Check for intensifier
        if (INTENSIFIERS.some((int) => precedingText.includes(int))) {
          negativeScore += 1.5;
        } else {
          negativeScore += 1;
        }
      }
    }
  }

  // Calculate final score
  const totalScore = positiveScore + negativeScore;
  let score = 0;
  let confidence = 0;

  if (totalScore > 0) {
    score = (positiveScore - negativeScore) / totalScore;
    confidence = Math.min(1, totalScore / 5); // More keywords = higher confidence
  }

  // Determine label
  let label: SentimentLabel;
  if (score > 0.2) {
    label = 'positive';
  } else if (score < -0.2) {
    label = 'negative';
  } else {
    label = 'neutral';
  }

  return {
    score: Math.round(score * 100) / 100,
    label,
    confidence: Math.round(confidence * 100) / 100,
    keywords: [...new Set(foundKeywords)],
  };
}

/**
 * Batch analyze sentiment for multiple texts
 */
export function batchAnalyzeSentiment(texts: string[]): SentimentResult[] {
  return texts.map(analyzeSentiment);
}

/**
 * Get sentiment statistics for a collection of reviews
 */
export function getSentimentStats(results: SentimentResult[]): {
  averageScore: number;
  distribution: { positive: number; neutral: number; negative: number };
  topKeywords: string[];
} {
  if (results.length === 0) {
    return {
      averageScore: 0,
      distribution: { positive: 0, neutral: 0, negative: 0 },
      topKeywords: [],
    };
  }

  const distribution = { positive: 0, neutral: 0, negative: 0 };
  const keywordCounts = new Map<string, number>();
  let totalScore = 0;

  for (const result of results) {
    totalScore += result.score;
    distribution[result.label]++;

    for (const keyword of result.keywords) {
      keywordCounts.set(keyword, (keywordCounts.get(keyword) || 0) + 1);
    }
  }

  // Get top keywords
  const topKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([keyword]) => keyword);

  return {
    averageScore: Math.round((totalScore / results.length) * 100) / 100,
    distribution,
    topKeywords,
  };
}
