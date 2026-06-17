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
    const scope = searchParams.get('scope'); // 'month' or 'year'

    // Retrieve all periods to construct historical comparisons
    const periods = await prisma.budgetPeriod.findMany({
      include: {
        transactions: true
      },
      orderBy: [
        { year: 'asc' },
        { month: 'asc' }
      ]
    });

    const trends = periods.map(p => {
      let expense = 0;
      let totalAll = 0;
      p.transactions.forEach(t => {
        if (t.includedInBudgetCut !== false) {
          expense += t.amountBeforeTax;
        }
        totalAll += t.totalAmount;
      });
      return {
        id: p.id,
        label: `${p.year}-${String(p.month).padStart(2, '0')}`,
        year: p.year,
        month: p.month,
        income: 0,
        expense: Math.round(expense * 100) / 100,
        net: Math.round(totalAll * 100) / 100,
        status: p.status
      };
    });

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;

    let targetYear = currentYear;
    if (yearStr) {
      const parsedYear = parseInt(yearStr, 10);
      if (!isNaN(parsedYear)) {
        targetYear = parsedYear;
      }
    }

    let activeStats = {
      year: currentYear,
      month: currentMonth,
      income: 0,
      expense: 0,
      net: 0,
      periodId: null,
      status: 'none',
      name: ''
    };

    let costCenterBreakdown = [];

    if (scope === 'year') {
      const yearPeriods = periods.filter(p => p.year === targetYear);
      let income = 0;
      let expense = 0;
      const ccGroups = {};

      const costCenters = await prisma.costCenter.findMany();
      const ccMap = {};
      costCenters.forEach(cc => {
        ccMap[cc.id] = { code: cc.code, name: cc.name };
      });

      let netAll = 0;
      yearPeriods.forEach(p => {
        p.transactions.forEach(t => {
          if (t.includedInBudgetCut !== false) {
            expense += t.amountBeforeTax;

            const ccId = t.costCenterId || 0;
            if (!ccGroups[ccId]) {
              ccGroups[ccId] = {
                costCenterId: ccId,
                code: ccId ? (ccMap[ccId]?.code || 'CC_UNKNOWN') : 'UNASSIGNED',
                name: ccId ? (ccMap[ccId]?.name || 'Unknown Cost Center') : 'Unassigned',
                beforeTax: 0,
                tax: 0,
                total: 0
              };
            }
            ccGroups[ccId].beforeTax += t.amountBeforeTax;
            ccGroups[ccId].tax += t.taxAmount;
            ccGroups[ccId].total += t.totalAmount;
          }
          netAll += t.totalAmount;
        });
      });

      activeStats = {
        year: targetYear,
        month: null,
        income: 0,
        expense: Math.round(expense * 100) / 100,
        net: Math.round(netAll * 100) / 100,
        periodId: null,
        status: yearPeriods.length > 0 && yearPeriods.every(p => p.status === 'finalized') ? 'finalized' : 'draft',
        name: `Year ${targetYear}`
      };

      costCenterBreakdown = Object.values(ccGroups).map(g => ({
        ...g,
        beforeTax: Math.round(g.beforeTax * 100) / 100,
        tax: Math.round(g.tax * 100) / 100,
        total: Math.round(g.total * 100) / 100
      }));
    } else {
      // Search for current month period
      let activePeriod = periods.find(p => p.year === currentYear && p.month === currentMonth);
      
      // Fallback to latest period overall
      if (!activePeriod && periods.length > 0) {
        activePeriod = periods[periods.length - 1];
      }

      if (activePeriod) {
        let expense = 0;
        let netAll = 0;
        activePeriod.transactions.forEach(t => {
          if (t.includedInBudgetCut !== false) {
            expense += t.amountBeforeTax;
          }
          netAll += t.totalAmount;
        });

        activeStats = {
          year: activePeriod.year,
          month: activePeriod.month,
          income: 0,
          expense: Math.round(expense * 100) / 100,
          net: Math.round(netAll * 100) / 100,
          periodId: activePeriod.id,
          status: activePeriod.status,
          name: activePeriod.name
        };

        // Retrieve all Cost Centers to resolve display names
        const costCenters = await prisma.costCenter.findMany();
        const ccMap = {};
        costCenters.forEach(cc => {
          ccMap[cc.id] = { code: cc.code, name: cc.name };
        });

        const ccGroups = {};
        activePeriod.transactions.forEach(t => {
          if (t.includedInBudgetCut !== false) {
            const ccId = t.costCenterId || 0;
            if (!ccGroups[ccId]) {
              ccGroups[ccId] = {
                costCenterId: ccId,
                code: ccId ? (ccMap[ccId]?.code || 'CC_UNKNOWN') : 'UNASSIGNED',
                name: ccId ? (ccMap[ccId]?.name || 'Unknown Cost Center') : 'Unassigned',
                beforeTax: 0,
                tax: 0,
                total: 0
              };
            }
            ccGroups[ccId].beforeTax += t.amountBeforeTax;
            ccGroups[ccId].tax += t.taxAmount;
            ccGroups[ccId].total += t.totalAmount;
          }
        });

        costCenterBreakdown = Object.values(ccGroups).map(g => ({
          ...g,
          beforeTax: Math.round(g.beforeTax * 100) / 100,
          tax: Math.round(g.tax * 100) / 100,
          total: Math.round(g.total * 100) / 100
        }));
      }
    }

    return NextResponse.json({
      activeStats,
      trends,
      costCenterBreakdown
    });
  } catch (error) {
    console.error('Fetch dashboard stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
