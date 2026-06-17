import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function PUT(request, { params }) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const { code, name, description, isActive } = await request.json();

    const existing = await prisma.costCenter.findUnique({
      where: { id }
    });

    if (!existing) {
      return NextResponse.json({ error: 'Cost Center not found' }, { status: 404 });
    }

    // Check code duplication
    if (code && code !== existing.code) {
      const duplicate = await prisma.costCenter.findUnique({
        where: { code }
      });
      if (duplicate) {
        return NextResponse.json({ error: 'Cost Center with this code already exists' }, { status: 400 });
      }
    }

    const updated = await prisma.costCenter.update({
      where: { id },
      data: {
        code: code !== undefined ? code : existing.code,
        name: name !== undefined ? name : existing.name,
        description: description !== undefined ? description : existing.description,
        isActive: isActive !== undefined ? isActive : existing.isActive
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'UPDATE_COST_CENTER',
        description: `Updated cost center ${updated.code} (ID: ${id})`
      }
    });

    return NextResponse.json({ success: true, costCenter: updated });
  } catch (error) {
    console.error('Update cost center error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userPayload.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const resolvedParams = await params;
    const id = parseInt(resolvedParams.id, 10);
    if (isNaN(id)) {
      return NextResponse.json({ error: 'Invalid ID' }, { status: 400 });
    }

    const costCenter = await prisma.costCenter.findUnique({
      where: { id },
      include: {
        _count: {
          select: { transactions: true }
        }
      }
    });

    if (!costCenter) {
      return NextResponse.json({ error: 'Cost Center not found' }, { status: 404 });
    }

    // Deactivate if there are transaction logs linked
    if (costCenter._count.transactions > 0) {
      await prisma.costCenter.update({
        where: { id },
        data: { isActive: false }
      });
      
      await prisma.auditLog.create({
        data: {
          userId: userPayload.id,
          action: 'DEACTIVATE_COST_CENTER',
          description: `Deactivated cost center ${costCenter.code} due to existing transactions`
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Cost Center has transactions; deactivated instead of deleted.' 
      });
    }

    // Otherwise, perform actual delete
    await prisma.costCenter.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'DELETE_COST_CENTER',
        description: `Deleted cost center ${costCenter.code}`
      }
    });

    return NextResponse.json({ success: true, message: 'Cost Center deleted successfully.' });
  } catch (error) {
    console.error('Delete cost center error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
