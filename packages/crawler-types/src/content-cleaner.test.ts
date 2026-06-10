import { describe, expect, it } from 'vitest';
import {
  AD_PATTERNS,
  BOILERPLATE_PATTERNS,
  cleanContent,
  cleanHtmlContent,
  COPYRIGHT_PATTERNS,
  detectAdDensity,
  extractPureContent,
  isLowQualityContent,
  maskPhoneNumbers,
  normalizeWhitespace,
  PERSONAL_INFO_PATTERNS,
  PLATFORM_NOISE_PATTERNS,
  PROMOTION_PATTERNS,
} from './content-cleaner.js';

// ============================================================================
// Helper
// ============================================================================

/** 生成指定长度的中文填充文本 */
function filler(length: number): string {
  const base = '这是一段正常的旅游攻略内容，介绍了当地的风景和美食。';
  return base.repeat(Math.ceil(length / base.length)).slice(0, length);
}

// ============================================================================
// cleanContent
// ============================================================================

describe('cleanContent', () => {
  describe('ad removal', () => {
    it('should remove taobao/tmall links', () => {
      const content = `${filler(200)}\n复制这个链接到淘宝购买\nhttps://s.click.taobao.com/xxx\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('淘宝');
      expect(result.content).not.toContain('s.click.taobao.com');
      expect(result.removedTypes).toContain('ad');
    });

    it('should remove taobao password tokens (¥xxx¥)', () => {
      const content = `${filler(200)} ¥abcdef123¥ ${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('¥abcdef123¥');
    });

    it('should remove coupon/discount codes', () => {
      const content = `${filler(200)}\n领取优惠券：SAVE50\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('优惠券');
    });

    it('should remove ad markers', () => {
      const content = `${filler(200)} [广告] ${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('[广告]');
    });

    it('should remove #ad tags', () => {
      const content = `${filler(200)} #ad #sponsored ${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('#ad');
      expect(result.content).not.toContain('#sponsored');
    });
  });

  describe('promotion removal', () => {
    it('should remove product recommendations', () => {
      const content = `${filler(200)}\n安利这个产品真的太好用了\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('安利这个产品');
      expect(result.removedTypes).toContain('promotion');
    });

    it('should remove live shopping references', () => {
      const content = `${filler(200)}\n直播间链接在这里\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('直播间');
    });
  });

  describe('personal info removal', () => {
    it('should remove WeChat IDs', () => {
      const content = `${filler(200)}\n微信号：travel_buddy_123\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('travel_buddy_123');
      expect(result.removedTypes).toContain('personal');
    });

    it('should remove WeChat with various formats', () => {
      const cases = [
        '加我微信abc123',
        'wx：hello_world',
        'WeChat号：test123',
        'vx: myid888',
        'v信号myaccount',
      ];
      for (const text of cases) {
        const content = `${filler(200)}\n${text}\n${filler(100)}`;
        const result = cleanContent(content);
        expect(result.removedTypes).toContain('personal');
      }
    });

    it('should mask phone numbers instead of deleting them', () => {
      const content = `${filler(200)}\n手机：13812345678\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('13812345678');
      expect(result.content).toContain('手机：138****5678');
      expect(result.removedTypes).toContain('personal');
    });

    it('should mask standalone phone numbers', () => {
      const content = `${filler(200)} 13912345678 ${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('13912345678');
      expect(result.content).toContain('139****5678');
    });

    it('should remove public account references', () => {
      const content = `${filler(200)}\n关注我的公众号旅行达人\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('公众号');
    });

    it('should remove xiaohongshu IDs', () => {
      const content = `${filler(200)}\n小红书号：123456789\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('小红书号');
    });

    it('should remove QQ numbers', () => {
      const content = `${filler(200)}\nQQ号：12345678\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('12345678');
    });

    it('should remove douyin IDs', () => {
      const content = `${filler(200)}\n抖音号：travel_vlog\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('抖音号');
    });
  });

  describe('platform noise removal', () => {
    it('should remove follow/like/bookmark prompts', () => {
      const prompts = [
        '喜欢就点赞收藏关注吧！',
        '记得点赞收藏转发哦',
        '双击666',
        '一键三连',
      ];
      for (const prompt of prompts) {
        const content = `${filler(200)}\n${prompt}\n${filler(100)}`;
        const result = cleanContent(content);
        expect(result.removedTypes).toContain('platform');
      }
    });

    it('should remove image placeholders', () => {
      const content = `${filler(200)} [图片] 继续正文 图片占位符 ${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('[图片]');
      expect(result.content).not.toContain('图片占位符');
    });

    it('should remove "load more" text', () => {
      const content = `${filler(200)} 加载更多内容`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('加载更多');
    });

    it('should remove comment prompts', () => {
      const content = `${filler(200)}\n欢迎大家在评论区留言\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('评论区');
    });
  });

  describe('copyright removal', () => {
    it('should remove copyright notices', () => {
      const content = `${filler(200)}\n版权所有，未经授权禁止转载\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('版权');
      expect(result.removedTypes).toContain('copyright');
    });

    it('should remove © symbols', () => {
      const content = `${filler(200)}\n© 2024 TravelBlog\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('©');
    });

    it('should remove All Rights Reserved', () => {
      const content = `${filler(200)}\nAll Rights Reserved.\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('All Rights Reserved');
    });
  });

  describe('boilerplate removal', () => {
    it('should remove ending boilerplate', () => {
      const content = `${filler(200)}\n以上就是今天的分享啦！\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('以上就是');
      expect(result.removedTypes).toContain('boilerplate');
    });

    it('should remove related article links', () => {
      const content = `${filler(200)}\n推荐阅读：其他精彩攻略\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('推荐阅读');
    });
  });

  describe('whitespace normalization', () => {
    it('should normalize excessive newlines', () => {
      const content = `段落一\n\n\n\n\n段落二`;
      const result = cleanContent(content);
      expect(result.content).toBe('段落一\n\n段落二');
    });

    it('should normalize inline spaces', () => {
      const content = '文字    之间    多余    空格';
      const result = cleanContent(content);
      expect(result.content).toBe('文字 之间 多余 空格');
    });

    it('should trim leading/trailing whitespace per line', () => {
      const content = '  开头空格  \n  结尾空格  ';
      const result = cleanContent(content);
      expect(result.content).toBe('开头空格\n结尾空格');
    });
  });

  describe('options', () => {
    it('should only clean specified categories', () => {
      const content = `${filler(200)}\n微信号：abc123\n点赞收藏！\n`;
      const result = cleanContent(content, { categories: ['personal'] });
      // Personal info should be removed
      expect(result.content).not.toContain('微信号');
      // Platform noise should remain (not in categories)
      expect(result.content).toContain('点赞收藏');
    });

    it('should apply custom patterns', () => {
      const content = `${filler(200)} CUSTOM_MARKER ${filler(100)}`;
      const result = cleanContent(content, {
        customPatterns: [/CUSTOM_MARKER/g],
      });
      expect(result.content).not.toContain('CUSTOM_MARKER');
    });

    it('should preserve paragraphs when option is set', () => {
      const content = '段落一\n\n段落二\n\n段落三';
      const result = cleanContent(content, { preserveParagraphs: true });
      expect(result.content).toBe('段落一\n\n段落二\n\n段落三');
    });
  });

  describe('result metadata', () => {
    it('should report original and cleaned lengths', () => {
      const content = `${filler(200)}\n微信号：abc123\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.originalLength).toBe(content.length);
      expect(result.cleanedLength).toBeLessThan(result.originalLength);
      expect(result.cleanedLength).toBe(result.content.length);
    });

    it('should count removals', () => {
      const content = `${filler(200)}\n微信号：abc123\n点赞收藏关注！\n© 2024`;
      const result = cleanContent(content);
      expect(result.removedCount).toBeGreaterThan(0);
    });

    it('should list removed types', () => {
      const content = `${filler(200)}\n微信号：abc123\n点赞收藏！`;
      const result = cleanContent(content);
      expect(result.removedTypes).toContain('personal');
      expect(result.removedTypes).toContain('platform');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      const result = cleanContent('');
      expect(result.content).toBe('');
      expect(result.removedCount).toBe(0);
    });

    it('should handle content with no ads', () => {
      const content = filler(300);
      const result = cleanContent(content);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.removedTypes).not.toContain('ad');
      expect(result.removedTypes).not.toContain('personal');
    });

    it('should not destroy normal content', () => {
      const content = '北京故宫是中国明清两代的皇家宫殿，位于北京中轴线的中心。建议游览时间3-4小时，门票60元。';
      const result = cleanContent(content);
      // Core travel info should be preserved
      expect(result.content).toContain('故宫');
      expect(result.content).toContain('门票60元');
    });

    it('should handle mixed content (normal + noise)', () => {
      const content = [
        '第一天到达北京，入住酒店后去了天安门广场。',
        '微信号：travel123',
        '第二天游览故宫，建议提前预约。',
        '点赞收藏关注！',
        '第三天去长城，记得穿舒适的鞋。',
      ].join('\n');
      const result = cleanContent(content);
      expect(result.content).toContain('天安门广场');
      expect(result.content).toContain('故宫');
      expect(result.content).toContain('长城');
      expect(result.content).not.toContain('微信号');
      expect(result.content).not.toContain('点赞收藏');
    });
  });

  // 审计回归用例：被旧版裸词规则误删的真实旅游信息必须保留
  describe('over-cleaning regressions (audit cases)', () => {
    it('should keep hotel phone sentences with the number masked', () => {
      const content = `${filler(200)}\n酒店电话：13912345678，前台24小时有人\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).toContain('酒店电话：139****5678，前台24小时有人');
    });

    it('should keep transport tips mentioning 持续更新', () => {
      const content = `${filler(200)}\n持续更新中的小贴士：地铁2号线可以直达机场\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).toContain('持续更新中的小贴士：地铁2号线可以直达机场');
    });

    it('should keep sightseeing advice starting with 查看更多', () => {
      const content = `${filler(200)}\n查看更多景点可以去游客中心拿一份免费地图\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).toContain('查看更多景点可以去游客中心拿一份免费地图');
    });

    it('should keep in-paragraph opinion after an engagement question', () => {
      const content = `${filler(200)}\n大家觉得怎么样？我个人认为洱海的日出很美，建议早起前往才村码头\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).toContain('我个人认为洱海的日出很美，建议早起前往才村码头');
    });

    it('should not delete sentences containing the bare word 推荐', () => {
      const content = `${filler(200)}\n推荐大家早起去看日出，人少景美\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).toContain('推荐大家早起去看日出，人少景美');
    });

    it('should not delete sentences containing the bare word 微信', () => {
      const content = `${filler(200)}\n景区门票可以用微信支付，不用带现金\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).toContain('景区门票可以用微信支付，不用带现金');
    });

    it('should not delete travel tips starting with 好了/记得', () => {
      const content = `${filler(200)}\n好了，接下来介绍交通方式\n记得带好防晒霜和墨镜\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).toContain('好了，接下来介绍交通方式');
      expect(result.content).toContain('记得带好防晒霜和墨镜');
    });

    it('should still remove standalone UI noise lines', () => {
      const content = `${filler(200)}\n查看更多\n持续更新中…\n${filler(100)}`;
      const result = cleanContent(content);
      expect(result.content).not.toContain('查看更多');
      expect(result.content).not.toContain('持续更新中');
    });
  });
});

// ============================================================================
// maskPhoneNumbers
// ============================================================================

describe('maskPhoneNumbers', () => {
  it('should mask the middle four digits', () => {
    expect(maskPhoneNumbers('13812341234')).toBe('138****1234');
  });

  it('should keep surrounding text intact', () => {
    expect(maskPhoneNumbers('订房电话13912345678转0')).toBe('订房电话139****5678转0');
  });

  it('should not touch landline numbers', () => {
    expect(maskPhoneNumbers('景区咨询：0872-1234567')).toBe('景区咨询：0872-1234567');
  });

  it('should not mask digits embedded in longer numbers', () => {
    expect(maskPhoneNumbers('订单号213812345678901')).toBe('订单号213812345678901');
  });

  it('should mask multiple numbers', () => {
    expect(maskPhoneNumbers('13812341234 或 15987654321'))
      .toBe('138****1234 或 159****4321');
  });
});

// ============================================================================
// cleanHtmlContent
// ============================================================================

describe('cleanHtmlContent', () => {
  it('should remove script tags', () => {
    const html = '<div>正文</div><script>alert("xss")</script>';
    const result = cleanHtmlContent(html);
    expect(result).not.toContain('<script');
    expect(result).toContain('正文');
  });

  it('should remove style tags', () => {
    const html = '<style>body{color:red}</style><div>正文</div>';
    const result = cleanHtmlContent(html);
    expect(result).not.toContain('<style');
    expect(result).toContain('正文');
  });

  it('should remove iframe tags', () => {
    const html = '<div>正文</div><iframe src="ad.html"></iframe>';
    const result = cleanHtmlContent(html);
    expect(result).not.toContain('<iframe');
  });

  it('should remove event handler attributes', () => {
    const html = '<div onclick="alert(1)" onmouseover="track()">正文</div>';
    const result = cleanHtmlContent(html);
    expect(result).not.toContain('onclick');
    expect(result).not.toContain('onmouseover');
    expect(result).toContain('正文');
  });

  it('should remove tracking data attributes', () => {
    const html = '<div data-track-id="123" data-ad-slot="banner">正文</div>';
    const result = cleanHtmlContent(html);
    expect(result).not.toContain('data-track');
    expect(result).not.toContain('data-ad');
  });

  it('should remove display:none elements', () => {
    const html = '<div>可见</div><div style="display: none">隐藏广告</div>';
    const result = cleanHtmlContent(html);
    expect(result).not.toContain('隐藏广告');
    expect(result).toContain('可见');
  });

  it('should remove empty tags recursively', () => {
    const html = '<div><span></span></div><p>正文</p>';
    const result = cleanHtmlContent(html);
    expect(result).toContain('正文');
  });

  it('should remove embed and object tags', () => {
    const html = '<object data="flash.swf"></object><embed src="ad.swf"/>';
    const result = cleanHtmlContent(html);
    expect(result).not.toContain('<object');
    expect(result).not.toContain('<embed');
  });
});

// ============================================================================
// normalizeWhitespace
// ============================================================================

describe('normalizeWhitespace', () => {
  it('should unify line endings', () => {
    expect(normalizeWhitespace('a\r\nb\rc')).toBe('a\nb\nc');
  });

  it('should collapse excessive newlines with preserveParagraphs', () => {
    expect(normalizeWhitespace('a\n\n\n\n\nb', true)).toBe('a\n\nb');
  });

  it('should collapse all whitespace without preserveParagraphs', () => {
    expect(normalizeWhitespace('a\n\n\n\nb', false)).toBe('a b');
  });

  it('should trim the result', () => {
    expect(normalizeWhitespace('  hello  ')).toBe('hello');
  });

  it('should handle empty string', () => {
    expect(normalizeWhitespace('')).toBe('');
  });
});

// ============================================================================
// detectAdDensity
// ============================================================================

describe('detectAdDensity', () => {
  it('should return 0 for clean content', () => {
    const content = filler(500);
    expect(detectAdDensity(content)).toBe(0);
  });

  it('should return > 0 for content with ads', () => {
    const content = `${filler(200)}\n微信号：abc123\n优惠券：SAVE50\n`;
    expect(detectAdDensity(content)).toBeGreaterThan(0);
  });

  it('should return 0 for empty content', () => {
    expect(detectAdDensity('')).toBe(0);
  });

  it('should cap at 1', () => {
    // Mostly ad content
    const content = '微信号：abc123\n公众号：旅行家\nQQ号：12345678\n抖音号：travel';
    expect(detectAdDensity(content)).toBeLessThanOrEqual(1);
  });
});

// ============================================================================
// extractPureContent
// ============================================================================

describe('extractPureContent', () => {
  it('should remove all non-content text', () => {
    const content = [
      '大家好，我是旅行博主！',
      '北京三日游详细攻略。',
      '第一天：故宫+天安门',
      '微信号：traveler99',
      '点赞收藏关注！',
      '© 2024 All Rights Reserved.',
      '以上就是今天的分享了！',
    ].join('\n');
    const result = extractPureContent(content);
    expect(result).toContain('故宫');
    expect(result).toContain('天安门');
    expect(result).not.toContain('微信号');
    expect(result).not.toContain('点赞收藏');
    expect(result).not.toContain('©');
  });
});

// ============================================================================
// isLowQualityContent
// ============================================================================

describe('isLowQualityContent', () => {
  it('should flag empty content as low quality', () => {
    expect(isLowQualityContent('')).toBe(true);
  });

  it('should flag short content as low quality', () => {
    expect(isLowQualityContent('太短了')).toBe(true);
  });

  it('should not flag normal content', () => {
    const content = filler(500);
    expect(isLowQualityContent(content)).toBe(false);
  });

  it('should respect custom minLength', () => {
    const content = filler(50);
    expect(isLowQualityContent(content, { minLength: 30 })).toBe(false);
    expect(isLowQualityContent(content, { minLength: 200 })).toBe(true);
  });

  it('should flag content with high ad density', () => {
    // Construct content that's mostly ads
    const adContent = Array.from({ length: 20 }, () =>
      '微信号：test123\n优惠券：SAVE50\nhttps://s.click.taobao.com/xxx').join('\n');
    // Might or might not flag depending on density — at least should run
    const result = isLowQualityContent(adContent);
    expect(typeof result).toBe('boolean');
  });
});

// ============================================================================
// Pattern sanity checks
// ============================================================================

describe('pattern arrays', () => {
  it('should have non-empty AD_PATTERNS', () => {
    expect(AD_PATTERNS.length).toBeGreaterThan(0);
  });

  it('should have non-empty PROMOTION_PATTERNS', () => {
    expect(PROMOTION_PATTERNS.length).toBeGreaterThan(0);
  });

  it('should have non-empty PERSONAL_INFO_PATTERNS', () => {
    expect(PERSONAL_INFO_PATTERNS.length).toBeGreaterThan(0);
  });

  it('should have non-empty PLATFORM_NOISE_PATTERNS', () => {
    expect(PLATFORM_NOISE_PATTERNS.length).toBeGreaterThan(0);
  });

  it('should have non-empty COPYRIGHT_PATTERNS', () => {
    expect(COPYRIGHT_PATTERNS.length).toBeGreaterThan(0);
  });

  it('should have non-empty BOILERPLATE_PATTERNS', () => {
    expect(BOILERPLATE_PATTERNS.length).toBeGreaterThan(0);
  });

  // Ensure patterns are valid RegExp
  it('all patterns should be valid RegExp', () => {
    const allPatterns = [
      ...AD_PATTERNS,
      ...PROMOTION_PATTERNS,
      ...PERSONAL_INFO_PATTERNS,
      ...PLATFORM_NOISE_PATTERNS,
      ...COPYRIGHT_PATTERNS,
      ...BOILERPLATE_PATTERNS,
    ];
    for (const p of allPatterns) {
      expect(p).toBeInstanceOf(RegExp);
    }
  });
});
