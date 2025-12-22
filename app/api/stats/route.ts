import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma-client';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '7');

    // Get statistics for the last N days
    const stats = await getStatistics(days);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error: any) {
    console.error('🔴 Error fetching stats:', error);
    
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}

async function getStatistics(days: number) {
  const dateFilter = new Date();
  dateFilter.setDate(dateFilter.getDate() - days);

  // Total requests
  const totalRequests = await prisma.rateRequest.count({
    where: {
      createdAt: {
        gte: dateFilter
      }
    }
  });

  // Successful vs failed requests
  const successfulRequests = await prisma.wWEXResponse.count({
    where: {
      createdAt: {
        gte: dateFilter
      },
      shippingRate: {
        not: null
      }
    }
  });

  const failedRequests = await prisma.wWEXResponse.count({
    where: {
      createdAt: {
        gte: dateFilter
      },
      errorMessage: {
        not: null
      }
    }
  });

  // Average response time
  const avgResponseTime = await prisma.wWEXResponse.aggregate({
    where: {
      createdAt: {
        gte: dateFilter
      }
    },
    _avg: {
      responseTimeMs: true
    }
  });

  // Top destinations
  const topDestinationsRaw = await prisma.rateRequest.groupBy({
    by: ['destinationCity', 'destinationProvince'],
    where: {
      createdAt: {
        gte: dateFilter
      }
    },
    _count: {
      id: true
    },
    orderBy: {
      _count: {
        id: 'desc'
      }
    },
    take: 10
  });

  const topDestinations = topDestinationsRaw.map((item: any) => ({
    destination_city: item.destinationCity,
    destination_province: item.destinationProvince,
    count: item._count.id
  }));

  // Weight distribution with average rates
  const allRequests = await prisma.rateRequest.findMany({
    where: {
      createdAt: {
        gte: dateFilter
      }
    },
    include: {
      wwexResponses: {
        select: {
          shippingRate: true
        }
      }
    }
  });

  const weightDistribution = allRequests.reduce((acc: any[], request: any) => {
    const weight = request.totalWeight.toNumber();
    let range: string;

    if (weight < 200) range = '0-200 lbs';
    else if (weight < 500) range = '200-500 lbs';
    else if (weight < 1000) range = '500-1000 lbs';
    else range = '1000+ lbs';

    const existingRange = acc.find(item => item.weight_range === range);
    const rate = request.wwexResponses[0]?.shippingRate?.toNumber() || 0;

    if (existingRange) {
      existingRange.count++;
      existingRange.total_rate += rate;
      existingRange.avg_rate = existingRange.total_rate / existingRange.count;
    } else {
      acc.push({
        weight_range: range,
        count: 1,
        total_rate: rate,
        avg_rate: rate
      });
    }

    return acc;
  }, []);

  // Sort weight distribution
  const sortOrder = ['0-200 lbs', '200-500 lbs', '500-1000 lbs', '1000+ lbs'];
  weightDistribution.sort((a: any, b: any) => 
    sortOrder.indexOf(a.weight_range) - sortOrder.indexOf(b.weight_range)
  );

  // Remove total_rate from output
  weightDistribution.forEach((item: any) => delete item.total_rate);

  // Recent errors
  const recentErrors = await prisma.errorLog.findMany({
    where: {
      createdAt: {
        gte: dateFilter
      }
    },
    select: {
      errorType: true,
      errorMessage: true,
      createdAt: true
    },
    orderBy: {
      createdAt: 'desc'
    },
    take: 20
  });

  const formattedErrors = recentErrors.map((error: any) => ({
    error_type: error.errorType,
    error_message: error.errorMessage,
    created_at: error.createdAt
  }));

  // Cache hit rate
  const totalCachedRates = await prisma.rateCache.count();
  const activeCachedRates = await prisma.rateCache.count({
    where: {
      expiresAt: {
        gt: new Date()
      }
    }
  });

  return {
    period: `Last ${days} days`,
    totalRequests: totalRequests,
    successfulRequests: successfulRequests,
    failedRequests: failedRequests,
    averageResponseTime: Math.round(avgResponseTime._avg.responseTimeMs || 0),
    topDestinations: topDestinations,
    weightDistribution: weightDistribution,
    recentErrors: formattedErrors,
    cacheStats: {
      total: totalCachedRates,
      active: activeCachedRates
    }
  };
}

