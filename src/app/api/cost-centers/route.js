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
    const activeOnly = searchParams.get('active') === 'true';

    const where = {};
    if (activeOnly) {
      where.isActive = true;
    }

    const costCenters = await prisma.costCenter.findMany({
      where,
      include: {
        _count: {
          select: { transactions: true }
        }
      },
      orderBy: { code: 'asc' }
    });

    return NextResponse.json({ costCenters });
  } catch (error) {
    console.error('Fetch cost centers error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { code, name, description, isActive } = await request.json();

    if (!code || !name) {
      return NextResponse.json({ error: 'Code and name are required' }, { status: 400 });
    }

    // Check duplicate
    const existing = await prisma.costCenter.findUnique({
      where: { code }
    });

    if (existing) {
      return NextResponse.json({ error: 'Cost Center with this code already exists' }, { status: 400 });
    }

    const costCenter = await prisma.costCenter.create({
      data: {
        code,
        name,
        description: description || null,
        isActive: isActive !== false
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'CREATE_COST_CENTER',
        description: `Created cost center ${code} - ${name}`
      }
    });

    return NextResponse.json({ success: true, costCenter });
  } catch (error) {
    console.error('Create cost center error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
