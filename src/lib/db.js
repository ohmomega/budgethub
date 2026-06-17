import { PrismaClient } from '@prisma/client';
import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

function createPrismaClient() {
  // Parse database URL from environment, fallback to dev.db for local development
  const dbUrl = process.env.DATABASE_URL
    ? process.env.DATABASE_URL.replace('file:', '').replace('./', '')
    : 'dev.db';

  const adapter = new PrismaBetterSqlite3({ url: dbUrl });
  return new PrismaClient({ adapter });
}

let prisma;

// Prevent multiple instances of Prisma Client in development (hot-reload)
if (process.env.NODE_ENV === 'production') {
  prisma = createPrismaClient();
} else {
  if (!global.globalPrisma) {
    global.globalPrisma = createPrismaClient();
  }
  prisma = global.globalPrisma;
}

export { prisma };
