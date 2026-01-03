import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface Reminder {
  id: string;
  item_id: string;
  user_id: string;
  minutes_before: number;
  scheduled_at: string;
  sent_at: string | null;
}

/**
 * Send reminders for itinerary items
 * This function is triggered periodically (e.g., every minute) to find and send reminders
 */
serve(async (req: Request) => {
  try {
    // Verify the request is from Supabase scheduler
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const _token = authHeader.slice(7);
    // In production, verify the token is valid

    // Get current time
    const now = new Date();
    const currentTime = now.toISOString();

    // Find reminders that are due in the next minute but haven't been sent
    const { data: reminders, error: reminderError } = await supabase
      .from('reminders')
      .select('id, item_id, user_id, minutes_before, scheduled_at, sent_at')
      .is('sent_at', null)
      .lte('scheduled_at', currentTime)
      .order('scheduled_at', { ascending: true })
      .limit(100);

    if (reminderError) {
      throw reminderError;
    }

    if (!reminders || reminders.length === 0) {
      console.warn('[send-reminders] No reminders to send');
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No reminders to send',
          count: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Get expo push tokens for the users
    const userIds = [
      ...new Set((reminders as Reminder[]).map((r) => r.user_id)),
    ];

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, expo_push_token')
      .in('id', userIds);

    if (usersError) {
      throw usersError;
    }

    const tokenMap = new Map(
      (users || []).map((u: { id: string; expo_push_token: string | null }) => [
        u.id,
        u.expo_push_token,
      ])
    );

    // Get item details for reminder context
    const itemIds = [
      ...new Set((reminders as Reminder[]).map((r) => r.item_id)),
    ];

    const { data: items, error: itemsError } = await supabase
      .from('itinerary_items')
      .select('id, start_time, poi_id')
      .in('id', itemIds);

    if (itemsError) {
      throw itemsError;
    }

    const itemMap = new Map((items || []).map((i: any) => [i.id, i]));

    // Send notifications
    const sentReminders: string[] = [];
    const failedReminders: string[] = [];

    for (const reminder of reminders as Reminder[]) {
      try {
        const token = tokenMap.get(reminder.user_id);
        const item = itemMap.get(reminder.item_id);

        if (!token) {
          console.warn(
            `[send-reminders] No push token for user ${reminder.user_id}`
          );
          failedReminders.push(reminder.id);
          continue;
        }

        if (!item) {
          console.warn(`[send-reminders] Item ${reminder.item_id} not found`);
          failedReminders.push(reminder.id);
          continue;
        }

        // Send push notification
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({
            to: token,
            sound: 'default',
            title: '行程提醒',
            body: `${item.poi_name || '行程项目'} 即将开始 (${item.start_time})`,
            data: {
              itemId: reminder.item_id,
              reminderMinutes: reminder.minutes_before,
            },
            badge: 1,
            priority: 'high',
            ttl: 3600, // 1 hour
          }),
        });

        const result = await response.json();

        if (!response.ok) {
          console.error(
            `[send-reminders] Push notification failed for ${reminder.id}:`,
            result
          );
          failedReminders.push(reminder.id);
          continue;
        }

        // Mark reminder as sent
        const { error: updateError } = await supabase
          .from('reminders')
          .update({ sent_at: currentTime })
          .eq('id', reminder.id);

        if (updateError) {
          console.error(
            `[send-reminders] Failed to mark reminder ${reminder.id} as sent:`,
            updateError
          );
          failedReminders.push(reminder.id);
        } else {
          sentReminders.push(reminder.id);
        }
      } catch (error) {
        console.error(
          `[send-reminders] Error processing reminder ${reminder.id}:`,
          error
        );
        failedReminders.push(reminder.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Reminders processed',
        sent: sentReminders.length,
        failed: failedReminders.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[send-reminders] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
