import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

// Cast internal to any to avoid type errors when _generated/api.d.ts is outdated
// eslint-disable-next-line ts/no-explicit-any
const internalApi = internal as any;

/**
 * 每分钟检查并发送待处理的提醒
 */
crons.interval(
  'send-pending-reminders',
  { minutes: 1 },
  internalApi.notifications.sendPendingReminders,
);

/**
 * 每小时清理过期的 OTP 验证码
 */
crons.interval(
  'cleanup-expired-otps',
  { hours: 1 },
  internalApi.phoneAuth.cleanupExpiredOtps,
);

/**
 * 每天清理过期的速率限制记录
 */
crons.interval(
  'cleanup-expired-rate-limits',
  { hours: 24 },
  internalApi.phoneAuth.cleanupExpiredRateLimits,
);

/**
 * 每6小时清理过期的通知（保留30天内的已读通知）
 * Clean up read notifications older than 30 days
 */
crons.interval(
  'cleanup-old-notifications',
  { hours: 6 },
  internalApi.notifications.cleanupOldNotifications,
);

/**
 * 每天凌晨3点清理过期的数据质量报告（保留90天）
 * Clean up old data quality reports
 */
crons.daily(
  'cleanup-old-quality-reports',
  { hourUTC: 19, minuteUTC: 0 }, // 3:00 AM UTC+8
  internalApi.dataQualityReports.cleanupOld,
);

/**
 * 每5分钟处理二次爬取队列
 * Process content refetch queue for truncated guides
 */
crons.interval(
  'process-refetch-queue',
  { minutes: 5 },
  internal.refetchTasks.processRefetchQueue,
);

/**
 * 每天清理已完成的二次爬取任务（保留7天）
 * Clean up completed refetch tasks
 */
crons.daily(
  'cleanup-completed-refetch-tasks',
  { hourUTC: 20, minuteUTC: 0 }, // 4:00 AM UTC+8
  internal.refetchTasks.cleanupCompletedInternal,
);

export default crons;
