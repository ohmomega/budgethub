import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getUserFromRequest } from '@/lib/auth';

// Thailand VAT rate — extract to config/DB setting if rate changes
const TAX_RATE = 0.07;
const VALID_TRANSACTION_TYPES = ['income', 'expense'];

export async function POST(request, { params }) {
  try {
    const userPayload = await getUserFromRequest(request);
    if (!userPayload) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (userPayload.role === 'viewer') {
      return NextResponse.json({ error: 'Forbidden: Viewers cannot edit data' }, { status: 403 });
    }

    const resolvedParams = await params;
    const periodId = parseInt(resolvedParams.id, 10);
    if (isNaN(periodId)) {
      return NextResponse.json({ error: 'Invalid period ID' }, { status: 400 });
    }

    // Check period status
    const period = await prisma.budgetPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    if (period.status === 'finalized') {
      return NextResponse.json({ error: 'Forbidden: Finalized periods are read-only' }, { status: 403 });
    }

    const { transactions } = await request.json();
    if (!Array.isArray(transactions)) {
      return NextResponse.json({ error: 'Transactions list is required' }, { status: 400 });
    }

    // Synchronize in database transaction
    const dbTransactions = await prisma.transaction.findMany({
      where: { periodId }
    });
    const dbIds = dbTransactions.map(t => t.id);
    const dbTxMap = new Map(dbTransactions.map(t => [t.id, t]));

    const requestIds = transactions
      .map(t => t.id)
      .filter(id => id && typeof id === 'number' && id > 0);

    // Prune removed transactions
    const idsToDelete = dbIds.filter(id => !requestIds.includes(id));

    await prisma.$transaction(async (tx) => {
      // 1. Delete removed rows
      if (idsToDelete.length > 0) {
        await tx.transaction.deleteMany({
          where: {
            id: { in: idsToDelete }
          }
        });
      }

      // 2. Upsert rows differentially
      for (let i = 0; i < transactions.length; i++) {
        const t = transactions[i];
        
        // Calculations
        const amountBeforeTax = parseFloat(t.amountBeforeTax) || 0.0;
        const taxAmount = Math.round(amountBeforeTax * TAX_RATE * 100) / 100;
        const totalAmount = Math.round((amountBeforeTax + taxAmount) * 100) / 100;

        const data = {
          periodId,
          costCenterId: t.costCenterId ? parseInt(t.costCenterId, 10) : null,
          rowOrder: i + 1, // Apply layout order
          description: t.description || '',
          amountBeforeTax,
          taxAmount,
          totalAmount,
          transactionType: VALID_TRANSACTION_TYPES.includes(t.transactionType) ? t.transactionType : 'expense',
          accountCode: t.accountCode || null,
          includedInBudgetCut: t.includedInBudgetCut !== false,
          notes: t.notes || null
        };

        if (t.id && typeof t.id === 'number' && t.id > 0) {
          const existing = dbTxMap.get(t.id);
          const hasChanged = !existing ||
            existing.costCenterId !== data.costCenterId ||
            existing.rowOrder !== data.rowOrder ||
            existing.description !== data.description ||
            existing.amountBeforeTax !== data.amountBeforeTax ||
            existing.taxAmount !== data.taxAmount ||
            existing.totalAmount !== data.totalAmount ||
            existing.transactionType !== data.transactionType ||
            existing.accountCode !== data.accountCode ||
            existing.includedInBudgetCut !== data.includedInBudgetCut ||
            existing.notes !== data.notes;

          if (hasChanged) {
            await tx.transaction.update({
              where: { id: t.id },
              data
            });
          }
        } else {
          await tx.transaction.create({
            data
          });
        }
      }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'SAVE_TRANSACTIONS',
        description: `Saved ${transactions.length} transactions for period ${period.year}-${String(period.month).padStart(2, '0')}`
      }
    });

    // Fetch and return fresh records
    const updatedTransactions = await prisma.transaction.findMany({
      where: { periodId },
      orderBy: { rowOrder: 'asc' },
      include: { costCenter: true }
    });

    return NextResponse.json({ success: true, transactions: updatedTransactions });
  } catch (error) {
    console.error('Save transactions error:', error);
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
      return NextResponse.json({ error: 'Forbidden: Viewers cannot edit data' }, { status: 403 });
    }

    const resolvedParams = await params;
    const periodId = parseInt(resolvedParams.id, 10);
    if (isNaN(periodId)) {
      return NextResponse.json({ error: 'Invalid period ID' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const transactionIdStr = searchParams.get('transactionId');
    if (!transactionIdStr) {
      return NextResponse.json({ error: 'Transaction ID is required' }, { status: 400 });
    }

    const transactionId = parseInt(transactionIdStr, 10);
    if (isNaN(transactionId)) {
      return NextResponse.json({ error: 'Invalid transaction ID' }, { status: 400 });
    }

    const period = await prisma.budgetPeriod.findUnique({
      where: { id: periodId }
    });

    if (!period) {
      return NextResponse.json({ error: 'Period not found' }, { status: 404 });
    }

    if (period.status === 'finalized') {
      return NextResponse.json({ error: 'Forbidden: Finalized periods are read-only' }, { status: 403 });
    }

    const transaction = await prisma.transaction.findUnique({
      where: { id: transactionId }
    });

    if (!transaction || transaction.periodId !== periodId) {
      return NextResponse.json({ error: 'Transaction not found in this period' }, { status: 404 });
    }

    await prisma.transaction.delete({
      where: { id: transactionId }
    });

    // Create Audit Log
    await prisma.auditLog.create({
      data: {
        userId: userPayload.id,
        action: 'DELETE_TRANSACTION',
        description: `Deleted transaction "${transaction.description}" in period ${period.year}-${String(period.month).padStart(2, '0')}`
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete transaction error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
