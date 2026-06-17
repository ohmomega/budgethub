import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';
import bcrypt from 'bcryptjs';

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

    // Safety check: Cannot modify self
    if (id === userPayload.id) {
      return NextResponse.json({ error: 'Cannot modify your own administrator account' }, { status: 400 });
    }

    const { email, password, role } = await request.json();

    const user = await prisma.user.findUnique({
      where: { id }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const data = {};
    if (email) data.email = email;
    if (role) {
      if (role !== 'admin' && role !== 'user' && role !== 'viewer' && role !== 'deactivated') {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
      }
      data.role = role;
    }
    if (password) {
      if (password.length < 8) {
        return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
      }
      data.passwordHash = bcrypt.hashSync(password, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        email: true,
        role: true,
        createdAt: true
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: password ? 'RESET_PASSWORD' : 'UPDATE_USER',
        description: password 
          ? `Reset password for user "${user.username}"`
          : `Updated user "${user.username}" (role changed to "${role || user.role}")`
      }
    });

    return NextResponse.json({ success: true, user: updated });
  } catch (error) {
    console.error('Update user error:', error);
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

    if (id === userPayload.id) {
      return NextResponse.json({ error: 'Cannot delete your own administrator account' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        _count: {
          select: { budgetPeriods: true, exportLogs: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Deactivate if they have created periods or log details
    if (user._count.budgetPeriods > 0 || user._count.exportLogs > 0) {
      await prisma.user.update({
        where: { id },
        data: { role: 'deactivated' }
      });

      await prisma.auditLog.create({
        data: {
          userId: userPayload.id,
          action: 'DEACTIVATE_USER',
          description: `Deactivated user "${user.username}" due to existing records`
        }
      });

      return NextResponse.json({ success: true, message: 'User has transaction records; deactivated instead of deleted.' });
    }

    // Otherwise, perform actual hard-delete
    await prisma.user.delete({
      where: { id }
    });

    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'DELETE_USER',
        description: `Deleted user "${user.username}"`
      }
    });

    return NextResponse.json({ success: true, message: 'User deleted successfully.' });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
