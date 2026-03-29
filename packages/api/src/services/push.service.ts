/**
 * Push notification service — send push notifications to user devices.
 *
 * Currently logs notifications for development. Actual APNs/FCM
 * integration requires platform credentials to be configured.
 */
import { getDb, pushTokens } from '@pathfinding/database';
import { createLogger } from '@pathfinding/logger';
import { and, eq } from 'drizzle-orm';

const log = createLogger('push-service');

/**
 * Send a push notification to all active devices for a user.
 *
 * @param userId  - Target user ID
 * @param title   - Notification title
 * @param body    - Notification body text
 * @param _data   - Optional payload data
 * @returns Number of tokens the notification was sent to
 */
export async function sendPushNotification(
  userId: number,
  title: string,
  body: string,
  _data?: Record<string, unknown>,
): Promise<number> {
  const db = getDb();

  const tokens = await db
    .select()
    .from(pushTokens)
    .where(
      and(
        eq(pushTokens.userId, userId),
        eq(pushTokens.isActive, true),
      ),
    );

  if (tokens.length === 0) {
    log.info(`用户 ${userId} 没有活跃的推送令牌，跳过通知发送`);
    return 0;
  }

  for (const tokenRecord of tokens) {
    log.info(
      `[模拟发送] 推送通知 -> 用户: ${userId}, 平台: ${tokenRecord.platform}, 令牌: ${tokenRecord.token}, 标题: ${title}, 内容: ${body}`,
    );
  }

  log.info(`已向用户 ${userId} 的 ${tokens.length} 个设备发送推送通知`);

  return tokens.length;
}
