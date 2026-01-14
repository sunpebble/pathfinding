import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';
import {
  AddPhotosSchema,
  CreateLuggageSchema,
  FileLossReportSchema,
  LinkToFlightBookingSchema,
  LinkToItinerarySchema,
  LuggageListQuerySchema,
  SetTagPhotoSchema,
  UpdateLuggageSchema,
  UpdateStatusSchema,
} from '../models/luggage';
import { LuggageService } from '../services/luggageService';

interface Variables {
  userId: string;
  accessToken: string;
}

// Protected routes (auth required)
export const luggageRoutes = new Hono<{ Variables: Variables }>();

// Public routes (no auth required)
export const publicLuggageRoutes = new Hono();

/**
 * GET /luggage - List user's luggage with pagination
 */
luggageRoutes.get(
  '/',
  zValidator('query', LuggageListQuerySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const query = c.req.valid('query');

    const { data, total } = await LuggageService.list(
      userId,
      query,
      accessToken
    );

    return c.json({
      success: true,
      data,
      meta: {
        page: query.page,
        pageSize: query.pageSize,
        totalCount: total,
        totalPages: Math.ceil(total / query.pageSize),
      },
    });
  }
);

/**
 * GET /luggage/active - Get active luggage (not claimed)
 */
luggageRoutes.get(
  '/active',
  zValidator(
    'query',
    z.object({
      limit: z.coerce.number().int().min(1).max(20).optional().default(10),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const { limit } = c.req.valid('query');

    const luggage = await LuggageService.getActive(userId, limit, accessToken);

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * GET /luggage/stats - Get luggage statistics
 */
luggageRoutes.get('/stats', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');

  const stats = await LuggageService.getStats(userId, accessToken);

  return c.json({
    success: true,
    data: stats,
  });
});

/**
 * GET /luggage/by-flight/:flightBookingId - Get luggage by flight booking
 */
luggageRoutes.get('/by-flight/:flightBookingId', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const flightBookingId = c.req.param('flightBookingId');

  const luggage = await LuggageService.getByFlightBooking(
    flightBookingId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: luggage,
  });
});

/**
 * GET /luggage/by-itinerary/:itineraryId - Get luggage by itinerary
 */
luggageRoutes.get('/by-itinerary/:itineraryId', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const itineraryId = c.req.param('itineraryId');

  const luggage = await LuggageService.getByItinerary(
    itineraryId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: luggage,
  });
});

/**
 * POST /luggage - Create a new luggage entry
 */
luggageRoutes.post(
  '/',
  zValidator('json', CreateLuggageSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const input = c.req.valid('json');

    const luggage = await LuggageService.create(userId, input, accessToken);

    return c.json(
      {
        success: true,
        data: luggage,
      },
      201
    );
  }
);

/**
 * GET /luggage/:id - Get luggage by ID
 */
luggageRoutes.get('/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const luggageId = c.req.param('id');

  const luggage = await LuggageService.getById(luggageId, userId, accessToken);

  return c.json({
    success: true,
    data: luggage,
  });
});

/**
 * PATCH /luggage/:id - Update a luggage entry
 */
luggageRoutes.patch(
  '/:id',
  zValidator('json', UpdateLuggageSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const luggageId = c.req.param('id');
    const input = c.req.valid('json');

    const luggage = await LuggageService.update(
      luggageId,
      userId,
      input,
      accessToken
    );

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * DELETE /luggage/:id - Delete a luggage entry
 */
luggageRoutes.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const luggageId = c.req.param('id');

  await LuggageService.delete(luggageId, userId, accessToken);

  return c.json({
    success: true,
    data: null,
  });
});

/**
 * PATCH /luggage/:id/status - Update luggage status
 */
luggageRoutes.patch(
  '/:id/status',
  zValidator('json', UpdateStatusSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const luggageId = c.req.param('id');
    const { status, lastKnownLocation } = c.req.valid('json');

    const luggage = await LuggageService.updateStatus(
      luggageId,
      userId,
      status,
      lastKnownLocation,
      accessToken
    );

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * POST /luggage/:id/loss-report - File a loss report
 */
luggageRoutes.post(
  '/:id/loss-report',
  zValidator('json', FileLossReportSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const luggageId = c.req.param('id');
    const { lossReportNumber, lossReportNotes } = c.req.valid('json');

    const luggage = await LuggageService.fileLossReport(
      luggageId,
      userId,
      lossReportNumber,
      lossReportNotes,
      accessToken
    );

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * POST /luggage/:id/mark-found - Mark luggage as found
 */
luggageRoutes.post(
  '/:id/mark-found',
  zValidator(
    'json',
    z.object({
      lastKnownLocation: z.string().max(200).optional(),
    })
  ),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const luggageId = c.req.param('id');
    const { lastKnownLocation } = c.req.valid('json');

    const luggage = await LuggageService.markAsFound(
      luggageId,
      userId,
      lastKnownLocation,
      accessToken
    );

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * POST /luggage/:id/mark-claimed - Mark luggage as claimed
 */
luggageRoutes.post('/:id/mark-claimed', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const luggageId = c.req.param('id');

  const luggage = await LuggageService.markAsClaimed(
    luggageId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: luggage,
  });
});

/**
 * POST /luggage/:id/link-flight - Link luggage to a flight booking
 */
luggageRoutes.post(
  '/:id/link-flight',
  zValidator('json', LinkToFlightBookingSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const luggageId = c.req.param('id');
    const { flightBookingId } = c.req.valid('json');

    const luggage = await LuggageService.linkToFlightBooking(
      luggageId,
      userId,
      flightBookingId,
      accessToken
    );

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * POST /luggage/:id/unlink-flight - Unlink luggage from flight booking
 */
luggageRoutes.post('/:id/unlink-flight', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const luggageId = c.req.param('id');

  const luggage = await LuggageService.unlinkFromFlightBooking(
    luggageId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: luggage,
  });
});

/**
 * POST /luggage/:id/link-itinerary - Link luggage to an itinerary
 */
luggageRoutes.post(
  '/:id/link-itinerary',
  zValidator('json', LinkToItinerarySchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const luggageId = c.req.param('id');
    const { itineraryId } = c.req.valid('json');

    const luggage = await LuggageService.linkToItinerary(
      luggageId,
      userId,
      itineraryId,
      accessToken
    );

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * POST /luggage/:id/unlink-itinerary - Unlink luggage from itinerary
 */
luggageRoutes.post('/:id/unlink-itinerary', async (c) => {
  const userId = c.get('userId');
  const accessToken = c.get('accessToken');
  const luggageId = c.req.param('id');

  const luggage = await LuggageService.unlinkFromItinerary(
    luggageId,
    userId,
    accessToken
  );

  return c.json({
    success: true,
    data: luggage,
  });
});

/**
 * POST /luggage/:id/photos - Add photos to luggage
 */
luggageRoutes.post(
  '/:id/photos',
  zValidator('json', AddPhotosSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const luggageId = c.req.param('id');
    const { photoUrls } = c.req.valid('json');

    const luggage = await LuggageService.addPhotos(
      luggageId,
      userId,
      photoUrls,
      accessToken
    );

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * POST /luggage/:id/tag-photo - Set tag photo
 */
luggageRoutes.post(
  '/:id/tag-photo',
  zValidator('json', SetTagPhotoSchema),
  async (c) => {
    const userId = c.get('userId');
    const accessToken = c.get('accessToken');
    const luggageId = c.req.param('id');
    const { tagPhotoUrl } = c.req.valid('json');

    const luggage = await LuggageService.setTagPhoto(
      luggageId,
      userId,
      tagPhotoUrl,
      accessToken
    );

    return c.json({
      success: true,
      data: luggage,
    });
  }
);

/**
 * GET /luggage/loss-report-templates - List all loss report templates
 */
luggageRoutes.get('/loss-report-templates', async (c) => {
  const templates = await LuggageService.listLossReportTemplates();

  return c.json({
    success: true,
    data: templates,
  });
});

/**
 * GET /luggage/loss-report-templates/:airlineCode - Get loss report template by airline
 */
luggageRoutes.get('/loss-report-templates/:airlineCode', async (c) => {
  const airlineCode = c.req.param('airlineCode');

  const template = await LuggageService.getLossReportTemplate(airlineCode);

  return c.json({
    success: true,
    data: template,
  });
});

// ============================================
// Public routes (airline tracking info)
// ============================================

/**
 * GET /luggage/airlines - Get common airline baggage tracking links
 */
publicLuggageRoutes.get('/airlines', async (c) => {
  // Common airline baggage tracking URLs
  const airlines = [
    {
      code: 'CA',
      name: '中国国航',
      nameEn: 'Air China',
      trackingUrl: 'https://www.airchina.com.cn/cn/service/baggage/delayed_baggage.shtml',
      phone: '95583',
    },
    {
      code: 'MU',
      name: '东方航空',
      nameEn: 'China Eastern',
      trackingUrl: 'https://www.ceair.com/guide/xtfw/xxcx/xltybq/',
      phone: '95530',
    },
    {
      code: 'CZ',
      name: '南方航空',
      nameEn: 'China Southern',
      trackingUrl: 'https://www.csair.com/cn/tourguide/luggage_service/luggage_delay/',
      phone: '95539',
    },
    {
      code: 'HU',
      name: '海南航空',
      nameEn: 'Hainan Airlines',
      trackingUrl: 'https://www.hnair.com/huhangfuwu/xlfw/',
      phone: '95339',
    },
    {
      code: '3U',
      name: '四川航空',
      nameEn: 'Sichuan Airlines',
      trackingUrl: 'https://www.sichuanair.com/service/baggage',
      phone: '028-88888888',
    },
    {
      code: 'ZH',
      name: '深圳航空',
      nameEn: 'Shenzhen Airlines',
      trackingUrl: 'https://www.shenzhenair.com/help/baggage',
      phone: '95361',
    },
    {
      code: 'FM',
      name: '上海航空',
      nameEn: 'Shanghai Airlines',
      trackingUrl: 'https://www.shanghai-air.com/baggage',
      phone: '95530',
    },
    {
      code: 'SC',
      name: '山东航空',
      nameEn: 'Shandong Airlines',
      trackingUrl: 'https://www.sda.cn/service/baggage',
      phone: '95369',
    },
    {
      code: 'KN',
      name: '联合航空',
      nameEn: 'China United Airlines',
      trackingUrl: 'https://www.flycua.com/baggage',
      phone: '4001026666',
    },
    {
      code: '9C',
      name: '春秋航空',
      nameEn: 'Spring Airlines',
      trackingUrl: 'https://www.ch.com/help/baggage',
      phone: '95524',
    },
    {
      code: 'G5',
      name: '华夏航空',
      nameEn: 'China Express Airlines',
      trackingUrl: 'https://www.chinaexpressair.com/baggage',
      phone: '400-6633-666',
    },
  ];

  return c.json({
    success: true,
    data: airlines,
  });
});

/**
 * GET /luggage/loss-report-guide - Get general loss report guide
 */
publicLuggageRoutes.get('/loss-report-guide', async (c) => {
  const guide = {
    title: '行李丢失报告指南',
    steps: [
      {
        step: 1,
        title: '立即报告',
        description: '在行李传送带区域找到航空公司柜台，立即报告行李丢失',
      },
      {
        step: 2,
        title: '填写PIR',
        description: '填写行李事故报告 (Property Irregularity Report)',
      },
      {
        step: 3,
        title: '保留单据',
        description: '保留PIR副本、登机牌、行李票等所有相关单据',
      },
      {
        step: 4,
        title: '提供信息',
        description: '提供行李详细描述（颜色、品牌、尺寸、特征）',
      },
      {
        step: 5,
        title: '跟踪查询',
        description: '使用PIR号码在航空公司网站或WorldTracer系统查询',
      },
      {
        step: 6,
        title: '索赔准备',
        description: '如21天后仍未找到，准备索赔材料',
      },
    ],
    requiredDocuments: [
      '登机牌 (Boarding Pass)',
      '行李票 (Baggage Claim Tag)',
      '护照/身份证复印件',
      '行李事故报告 (PIR)',
      '行李物品清单',
      '购买凭证 (用于索赔)',
    ],
    tips: [
      '在托运前拍摄行李及行李标签照片',
      '使用醒目的行李带或贴纸作为标识',
      '在行李内外放置联系信息卡',
      '购买旅行保险以获得行李丢失保障',
      '保持手机畅通以接收航空公司通知',
    ],
    worldTracerUrl: 'https://www.sita.aero/solutions/airport-management/worldtracer/',
  };

  return c.json({
    success: true,
    data: guide,
  });
});
