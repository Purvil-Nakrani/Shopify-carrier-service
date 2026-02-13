// app/api/errors/route.ts
// API endpoint for retrieving error logs

import { NextRequest, NextResponse } from 'next/server';
import {
  getErrorLogs
} from '@/lib/database';

/**
 * GET /api/errors
 * Retrieve error logs with various filtering options
 * 
 * Query Parameters:
 * - action: 'list'
 * - page: number (for pagination)
 * - limit: number (items per page)
 * - errorType: string (filter by error type)
 * - hours: number (time window in hours)
 * - days: number (time window in days)
 * - search: string (search term)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const action = searchParams.get('action') || 'list';

    switch (action) {
      case 'list': {
        // Get paginated list of errors
        const page = parseInt(searchParams.get('page') || '1');
        const limit = parseInt(searchParams.get('limit') || '50');
        const errorType = searchParams.get('errorType') || undefined;
        
        const startDateStr = searchParams.get('startDate');
        const endDateStr = searchParams.get('endDate');
        
        const result = await getErrorLogs({
          page,
          limit,
          errorType,
          startDate: startDateStr ? new Date(startDateStr) : undefined,
          endDate: endDateStr ? new Date(endDateStr) : undefined
        });

        return NextResponse.json({
          success: true,
          ...result
        });
      }

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid action parameter',
          validActions: ['list', 'recent', 'summary', 'stats', 'hourly', 'common', 'search', 'byType']
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
