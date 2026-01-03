import { z } from 'npm:zod';

/**
 * Reminder schema for validation
 */
export const ReminderSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  itemId: z.string().uuid(),
  minutesBefore: z.number().int().min(0).max(1440), // Up to 24 hours
  scheduledAt: z.string().datetime(),
  sentAt: z.string().datetime().nullable(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * Reminder type
 */
export type Reminder = z.infer<typeof ReminderSchema>;

/**
 * Schema for creating a reminder
 */
export const CreateReminderSchema = z.object({
  itemId: z.string().uuid(),
  minutesBefore: z.number().int().min(5).max(1440).default(30),
});

export type CreateReminderInput = z.infer<typeof CreateReminderSchema>;

/**
 * Schema for updating a reminder
 */
export const UpdateReminderSchema = z.object({
  minutesBefore: z.number().int().min(5).max(1440).optional(),
});

export type UpdateReminderInput = z.infer<typeof UpdateReminderSchema>;

/**
 * Preset reminder options (in minutes)
 */
export const REMINDER_PRESETS = [
  { value: 5, label: '提前 5 分钟' },
  { value: 15, label: '提前 15 分钟' },
  { value: 30, label: '提前 30 分钟' },
  { value: 60, label: '提前 1 小时' },
  { value: 120, label: '提前 2 小时' },
  { value: 1440, label: '提前 1 天' },
] as const;
