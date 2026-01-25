import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';
const crons = cronJobs();
/**
 * 每分钟检查并发送待处理的提醒
 */
crons.interval('send-pending-reminders', { minutes: 1 }, internal.notifications.sendPendingReminders);
/**
 * 每小时清理过期的 OTP 验证码
 */
crons.interval('cleanup-expired-otps', { hours: 1 }, internal.phoneAuth.cleanupExpiredOtps);
/**
 * 每天清理过期的速率限制记录
 */
crons.interval('cleanup-expired-rate-limits', { hours: 24 }, internal.phoneAuth.cleanupExpiredRateLimits);
/**
 * 每6小时清理过期的通知（保留30天内的已读通知）
 * Clean up read notifications older than 30 days
 */
crons.interval('cleanup-old-notifications', { hours: 6 }, internal.notifications.cleanupOldNotifications);
/**
 * 每天凌晨3点清理过期的数据质量报告（保留90天）
 * Clean up old data quality reports
 */
crons.daily('cleanup-old-quality-reports', { hourUTC: 19, minuteUTC: 0 }, // 3:00 AM UTC+8
internal.dataQualityReports.cleanupOld);
export default crons;
