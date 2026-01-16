import { v } from 'convex/values';
import { internal } from './_generated/api';
import { internalMutation, mutation, query } from './_generated/server';

// OTP 配置
const OTP_CONFIG = {
  codeLength: 6,
  expiryMs: 5 * 60 * 1000, // 5 分钟
  maxAttemptsPerCode: 5,
  cooldownMs: 60 * 1000, // 1 分钟
  maxSendPerHour: 5,
  maxSendPerDay: 10,
};

/**
 * 生成安全随机验证码
 */
function generateOtpCode(): string {
  const max = 10**OTP_CONFIG.codeLength;
  const randomNumber = Math.floor(Math.random() * max);
  return randomNumber.toString().padStart(OTP_CONFIG.codeLength, '0');
}

/**
 * 标准化手机号为 +86 格式
 */
function normalizePhone(phone: string): string {
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.startsWith('+86')) {
    return cleaned;
  }
  if (cleaned.startsWith('86')) {
    return `+${cleaned}`;
  }
  return `+86${cleaned}`;
}

/**
 * 验证手机号格式
 */
function isValidPhone(phone: string): boolean {
  return /^\+861[3-9]\d{9}$/.test(phone);
}

/**
 * 发送 OTP 验证码
 */
export const sendOtp = mutation({
  args: { phone: v.string() },
  handler: async (ctx, { phone }) => {
    const normalizedPhone = normalizePhone(phone);

    // 验证手机号格式
    if (!isValidPhone(normalizedPhone)) {
      throw new Error('请输入有效的中国大陆手机号');
    }

    const now = Date.now();

    // 检查冷却期
    const cooldownKey = `cooldown:${normalizedPhone}`;
    const cooldownRecord = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', (q) => q.eq('key', cooldownKey))
      .first();

    if (cooldownRecord && cooldownRecord.expiresAt > now) {
      const remainingSeconds = Math.ceil(
        (cooldownRecord.expiresAt - now) / 1000
      );
      throw new Error(`请${remainingSeconds}秒后再试`);
    }

    // 检查每小时限制
    const hourlyKey = `hourly:${normalizedPhone}`;
    const hourlyRecord = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', (q) => q.eq('key', hourlyKey))
      .first();

    if (hourlyRecord) {
      if (hourlyRecord.expiresAt > now) {
        if (hourlyRecord.count >= OTP_CONFIG.maxSendPerHour) {
          throw new Error('发送过于频繁，请1小时后再试');
        }
        // 更新计数
        await ctx.db.patch(hourlyRecord._id, { count: hourlyRecord.count + 1 });
      } else {
        // 重置
        await ctx.db.patch(hourlyRecord._id, {
          count: 1,
          expiresAt: now + 60 * 60 * 1000,
        });
      }
    } else {
      await ctx.db.insert('rateLimits', {
        key: hourlyKey,
        count: 1,
        expiresAt: now + 60 * 60 * 1000,
      });
    }

    // 检查每日限制
    const dailyKey = `daily:${normalizedPhone}`;
    const dailyRecord = await ctx.db
      .query('rateLimits')
      .withIndex('by_key', (q) => q.eq('key', dailyKey))
      .first();

    if (dailyRecord) {
      if (dailyRecord.expiresAt > now) {
        if (dailyRecord.count >= OTP_CONFIG.maxSendPerDay) {
          throw new Error('今日发送次数已达上限，请明天再试');
        }
        await ctx.db.patch(dailyRecord._id, { count: dailyRecord.count + 1 });
      } else {
        await ctx.db.patch(dailyRecord._id, {
          count: 1,
          expiresAt: now + 24 * 60 * 60 * 1000,
        });
      }
    } else {
      await ctx.db.insert('rateLimits', {
        key: dailyKey,
        count: 1,
        expiresAt: now + 24 * 60 * 60 * 1000,
      });
    }

    // 生成验证码
    const code = generateOtpCode();

    // 删除旧的 OTP 记录
    const existingOtp = await ctx.db
      .query('otpCodes')
      .withIndex('by_phone', (q) => q.eq('phone', normalizedPhone))
      .first();

    if (existingOtp) {
      await ctx.db.delete(existingOtp._id);
    }

    // 存储新的 OTP
    await ctx.db.insert('otpCodes', {
      phone: normalizedPhone,
      code,
      attempts: 0,
      expiresAt: now + OTP_CONFIG.expiryMs,
    });

    // 设置冷却期
    if (cooldownRecord) {
      await ctx.db.patch(cooldownRecord._id, {
        count: 1,
        expiresAt: now + OTP_CONFIG.cooldownMs,
      });
    } else {
      await ctx.db.insert('rateLimits', {
        key: cooldownKey,
        count: 1,
        expiresAt: now + OTP_CONFIG.cooldownMs,
      });
    }

    // 调用短信发送 action
    await ctx.scheduler.runAfter(0, internal.sms.send, {
      phone: normalizedPhone,
      code,
    });

    // 开发模式下打印验证码
    console.error(`[DEV] OTP for ${normalizedPhone}: ${code}`);

    return {
      expiresIn: Math.floor(OTP_CONFIG.expiryMs / 1000),
      cooldown: Math.floor(OTP_CONFIG.cooldownMs / 1000),
    };
  },
});

/**
 * 验证 OTP 并登录/注册
 */
export const verifyOtp = mutation({
  args: {
    phone: v.string(),
    code: v.string(),
  },
  handler: async (ctx, { phone, code }) => {
    const normalizedPhone = normalizePhone(phone);
    const now = Date.now();

    // 查找 OTP 记录
    const otpRecord = await ctx.db
      .query('otpCodes')
      .withIndex('by_phone', (q) => q.eq('phone', normalizedPhone))
      .first();

    if (!otpRecord) {
      throw new Error('验证码已过期或不存在');
    }

    // 检查是否过期
    if (otpRecord.expiresAt < now) {
      await ctx.db.delete(otpRecord._id);
      throw new Error('验证码已过期，请重新获取');
    }

    // 检查尝试次数
    if (otpRecord.attempts >= OTP_CONFIG.maxAttemptsPerCode) {
      await ctx.db.delete(otpRecord._id);
      throw new Error('验证次数过多，请重新获取验证码');
    }

    // 验证码比对
    if (otpRecord.code !== code) {
      // 增加尝试次数
      await ctx.db.patch(otpRecord._id, { attempts: otpRecord.attempts + 1 });
      const remaining = OTP_CONFIG.maxAttemptsPerCode - otpRecord.attempts - 1;
      throw new Error(`验证码错误，还剩${remaining}次尝试机会`);
    }

    // 验证成功，删除 OTP 记录
    await ctx.db.delete(otpRecord._id);

    // 查找或创建用户
    let user = await ctx.db
      .query('users')
      .withIndex('by_phone', (q) => q.eq('phone', normalizedPhone))
      .first();

    let isNewUser = false;

    if (!user) {
      // 创建新用户
      const userId = await ctx.db.insert('users', {
        phone: normalizedPhone,
      });
      user = await ctx.db.get(userId);
      isNewUser = true;
    }

    if (!user) {
      throw new Error('创建用户失败');
    }

    return {
      user: {
        id: user._id,
        phone: user.phone,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user._creationTime,
      },
      isNewUser,
    };
  },
});

/**
 * 获取当前用户信息
 */
export const getCurrentUser = query({
  args: { userId: v.optional(v.id('users')) },
  handler: async (ctx, { userId }) => {
    if (!userId) {
      return null;
    }

    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }

    return {
      id: user._id,
      phone: user.phone,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      createdAt: user._creationTime,
    };
  },
});

/**
 * 更新用户资料
 */
export const updateProfile = mutation({
  args: {
    userId: v.id('users'),
    displayName: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
  },
  handler: async (ctx, { userId, displayName, avatarUrl }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    const updates: Partial<{ displayName: string; avatarUrl: string }> = {};
    if (displayName !== undefined) updates.displayName = displayName;
    if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl;

    await ctx.db.patch(userId, updates);

    return { success: true };
  },
});

/**
 * 更新 Expo Push Token
 */
export const updatePushToken = mutation({
  args: {
    userId: v.id('users'),
    expoPushToken: v.string(),
  },
  handler: async (ctx, { userId, expoPushToken }) => {
    const user = await ctx.db.get(userId);
    if (!user) {
      throw new Error('用户不存在');
    }

    await ctx.db.patch(userId, { expoPushToken });

    return { success: true };
  },
});

/**
 * 清理过期的 OTP 记录 (由 cron 调用)
 */
export const cleanupExpiredOtps = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    // 清理过期的 OTP
    const expiredOtps = await ctx.db
      .query('otpCodes')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect();

    for (const otp of expiredOtps) {
      await ctx.db.delete(otp._id);
    }

    // 清理过期的速率限制记录
    const expiredRateLimits = await ctx.db
      .query('rateLimits')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect();

    for (const record of expiredRateLimits) {
      await ctx.db.delete(record._id);
    }

    return {
      cleanedOtps: expiredOtps.length,
      cleanedRateLimits: expiredRateLimits.length,
    };
  },
});

/**
 * 清理过期的速率限制记录 (由 cron 调用)
 */
export const cleanupExpiredRateLimits = internalMutation({
  handler: async (ctx) => {
    const now = Date.now();

    const expiredRateLimits = await ctx.db
      .query('rateLimits')
      .filter((q) => q.lt(q.field('expiresAt'), now))
      .collect();

    for (const record of expiredRateLimits) {
      await ctx.db.delete(record._id);
    }

    return {
      cleaned: expiredRateLimits.length,
    };
  },
});
