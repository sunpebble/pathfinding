import { describe, expect, it } from 'vitest';
import { generateGuideMarkdownContent } from './guide-content.js';

describe('generateGuideMarkdownContent', () => {
  it('removes Mafengwo metadata and app boilerplate before building markdown', () => {
    const markdown = generateGuideMarkdownContent({
      title: '[鬼节,杀很大]邂逅你,只需要20米',
      content: [
        '1张照片 [鬼节,杀很大]邂逅你,只需要20米 2009.10.29发布·2100阅读 D傻 2国2城',
        '平生塞北江南，归来华发苍颜，布被秋宵梦觉，眼前万里江山',
        '关注 目的地 - 出行时间·天数 - 人均费用(人民币) - 出行人物 -',
        'DAY1 NaN.NaN 滇池 石林风景区 昆明翠湖公园 DAY2 NaN.NaN 滇池 西山风景名胜区',
        '查看全部天行程 寻常日子 有了些很软的记忆 只因有你么',
        '本游记著作权归@D傻所有，任何形式转载请联系作者。 © 2026 mafengwo.cn 举报',
        'APP内查看更多游记 84 温馨提示 APP阅读体验更佳，前往下载APP',
      ].join(' '),
      imageUrls: [
        'https://p1-q.mafengwo.net/s19/M00/2A/23/CoND2mSdRkpRszmFAAAOxGNzvzM.png',
        'https://img.example.com/photo.jpg',
      ],
    });

    expect(markdown).toContain('# [鬼节,杀很大]邂逅你,只需要20米');
    expect(markdown).toContain('寻常日子');
    expect(markdown).toContain('邂逅你');
    expect(markdown).toContain('![游记图片 1](https://img.example.com/photo.jpg)');
    expect(markdown).not.toContain('D傻 2国2城');
    expect(markdown).not.toContain('1张照片');
    expect(markdown).not.toContain('2100阅读');
    expect(markdown).not.toContain('NaN');
    expect(markdown).not.toContain('CoND2mSdRkpRszmFAAAOxGNzvzM');
    expect(markdown).not.toContain('本游记著作权');
    expect(markdown).not.toContain('APP内查看更多游记');
    expect(markdown).not.toContain('前往下载APP');
  });

  it('drops related-card copyright markers instead of rendering them as article text', () => {
    const markdown = generateGuideMarkdownContent({
      title: '黄山半日省力行程',
      content: [
        '星级游记 黄山半日省力行程 2026.01.02发布·100阅读 作者 1国2城',
        '半天登山建议从云谷索道上山，优先选择精华路段。',
        '著作权归@ 相关推荐标题 APP查看 之行 17345 24 图片加载失败',
      ].join(' '),
      imageUrls: ['https://note.mafengwo.net/img/photo.jpeg'],
    });

    expect(markdown).toContain('半天登山建议');
    expect(markdown).not.toContain('发布·100阅读');
    expect(markdown).not.toContain('著作权归@');
    expect(markdown).not.toContain('APP查看');
    expect(markdown).not.toContain('图片加载失败');
  });
});
