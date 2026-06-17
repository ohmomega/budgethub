import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const yearStr = searchParams.get('year');
    const monthStr = searchParams.get('month');
    
    const where = {};
    if (yearStr) {
      const year = parseInt(yearStr, 10);
      if (!isNaN(year)) {
        where.year = year;
      }
    }
    if (monthStr) {
      const month = parseInt(monthStr, 10);
      if (!isNaN(month) && month >= 1 && month <= 12) {
        where.month = month;
      }
    }

    const periods = await prisma.budgetPeriod.findMany({
      where,
      include: {
        user: {
          select: {
            username: true,
            email: true
          }
        }
      },
      orderBy: [
        { year: 'desc' },
        { month: 'desc' }
      ]
    });

    return NextResponse.json({ periods });
  } catch (error) {
    console.error('Fetch periods error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { year, month, name } = await request.json();

    if (!year || !month) {
      return NextResponse.json({ error: 'Year and month are required' }, { status: 400 });
    }

    const yearVal = parseInt(year, 10);
    const monthVal = parseInt(month, 10);

    if (isNaN(yearVal) || isNaN(monthVal) || monthVal < 1 || monthVal > 12) {
      return NextResponse.json({ error: 'Invalid year or month' }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.budgetPeriod.findFirst({
      where: {
        year: yearVal,
        month: monthVal
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Budget period already exists for this month' }, { status: 400 });
    }

    const newPeriod = await prisma.budgetPeriod.create({
      data: {
        userId: userPayload.id,
        year: yearVal,
        month: monthVal,
        name: name || null,
        status: 'draft'
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'CREATE_PERIOD',
        description: `Created budget period ${yearVal}-${String(monthVal).padStart(2, '0')}${name ? ` (${name})` : ''}`
      }
    });

    return NextResponse.json({ success: true, period: newPeriod });
  } catch (error) {
    console.error('Create period error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
