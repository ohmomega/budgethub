import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(request, { params }) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const period = await prisma.budgetPeriod.findUnique({
      where: { id },
      include: {
        user: {
          select: { username: true }
        },
        transactions: {
          orderBy: { rowOrder: 'asc' },
          include: {
            costCenter: true
          }
        }
      }
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    return NextResponse.json({ period });
  } catch (error) {
    console.error('Fetch period detail error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { status, name } = await request.json();
    
    const data = {};
    if (status !== undefined) {
      if (status !== 'draft' && status !== 'finalized') {
        return NextResponse.json({ error: 'Status must be draft or finalized' }, { status: 400 });
      }
      data.status = status;
    }
    if (name !== undefined) {
      data.name = name || null;
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No fields provided to update' }, { status: 400 });
    }

    const period = await prisma.budgetPeriod.findUnique({
      where: { id }
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    // Role-based restrictions (viewer role should not change status or name)
    if (userPayload.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden: Viewers cannot modify periods' }, { status: 403 });
    }

    const updatedPeriod = await prisma.budgetPeriod.update({
      where: { id },
      data
    });

    // Create Audit Log
    const changesDescription = [];
    if (status !== undefined && status !== period.status) {
      changesDescription.push(`status to ${status}`);
    }
    if (name !== undefined && name !== period.name) {
      changesDescription.push(`name to "${name || ''}"`);
    }

    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'UPDATE_PERIOD',
        description: `Updated budget period ${period.year}-${String(period.month).padStart(2, '0')} (${changesDescription.join(', ') || 'no changes'})`
      }
    });

    return NextResponse.json({ success: true, period: updatedPeriod });
  } catch (error) {
    console.error('Update period error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userPayload.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden: Viewers cannot delete periods' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const period = await prisma.budgetPeriod.findUnique({
      where: { id }
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    // Delete the period (transactions cascade due to onDelete: Cascade in schema)
    await prisma.budgetPeriod.delete({
      where: { id }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'DELETE_PERIOD',
        description: `Deleted budget period ${period.year}-${String(period.month).padStart(2, '0')}${period.name ? ` (${period.name})` : ''}`
      }
    });

    return NextResponse.json({ success: true, message: 'Budget period deleted successfully' });
  } catch (error) {
    console.error('Delete period error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
