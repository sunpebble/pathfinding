import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import { optionalAuthMiddleware } from '../middleware/auth';
import { VerificationService } from '../services/verificationService';

interface Variables {
  userId?: string;
  accessToken?: string;
}

// ============================================
// Schema Definitions
// ============================================

const BadgeTypeSchema = z.enum([
  'travel_expert',
  'local_guide',
  'official_account',
]);

const IdTypeSchema = z.enum(['id_card', 'passport', 'business_license']);

const MaterialTypeSchema = z.enum([
  'id_photo',
  'work_proof',
  'portfolio',
  'certificate',
  'other',
]);

const SupportingMaterialSchema = z.object({
  type: MaterialTypeSchema,
  url: z.string().url('Invalid URL'),
  description: z.string().max(500).optional(),
});

const ApplicationDataSchema = z.object({
  // Travel Expert fields
  travelExperience: z.string().max(2000).optional(),
  socialMediaLinks: z.array(z.string().url()).max(10).optional(),
  publishedGuideIds: z.array(z.string()).max(20).optional(),

  // Local Guide fields
  localCity: z.string().max(100).optional(),
  residenceProof: z.string().url().optional(),
  yearsOfResidence: z.number().int().min(0).max(100).optional(),
  localKnowledge: z.string().max(2000).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),

  // Official Account fields
  organizationName: z.string().max(200).optional(),
  organizationType: z.string().max(100).optional(),
  businessLicenseUrl: z.string().url().optional(),
  authorizationLetterUrl: z.string().url().optional(),
  officialWebsite: z.string().url().optional(),
});

const SubmitApplicationSchema = z.object({
  badgeType: BadgeTypeSchema,
  realName: z.string().min(2, 'Name is required').max(100),
  idType: IdTypeSchema,
  idNumber: z.string().min(6, 'ID number is required').max(50),
  phone: z
    .string()
    .min(10, 'Valid phone number required')
    .max(20)
    .regex(/^[\d\-+() ]+$/, 'Invalid phone number format'),
  email: z.string().email('Invalid email').optional(),
  applicationReason: z
    .string()
    .min(20, 'Please provide a detailed reason')
    .max(2000),
  supportingMaterials: z.array(SupportingMaterialSchema).max(10).optional(),
  applicationData: ApplicationDataSchema.optional(),
});

const BadgeMetadataSchema = z.object({
  travelExpertLevel: z.number().int().min(1).max(5).optional(),
  specialties: z.array(z.string().max(50)).max(10).optional(),
  totalGuides: z.number().int().min(0).optional(),
  totalLikes: z.number().int().min(0).optional(),
  localCity: z.string().max(100).optional(),
  localCityId: z.string().optional(),
  yearsOfResidence: z.number().int().min(0).max(100).optional(),
  languages: z.array(z.string().max(50)).max(10).optional(),
  organizationName: z.string().max(200).optional(),
  organizationType: z.string().max(100).optional(),
  officialWebsite: z.string().url().optional(),
});

const ApproveApplicationSchema = z.object({
  reviewNotes: z.string().max(1000).optional(),
  expiresInDays: z.number().int().min(1).max(3650).optional(), // Max 10 years
  metadata: BadgeMetadataSchema.optional(),
});

const RejectApplicationSchema = z.object({
  rejectionReason: z.string().min(10, 'Please provide a reason').max(1000),
  reviewNotes: z.string().max(1000).optional(),
});

const RevokeBadgeSchema = z.object({
  reason: z.string().min(10, 'Please provide a reason').max(1000),
});

const PaginationQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

// ============================================
// Public Routes (with optional auth)
// ============================================

export const publicVerificationRoutes = new Hono<{ Variables: Variables }>();

// Apply optional auth to get like status
publicVerificationRoutes.use('*', optionalAuthMiddleware);

/**
 * GET /users/:userId/badges - Get user's active badges
 */
publicVerificationRoutes.get('/users/:userId/badges', async (c) => {
  const userId = c.req.param('userId');
  const token = c.get('accessToken');

  const badges = await VerificationService.getUserBadges(userId, token);

  return c.json({
    success: true,
    data: badges,
  });
});

/**
 * GET /badges/:badgeId - Get badge details
 */
publicVerificationRoutes.get('/badges/:badgeId', async (c) => {
  const badgeId = c.req.param('badgeId');
  const token = c.get('accessToken');

  const badge = await VerificationService.getBadgeById(badgeId, token);

  if (!badge) {
    return c.json({ success: false, error: 'Badge not found' }, 404);
  }

  return c.json({
    success: true,
    data: badge,
  });
});

/**
 * GET /users/:userId/badges/check - Check if user has specific badge
 */
publicVerificationRoutes.get(
  '/users/:userId/badges/check',
  zValidator(
    'query',
    z.object({
      type: BadgeTypeSchema,
    })
  ),
  async (c) => {
    const userId = c.req.param('userId');
    const { type } = c.req.valid('query');
    const token = c.get('accessToken');

    const hasBadge = await VerificationService.hasBadge(userId, type, token);

    return c.json({
      success: true,
      data: { hasBadge },
    });
  }
);

// ============================================
// Protected Routes (auth required)
// ============================================

export const verificationRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /me/badges - Get current user's badges
 */
verificationRoutes.get('/me/badges', async (c) => {
  const userId = c.get('userId')!;
  const token = c.get('accessToken');

  const badges = await VerificationService.getUserBadges(userId, token);

  return c.json({
    success: true,
    data: badges,
  });
});

/**
 * GET /me/applications - Get current user's applications
 */
verificationRoutes.get('/me/applications', async (c) => {
  const userId = c.get('userId')!;
  const token = c.get('accessToken');

  const applications = await VerificationService.getUserApplications(
    userId,
    undefined,
    token
  );

  return c.json({
    success: true,
    data: applications,
  });
});

/**
 * GET /applications/:applicationId - Get application details
 */
verificationRoutes.get('/applications/:applicationId', async (c) => {
  const userId = c.get('userId')!;
  const applicationId = c.req.param('applicationId');
  const token = c.get('accessToken');

  const application = await VerificationService.getApplicationById(
    applicationId,
    token
  );

  if (!application) {
    return c.json({ success: false, error: 'Application not found' }, 404);
  }

  // Users can only view their own applications (unless admin)
  if (application.userId !== userId) {
    return c.json({ success: false, error: 'Unauthorized' }, 403);
  }

  return c.json({
    success: true,
    data: application,
  });
});

/**
 * POST /applications - Submit a new verification application
 */
verificationRoutes.post(
  '/applications',
  zValidator('json', SubmitApplicationSchema),
  async (c) => {
    const userId = c.get('userId')!;
    const token = c.get('accessToken');
    const input = c.req.valid('json');

    try {
      const applicationId = await VerificationService.submitApplication(
        userId,
        input,
        token
      );

      return c.json(
        {
          success: true,
          data: { applicationId },
          message: '申请已提交，请等待审核',
        },
        201
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to submit application';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * POST /applications/:applicationId/cancel - Cancel an application
 */
verificationRoutes.post('/applications/:applicationId/cancel', async (c) => {
  const userId = c.get('userId')!;
  const applicationId = c.req.param('applicationId');
  const token = c.get('accessToken');

  try {
    await VerificationService.cancelApplication(applicationId, userId, token);

    return c.json({
      success: true,
      message: '申请已取消',
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to cancel application';
    return c.json({ success: false, error: message }, 400);
  }
});

// ============================================
// Admin Routes (auth required + admin check)
// ============================================

export const adminVerificationRoutes = new Hono<{ Variables: Variables }>();

/**
 * GET /admin/badges - List badges by type
 */
adminVerificationRoutes.get(
  '/badges',
  zValidator(
    'query',
    z.object({
      type: BadgeTypeSchema.optional(),
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    })
  ),
  async (c) => {
    const { type, limit } = c.req.valid('query');
    const token = c.get('accessToken');

    if (type) {
      const badges = await VerificationService.listBadgesByType(
        type,
        limit,
        token
      );
      return c.json({ success: true, data: badges });
    }

    // Return all types
    const [travelExperts, localGuides, officialAccounts] = await Promise.all([
      VerificationService.listBadgesByType('travel_expert', limit, token),
      VerificationService.listBadgesByType('local_guide', limit, token),
      VerificationService.listBadgesByType('official_account', limit, token),
    ]);

    return c.json({
      success: true,
      data: {
        travel_expert: travelExperts,
        local_guide: localGuides,
        official_account: officialAccounts,
      },
    });
  }
);

/**
 * GET /admin/applications/pending - List pending applications
 */
adminVerificationRoutes.get(
  '/applications/pending',
  zValidator(
    'query',
    z.object({
      type: BadgeTypeSchema.optional(),
      limit: z.coerce.number().int().min(1).max(100).optional().default(50),
    })
  ),
  async (c) => {
    const { type, limit } = c.req.valid('query');
    const token = c.get('accessToken');

    const applications = await VerificationService.listPendingApplications(
      type,
      limit,
      token
    );

    return c.json({
      success: true,
      data: applications,
    });
  }
);

/**
 * POST /admin/applications/:applicationId/review - Start reviewing
 */
adminVerificationRoutes.post(
  '/applications/:applicationId/review',
  async (c) => {
    const reviewerId = c.get('userId')!;
    const applicationId = c.req.param('applicationId');
    const token = c.get('accessToken');

    try {
      await VerificationService.startReview(applicationId, reviewerId, token);

      return c.json({
        success: true,
        message: '已开始审核',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to start review';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * POST /admin/applications/:applicationId/approve - Approve application
 */
adminVerificationRoutes.post(
  '/applications/:applicationId/approve',
  zValidator('json', ApproveApplicationSchema),
  async (c) => {
    const reviewerId = c.get('userId')!;
    const applicationId = c.req.param('applicationId');
    const token = c.get('accessToken');
    const input = c.req.valid('json');

    try {
      const badgeId = await VerificationService.approveApplication(
        applicationId,
        reviewerId,
        input,
        token
      );

      return c.json({
        success: true,
        data: { badgeId },
        message: '申请已通过',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to approve application';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * POST /admin/applications/:applicationId/reject - Reject application
 */
adminVerificationRoutes.post(
  '/applications/:applicationId/reject',
  zValidator('json', RejectApplicationSchema),
  async (c) => {
    const reviewerId = c.get('userId')!;
    const applicationId = c.req.param('applicationId');
    const token = c.get('accessToken');
    const { rejectionReason, reviewNotes } = c.req.valid('json');

    try {
      await VerificationService.rejectApplication(
        applicationId,
        reviewerId,
        rejectionReason,
        reviewNotes,
        token
      );

      return c.json({
        success: true,
        message: '申请已拒绝',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reject application';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * POST /admin/badges/:badgeId/revoke - Revoke a badge
 */
adminVerificationRoutes.post(
  '/badges/:badgeId/revoke',
  zValidator('json', RevokeBadgeSchema),
  async (c) => {
    const revokedBy = c.get('userId')!;
    const badgeId = c.req.param('badgeId');
    const token = c.get('accessToken');
    const { reason } = c.req.valid('json');

    try {
      await VerificationService.revokeBadge(badgeId, reason, revokedBy, token);

      return c.json({
        success: true,
        message: '徽章已撤销',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to revoke badge';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * POST /admin/badges/:badgeId/reactivate - Reactivate a badge
 */
adminVerificationRoutes.post(
  '/badges/:badgeId/reactivate',
  zValidator(
    'json',
    z.object({
      expiresInDays: z.number().int().min(1).max(3650).optional(),
    })
  ),
  async (c) => {
    const badgeId = c.req.param('badgeId');
    const token = c.get('accessToken');
    const { expiresInDays } = c.req.valid('json');

    const newExpiresAt = expiresInDays
      ? Date.now() + expiresInDays * 24 * 60 * 60 * 1000
      : undefined;

    try {
      await VerificationService.reactivateBadge(badgeId, newExpiresAt, token);

      return c.json({
        success: true,
        message: '徽章已重新激活',
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to reactivate badge';
      return c.json({ success: false, error: message }, 400);
    }
  }
);

/**
 * GET /admin/statistics - Get verification statistics
 */
adminVerificationRoutes.get('/statistics', async (c) => {
  const token = c.get('accessToken');

  const [badgeStats, applicationStats] = await Promise.all([
    VerificationService.getBadgeStatistics(token),
    VerificationService.getApplicationStatistics(token),
  ]);

  return c.json({
    success: true,
    data: {
      badges: badgeStats,
      applications: applicationStats,
    },
  });
});
