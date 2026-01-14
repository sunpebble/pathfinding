import { z } from 'zod';

/**
 * Insurance type enum schema
 */
export const InsuranceTypeSchema = z.enum([
  'comprehensive',
  'medical',
  'accident',
  'flight_delay',
  'luggage',
  'cancellation',
  'emergency_evacuation',
]);

/**
 * Risk level enum schema
 */
export const RiskLevelSchema = z.enum(['low', 'medium', 'high', 'extreme']);

/**
 * Claim type enum schema
 */
export const ClaimTypeSchema = z.enum([
  'medical',
  'accident',
  'flight_delay',
  'luggage_loss',
  'trip_cancellation',
  'emergency_evacuation',
  'other',
]);

/**
 * Insurance product query schema
 */
export const InsuranceProductQuerySchema = z.object({
  type: InsuranceTypeSchema.optional(),
  domesticOnly: z.coerce.boolean().optional(),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
});

/**
 * Insurance recommendation query schema
 */
export const InsuranceRecommendationQuerySchema = z.object({
  destination: z.string().min(1, 'Destination is required'),
  tripDays: z.coerce.number().int().min(1).max(365),
  riskLevel: RiskLevelSchema.optional(),
});

/**
 * Insurance comparison query schema
 */
export const InsuranceCompareQuerySchema = z.object({
  productIds: z.string().transform((val) => val.split(',')),
});

/**
 * User insurance query schema
 */
export const UserInsuranceQuerySchema = z.object({
  status: z
    .enum(['pending', 'active', 'expired', 'cancelled', 'claimed'])
    .optional(),
});

/**
 * Create user insurance schema
 */
export const CreateUserInsuranceSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  itineraryId: z.string().optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  coverageDays: z.number().int().min(1),
  destinations: z.array(z.string()).min(1, 'At least one destination required'),
  insuredPersons: z.array(
    z.object({
      name: z.string().min(1, 'Name is required'),
      idType: z.enum(['id_card', 'passport', 'other']),
      idNumber: z.string().min(1, 'ID number is required'),
      phone: z.string().optional(),
      relationship: z.enum(['self', 'spouse', 'child', 'parent', 'other']),
    })
  ),
  totalPrice: z.number().min(0),
  notes: z.string().optional(),
});

/**
 * Update user insurance status schema
 */
export const UpdateUserInsuranceStatusSchema = z.object({
  status: z.enum(['pending', 'active', 'expired', 'cancelled', 'claimed']),
  paymentStatus: z.enum(['pending', 'paid', 'refunded', 'failed']).optional(),
  orderNumber: z.string().optional(),
  policyNumber: z.string().optional(),
});

/**
 * Add insurance claim schema
 */
export const AddInsuranceClaimSchema = z.object({
  claimType: z.string().min(1, 'Claim type is required'),
  claimAmount: z.number().min(0, 'Claim amount must be positive'),
  notes: z.string().optional(),
});

/**
 * Claim guide query schema
 */
export const ClaimGuideQuerySchema = z.object({
  claimType: ClaimTypeSchema.optional(),
});

// Infer types from schemas
export type InsuranceType = z.infer<typeof InsuranceTypeSchema>;
export type RiskLevel = z.infer<typeof RiskLevelSchema>;
export type ClaimType = z.infer<typeof ClaimTypeSchema>;
export type InsuranceProductQuery = z.infer<typeof InsuranceProductQuerySchema>;
export type InsuranceRecommendationQuery = z.infer<
  typeof InsuranceRecommendationQuerySchema
>;
export type CreateUserInsurance = z.infer<typeof CreateUserInsuranceSchema>;
export type UpdateUserInsuranceStatus = z.infer<
  typeof UpdateUserInsuranceStatusSchema
>;
export type AddInsuranceClaim = z.infer<typeof AddInsuranceClaimSchema>;
