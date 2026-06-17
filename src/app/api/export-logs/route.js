import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

export async function POST(request) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { periodId, exportType, fileName } = await request.json();

    if (!periodId || !exportType || !fileName) {
      return NextResponse.json({ error: 'Missing log fields' }, { status: 400 });
    }

    const log = await prisma.exportLog.create({
      data: {
        periodId: parseInt(periodId, 10),
        userId: userPayload.id,
        exportType,
        fileName
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'EXPORT',
        description: `Exported period (ID: ${periodId}) as ${exportType.toUpperCase()} (File: ${fileName})`
      }
    });

    return NextResponse.json({ success: true, log });
  } catch (error) {
    console.error('Log export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
