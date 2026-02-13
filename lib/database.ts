import prisma from './prisma-client';

// Log rate request to database
export async function logRateRequest(data: {
  requestId: string;
  origin: string;
  destination: any;
  weight: number;
  price: number;
  items: any[];
}) {
  await prisma.rateRequest.create({
    data: {
      requestId: data.requestId,
      originPostalCode: data.origin,
      destinationPostalCode: data.destination.postal_code,
      destinationCountry: data.destination.country,
      destinationProvince: data.destination.province,
      destinationCity: data.destination.city,
      totalWeight: data.weight,
      totalPrice: data.price,
      items: data.items as any
    }
  });
}

// Log WWEX response
export async function logWWEXResponse(data: {
  requestId: string;
  quoteId?: string;
  rate?: number;
  transitDays?: number;
  serviceLevel?: string;
  responseTimeMs: number;
  error?: string;
  rawResponse: any;
}) {
  await prisma.wWEXResponse.create({
    data: {
      requestId: data.requestId,
      wwexQuoteId: data.quoteId || null,
      shippingRate: data.rate || null,
      transitDays: data.transitDays || null,
      serviceLevel: data.serviceLevel || null,
      responseTimeMs: data.responseTimeMs,
      errorMessage: data.error || null,
      rawResponse: data.rawResponse as any
    }
  });
}

export async function getLatestWWEXRate() {
  const latest = await prisma.finalShippingRate.findFirst({
    // where: {
    //   requestId: requestId,
    //   shippingRate: {
    //     not: null,
    //   },
    //   errorMessage: null,
    // },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!latest) {
    return null;
  }

  return {
    rate: latest.combinedRate?.toNumber() || null,
    transitDays: latest.transitDays,
    destination: latest.destination,
    items: latest.items,
    createdAt: latest.createdAt,
  };
}

export async function logFinalShippingRate(data: { 
  requestId: string;
  combinedRate?: number;
  transitDays?: number;
  destination: any;
  items: any;
}) {
  await prisma.finalShippingRate.create({
    data: {
      requestId: data.requestId,
      combinedRate: data.combinedRate || null,
      transitDays: data.transitDays || null,
      destination: data.destination || null,
      items: data.items
    },
  });
}

// Check rate cache
export async function getCachedRate(cacheKey: string) {
  const cached = await prisma.rateCache.findFirst({
    where: {
      cacheKey: cacheKey,
      expiresAt: {
        gt: new Date()
      }
    }
  });

  if (!cached) return null;

  return {
    shipping_rate: cached.shippingRate.toNumber(),
    transit_days: cached.transitDays
  };
}

// Save rate to cache
export async function cacheRate(data: {
  cacheKey: string;
  origin: string;
  destination: string;
  weightMin: number;
  weightMax: number;
  rate: number;
  transitDays: number;
  expiresInMinutes?: number;
}) {
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + (data.expiresInMinutes || 60));

  await prisma.rateCache.upsert({
    where: {
      cacheKey: data.cacheKey
    },
    update: {
      shippingRate: data.rate,
      transitDays: data.transitDays,
      expiresAt: expiresAt
    },
    create: {
      cacheKey: data.cacheKey,
      originPostalCode: data.origin,
      destinationPostalCode: data.destination,
      weightRangeMin: data.weightMin,
      weightRangeMax: data.weightMax,
      shippingRate: data.rate,
      transitDays: data.transitDays,
      expiresAt: expiresAt
    }
  });
}

// Log errors
export async function logError(errorType: string, errorMessage: string, stackTrace?: string, requestData?: any) {
  await prisma.errorLog.create({
    data: {
      errorType: errorType,
      errorMessage: errorMessage,
      stackTrace: stackTrace || null,
      requestData: requestData ? (requestData as any) : null
    }
  });
}

// =====================================================
// ERROR RETRIEVAL FUNCTIONS
// =====================================================

/**
 * Get all errors with pagination
 */
export async function getErrorLogs(options?: {
  page?: number;
  limit?: number;
  errorType?: string;
  startDate?: Date;
  endDate?: Date;
}) {
  const page = options?.page || 1;
  const limit = options?.limit || 50;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (options?.errorType) {
    where.errorType = options.errorType;
  }

  if (options?.startDate || options?.endDate) {
    where.createdAt = {};
    if (options.startDate) {
      where.createdAt.gte = options.startDate;
    }
    if (options.endDate) {
      where.createdAt.lte = options.endDate;
    }
  }

  const [errors, total] = await Promise.all([
    prisma.errorLog.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      skip,
      take: limit,
    }),
    prisma.errorLog.count({ where })
  ]);

  return {
    errors,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      hasNext: page * limit < total,
      hasPrev: page > 1
    }
  };
}

export default { logRateRequest, logWWEXResponse, getCachedRate, cacheRate, logError, getErrorLogs };

