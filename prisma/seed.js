const { PrismaClient } = require('@prisma/client');
const { PrismaBetterSqlite3 } = require('@prisma/adapter-better-sqlite3');
const bcrypt = require('bcryptjs');

const dbUrl = process.env.DATABASE_URL
  ? process.env.DATABASE_URL.replace('file:', '').replace('./', '')
  : 'dev.db';
const adapter = new PrismaBetterSqlite3({ url: dbUrl });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Seeding database...");

  // Clear existing data
  await prisma.transaction.deleteMany();
  await prisma.exportLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.budgetPeriod.deleteMany();
  await prisma.costCenter.deleteMany();
  await prisma.user.deleteMany();

  // Create Users
  const adminPasswordHash = bcrypt.hashSync('admin123', 12);
  const userPasswordHash = bcrypt.hashSync('user123', 12);
  const viewerPasswordHash = bcrypt.hashSync('viewer123', 12);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@budgethub.com',
      passwordHash: adminPasswordHash,
      role: 'admin',
    }
  });

  const user = await prisma.user.create({
    data: {
      username: 'user',
      email: 'user@budgethub.com',
      passwordHash: userPasswordHash,
      role: 'user',
    }
  });

  const viewer = await prisma.user.create({
    data: {
      username: 'viewer',
      email: 'viewer@budgethub.com',
      passwordHash: viewerPasswordHash,
      role: 'viewer',
    }
  });

  console.log("Users seeded successfully.");

  // Create Cost Centers with realistic codes (e.g. H307101030)
  const cc001 = await prisma.costCenter.create({
    data: { code: 'H307101030', name: 'Operations & Facilities', description: 'Core business operations and facilities management' }
  });
  const cc002 = await prisma.costCenter.create({
    data: { code: 'M204005001', name: 'Marketing & PR', description: 'Advertising, campaigns, and digital marketing' }
  });
  const cc003 = await prisma.costCenter.create({
    data: { code: 'RD10203040', name: 'Research & Development', description: 'Research and development of new products' }
  });
  const cc004 = await prisma.costCenter.create({
    data: { code: 'S994801020', name: 'Sales Operations', description: 'Sales pipeline and client operations' }
  });
  const cc005 = await prisma.costCenter.create({
    data: { code: 'HR10020304', name: 'HR & Administration', description: 'Human resources, recruitment, and legal support' }
  });

  console.log("Cost Centers seeded successfully.");

  // Create Budget Periods
  // May 2026 (Finalized)
  const periodMay = await prisma.budgetPeriod.create({
    data: {
      userId: admin.id,
      name: 'May 2026 Q2 Kickoff',
      year: 2026,
      month: 5,
      status: 'finalized',
    }
  });

  // June 2026 (Draft)
  const periodJune = await prisma.budgetPeriod.create({
    data: {
      userId: admin.id,
      name: 'June 2026 Operations',
      year: 2026,
      month: 6,
      status: 'draft',
    }
  });

  console.log("Budget Periods seeded successfully.");

  // Create Transactions for May 2026
  const transMay = [
    {
      periodId: periodMay.id,
      costCenterId: cc001.id,
      rowOrder: 1,
      accountCode: '53010060',
      description: 'Office Rent - May',
      amountBeforeTax: 5000.0,
      taxAmount: 350.0,
      totalAmount: 5350.0,
      transactionType: 'expense',
      includedInBudgetCut: true,
      notes: 'Monthly fixed contract rent',
    },
    {
      periodId: periodMay.id,
      costCenterId: cc002.id,
      rowOrder: 2,
      accountCode: '53010072',
      description: 'Q2 Marketing Ads',
      amountBeforeTax: 3000.0,
      taxAmount: 210.0,
      totalAmount: 3210.0,
      transactionType: 'expense',
      includedInBudgetCut: true,
      notes: 'Social media ads and printed flyers',
    },
    {
      periodId: periodMay.id,
      costCenterId: cc004.id,
      rowOrder: 3,
      accountCode: '41010010',
      description: 'Consulting Revenue - Client A',
      amountBeforeTax: 15000.0,
      taxAmount: 1050.0,
      totalAmount: 16050.0,
      transactionType: 'expense',
      includedInBudgetCut: false,
      notes: 'Milestone 2 payment',
    },
    {
      periodId: periodMay.id,
      costCenterId: cc003.id,
      rowOrder: 4,
      accountCode: '53010080',
      description: 'Server Subscriptions (AWS)',
      amountBeforeTax: 2500.0,
      taxAmount: 175.0,
      totalAmount: 2675.0,
      transactionType: 'expense',
      includedInBudgetCut: true,
      notes: 'Cloud hosting billing',
    }
  ];

  for (const t of transMay) {
    await prisma.transaction.create({ data: t });
  }

  // Create Transactions for June 2026
  const transJune = [
    {
      periodId: periodJune.id,
      costCenterId: cc001.id,
      rowOrder: 1,
      accountCode: '53010060',
      description: 'Office Rent - June',
      amountBeforeTax: 5000.0,
      taxAmount: 350.0,
      totalAmount: 5350.0,
      transactionType: 'expense',
      includedInBudgetCut: true,
      notes: 'Monthly fixed contract rent',
    },
    {
      periodId: periodJune.id,
      costCenterId: cc002.id,
      rowOrder: 2,
      accountCode: '53010075',
      description: 'Social Media Campaign',
      amountBeforeTax: 1200.0,
      taxAmount: 84.0,
      totalAmount: 1284.0,
      transactionType: 'expense',
      includedInBudgetCut: true,
      notes: 'Influencer partnerships',
    },
    {
      periodId: periodJune.id,
      costCenterId: cc004.id,
      rowOrder: 3,
      accountCode: '41010010',
      description: 'Consulting Revenue - Client B',
      amountBeforeTax: 12000.0,
      taxAmount: 840.0,
      totalAmount: 12840.0,
      transactionType: 'expense',
      includedInBudgetCut: false,
      notes: 'Retainer fee',
    },
    {
      periodId: periodJune.id,
      costCenterId: cc005.id,
      rowOrder: 4,
      accountCode: '53010090',
      description: 'Recruitment Fees',
      amountBeforeTax: 1500.0,
      taxAmount: 105.0,
      totalAmount: 1605.0,
      transactionType: 'expense',
      includedInBudgetCut: false,
      notes: 'Tech lead hiring fee (exempt from budget cut)',
    }
  ];

  for (const t of transJune) {
    await prisma.transaction.create({ data: t });
  }

  console.log("Transactions seeded successfully.");
  console.log("Database seeded successfully!");
}

main()
  .catch((e) => {
    console.error("Error during seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
